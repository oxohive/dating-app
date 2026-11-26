# Ownership: 0001-repo-and-ci-cd-foundation

Five concurrently-running subtasks, disjoint paths — no row below overlaps
with another while running in parallel.

| Subtask | Owned paths (write access) | Do-not-touch (owned by others) |
|---|---|---|
| Backend agent | `services/backend/**` | `apps/**`, `infra/**`, `lambda/**`, `.github/**`, `docs/**`, `tasks/**`, `.claude/**`, root files |
| Mobile agent | `apps/mobile/**` | `services/backend/**`, `apps/admin-web/**`, `apps/marketing-site/**`, `infra/**`, `lambda/**`, `.github/**`, `docs/**`, `tasks/**`, `.claude/**`, root files |
| Web agent | `apps/admin-web/**`, `apps/marketing-site/**` | `services/backend/**`, `apps/mobile/**`, `infra/**`, `lambda/**`, `.github/**`, `docs/**`, `tasks/**`, `.claude/**`, root files |
| Infra agent | `infra/**`, `lambda/**` | `services/backend/**`, `apps/**`, `.github/**`, `docs/**`, `tasks/**`, `.claude/**`, root files |
| This agent (integration/meta) | `.claude/skills/task-pipeline/**`, `docs/**`, `tasks/0001-repo-and-ci-cd-foundation/**`, `.github/workflows/**`, `README.md`, `.gitignore`, move `writing-block.md` → `docs/product-plan.md` | `services/backend/**`, `apps/**`, `infra/**`, `lambda/**` |

## Notes

- `writing-block.md` is a root file but its disposition (move to
  `docs/product-plan.md`, then delete) is explicitly carved out to this
  agent; no other subtask touches root files at all.
- None of the five subtasks runs any `git` command. This is not yet a git
  repository; a later, separate integration step owns `git init`/commit/push
  and flipping this task's `status.md` to `done`.
- This agent does not wait on or verify the other four subtasks' actual
  output before writing CI/CD workflows and docs — it writes them against
  the *intended* shape given in the task brief. Verifying all five landed
  correctly and matching reality is explicitly deferred to the later
  integration step, not this task.
