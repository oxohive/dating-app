# Plan: 0001-repo-and-ci-cd-foundation

## Goal

Stand up the initial repository skeleton for the Dating-app MVP monorepo:
the backend, mobile, admin-web/marketing-site, and infra/lambda directory
scaffolds, plus the repo-level meta content (docs, CI/CD workflows,
task-pipeline skill, README, .gitignore) that ties them together — all
before a single `git init`/commit/push, which happens as a later
integration step.

## Approach

This foundation effort is split into five parallel scaffolding subtasks plus
this integration/meta subtask, following the directory-boundary decomposition
rule in `.claude/skills/task-pipeline/SKILL.md` section 2:

1. **Backend agent** — scaffolds `services/backend/**` (FastAPI app skeleton,
   `core/` shared package, feature-slice convention scaffolding, requirements,
   initial tests/lint config).
2. **Mobile agent** — scaffolds `apps/mobile/**` (Expo/React Native app
   skeleton, component-based structure, lint/typecheck/test tooling).
3. **Web agent** — scaffolds `apps/admin-web/**` and `apps/marketing-site/**`
   (two Next.js apps, component-based structure, lint/typecheck/test
   tooling).
4. **Infra agent** — scaffolds `infra/**` (Terraform for the AWS pilot
   environment under `infra/terraform/envs/pilot`) and `lambda/**` (the
   EventBridge-triggered instance on/off Lambda).
5. **This agent (integration/meta)** — everything else: the task-pipeline
   skill (`.claude/skills/task-pipeline/**`), `docs/**`, this task folder
   (`tasks/0001-repo-and-ci-cd-foundation/**`), `.github/workflows/**`
   (`ci.yml`, `deploy.yml`), root `README.md`, root `.gitignore`, and moving
   `writing-block.md` → `docs/product-plan.md`.

All five run concurrently since their claimed paths are disjoint (see
`ownership.md`). None of the five subtasks runs `git` commands — this is not
yet a git repository. A later integration step (not part of this task) will
verify everything, run `git init`, commit, and push to
`oxohive/dating-app`, and flip this task's `status.md` to `done`.

## Files / directories touched

- `services/backend/**` — backend agent
- `apps/mobile/**` — mobile agent
- `apps/admin-web/**`, `apps/marketing-site/**` — web agent
- `infra/**`, `lambda/**` — infra agent
- `.claude/skills/task-pipeline/**` — this agent
- `docs/**` — this agent
- `tasks/0001-repo-and-ci-cd-foundation/**` — this agent
- `.github/workflows/**` — this agent
- `README.md`, `.gitignore` — this agent
- `writing-block.md` → `docs/product-plan.md` (move) — this agent

## Risks

- **CI/CD workflows reference app directories that don't exist yet at the
  time this agent writes them**, since all five subtasks run concurrently
  and this agent doesn't wait on the others. Mitigated by writing the
  workflow jobs from the documented intended shape (working directories,
  install/lint/test commands) given in this task's brief, and by `ci.yml`
  running real commands that will simply fail loudly (not silently) if a
  sibling agent's scaffold doesn't match — easy to catch in the first CI run
  after integration.
- **`deploy.yml` referencing AWS resources that don't exist yet** (no IAM
  OIDC role, no EC2 instance, no ECR repo) — mitigated by the `check-ready`
  gate job that detects missing secrets/vars and skips the deploy cleanly
  instead of failing, per `.claude/skills/task-pipeline/SKILL.md` section 5.
- **Path collisions between subtasks** — mitigated by the disjoint ownership
  split in `ownership.md`; if any subtask's agent touches a path outside its
  claim, that's caught at integration/verification time before this task is
  marked done.
- **Sibling agents still running when this plan is written** — this agent
  does not block on them; it only needs to know their *intended* shape to
  write accurate docs/workflows, not their actual committed output.

## Rollback

Since this task predates `git init`, "rollback" here means: if any of the
five subtasks' output is wrong or conflicting at integration time, the
integrating step can simply delete/rewrite the offending directory before
the first commit is ever made — there is no commit history to revert yet.
Once the later integration step performs the first `git init`+commit+push,
any subsequent rollback follows the normal
`docs/runbooks/rollback.md` process (revert commit, not force-push).
