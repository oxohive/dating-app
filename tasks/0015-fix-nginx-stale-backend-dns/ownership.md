# Ownership: 0015-fix-nginx-stale-backend-dns

Single sequential agent, same reasoning as every prior deploy-chain fix.

| Owned paths |
|---|
| `infra/docker-compose/nginx.conf` |
| `.github/workflows/deploy.yml` (only if the optional path-filter improvement is made) |
| `tasks/0015-fix-nginx-stale-backend-dns/**` |

Also responsible for pushing the two commits task 0014 left pending
locally (`0cdfa5c`, `368be2e` — already committed, just unpushed,
deliberately held back until this fix landed) together with this fix's
own commit, so the next deploy that goes out already has the resolver
fix in place and doesn't repeat the outage.
