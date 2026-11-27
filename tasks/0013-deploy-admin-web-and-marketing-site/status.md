# Status: 0013-deploy-admin-web-and-marketing-site

**State:** done

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
- [x] Verified live: marketing-site root page and admin-web page both
      return real HTML, backend API routes unaffected — see verification
      results below.
- [x] Docs updated with new URLs (`docs/runbooks/env-start-stop.md`, new
      "App URLs (task 0013)" section).
- [x] Committed and pushed to `main`.

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
6. Committed and pushed to `main`, triggering the real CI/CD deploy.
7. Verified the live deploy (URLs, HTTP status/content, backend API
   unaffected, `docker stats` memory numbers) — see below.

## Live URLs

- Marketing site: `http://15.206.247.148/`
- Admin web: `http://15.206.247.148:8081/`
- Backend API (unchanged): `http://15.206.247.148/health`, etc.

## Verification results

See final report delivered alongside this commit for exact HTTP
status/content checks and `docker stats` memory numbers from the live
instance.
