# Ownership: 0007-fix-instance-bootstrap-and-deploy-verification

Single sequential subtask.

| Subtask | Owned paths (write access) | Do-not-touch |
|---|---|---|
| Bootstrap-fix agent | `infra/terraform/modules/ec2-app/**`, `.github/workflows/deploy.yml` (deploy job only), the live EC2 instance via SSM (hot-patch, not a repo file), `tasks/0007-fix-instance-bootstrap-and-deploy-verification/**`, `tasks/0003-pilot-live-deploy/status.md`, `tasks/0004-fix-oidc-trust-policy/status.md`, `tasks/0006-fix-ssm-document-arn/status.md` (closing out once verified) | `services/**`, `apps/**`, `infra/docker-compose/**`, `infra/terraform/modules/iam/**` (already fixed twice — do not touch again unless this task's own fix genuinely requires it), `lambda/**`, `.claude/**`, other `docs/**`, `.github/workflows/ci.yml`, other `tasks/*` (including `tasks/0005-idle-auto-shutdown/**` — still queued) |

## Notes

- Explicit gate: if `terraform plan` for the `ec2-app` module's user_data
  change shows the live instance would be replaced, STOP, do not apply, add
  `lifecycle { ignore_changes = [user_data] }` instead, and report this
  clearly rather than silently forcing a replacement of a live instance.
- Task 0005 remains queued behind this one (same `infra/terraform/envs/pilot`
  directory/state).
