# Ownership: 0017-polish-wake-up-page

Single sequential agent — small, self-contained visual change to one
Lambda's HTML templates plus its Terraform-managed deploy.

| Owned paths |
|---|
| `lambda/env-wake/**` |
| `infra/terraform/envs/pilot/**` (only if the Lambda's Terraform resource needs a `terraform apply` to push updated code — check first, no unrelated changes) |
| `tasks/0017-polish-wake-up-page/**` |

No overlap with any other in-flight work this session.
