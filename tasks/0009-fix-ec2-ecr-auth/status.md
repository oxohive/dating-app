# Status: 0009-fix-ec2-ecr-auth

**State:** verifying

## History

| Date | State | Notes |
|---|---|---|
| 2026-11-26 | in-progress | IAM policy + deploy.yml ECR login added, plan/apply clean, committed (3e1d4ea), pushed to main. |
| 2026-11-26 | verifying | Deploy run 45901034923 green. `/health` verified 200 + correlation_id. The targeted ECR-auth bug is fixed and confirmed (image pulled, backend/nginx/postgres/redis containers created from the private ECR image with no auth errors). BUT a sixth, distinct, new failure surfaced on independent verification: `celery-worker` is crash-looping — `kombu.exceptions.VersionMismatch: Redis transport requires redis-py versions 6.1.0 or later. You have 5.1.1`, a dependency pin mismatch inside `services/backend/requirements.txt` (celery/kombu vs. redis-py), not an infra/ECR/deploy.yml issue. This is outside task 0009's scope (`services/**` is explicitly do-not-touch per `ownership.md`) and overlaps with task 0008's concurrent work on `services/backend/requirements.txt`. Stopping here per the plan's instruction not to guess-patch a new distinct failure. Not flipping this task, or 0003/0004/0006/0007, to `done` — the full "all 5 services running" bar is not met. |

## Definition-of-done checklist

- [x] Instance role's ECR read permissions confirmed/added
- [x] ECR login step added to `deploy.yml`'s SSM script (task-0007
      hardening kept intact)
- [x] `terraform plan`/`apply` clean (1 to add, 0 changed, 0 destroyed)
- [x] Deploy re-triggered and watched to completion, green (run 45901034923)
- [x] `/health` independently confirmed reachable (200, correlation_id present)
- [ ] `docker compose ps` confirms all 5 services up — **4/5 up**
      (postgres healthy, redis up, backend up, nginx up); `celery-worker` is
      crash-looping on a `redis-py`/`kombu` version mismatch unrelated to
      ECR auth — a new, sixth, distinct bug, out of this task's scope
      (`services/backend/requirements.txt`).
- [ ] `tasks/0003`, `0004`, `0006`, `0007` closed to `done` — **not done**,
      blocked on the item above per the plan's explicit instruction to stop
      and report rather than guess-patch a new distinct failure.

Moves to `done` only once every box above is independently verified. The
ECR-auth fix itself (this task's actual scope) is complete and verified;
the task stays open pending a separate fix for the celery-worker
`redis-py` version bug (likely belongs to task 0008 or a new task, since it
is a `services/backend` dependency issue, not infra/deploy).
