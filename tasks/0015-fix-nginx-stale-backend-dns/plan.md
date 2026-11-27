# Plan: 0015-fix-nginx-stale-backend-dns

## Goal

Fix a real production-reliability bug discovered live just now: nginx's
`proxy_pass http://backend:8000;` in `infra/docker-compose/nginx.conf`
resolves the `backend` hostname once at nginx's own process startup and
caches it forever. When a deploy recreates only the `backend` container
(not `nginx`) — which is exactly what every normal backend-only deploy
does — Docker assigns the new container a new internal IP, nginx keeps
routing to the old, now-dead IP, and every request 502s until someone
manually restarts nginx. This just caused a real outage (task 0014's
second push triggered a redeploy that hit this; fixed manually via an
SSM nginx restart, but the underlying bug is still there and will recur
on the next backend-only deploy).

## Fix

In `infra/docker-compose/nginx.conf`, replace the static `proxy_pass`
with a `resolver`-based dynamic one so nginx re-resolves the `backend`
hostname against Docker's embedded DNS (127.0.0.11) on a short TTL
instead of caching it once at startup:

```
resolver 127.0.0.11 valid=10s;
set $backend_upstream http://backend:8000;
proxy_pass $backend_upstream;
```

(Using a `set` variable forces nginx to resolve at request time instead
of config-load time — a bare `proxy_pass http://backend:8000;` resolves
once even with a `resolver` directive present; this is the standard,
well-documented pattern for this exact problem.) Apply the same fix to
any other `proxy_pass` in this file pointing at a Docker Compose service
name (check for `admin-web`/`marketing-site` upstreams added by task
0013 — they have the identical bug, just not yet exposed since they
haven't been through a backend-only redeploy cycle).

## Verification (must actually prove the fix, not just that nginx reloads)

1. Deploy this change normally (push to `main`, let CI/CD apply it) —
   this itself recreates `nginx`, so it starts clean either way; the
   real test is the *next* deploy after that.
2. Trigger a second, backend-only-affecting deploy (or manually
   `docker compose restart backend` via SSM after confirming that's not
   itself blocked — if it's blocked by the permission system like the
   previous nginx restart was, that's fine, note it and rely on the
   next real CI/CD-triggered deploy as the proving event instead) and
   confirm nginx continues serving `/health` as 200 throughout, instead
   of 502ing the way it just did.
3. If you cannot safely force a second backend recreation yourself,
   clearly document in `status.md` that the fix is applied and
   config-correct (cite the well-established nginx resolver pattern)
   but hasn't yet been proven against a live second redeploy — don't
   claim verified-live if it wasn't actually exercised.

## Secondary improvement (optional, lower priority)

`deploy.yml` has no path filter — any push to `main`, including a
docs-only `status.md` commit, triggers a full redeploy. Consider adding
a path filter (e.g. skip deploy for changes confined to `tasks/**`,
`docs/**`, `*.md`) so routine status-file commits don't force
unnecessary container recreation. Do this only if it doesn't risk
missing a real deploy-worthy change — err on the side of leaving it
alone if there's any doubt, since the nginx fix above is the actual
must-fix.

## Rollback

Revert the nginx.conf change; the previous static `proxy_pass` behavior
resumes (with its known bug).
