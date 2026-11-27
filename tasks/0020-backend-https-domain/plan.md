# Plan: 0020-backend-https-domain

## Goal

Admin-web (now hosted on Vercel, HTTPS-only) cannot call the backend at
all from the browser, confirmed live: the backend itself works fine
directly (`curl` to `http://<ip>/auth/otp/request` returns `202`), but
the browser blocks the request as "mixed content" (an HTTPS page calling
a plain-HTTP endpoint). This isn't fixable client-side — the backend
needs a real HTTPS endpoint with a trusted certificate.

## Why this requires bringing back the static IP

Let's Encrypt (the only no-cost real-CA option) cannot issue a
certificate for a bare IP address — only for a real domain name, and
only once that domain resolves consistently (so the ACME HTTP-01
challenge can complete) long enough to request/renew a cert. Task
0018 deliberately dropped the Elastic IP to save its small idle-time
cost (~$1-4/month), accepting that the mobile app would do its own
dynamic IP discovery instead. That tradeoff is still fine for mobile
(a native app, not subject to browser mixed-content rules, already has
its own wake-and-discover flow). But a stable, cert-able domain for the
*backend itself* now has a second real consumer — any browser-based
client (admin-web, and potentially marketing-site later) — that
genuinely needs a non-changing address to hold a valid certificate
against. Re-adding the Elastic IP is the pragmatic fix; it was already
proven to work (task 0011) and the cost is trivial against this
project's budget.

## Implementation

1. **Terraform**: re-add `aws_eip.pilot` (and its output) to
   `infra/terraform/envs/pilot/main.tf`/`outputs.tf` — same resource
   task 0011 originally added and task 0018 removed. `terraform plan`
   first to confirm it's exactly one clean addition (association to the
   existing `aws_instance.app`), apply it, record the new static IP.
2. **DNS**: add an A record at Porkbun —
   `api.oxo-date.dev.oxohive.com` → the new static IP (use the Porkbun
   API the same way the earlier Vercel/Porkbun CNAME records were
   created — check for existing credentials already stored, e.g. as
   local env vars `PORKBUN_API_KEY`/`PORKBUN_SECRET_KEY`, and reuse
   them; if they're not available in this environment, clearly ask
   rather than guessing/fabricating a workaround).
3. **TLS on the instance**: install `certbot` (with the nginx plugin)
   on the pilot EC2 instance via SSM, obtain a real Let's Encrypt
   certificate for `api.oxo-date.dev.oxohive.com` (HTTP-01 challenge —
   requires the DNS record from step 2 to have propagated first, and
   port 80 reachable, which it already is), and configure nginx to
   terminate TLS for that hostname on port 443, proxying to the
   existing `backend` upstream exactly as the current port-80 server
   block does (reuse the existing location/regex routing, don't
   duplicate-and-drift it — factor shared config if that's cleaner).
   Keep port 80 working too (either as a plain HTTP fallback or a
   redirect to 443 — redirect is the more correct longer-term choice,
   but confirm nothing currently depends on calling the bare IP over
   plain HTTP before adding a hard redirect that would break it, e.g.
   anything still using `http://<ip>` directly rather than the new
   domain). Set up certbot's renewal (it installs a systemd timer/cron
   automatically — verify this actually happened, don't just assume).
4. **Update admin-web's API base URL**: change its Vercel environment
   variable `NEXT_PUBLIC_API_BASE_URL` from `http://<ip>` to
   `https://api.oxo-date.dev.oxohive.com`, then trigger a redeploy
   (Next.js bakes `NEXT_PUBLIC_*` vars in at build time, same as
   before) so the change actually takes effect.
5. **Verify end-to-end for real**: from a plain `curl`, confirm
   `https://api.oxo-date.dev.oxohive.com/health` returns `200` with a
   valid (not self-signed) certificate. Then actually drive the admin
   dashboard's real OTP request flow (the thing that's currently
   broken) and confirm it now succeeds — check the backend logs for the
   corresponding `otp_sms_*` log line to prove the request actually
   reached the backend this time, not just that the UI stopped showing
   an error.
6. Update `docs/runbooks/env-start-stop.md` with the new
   `api.oxo-date.dev.oxohive.com` address and a note that the Elastic
   IP is back (reversing task 0018's removal) specifically to support
   this certificate, with the cost tradeoff restated clearly.
7. Commit and push.

## Risks

- Re-adding the EIP reintroduces the small idle-time cost task 0018
  removed — explicitly accepted here as the cost of having working
  HTTPS for any browser-based client.
- Certbot's HTTP-01 challenge needs the DNS record to have actually
  propagated and port 80 to be reachable at the moment of the request —
  sequence steps 2 and 3 with that dependency in mind, don't race them.
- Don't let a port-80-to-443 redirect break anything still calling the
  bare IP directly (check mobile's wake-discovery flow and anything
  else) before deciding whether to add a hard redirect or just leave
  port 80 serving HTTP as-is alongside the new HTTPS port 443.

## Rollback

Remove the nginx TLS server block and the DNS record; `aws_eip.pilot`
can be removed again via Terraform if the cost becomes a concern later
(back to task 0018's dynamic-discovery-only approach for mobile, with
browser clients accepted as broken again).
