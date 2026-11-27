# Status: fix-pyjwt-dependency-conflict

**Current state:** in-progress

## History

| Date | State | Notes |
|---|---|---|
| 2026-11-27 | planned | Task opened to fix pyjwt/firebase-admin ResolutionImpossible conflict from Wave 3 (task 0012). |
| 2026-11-27 | in-progress | Starting implementation: bump pyjwt, verify clean resolve, audit usage, run tests, docker build, commit/push, watch CI/Deploy. |
| 2026-11-27 | verifying | Local verification complete: clean pip install (fresh Python 3.12 venv, no relaxed pins), pyjwt 2.9.0->2.15.1 API-surface audit clean (no breaking changes to jwt.encode/decode/PyJWTError/InvalidTokenError in that range per PyJWT changelog), 245/245 pytest passed, ruff clean, docker build succeeded and image imports app correctly. Discovered and fixed two additional latent conflicts beyond pyjwt that also block a clean resolve: httpx (firebase-admin 7.8.0 requires httpx==0.28.1 exactly, file had 0.27.2) and opentelemetry-api/sdk (google-api-core, pulled in transitively by firebase-admin, requires opentelemetry-api>=1.44.0, file had ==1.27.0). Bumped both to the versions pip's resolver naturally picked (httpx==0.28.1, opentelemetry-api/sdk==1.45.2). About to commit and push, then watch CI/Deploy.

## Definition-of-done checklist

- [ ] CI (`ci.yml`) green
- [ ] New/changed backend endpoints propagate `X-Correlation-ID` and emit structured JSON logs (N/A — no endpoint change)
- [ ] New/changed Celery tasks propagate correlation id from caller (N/A — no Celery change)
- [ ] New frontend UI is component-based (N/A — no frontend change)
- [ ] `docs/adr/` entry added if this was an architectural decision (N/A — dependency version bump, not an architectural decision)
- [ ] `plan.md` risk/rollback section matches what was actually built
