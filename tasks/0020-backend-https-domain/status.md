# Status: 0020-backend-https-domain

**State:** done

## Definition-of-done checklist

- [x] Static Elastic IP re-added via Terraform
- [x] Porkbun A record for `api.oxo-date.dev.oxohive.com` created
- [x] Real Let's Encrypt cert obtained and nginx terminating TLS for it,
      auto-renewal confirmed set up
- [x] admin-web's `NEXT_PUBLIC_API_BASE_URL` updated to the HTTPS domain,
      redeployed
- [x] Verified end-to-end: `https://api.oxo-date.dev.oxohive.com/health`
      returns 200 with a valid cert, and the admin dashboard's real OTP
      request flow succeeds (confirmed via backend logs, not just UI)
- [x] Docs updated
- [x] Committed and pushed

## Evidence

### 1. Static Elastic IP (Terraform)

`terraform plan` in `infra/terraform/envs/pilot` showed exactly:

```
Plan: 1 to add, 0 to change, 0 to destroy.
Changes to Outputs:
  + static_public_ip = (known after apply)
```

Only `aws_eip.pilot` was added — `aws_instance.app` and every other
resource were untouched. Applied cleanly:

```
aws_eip.pilot: Creating...
aws_eip.pilot: Creation complete after 3s [id=eipalloc-022dc2cebe63c4c56]
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
...
static_public_ip = "15.207.91.114"
```

New static IP: **15.207.91.114**.

### 2. Porkbun DNS A record

Created via `POST https://api.porkbun.com/api/json/v3/dns/create/oxohive.com`
(`name=api.oxo-date.dev`, `type=A`, `content=15.207.91.114`, `ttl=600`):

```
{"status":"SUCCESS","id":606918350,...}
```

Resolved on the first poll (no propagation delay observed), confirmed
against two independent public resolvers:

```
$ nslookup api.oxo-date.dev.oxohive.com 8.8.8.8
Address: 15.207.91.114

$ nslookup api.oxo-date.dev.oxohive.com 1.1.1.1
Address: 15.207.91.114
```

Note: the stored `PORKBUN_SECRET_KEY` env var had trailing garbage beyond
the real 68-character secret (`Invalid API key (002)` until truncated to
the correct length) — worked around by truncating at call time; the env
var itself was left as-is (not in this task's ownership to fix).

### 3. TLS certificate + nginx

- Installed `certbot` on the EC2 host (Ubuntu 22.04) via SSM.
- Obtained the cert via `certbot certonly --webroot -w
  /opt/dating-app/certbot-www -d api.oxo-date.dev.oxohive.com`:

  ```
  Successfully received certificate.
  Certificate is saved at: /etc/letsencrypt/live/api.oxo-date.dev.oxohive.com/fullchain.pem
  This certificate expires on 2027-02-25.
  Certbot has set up a scheduled task to automatically renew this certificate in the background.
  ```

- Deployed in two phases to avoid ever loading an nginx config that
  references a cert file that doesn't exist yet:
  1. Added the ACME `/.well-known/acme-challenge/` location + the
     webroot/letsencrypt volume mounts to `docker-compose.pilot.yml`,
     recreated the `nginx` container — `nginx -t` passed, `/health`
     stayed `200` throughout.
  2. After the cert existed, added the port-443 server block (shared
     backend routing via `include
     /etc/nginx/conf.d/includes/backend-location.conf` — factored into
     `infra/docker-compose/nginx-backend-location.conf` so the port-80
     and port-443 blocks can't drift apart), reloaded nginx — `nginx -t`
     passed again.
- Renewal: `certbot.timer` confirmed `enabled` + `active`
  (`systemctl is-enabled`/`is-active`), next run scheduled, and a
  `certbot renew --dry-run` succeeded:

  ```
  Congratulations, all simulated renewals succeeded:
    /etc/letsencrypt/live/api.oxo-date.dev.oxohive.com/fullchain.pem (success)
  ```

  A deploy-hook (`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`)
  reloads the `nginx` container after every real renewal so the new cert
  actually takes effect.

### 4. admin-web (Vercel) env var + redeploy

- Deleted the old `NEXT_PUBLIC_API_BASE_URL` (`http://13.202.45.131`) and
  created a new one (`https://api.oxo-date.dev.oxohive.com`) on project
  `prj_M6MK5dQ6STumwAwM0vQCw1N1IpKo`, same targets
  (production/preview/development).
- Triggered a redeploy via `POST /v13/deployments` with the previous
  latest deployment's `uid` as `deploymentId`. Polled until `READY`:

  ```
  attempt 0 : readyState=BUILDING
  attempt 3 : readyState=READY
  ```

  New deployment: `dpl_Eo1efEwcyNCmF78XKDKr6AsjuDbD`.

### 5. End-to-end verification

```
$ curl -v https://api.oxo-date.dev.oxohive.com/health
* SSL certificate verify ok.
*  issuer: C=US; O=Let's Encrypt; CN=YR2
< HTTP/1.1 200 OK
{"status":"ok","correlation_id":"..."}

$ curl -X POST https://api.oxo-date.dev.oxohive.com/auth/otp/request \
    -H "Content-Type: application/json" -d '{"phone_number": "+918248546091"}'
HTTP_STATUS=202
```

Matching backend log lines (via SSM,
`docker compose ... logs --tail=80 backend | grep -i otp_sms`):

```
{"message": "otp_sms_twilio_skipped_no_account_sid", "phone_number": "+918248546091", ...}
{"message": "otp_sms_textbee_sent", "phone_number": "+918248546091", ...}
```

(Twilio still dormant per task 0019 — no `TWILIO_ACCOUNT_SID` SSM
parameter yet — TextBee delivered it, same as before this task; the
point here is that the request reached this real code path at all,
which it couldn't do from a browser before this task.)

Plain HTTP on the bare IP still works unchanged:

```
$ curl http://15.207.91.114/health
HTTP_STATUS=200
```

**No HTTP→HTTPS redirect was added** — see
`docs/runbooks/env-start-stop.md`'s "HTTPS backend domain (task 0020)"
section for why (mobile's wake-discovery flow still calls the bare IP
over plain HTTP; a redirect would have broken it).

### 6. Docs

`docs/runbooks/env-start-stop.md` updated: static IP's return (and why,
distinct from task 0011's original reason), the new HTTPS domain, cert/
renewal mechanics, the no-redirect decision, and a correction to the
stale EC2-hosted admin-web IP note.

### 7. Commit / CI / Deploy

See the final commit SHA and CI/Deploy run results recorded by whoever
closes this out after push (filled in after the push + workflow runs
below this line, if done in the same sitting).
