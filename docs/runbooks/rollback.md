# Runbook: Rollback a Bad Deploy

## When to use this

The service on the pilot EC2 instance is unhealthy after a deploy (errors
spiking, health checks failing, obviously wrong behavior) and you need to
get back to a known-good state quickly.

## Steps

1. **Confirm it's the deploy, not infra.** Check CloudWatch for CPU/disk/
   memory exhaustion or an instance-level problem first (see
   `docs/runbooks/incident-response.md`). If the instance itself is
   unhealthy, that's a different runbook than a bad code deploy.

2. **Identify the last known-good commit on `main`.**
   `git log main` (or the GitHub Actions run history for `deploy.yml`) to
   find the most recent commit that deployed successfully and was healthy.

3. **Revert forward, don't force-push.** Create a revert commit:
   ```
   git revert <bad-commit-sha>
   ```
   Open a PR, get it through CI (`ci.yml`), merge to `main`. This re-triggers
   `deploy.yml` normally — it builds and pushes the previous good image and
   restarts the Compose stack via the same SSM path as any other deploy.
   Rollback uses the exact same automatic pipeline as forward deploys; there
   is no separate manual rollback mechanism, by design, so the rollback path
   is exercised and tested the same way deploys are.

4. **If you need to roll back immediately and can't wait on a PR/CI cycle,**
   trigger `workflow_dispatch` on `deploy.yml` from the last known-good
   commit/tag (via the Actions UI, or `gh workflow run deploy.yml --ref <good-sha-or-tag>`
   if the workflow supports ref selection). Still go back and open the
   revert PR afterward so `main` reflects reality.

5. **After rollback, confirm health**: check the API responds, check
   CloudWatch error rates return to baseline, check the specific
   correlation id(s) from the incident no longer recur.

6. **Do not** manually edit containers on the instance via SSH to "patch
   around" a bad deploy. Any fix goes through a commit, CI, and the normal
   deploy pipeline — otherwise the running instance state silently diverges
   from `main` and the next automatic deploy can reintroduce the bug or
   conflict with the manual patch.

## Database migrations

If the bad deploy included a database migration that already ran:

- A pure code revert will not undo an applied migration.
- Write and merge a new down-migration / corrective migration rather than
  trying to manually run SQL against the pilot database by hand.
- This should be rare in the MVP given the small schema surface, but treat
  any migration rollback as its own careful, reviewed change, not a
  same-incident hotfix.
