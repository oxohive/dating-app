# Ownership: <task-slug>

List every concurrently-running subtask and the exact paths it may write to.
No two rows may overlap while running in parallel — if they do, merge the
rows into one subtask or sequence them instead.

| Subtask | Owned paths (write access) | Do-not-touch (owned by others) |
|---|---|---|
| <subtask-name> | `path/**` | everything else listed in this table |
| | | |

## Notes

<!-- Call out anything ambiguous: shared files that need sequencing instead
     of parallel ownership, read-only dependencies between subtasks, etc. -->
