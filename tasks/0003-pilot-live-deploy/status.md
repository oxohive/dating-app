# Status: 0003-pilot-live-deploy

**State:** in-progress

## Definition-of-done checklist

- [x] `docker-compose.pilot.yml` + `nginx.conf` authored under `infra/docker-compose/`
- [x] DB password generated and stored in SSM (not committed anywhere) —
      `/dating-app/pilot/db_password`, `SecureString`, verified present via
      `aws ssm get-parameter` (value not displayed/logged)
- [x] `deploy.yml` deploy job extended to render `.env.pilot`, upload deploy
      assets to S3, and sync them onto the instance before `compose up` —
      also fixed a pre-existing bug found while reviewing the job: the
      "Build and push" step ran `docker build .` with no `-f`, but the
      Dockerfile lives at `services/backend/deploy/Dockerfile`, not
      `services/backend/Dockerfile` (never caught before because `ci.yml`
      never builds the image). Added `-f deploy/Dockerfile`.
- [x] IAM policy addition applied (`terraform apply`) granting the deploy
      role `ssm:GetParameter` on the db password param and the instance role
      `s3:GetObject`/`s3:ListBucket` on the artifacts bucket's `deploy/*`
      prefix — plan showed exactly `2 to add, 0 to change, 0 to destroy`,
      applied cleanly.
- [ ] All pending local commits + this task's commits pushed to `main`
- [ ] The resulting Actions `Deploy` run watched to completion and green
- [ ] `/health` confirmed reachable on the instance's public IP from outside
- [ ] `docker compose ps` on the instance confirms postgres/redis/backend/
      celery-worker/nginx all up
- [ ] `docs/runbooks/deploy.md` updated to reflect how deploy assets actually
      reach the instance now (S3 sync, not git)

Moves to `done` only once every box above is independently verified.
