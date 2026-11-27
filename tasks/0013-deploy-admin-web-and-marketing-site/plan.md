# Plan: 0013-deploy-admin-web-and-marketing-site

## Goal

Admin-web and marketing-site have been fully built and pass CI since
earlier waves, but neither has ever actually been deployed anywhere —
the pilot's `docker-compose.pilot.yml` only runs
`postgres`/`redis`/`backend`/`celery-worker`/`nginx`. The user asked
directly to see a UI; this task makes both apps real, browser-viewable
URLs on the existing pilot instance, at zero additional AWS resource
cost (same EC2 instance, same nginx, just two more containers + two more
server blocks).

## Approach

Single sequential agent (same reasoning as prior deploy-pipeline fixes —
Dockerfiles, compose wiring, nginx routing, and the CI/CD build/push steps
all compose into one coherent change).

1. **Dockerfiles**: add a production Dockerfile for `apps/admin-web`
   (Next.js standalone output, same general shape as whatever
   `deploy/Dockerfile` already does for the backend — check it first for
   conventions like non-root user, multi-stage build) and one for
   `apps/marketing-site`. Next.js apps should use `output: "standalone"`
   in `next.config.js` if not already set, to keep the image small.
2. **docker-compose.pilot.yml**: add `admin-web` and `marketing-site`
   services, each built from their new Dockerfile, exposing their
   internal port (Next.js default 3000 — use distinct internal
   container ports or rely on Docker's internal network + nginx
   upstream naming, whichever is cleaner) to the compose network only
   (not directly to the host) — nginx remains the single public entry
   point, consistent with the existing architecture.
3. **nginx.conf**: add server blocks/location routing so:
   - the existing API traffic keeps working exactly as before (don't
     break current routing to `backend`)
   - marketing-site is reachable at the instance's root path (`/`) —
     it's the public-facing site, most natural at root
   - admin-web is reachable at a distinct path prefix (e.g. `/admin/`)
     or a distinct port (e.g. `:8081`) — pick whichever is simpler given
     Next.js App Router's basePath requirements (if using a path
     prefix, admin-web's `next.config.js` needs `basePath: "/admin"` set
     to match, or its internal links/assets will 404 — verify this
     works, don't just assume). A distinct port avoids the basePath
     complexity entirely and may be the pragmatic choice for a pilot —
     use your judgment, but whichever you choose must actually work when
     tested, not just look right in config.
   - the existing API's current routing (what path prefix does the
     backend currently answer on — check nginx.conf as it exists today)
     must not shift or break.
4. **CI/CD** (`.github/workflows/deploy.yml`): add build+push steps for
   the two new images to ECR (two new ECR repositories needed — check
   whether Terraform manages ECR repo creation, e.g.
   `infra/terraform/envs/pilot/main.tf`'s existing `aws_ecr_repository`
   for the backend, and add matching ones for `admin-web` and
   `marketing-site` the same way), and extend the SSM deploy script step
   to `docker login`+pull+restart these two services alongside the
   backend. Follow the exact hardening already present for the backend's
   deploy step (the `set -e` + explicit Status check from task 0007,
   the `docker login` step from task 0009) — don't regress those fixes.
5. **Env/config**: admin-web and marketing-site need to know the
   backend's actual API base URL at build or runtime — check how mobile
   currently configures its API base URL (likely an env var) and apply
   the equivalent pattern; since this is all on one instance behind one
   nginx, the backend is reachable at a stable internal address
   (`http://backend:8000` on the Docker network) — prefer that over the
   public IP for server-side calls, and use the public static IP
   (`15.206.247.148`, from task 0011) only for anything that must resolve
   client-side in the browser.
6. **Security group / Terraform**: if you choose the distinct-port
   approach for admin-web, check whether the pilot's security group
   (`infra/terraform/modules/ec2-app/**` or wherever it's defined)
   already allows that port inbound; if not, add the minimal rule needed
   (same `Terraform only, no manual console changes` convention as every
   other infra task this session). If you choose the path-prefix
   approach instead, no security-group change is needed (everything
   stays on nginx's existing port 80).
7. Apply Terraform changes if any were needed, deploy via the normal
   pipeline (push to `main` triggers the existing CI/CD), then verify:
   `curl`/fetch marketing-site's root page and admin-web's page, confirm
   both return real HTML (not nginx's default 502/404), confirm the
   existing backend API routes still work unchanged.
8. Update `docs/runbooks/env-start-stop.md` (or wherever the static
   IP/URL is documented from task 0011) with the new URLs for marketing-
   site and admin-web.
9. Commit and push.

## Files / directories touched

- New: `apps/admin-web/Dockerfile`, `apps/marketing-site/Dockerfile` (or
  wherever `deploy/Dockerfile` for the backend actually lives — mirror
  that location's convention)
- `infra/docker-compose/docker-compose.pilot.yml`
- `infra/docker-compose/nginx.conf` (or wherever nginx config lives)
- `.github/workflows/deploy.yml`
- Possibly `infra/terraform/envs/pilot/main.tf` (new ECR repos, security
  group rule if distinct-port approach is chosen)
- `docs/runbooks/env-start-stop.md`
- `tasks/0013-deploy-admin-web-and-marketing-site/**`

## Risks

- **Admin-web is an internal tool with real admin actions (refund,
  suspend, verification review)** — it must NOT be left publicly
  reachable without its own auth in front of nginx too. Check: does
  admin-web already enforce its own login/auth at the application layer
  (it should, from Wave 1 — `features/auth` on admin-web) before being
  satisfied that nginx-level exposure is acceptable. If admin-web's own
  auth is solid, nginx just needs to route to it, not add a second auth
  layer — but verify this assumption rather than asserting it.
- **t3.medium resource limits**: adding two more Node.js containers to
  an instance already running Postgres/Redis/FastAPI/Celery/nginx could
  strain the 4GB RAM pilot instance. Use Next.js standalone output
  (small runtime footprint) and check actual memory usage after deploy
  (`docker stats` via SSM) rather than assuming it fits — flag clearly if
  the instance looks memory-constrained, don't silently let it OOM.
- **basePath pitfalls**: if choosing the path-prefix nginx approach,
  Next.js asset/API routes under a basePath are a common source of
  broken-looking pages (CSS/JS 404s) if not configured consistently on
  both the nginx and Next.js sides — test by actually loading the page
  in a way that surfaces asset-loading errors (check response status
  codes for `/_next/static/...` paths), not just that `/` or `/admin/`
  itself returns 200.

## Rollback

Revert the compose/nginx/deploy.yml changes in a single commit; the
previously-working backend-only deployment resumes exactly as before,
since nothing about the existing backend/postgres/redis/celery routing
is being removed, only added to.
