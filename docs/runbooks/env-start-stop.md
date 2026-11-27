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

**No more static public IP (task 0011 removed in task 0018):** task 0011
added a static AWS Elastic IP (`aws_eip.pilot`) so the pilot had one
address that never changed across stop/start. Task 0018 removed it: the
mobile app now does its own dynamic wake-and-discover via the JSON mode
above instead of relying on a fixed address, so the small ongoing
idle-time EIP cost is no longer worth paying.

**Practical consequence: the instance's own public IP can change on every
stop/start again**, exactly like before task 0011 — AWS assigns a fresh
ephemeral address each time the instance (re)starts, and releases it on
stop. There is **no stable bare-IP URL for the pilot instance anymore**.
Concretely:

- **The env-wake Lambda Function URL is now the only address that stays
  constant.** `terraform output -raw env_wake_function_url` never changes
  across stop/start cycles — bookmark/use *that* (with `?secret=...`), not
  a raw IP.
- **Any bare-IP bookmark you've saved (`http://<old-ip>/`,
  `http://<old-ip>:8081/`, etc.) will go stale** the next time the
  instance stops and starts, whether that's a scheduled stop, the idle
  auto-stop alarm, or a manual override below. Re-resolve the current
  address via the wake Lambda (browser mode redirects you to it; JSON mode
  returns it as `base_url`) rather than reusing an old bookmark.
- `terraform output instance_public_ip` / `marketing_site_url` /
  `admin_web_url` from `infra/terraform/envs/pilot` still work, but only
  reflect whatever the instance's IP happens to be *at the moment you run
  that command* — re-run them after any stop/start rather than trusting a
  previously-noted value.
- The mobile app no longer needs any of this — it discovers the current
  address itself via the Lambda's JSON mode on every app launch/foreground
  and after any mid-session connection failure (see
  `tasks/0018-mobile-dynamic-wake-discovery/plan.md`).

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
`terraform output admin_web_url` from `infra/terraform/envs/pilot` — as of
task 0018, these reflect the instance's **current** (no-longer-static) IP
at the moment you run them, not a fixed address; re-run them after any
stop/start rather than reusing a previously-noted value. (The
`admin-web`-side `ADMIN_WEB_PUBLIC_API_BASE_URL` baked in at deploy time
by `.github/workflows/deploy.yml` still hardcodes the old static IP as of
this writing — that value will go stale the next time the instance
stops/starts and is **not** fixed by this task; see task 0018's status/
report for details, it's a follow-up for whoever owns admin-web's deploy
config.)

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
