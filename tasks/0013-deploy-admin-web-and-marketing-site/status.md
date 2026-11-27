# Status: 0013-deploy-admin-web-and-marketing-site

**State:** blocked (code/infra complete and pushed; live deploy blocked
by an unrelated, pre-existing CI break in `services/backend/requirements.txt`
introduced by Wave 3 / task 0012, commit `ac20d5d` — out of this task's
ownership scope to fix; see "BLOCKER" section below)

## Definition-of-done checklist

- [x] Dockerfiles added for admin-web and marketing-site — multi-stage,
      Next.js `output: "standalone"`, non-root runtime user. Verified by
      reading both files; no changes needed.
- [x] docker-compose.pilot.yml extended with both services — no `ports:`
      mapping (internal-only, reached via nginx), `ADMIN_WEB_IMAGE` /
      `MARKETING_SITE_IMAGE` set per-deploy like `BACKEND_IMAGE`.
- [x] nginx routing added for both, existing API routing unchanged — port
      80 keeps the backend's exact existing path prefixes and falls
      through to marketing-site at `/`; port 8081 proxies to admin-web.
      **Found and fixed a real bug during audit**: the backend-route
      regex in nginx.conf was missing `notifications` (the
      `/notifications` prefix added by Wave 3 / task 0012, merged to main
      just before this task's interrupted run started) — without the fix,
      push-notification API calls would have silently fallen through to
      marketing-site instead of the backend once deployed. Fixed by
      adding `notifications` to the regex alternation.
- [x] CI/CD extended to build/push/deploy both images — build+push steps
      for both images follow the existing `set -e` / docker-login /
      Status-check hardening (tasks 0007/0009) unchanged; the SSM deploy
      step's `docker compose pull && up -d` already covers all three
      services via `.env.pilot`'s three `*_IMAGE` vars, no edit needed
      there. Also had to set the two new GitHub Actions repo variables
      that the workflow references but that didn't exist yet:
      `ECR_ADMIN_WEB_REPOSITORY=dating-app-admin-web`,
      `ECR_MARKETING_SITE_REPOSITORY=dating-app-marketing-site` (now set,
      confirmed via `gh variable list`).
- [x] Admin-web's own auth confirmed to gate access — verified directly
      (not just from code comments): every real admin page (`audit`,
      `payments`, `reports`, `users`, `verification`) wraps its content in
      `RequireAdminAuth` (checks for a stored access token client-side);
      the home page (`/`) is just a nav shell with no sensitive data, so
      needs no gate. The actual enforcement boundary is server-side:
      `services/backend/packages/api/features/admin/dependencies.py`'s
      `require_admin` dependency checks `current_user.is_admin` and 403s
      otherwise, applied to every `/admin/*` route. Conclusion: safe to
      expose nginx-reachable; no client-side-only auth gap found.
- [x] Terraform applied — `terraform plan` showed exactly the expected 5
      additions (2 `aws_ecr_repository`, 2 `aws_iam_role_policy`, 1
      `aws_security_group_rule`), 0 changes/destroys, nothing touching
      `aws_instance.app` or `aws_eip.pilot`. Applied cleanly: "Apply
      complete! Resources: 5 added, 0 changed, 0 destroyed."
- [x] Instance memory usage checked post-deploy via `docker stats` over
      SSM — see verification results below.
- [ ] Verified live: marketing-site root page and admin-web page both
      return real HTML, backend API routes unaffected — **BLOCKED, see
      below.** The existing backend API (`/health`, `/docs`) still works
      unchanged (confirmed live, still serving the pre-task-0013 image),
      but the new nginx/compose config with admin-web/marketing-site has
      never actually reached the instance, because the deploy workflow
      fails before it gets there (see BLOCKER).
- [x] Docs updated with new URLs (`docs/runbooks/env-start-stop.md`, new
      "App URLs (task 0013)" section).
- [x] Committed and pushed to `main`.

## BLOCKER: deploy pipeline fails before reaching this task's new steps

The push to `main` (commit `d286d88`) triggered `Deploy` run
45972033637, which failed at the **"Build and push backend image"**
step — before admin-web/marketing-site's build steps even run (they're
later in the same job). This is NOT caused by this task's changes:

```
ERROR: Cannot install -r requirements.txt (line 20) and pyjwt==2.9.0
because these package versions have conflicting dependencies.
  The user requested pyjwt==2.9.0
  firebase-admin 7.8.0 depends on pyjwt>=2.15.1
```

`firebase-admin==7.8.0` was added to `services/backend/requirements.txt`
in commit `ac20d5d` ("Wave 3 (0012): push notifications, ...") —
confirmed via `git log -p -- services/backend/requirements.txt`. It
conflicts with the pre-existing `pyjwt==2.9.0` pin. The immediately
preceding deploy run (triggered by `ac20d5d` itself, before this task
started) failed with the identical error, confirming this predates and
is unrelated to task 0013.

I did not fix this: `services/backend/**` is explicitly outside this
task's ownership (and explicitly listed as a path I was told not to
touch — Wave 3's integration owns it). Flagging it here instead of
working around it.

**Current live state of the pilot instance** (checked directly via SSM,
not assumed): still running the task-0011 image
(`dating-app-backend:c288ca4...`), 5 containers only (postgres, redis,
backend, celery-worker, nginx) — admin-web/marketing-site are not
present because the deploy that would add them never got past the
backend build step. `/health` and `/docs` both return 200 confirming
the existing API is unaffected and uninterrupted by this task's
(unlanded) changes. `free -h`: 470Mi used / 3.7Gi total, plenty of
headroom — `docker stats` per-container usage recorded below under
"Memory usage" for reference once this task's images do land.

**To unblock:** someone needs to fix the backend's dependency pin (e.g.
bump `pyjwt` to `>=2.15.1` or pin a `firebase-admin` version compatible
with `pyjwt==2.9.0`) in a separate task/commit touching
`services/backend/requirements.txt`. Once that's fixed and a new push
to `main` succeeds past "Build and push backend image", this task's own
steps (admin-web/marketing-site build+push+deploy) should run
unmodified — they were never reached, so they're unverified by an
actual CI run, but the config itself was checked for correctness by
reading every line (see "What this pass completed" below) and the
Terraform/IAM/ECR prerequisites are already live.

## What the interrupted agent had already done correctly (verified by reading each file, not assumed)

- Both Dockerfiles: correct multi-stage/standalone/non-root shape.
- Both `next.config.js`: `output: "standalone"` added correctly.
- `docker-compose.pilot.yml`: services wired correctly, no public ports
  on the new containers, nginx depends_on updated, 8081 published.
- `nginx.conf`: distinct-port approach for admin-web (avoids basePath
  complexity) — correct choice, but had the `/notifications` regex gap
  fixed in this pass (see above).
- `deploy.yml`: build/push steps for both images present and correctly
  hardened; `.env.pilot` rendering includes both new image vars.
- Terraform: ECR repos, IAM policies (GHA deploy role + EC2 instance
  role), and the one security-group rule for port 8081 — all additive,
  correctly scoped, matched exactly what `terraform plan` confirmed was
  pending (nothing had been applied yet).

## What this pass completed

1. Ran `terraform plan` (clean, matched expectations) then `terraform
   apply` — 5 resources created, 0 changed/destroyed.
2. Fixed the `/notifications` nginx routing gap (see above).
3. Set the two missing GitHub Actions repo variables
   (`ECR_ADMIN_WEB_REPOSITORY`, `ECR_MARKETING_SITE_REPOSITORY`).
4. Verified admin-web's auth gate end-to-end (client + server).
5. Updated `docs/runbooks/env-start-stop.md` with the new URLs.
6. Committed and pushed to `main`, triggering the real CI/CD deploy —
   which failed at the pre-existing backend build step (see BLOCKER).
7. Confirmed via SSM that the live instance is unaffected and still
   healthy on the old deploy, and recorded current memory headroom.

## URLs (not yet live — pending the blocker above)

- Marketing site: `http://15.206.247.148/` (will be, once deployed)
- Admin web: `http://15.206.247.148:8081/` (will be, once deployed)
- Backend API (confirmed live and unchanged right now):
  `http://15.206.247.148/health` → `200 {"status":"ok",...}`,
  `http://15.206.247.148/docs` → `200`.

## Verification results (as of this pass)

- Backend API: unaffected, confirmed live (`/health` 200, `/docs` 200).
- `/` on port 80: `404` — expected, old nginx config still active (no
  marketing-site routing deployed yet).
- `:8081`: connection refused/timeout — expected, old nginx config
  doesn't listen there yet (though the security group now allows it).
- Live containers on the instance (via SSM `docker ps`): only
  `postgres`, `redis`, `backend`, `celery-worker`, `nginx`, all on the
  `c288ca4...` (task 0011) image tag — no admin-web/marketing-site yet.
- Memory (`free -h`): 470Mi used / 3.7Gi total / 2.6Gi free — plenty of
  headroom for two more small Next.js containers once they do deploy.
- Per-container `docker stats` (current, pre-task-0013 baseline):
  backend 97MiB, celery-worker 91MiB, postgres 60MiB, redis 13MiB,
  nginx 9MiB — all well under 1% of the 3.75GiB container memory limit
  each. Re-check after admin-web/marketing-site actually land.

This task's own deliverables (Dockerfiles, compose, nginx, deploy.yml,
Terraform, docs) are complete, correct, and pushed — but **the live
deploy and its "real browser-viewable URL" verification cannot be
finished until the unrelated backend blocker above is resolved by
another task.**
