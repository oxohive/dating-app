# Ownership: 0006-fix-ssm-document-arn

Single small sequential subtask.

| Subtask | Owned paths (write access) | Do-not-touch |
|---|---|---|
| SSM-ARN fix agent | `infra/terraform/modules/iam/main.tf` (`SsmSendCommandDocument`/related resource-ARN statements only), `tasks/0006-fix-ssm-document-arn/**`, `tasks/0003-pilot-live-deploy/status.md`, `tasks/0004-fix-oidc-trust-policy/status.md` (closing out once verified) | Everything else: `services/**`, `apps/**`, `infra/docker-compose/**`, `infra/terraform/modules/iam/main.tf`'s trust-policy (`gha_assume`) block (already fixed by task 0004 — do not touch again unless this fix genuinely requires it), `lambda/**`, `.claude/**`, `docs/**` (except reading), `.github/workflows/**`, other `tasks/*` (including `tasks/0005-idle-auto-shutdown/**` — queued, not yet dispatched) |

## Notes

- This is the second follow-up fix in the same deploy chain as 0002→0003→
  0004; same authorization to apply/push/re-trigger deploy already extends
  here.
- Task 0005 is queued behind this one specifically because both touch
  `infra/terraform/envs/pilot` — do not run concurrently with it.
