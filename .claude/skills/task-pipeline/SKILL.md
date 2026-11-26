---
name: task-pipeline
description: Enforced workflow for this repo — load and follow this BEFORE any Edit/Write, build, install, test run, or implementation work anywhere in the Dating-app monorepo; it governs how work is planned into a tasks/NNNN-slug folder, decomposed across backend/mobile/admin-web/marketing-site/infra/lambda boundaries, delegated to background agents, and verified before being marked done.
---

# task-pipeline

This skill is the enforced process for doing any implementation work in this
repository (`oxohive/dating-app`). It is not advisory — the rules below are
hard gates. If you are about to run an `Edit` or `Write` tool call that
changes a file under `services/`, `apps/`, `infra/`, `lambda/`,
`.github/workflows/`, or any other implementation path, and you have not yet
opened a task folder for that change, stop and open one first.

## 1. Open a task folder before any implementation

Before the first `Edit`/`Write` that touches implementation code (not just
planning docs), create `tasks/NNNN-slug/` where `NNNN` is the next sequential
four-digit number (look at existing `tasks/*` directories, take the highest
number, add one; start at `0001` if none exist) and `slug` is a short
kebab-case description.

That folder must contain, before work starts:

- **`plan.md`** — goal, approach, exact files/directories touched, risks,
  rollback plan. Use `.claude/skills/task-pipeline/templates/plan.md`.
- **`ownership.md`** — exact paths this task (and each of its subtasks) will
  write to. Use `.claude/skills/task-pipeline/templates/ownership.md`.
- **`status.md`** — current state, one of `planned`, `in-progress`,
  `verifying`, `done`. Use `.claude/skills/task-pipeline/templates/status.md`.
  Starts at `planned`, moves to `in-progress` once agents are dispatched.

No implementation edit happens before these three files exist and `plan.md`
has been filled in.

## 2. Decompose for parallelism along existing boundaries

Split work along this repo's real directory boundaries, not arbitrarily:

- One subtask per backend feature slice: `services/backend/packages/api/features/<name>/**`
- One subtask per frontend app: `apps/mobile/**`, `apps/admin-web/**`, `apps/marketing-site/**`
- One subtask for `infra/**`
- One subtask for `lambda/**`
- One subtask for `.github/workflows/**`
- Anything cross-cutting (shared `core/`, root docs, root config) is its own
  subtask, owned by the main/integrating thread, never bundled silently into
  a feature subtask.

**Hard rule: no two concurrently-running subtasks may claim overlapping
paths.** If two candidate subtasks would touch the same file or directory,
they are not run in parallel — either merge them into one subtask, or
sequence them (one finishes and is verified before the next starts).
`ownership.md` is where this is checked: before dispatching, diff every
subtask's claimed paths against every other concurrently-running subtask's
claimed paths. Any overlap blocks parallel dispatch.

## 3. The main thread never implements inline

The main thread's job is to plan, decompose, dispatch, and integrate — not to
write feature code itself. Every subtask is handed to a background agent
with all of the following, explicitly:

1. Its slice of `plan.md` (the part relevant to it).
2. Its exact ownership paths (from `ownership.md`) — what it may create,
   edit, and delete.
3. The other concurrently-running subtasks' "do not touch" paths, so it
   knows the boundary even if it's curious.
4. The definition of done (see below) stated in full, not paraphrased down.

## 4. Definition of done

A subtask's `status.md` may not move to `done` until all of the following
hold, verified (not assumed):

- CI (`.github/workflows/ci.yml`) is green for the change.
- Any new backend endpoint accepts/propagates `X-Correlation-ID` and emits
  structured JSON logs carrying that correlation id.
- Any new Celery task receives and propagates the correlation id from its
  caller into its own log lines.
- Any new frontend UI is component-based: one small single-responsibility
  component per file under `components/`, with screens/pages only composing
  components rather than containing their own large inline markup/logic.
- If the change is an architectural decision (new service boundary, new
  cross-cutting convention, new infra pattern), a new `docs/adr/NNNN-*.md`
  entry exists recording it.
- `plan.md`'s risk/rollback section has been updated, if needed, to match
  what was actually built (not left describing a stale plan).

Only after all of the above are independently confirmed does `status.md` move
`planned` → `in-progress` → `verifying` → `done`.

## 5. Deploy is automatic — never manual

Merging to `main` is the only deploy trigger (`.github/workflows/deploy.yml`).
Never deploy manually, never SSH into the pilot instance to push changes by
hand, never run deploy steps locally against the AWS pilot. `deploy.yml`
itself must detect missing AWS secrets/vars (e.g. a not-yet-provisioned
`AWS_DEPLOY_ROLE_ARN` or `EC2_INSTANCE_ID`) and skip its deploy steps
cleanly — exit successfully with a log line explaining why — rather than
failing the run, until the infra task has actually provisioned those values.

## 6. Verify, don't assume

Before marking any subtask done, and before building on another subtask's
output:

- Read the files that subtask actually touched — don't trust its own summary
  of what it did.
- Run the relevant check yourself (lint/test/build/`terraform validate`/etc.)
  rather than trusting a reported "tests passed."
- If a subtask stalled or only partially landed, treat its output as
  untrusted until you've audited it directly.

This applies recursively: the integrating thread verifies every subtask
before flipping the parent task's `status.md` to `done`.
