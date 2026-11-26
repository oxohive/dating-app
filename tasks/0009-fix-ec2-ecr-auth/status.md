# Status: 0009-fix-ec2-ecr-auth

**State:** verifying

## History

| Date | State | Notes |
|---|---|---|
| 2026-11-26 | in-progress | IAM policy + deploy.yml ECR login added, plan/apply clean, committed (3e1d4ea), pushed to main. |
| 2026-11-26 | verifying | Deploy run 45901034923 green. `/health` verified 200 + correlation_id. The targeted ECR-auth bug is fixed and confirmed (image pulled, backend/nginx/postgres/redis containers created from the private ECR image with no auth errors). BUT a sixth, distinct, new failure surfaced on independent verification: `celery-worker` is crash-looping — `kombu.exceptions.VersionMismatch: Redis transport requires redis-py versions 6.1.0 or later. You have 5.1.1`, a dependency pin mismatch inside `services/backend/requirements.txt` (celery/kombu vs. redis-py), not an infra/ECR/deploy.yml issue. This is outside task 0009's scope (`services/**` is explicitly do-not-touch per `ownership.md`) and overlaps with task 0008's concurrent work on `services/backend/requirements.txt`. Stopping here per the plan's instruction not to guess-patch a new distinct failure. Not flipping this task, or 0003/0004/0006/0007, to `done` — the full "all 5 services running" bar is not met. |
| 2026-11-26 | verifying | **Update (task 0008 integration step):** the redis-py bump (`redis==6.1.0`) landed and was independently re-verified on the live instance — `celery-worker` now starts cleanly, connects to Redis, logs `celery@... ready.`, and stays up (checked at +1 min, no restart) — **this task's deferred blocker is fixed and confirmed**, all 5 containers are now up. Two further, previously-undiscovered bugs were found and fixed along the way: a missing `psycopg2-binary` driver (the app could never have actually used Postgres either, for a reason unrelated to ECR), and a `deploy.yml` bug where `aws s3 sync` was silently never updating `.env.pilot` on the instance on any deploy (fixed: per-file `aws s3 cp`). **Still not flipping this task (or 0003/0004/0006/0007) to `done`**: a *seventh* blocker surfaced at the very last verification step — the pilot database's schema was never actually migrated (`GET /profiles/{id}` → 500, `relation "profiles" does not exist`) — needs a human-authorized `alembic upgrade head` run against the live DB; see `tasks/0008-mvp-feature-completion/status.md` for full detail and the exact command. |

## Definition-of-done checklist

- [x] Instance role's ECR read permissions confirmed/added
- [x] ECR login step added to `deploy.yml`'s SSM script (task-0007
      hardening kept intact)
- [x] `terraform plan`/`apply` clean (1 to add, 0 changed, 0 destroyed)
- [x] Deploy re-triggered and watched to completion, green (run 45901034923)
- [x] `/health` independently confirmed reachable (200, correlation_id present)
- [x] `docker compose ps` confirms all 5 services up — **confirmed via
      task 0008's integration step**: postgres (healthy), redis, backend,
      nginx, and now `celery-worker` too (redis-py bump fixed the
      version-mismatch crash-loop; verified stable, not restarting).
- [ ] `tasks/0003`, `0004`, `0006`, `0007` closed to `done` — **still not
      done**: a seventh, distinct bug was found at the final verification
      step (pilot DB schema never migrated) — see
      `tasks/0008-mvp-feature-completion/status.md`. Containers are up,
      but the app isn't genuinely functional against the DB yet.

This task's own actual scope (ECR auth) is complete and verified, and the
celery-worker blocker it deferred is now also fixed and verified (task
0008). Not flipping to `done` yet — kept open pending the DB-migration
blocker above, which needs human authorization to apply to production.
