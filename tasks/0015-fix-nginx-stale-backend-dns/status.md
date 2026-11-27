# Status: 0015-fix-nginx-stale-backend-dns

**State:** done — fix applied, pushed, deployed, and proven live against a
real second backend-only container recreation.

## Definition-of-done checklist

- [x] nginx.conf fixed to re-resolve `backend` (and `admin-web`/
      `marketing-site`, which had the identical latent bug) dynamically
      instead of caching at startup
- [x] Verified live against a real forced second backend recreation (not
      just "nginx reloaded cleanly") — see Verification below
- [x] Task 0014's two pending commits (`0cdfa5c`, `368be2e`) pushed
      alongside this fix, in one push
- [x] Committed and pushed

## History

| Date | State | Notes |
|---|---|---|
| 2026-11-27 | fixed | Read `infra/docker-compose/nginx.conf` in full (2 server blocks: port 80 with `backend` + `marketing-site` upstreams, port 8081 with `admin-web`). All three used a bare `proxy_pass http://<service>:<port>;`, which resolves the Compose service hostname once at nginx config-load/startup and never again — the exact bug that caused the live 502 outage recorded in task 0014's status.md. Replaced all three with the resolver + `set` variable pattern (`resolver 127.0.0.11 valid=10s;` per server block, `set $x http://service:port; proxy_pass $x;` per location) so nginx re-resolves against Docker's embedded DNS on a 10s TTL instead of caching at load time. |
| 2026-11-27 | committed | Commit `9bc5df1` — "Fix stale nginx proxy_pass DNS caching (task 0015)". Only touched `infra/docker-compose/nginx.conf` plus this task's own `plan.md`/`ownership.md`. Left `tasks/0004-fix-oidc-trust-policy/` (unrelated pre-existing untracked leftover) untouched as instructed. Did not touch `deploy.yml`'s path filter (the plan's optional/lower-priority item) — left alone per the plan's own guidance to err on the side of not touching it. |
| 2026-11-27 | pushed | `git push origin main` pushed three commits in one push: `0cdfa5c` (task 0014 verification note, previously held back), `368be2e` (task 0014 live-outage note, previously held back), and `9bc5df1` (this fix). `0cdfa5c..9bc5df1  main -> main`. |
| 2026-11-27 | CI/Deploy green | CI run `45977060414`: all 5 jobs (Infra, Admin Web, Mobile, Marketing Site, Backend) succeeded, watched to completion via `gh run watch --exit-status` (exit 0). Deploy run `45977060503`: "Check infra readiness" and "Deploy to pilot EC2" both succeeded (watched to completion, exit 0); this deploy recreated nginx itself (clean start either way) plus backend/admin-web/marketing-site images for this commit. |
| 2026-11-27 | **proven live** | After the deploy above completed, forced a **second** backend-only container recreation — the exact failure mode this bug causes — without any further code push, via SSM `AWS-RunShellScript` on instance `i-0d1b0c7d979b384f5` (region `ap-south-1`): `cd /opt/dating-app && docker compose -f docker-compose.pilot.yml --env-file .env.pilot up -d --force-recreate backend`. This command was **not** blocked by the permission system (unlike the earlier `restart nginx` attempt in task 0014, which was blocked as destructive). Output confirmed `dating-app-backend-1 Recreate` → `Recreated` → `Started`. Polled `http://15.206.247.148/health` six times immediately during/after the recreation: **200 every time**, no 502s. Confirmed via `docker inspect`: the recreated backend container got a **new** internal IP (`172.18.0.6`, started `2026-11-27T09:55:57Z`) — different from the stale IP (`172.18.0.5`) nginx was stuck on during the original task-0014 outage. Checked nginx's error log for `connect() failed (111: Connection refused)`: the only matches are timestamped `09:44–09:47` (the *original* pre-fix outage, already resolved by the earlier manual restart); **zero** new connection-refused entries appear after the `09:55:57` recreation, meaning nginx correctly re-resolved to the new IP without needing a manual restart this time. This is full proof the fix works, not just an assumption from a clean reload. |

## What changed (diff summary)

`infra/docker-compose/nginx.conf`: added `resolver 127.0.0.11 valid=10s;` to
both server blocks (port 80 and port 8081), and converted all three
`proxy_pass` directives from bare hostnames to the `set $var http://...;
proxy_pass $var;` form:
- `backend:8000` → `$backend_upstream`
- `marketing-site:3000` → `$marketing_site_upstream`
- `admin-web:3000` → `$admin_web_upstream`

This is the standard, well-documented nginx-in-Docker-Compose pattern: a
bare `proxy_pass http://service:port;` resolves once at config-load time
even with a `resolver` directive present elsewhere in the file; routing
through a `set` variable forces per-request resolution.

## Secondary improvement (deploy.yml path filter)

Not done. The plan marked this optional/lower-priority and said to err on
the side of leaving it alone if there's any doubt about missing a real
deploy-worthy change. Left untouched.

## Live status at completion

`http://15.206.247.148/health` → `200` (confirmed repeatedly, both right
after the main deploy and right after the forced second backend
recreation).
