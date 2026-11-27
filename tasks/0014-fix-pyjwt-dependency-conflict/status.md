# Status: fix-pyjwt-dependency-conflict

**Current state:** done (dependency fix itself) — **but see live-outage note below, needs a human**

## History

| Date | State | Notes |
|---|---|---|
| 2026-11-27 | planned | Task opened to fix pyjwt/firebase-admin ResolutionImpossible conflict from Wave 3 (task 0012). |
| 2026-11-27 | in-progress | Starting implementation: bump pyjwt, verify clean resolve, audit usage, run tests, docker build, commit/push, watch CI/Deploy. |
| 2026-11-27 | verifying | Local verification complete: clean pip install (fresh Python 3.12 venv, no relaxed pins), pyjwt 2.9.0->2.15.1 API-surface audit clean (no breaking changes to jwt.encode/decode/PyJWTError/InvalidTokenError in that range per PyJWT changelog), 245/245 pytest passed, ruff clean, docker build succeeded and image imports app correctly. Discovered and fixed two additional latent conflicts beyond pyjwt that also block a clean resolve: httpx (firebase-admin 7.8.0 requires httpx==0.28.1 exactly, file had 0.27.2) and opentelemetry-api/sdk (google-api-core, pulled in transitively by firebase-admin, requires opentelemetry-api>=1.44.0, file had ==1.27.0). Bumped both to the versions pip's resolver naturally picked (httpx==0.28.1, opentelemetry-api/sdk==1.45.2). About to commit and push, then watch CI/Deploy. |
| 2026-11-27 | done | Committed as 663ff348a153df362632b74cf68d40d7a1cf3f85, pushed to main. CI run 45974786895 green (Backend CI, Mobile CI, Admin Web CI, Marketing Site CI, Infra CI all passed). Deploy run 45974787420 green ("Build and push backend image" step — previously the exact failure point — succeeded, SSM deploy command Status=Success). Verified on the live pilot instance (15.206.247.148) via SSM `docker ps`: backend, celery-worker, admin-web, and marketing-site containers are all running image tag `663ff348a153df362632b74cf68d40d7a1cf3f85`, matching this commit's SHA exactly (not just /health returning 200, though it does: `{"status":"ok", ...}`). |
| 2026-11-27 | outage-found | A second, doc-only commit (0cdfa5c9117066f107732fc3055b84a6905c5779, recording this same verification above) was pushed to update this status.md. Because `deploy.yml` has no path filter, that push triggered a second full Deploy run (45975579737), which also went green per `gh run watch`/`gh run view`. That redeploy recreated the `backend` container (new internal IP) but left the long-running `nginx` container untouched. nginx's `proxy_pass http://backend:8000` resolves the `backend` hostname once at nginx's own process startup and does not re-resolve afterward, so nginx is still connecting to the backend container's *previous* IP and now returns 502 on every request (confirmed via SSM: backend's own logs show it healthy and listening; nginx's logs show `connect() failed (111: Connection refused)` to the stale IP). This is a pre-existing infra bug (nginx config has no `resolver` + variable-based `proxy_pass`, so it can't survive a backend-only redeploy without a manual nginx restart) that this task did not introduce, but this task's second push triggered the redeploy that exposed it. **A command to fix it (`docker compose -f docker-compose.pilot.yml --env-file .env.pilot restart nginx` on the instance, via SSM) was attempted and blocked by the permission system as a destructive/production-mutating action — needs a human to approve and run it, or to fix `infra/docker-compose/nginx.conf` to re-resolve dynamically (resolver + variable in proxy_pass) so this can't recur on every future backend-only deploy.** As of this writing, `curl http://15.206.247.148/health` returns 502, not 200 — the pilot is down until this is addressed. |

## Definition-of-done checklist

- [x] CI (`ci.yml`) green
- [x] New/changed backend endpoints propagate `X-Correlation-ID` and emit structured JSON logs (N/A — no endpoint change)
- [x] New/changed Celery tasks propagate correlation id from caller (N/A — no Celery change)
- [x] New frontend UI is component-based (N/A — no frontend change)
- [x] `docs/adr/` entry added if this was an architectural decision (N/A — dependency version bump, not an architectural decision)
- [x] `plan.md` risk/rollback section matches what was actually built
- [ ] **NOT DONE: live pilot `/health` currently returns 502 (nginx stale-upstream-IP issue — see outage-found entry above). Needs human action before this task can be considered fully closed.**
