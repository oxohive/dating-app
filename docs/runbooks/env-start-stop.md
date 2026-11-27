# Runbook: Manually Start/Stop the Pilot Environment

The pilot EC2 instance has **two** automatic cost-control mechanisms working
together, plus a wake-on-demand escape hatch:

1. **Fixed schedule (the outer bound)** — an EventBridge-scheduled Lambda
   (in `lambda/env-start` / `lambda/env-stop`) stops the instance at a fixed
   time every night and starts it again every morning (IST), regardless of
   activity. This guarantees the instance is never billed overnight.
2. **Idle auto-stop (the inner optimization)** — a CloudWatch alarm
   (`dating-app-pilot-idle-auto-stop`, defined in
   `infra/terraform/envs/pilot/main.tf`) watches the instance's
   `CPUUtilization`. If it stays below ~5% for ~20 minutes (4 periods of 5
   minutes — configurable via the `idle_alarm_*` tfvars), the alarm invokes
   the **same** `env-stop` Lambda directly as its alarm action (no new SNS
   topic or Lambda code needed — CloudWatch alarms can invoke a Lambda ARN
   directly, and `env-stop` is already idempotent). This catches idle
   periods *during* active hours that the fixed schedule doesn't cover —
   e.g. everyone stops testing at 2pm instead of waiting for the midnight
   cutoff.
3. **Wake on demand** — since either mechanism above can leave the instance
   stopped while someone actually wants to use it, a small `env-wake` Lambda
   (`lambda/env-wake/handler.py`) behind a public Lambda Function URL lets
   anyone bring the instance back up immediately, without waiting for the
   next scheduled start. See "Wake the instance via the Function URL"
   below.

Use the rest of this runbook when you need to override any of the above —
e.g. a demo outside normal hours, or taking the instance down for
maintenance.

## Wake the instance via the Function URL

Hit the wake URL in a browser (or `curl`), with the shared secret as a
query parameter:

```
<env_wake_function_url output>?secret=<secret>
```

- Get the current URL: `terraform output -raw env_wake_function_url` from
  `infra/terraform/envs/pilot` (or `aws lambda get-function-url-config
  --function-name dating-app-pilot-env-wake`).
- Get the current secret: it's stored as an SSM **SecureString** parameter,
  name given by `terraform output -raw env_wake_secret_parameter_name`
  (currently `/dating-app/pilot/env_wake_shared_secret`). Fetch it with:

  ```
  aws ssm get-parameter --name /dating-app/pilot/env_wake_shared_secret \
    --with-decryption --query 'Parameter.Value' --output text
  ```

  This requires AWS CLI credentials with `ssm:GetParameter` + KMS decrypt on
  that parameter (the same kind of manual-escape-hatch credentials as
  Option B below) — it is **not** meant to be looked up by end users on
  every visit; share the full `...?secret=...` URL with whoever needs it
  instead of making them fetch the secret themselves each time.

**What happens when you hit it (browser/HTML mode, the default):**
- If the instance is stopped, it calls `ec2:StartInstances` (idempotent)
  and shows a "Starting the app..." page that auto-refreshes every 5
  seconds until the instance comes up.
- If the instance is already running, it redirects (302) to the
  instance's **current public IP** over plain HTTP.
- Wrong or missing secret → `403 Forbidden`.

**JSON mode (task 0018):** send `Accept: application/json` (what the
mobile app does) or append `?format=json` to the same URL, and the Lambda
returns a JSON body instead of the HTML/redirect above, for the exact same
underlying checks and the same `?secret=` auth:

| Situation | Response |
|---|---|
| Running, public IP available | `200 {"state": "running", "base_url": "http://<ip>"}` |
| Running but no public IP yet / stopped (start requested) / transitional (`pending`/`stopping`/`shutting-down`) | `200 {"state": "starting", "retry_after_seconds": 5}` |
| Terminated / unrecoverable | `500 {"state": "error", "message": "..."}` |
| Missing/incorrect secret | `403 {"state": "forbidden"}` |

See `lambda/env-wake/handler.py` and
`tasks/0018-mobile-dynamic-wake-discovery/plan.md` for the authoritative
contract. The mobile app polls this on startup (and after a mid-session
connection failure) and retries every `retry_after_seconds` until
`"running"`.

**Static public IP is back (task 0011, removed in task 0018, re-added in
task 0020):** task 0011 added a static AWS Elastic IP (`aws_eip.pilot`) so
the pilot had one address that never changed across stop/start. Task 0018
removed it, since the mobile app's own dynamic wake-and-discover via the
JSON mode above no longer needed a fixed address. **Task 0020 re-adds it**
(current value: `15.207.91.114` — re-run `terraform output
static_public_ip` from `infra/terraform/envs/pilot` rather than trusting
this written-down value, in case it's ever replaced) for a different
reason: a real Let's Encrypt TLS certificate can only be issued for a
domain name that resolves consistently, which in turn needs a stable IP
to resolve *to*. admin-web is now hosted on Vercel (HTTPS-only), and
browsers block it calling a plain-HTTP backend as mixed content — see
"HTTPS backend domain (task 0020)" below. The small ongoing idle-time EIP
cost (~$1-4/month) that task 0018 avoided is accepted again here, since a
browser-based client (admin-web, and potentially marketing-site later)
is a second real consumer that genuinely needs it.

The mobile app's dynamic wake-and-discover flow (task 0018) is **unaffected
and needs no changes**: `lambda/env-wake/handler.py` always looked up the
instance's *current* public IP dynamically regardless of whether that IP
came from an EIP or AWS's ephemeral pool — it just happens to return the
same address every time now instead of a fresh one per stop/start.

**Practical consequence:** the instance's public IP is once again stable
across stop/start (barring the EIP itself ever being released/replaced).
`terraform output instance_public_ip` / `static_public_ip` /
`marketing_site_url` / `admin_web_url` from `infra/terraform/envs/pilot`
now reflect the same value every time, but re-running them after a
`terraform apply` that touches the EIP is still the authoritative way to
get the current value rather than trusting a previously-noted one. The
env-wake Lambda Function URL remains the one address that was never
affected either way by any of this — see above.

## HTTPS backend domain (task 0020)

The backend is reachable over HTTPS at **`https://api.oxo-date.dev.oxohive.com`**,
a Porkbun DNS A record pointing at the static Elastic IP above, with a
real Let's Encrypt certificate terminated by the `nginx` container (see
`infra/docker-compose/nginx.conf`'s port-443 server block). This exists
specifically so admin-web (hosted on Vercel, HTTPS-only) can call the
backend without the browser blocking it as mixed content — calling the
bare IP over plain HTTP from an HTTPS page is exactly what was broken
before this task. admin-web's `NEXT_PUBLIC_API_BASE_URL` Vercel env var
now points at this domain instead of the old bare IP.

- **Certificate:** obtained via `certbot certonly --webroot`, run directly
  on the EC2 host (not inside a container) against a webroot directory
  (`/opt/dating-app/certbot-www`) shared with the `nginx` container via a
  volume mount, so the ACME HTTP-01 challenge is served on plain port 80
  through nginx's `/.well-known/acme-challenge/` location without needing
  to stop nginx or free up the port. Certs live under the host's
  `/etc/letsencrypt/`, mounted read-only into the `nginx` container.
- **Renewal:** certbot's own `certbot.timer` systemd unit (installed
  automatically with the package, confirmed `enabled`/`active`) runs
  twice daily and renews automatically when a cert is near expiry — no
  cron job was hand-rolled. A deploy-hook
  (`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`) reloads the
  `nginx` container (`docker compose exec nginx nginx -s reload`) after
  every successful renewal so the new cert actually takes effect without
  needing a manual restart. Verified with `certbot renew --dry-run`.
- **No HTTP→HTTPS redirect was added.** Port 80 still serves plain HTTP
  unchanged, alongside the new port 443. This was a deliberate choice,
  not an oversight: `lambda/env-wake/handler.py`'s JSON mode (what the
  mobile app's wake-discovery flow uses — see task 0018) still constructs
  and returns a bare `http://<ip>` URL, and a hard redirect would have
  broken every subsequent request the mobile app makes against it. If
  mobile is ever updated to use the HTTPS domain too, revisit adding a
  redirect at that point.
- **Shared routing, not duplicated:** both the port-80 and port-443 server
  blocks `include` the same `nginx-backend-location.conf` snippet for the
  backend's path-prefix routing, so the two can't drift apart.

**App URLs (task 0013):** alongside the backend API, the pilot instance
also serves two browser-viewable apps, both proxied through the same
nginx container as the backend (see `infra/docker-compose/nginx.conf`):

- **Marketing site:** root path, no login required.
- **Admin web:** port `8081` — a distinct port rather than a `/admin/`
  path prefix, to avoid Next.js basePath/asset-path issues. Reachable from
  the public internet, but gated by its own application-level login
  (`apps/admin-web/src/features/auth`) and, more importantly, by the
  backend's `is_admin` check enforced server-side on every `/admin/*` API
  call regardless of what the client sends.
- The existing backend API is unaffected — same path prefixes
  (`/health`, `/auth`, `/admin`, etc.) on the same host.

Both are produced by `terraform output marketing_site_url` /
`terraform output admin_web_url` from `infra/terraform/envs/pilot` and,
since task 0020 re-added the static Elastic IP, are stable again (no
need to re-run them after every stop/start, though re-running is still
the authoritative source of truth). Note this `admin-web` on port `8081`
is the EC2/docker-compose-hosted copy from task 0013, distinct from the
**Vercel-hosted admin-web** that task 0020 actually points at the new
`https://api.oxo-date.dev.oxohive.com` domain (its `NEXT_PUBLIC_API_BASE_URL`
env var on the Vercel project) — the two are deployed independently.
The EC2 copy's own `ADMIN_WEB_PUBLIC_API_BASE_URL` build-arg (set in
`.github/workflows/deploy.yml`) still hardcodes an old bare IP
(`http://15.206.247.148`, pre-dating even task 0018's EIP removal) that
was never kept in sync with the EIP's actual value across tasks — not
touched by task 0020 either, since that EC2 copy isn't the one admin-web
traffic is understood to use; flag this as a follow-up if the EC2-hosted
copy is still actually relied on by anyone.

**Rotating the secret:** the secret is a Terraform-managed `random_password`
stored in the SSM parameter above.

```
cd infra/terraform/envs/pilot
terraform apply -replace=random_password.env_wake_secret
```

This generates a fresh 32-character secret and writes it to the same SSM
parameter (so the parameter name and the Function URL itself never
change — only the `?secret=` value does). Anyone with the old link stops
working immediately after the apply; redistribute the new `...?secret=...`
URL to whoever needs it.

## OTP SMS delivery credentials (task 0019)

`send_otp_sms` (`services/backend/packages/api/features/auth/otp_service.py`)
tries Twilio, then TextBee, then falls back to the original log-only stub.
Credentials for both providers live in SSM under `/dating-app/pilot/`
(`twilio_api_key_sid`, `twilio_api_key_secret`, `twilio_from_number`,
`textbee_device_id`, `textbee_api_key`), fetched into `.env.pilot` by
`.github/workflows/deploy.yml` the same way the DB password is, and passed
into the `backend` container via `infra/docker-compose/docker-compose.pilot.yml`.

- **Twilio is dormant right now.** There is no `TWILIO_ACCOUNT_SID` SSM
  parameter yet (Twilio's API requires it alongside the API Key SID/Secret),
  so `.env.pilot` renders it empty and `otp_service.py` skips Twilio
  entirely and falls through to TextBee. Adding
  `/dating-app/pilot/twilio_account_sid` to SSM and wiring it into the same
  deploy step/compose `environment:` block activates Twilio with **no
  code change**.
- **TextBee is an intentional, temporary, testing-only fallback** — a
  phone-based SMS relay (https://github.com/vernu/textbee), not a durable
  or production-grade SMS provider (single point of failure if that phone
  is off/offline, ordinary-carrier rate limits). It is what actually
  delivers OTP SMS today. Remove it once a durable SMS strategy (e.g.
  Twilio fully wired, or another provider) is chosen for real production
  traffic.

## Option A: `workflow_dispatch` (preferred)

If a workflow is set up for manual start/stop (check
`.github/workflows/` for an `env-start-stop.yml` or similar, once the infra
task adds one):

```
gh workflow run env-start-stop.yml -f action=start
gh workflow run env-start-stop.yml -f action=stop
```

This goes through the same OIDC-authenticated path as `deploy.yml`, so no
local AWS credentials are needed, and the action is auditable in the Actions
run history.

## Option B: Direct Lambda invoke

If you need to bypass a workflow entirely (e.g. workflow not yet wired up,
or urgent manual override), invoke the control Lambda directly:

```
aws lambda invoke \
  --function-name <pilot-instance-control-lambda-name> \
  --payload '{"action": "start"}' \
  --cli-binary-format raw-in-base64-out \
  response.json
cat response.json
```

Replace `"start"` with `"stop"` to stop the instance. The Lambda name and
payload shape are defined in `lambda/` once the infra task provisions it —
confirm the exact function name and payload contract there before using this
command, since this runbook is written ahead of that infra existing.

This requires AWS CLI credentials with permission to invoke that specific
Lambda (e.g. via `aws sso login` or an assumed role) — it is a deliberate
manual escape hatch, separate from the no-static-keys rule that applies to
GitHub Actions.

## After a manual override

- If you started the instance outside its scheduled window, remember it
  will **not** auto-stop until the next scheduled stop event *or* until the
  idle alarm fires (whichever comes first) — the idle alarm means you don't
  have to remember to stop it yourself, but it also means a genuinely idle
  manual session will get stopped out from under you after ~20 minutes of
  low CPU, even outside the fixed schedule's off-hours.
- If you stopped the instance outside its scheduled window, remember the
  next scheduled *start* event will bring it back up as normal — the
  schedule is not disabled by a manual override, only the current on/off
  state is. You don't have to wait for it, though — use the wake Function
  URL above to bring it back immediately.
- Check the AWS Budgets alarm / CloudWatch billing metrics if you're running
  an extended manual session outside the normal schedule.
- If you need to temporarily disable the idle auto-stop (e.g. a long demo
  with mostly-idle CPU that you don't want cut off), there's no dedicated
  on/off switch for just the idle alarm today — either keep triggering
  enough CPU activity to stay above the threshold, or set
  `aws cloudwatch disable-alarm-actions --alarm-names
  dating-app-pilot-idle-auto-stop` and remember to re-enable it afterward
  with the matching `enable-alarm-actions` call.
