# Plan: fix-pyjwt-dependency-conflict

## Goal

Wave 3 (task 0012, commit ac20d5d) added `firebase-admin==7.8.0` to
`services/backend/requirements.txt`, which requires `pyjwt>=2.15.1`, but the
file still pins `pyjwt==2.9.0`. This is a hard pip dependency conflict
(`ResolutionImpossible`), confirmed by two failed GitHub Actions runs (CI run
45971324174, Deploy run 45971324581). The backend Docker image has never
actually built since Wave 3 landed, so the live pilot instance is still
running the pre-Wave-3 image. This task bumps `pyjwt` to a compatible
version, verifies nothing downstream breaks, and gets CI/Deploy green again.

## Approach

Single-file hotfix, no decomposition needed (one line in one file, no
feature-boundary work):

1. Bump `pyjwt` to `2.15.1` in `services/backend/requirements.txt` (the
   version pip's resolver naturally picked per Wave 3's own B7 agent report).
2. Verify `pip install -r requirements.txt` resolves cleanly in a fresh venv
   (not the shared `.venv`).
3. Audit `import jwt` / pyjwt usage in `features/auth/` for API breakage
   between 2.9.0 and 2.15.1.
4. Run full backend `pytest` suite against the updated requirements.
5. Run `docker build` for the backend Dockerfile to reproduce the exact CI
   failure path and confirm it now succeeds.
6. Commit just the `requirements.txt` change, push to `main`.
7. Watch the resulting CI and Deploy GitHub Actions runs to completion.
8. Verify the live pilot instance (15.206.247.148) is running the new image
   (not just `/health` returning 200 — check the actual container image
   tag/digest via SSM).

## Files / directories touched

- `services/backend/requirements.txt` (the fix itself)
- `tasks/0014-fix-pyjwt-dependency-conflict/*` (plan/ownership/status docs)

## Risks (as actually built)

- pyjwt 2.9.0 -> 2.15.1: audited against PyJWT's changelog for that range.
  No change to `jwt.encode`/`jwt.decode`/`jwt.PyJWTError`/`jwt.InvalidTokenError`
  signatures or removal of either exception class. The only user-visible
  effect is a new `InsecureKeyLengthWarning` (added in 2.11.0) on HMAC keys
  under 32 bytes, which the test suite's short JWT secret now triggers as a
  warning (not a failure) — confirmed via the full pytest run (245 passed).
- **Confirmed, not hypothetical:** the fresh-venv resolve did fail twice more
  beyond pyjwt, exactly as this risk anticipated. `firebase-admin==7.8.0`
  requires `httpx==0.28.1` exactly (file had `httpx==0.27.2`), and once that
  was fixed, `google-api-core` (pulled in transitively by firebase-admin)
  required `opentelemetry-api>=1.44.0` (file had `opentelemetry-api==1.27.0`,
  with `opentelemetry-sdk==1.27.0` pinned to match it). Both were bumped to
  the versions pip's resolver naturally picked when the pins were relaxed:
  `httpx==0.28.1`, `opentelemetry-api==1.45.2`, `opentelemetry-sdk==1.45.2`.
  A final from-scratch install with all pins back in place (no relaxed
  ranges) succeeded cleanly. No code in this repo calls httpx or
  opentelemetry-api directly with APIs affected by the jump (checked both
  changelogs), and the full test suite plus a Docker build both pass.
- Docker build could diverge from local venv resolution (different base
  image, different cached layers). Mitigated by running `docker build`
  directly against `services/backend/deploy/Dockerfile` — it succeeded, and
  the resulting image was run to confirm `packages.api.main` imports
  correctly.

## Rollback

If the bump breaks auth in production: revert the single-line
`requirements.txt` change in a follow-up commit (`pyjwt==2.9.0` is no longer
viable once firebase-admin 7.8.0 is in the file, so a true rollback would
also need to pin firebase-admin back to a pre-7.8.0 version, or pin pyjwt to
the lowest version satisfying both constraints). Revert commit via
`git revert <sha>` and push; CI/Deploy will redeploy the previous image.
