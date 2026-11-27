# Ownership: 0020-backend-https-domain

Single sequential agent — Terraform, nginx/instance config, DNS, and a
Vercel env var all need to happen in a specific dependency order
(EIP → DNS → cert → nginx → admin-web redeploy), so one agent owns
the whole chain rather than parallel subtasks.

| Owned paths |
|---|
| `infra/terraform/envs/pilot/**` |
| `infra/docker-compose/nginx.conf` |
| `docs/runbooks/env-start-stop.md` |
| Vercel project `prj_M6MK5dQ6STumwAwM0vQCw1N1IpKo` (admin-web) env vars + a redeploy — via the Vercel API, `VERCEL_TOKEN` already available as a local env var |
| Porkbun DNS for `oxohive.com` — via the Porkbun API, `PORKBUN_API_KEY`/`PORKBUN_SECRET_KEY` already available as local env vars |
| `tasks/0020-backend-https-domain/**` |
