# Ownership: 0002-aws-pilot-infra

Single sequential subtask — no parallel dispatch for this task (see
`plan.md` approach section for why: every step hard-depends on the previous
step's real-world output, so parallelizing would race against incomplete
state).

| Subtask | Owned paths (write access) | Do-not-touch |
|---|---|---|
| Infra-provisioning agent | `infra/terraform/envs/pilot/**` (backend config, ECR resource, tfvars — tfvars stay untracked/local), `tasks/0002-aws-pilot-infra/**`, real AWS resources in account 767398004313 / region `ap-south-1`, GitHub repo secrets/variables on `oxohive/dating-app` | `services/backend/**`, `apps/**`, `infra/terraform/modules/**` (no module logic changes — only the `envs/pilot` composition layer), `lambda/**`, `.github/workflows/**` (reads `check-ready`'s expected secret/var names, does not edit the workflow file), `.claude/**`, `docs/**` (except reading), root files, any other `tasks/*` folder |

## Notes

- This agent must NOT run `terraform apply`/`plan` with anything other than
  `infra/terraform/envs/pilot` as the working directory, and must not touch
  any other AWS account or region.
- This agent must NOT modify `.github/workflows/deploy.yml` — it only reads
  it to learn the exact secret/variable names the `check-ready` job expects,
  then sets those same names via `gh secret set` / `gh variable set`.
- If any step requires touching a path outside this table, stop and report
  rather than proceeding.
