# Ownership: fix-pyjwt-dependency-conflict

Single-subtask hotfix — no parallel dispatch, no decomposition.

| Subtask | Owned paths (write access) | Do-not-touch (owned by others) |
|---|---|---|
| fix-pyjwt-dependency-conflict | `services/backend/requirements.txt`, `tasks/0014-fix-pyjwt-dependency-conflict/**` | everything else in the repo |

## Notes

This is a one-line dependency pin fix confirmed by two failed CI runs. No
other task is concurrently running against `services/backend/requirements.txt`,
so there is no overlap to check against.
