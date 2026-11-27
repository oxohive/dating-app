# Ownership: 0013-deploy-admin-web-and-marketing-site

Single sequential agent — deploy-pipeline/infra changes that all touch
the same shared files (`docker-compose.pilot.yml`, `nginx.conf`,
`deploy.yml`), same pattern as every prior deploy-chain fix (tasks
0003/0004/0006/0007/0009).

| Owned paths |
|---|
| `apps/admin-web/Dockerfile` (new), `apps/marketing-site/Dockerfile` (new) |
| `infra/docker-compose/**` |
| `.github/workflows/deploy.yml` |
| `infra/terraform/envs/pilot/**` (only if new ECR repos / security group rule needed) |
| `docs/runbooks/env-start-stop.md` |
| `tasks/0013-deploy-admin-web-and-marketing-site/**` |

Safe to run now in parallel with Wave 3's five implementation agents
(B7/B8/B9/M4/W3), which only touch `services/backend/packages/api/features/**`,
`apps/mobile/src/features/**`, `apps/marketing-site/src/**` (content, not
Dockerfiles/deploy config), and `apps/admin-web/src/features/**` — no
overlap with this task's infra/deploy-config paths.

**Caution for B9 (marketing-site content) overlap:** B9 only owns
`apps/marketing-site/**` for *content* (pages/components under `src/`);
this task adds only a root-level `Dockerfile` and possibly a
`next.config.js` edit (for `output: "standalone"`) — if B9 also touches
`next.config.js` for any reason, that's a potential collision. Check
before editing `next.config.js` whether B9 has already changed it this
session, and merge rather than overwrite.
