# Status: <task-slug>

**Current state:** planned <!-- one of: planned | in-progress | verifying | done -->

## History

| Date | State | Notes |
|---|---|---|
| | planned | |

## Definition-of-done checklist

<!-- Copy from .claude/skills/task-pipeline/SKILL.md section 4; check off
     only after independently verifying, not on a subtask's say-so. -->

- [ ] CI (`ci.yml`) green
- [ ] New/changed backend endpoints propagate `X-Correlation-ID` and emit structured JSON logs
- [ ] New/changed Celery tasks propagate correlation id from caller
- [ ] New frontend UI is component-based (one responsibility per file under `components/`)
- [ ] `docs/adr/` entry added if this was an architectural decision
- [ ] `plan.md` risk/rollback section matches what was actually built
