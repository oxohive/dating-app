# Status: 0018-mobile-dynamic-wake-discovery

**State:** dispatched

## Definition-of-done checklist

- [x] Infra: JSON mode added to env-wake Lambda, existing tests still
      green, new tests for JSON branch
- [x] Infra: `aws_eip.pilot` removed, `terraform plan` confirmed clean
      before apply, applied; new (ephemeral) IP noted here
- [x] Infra: runbook docs updated; mobile static-IP config checked
- [ ] Mobile: wake-check flow built (startup gate + mid-session
      recovery), polished waking-up UI, tests green
- [ ] Final cross-check: both sides agree on the JSON contract as
      actually implemented (not just as planned)
- [ ] Committed and pushed

Moves to `done` only once every box above is independently verified.

## Infra subtask notes (completed)

**JSON mode:** added to `lambda/env-wake/handler.py`, triggered by either
an `Accept: application/json` header or `?format=json`, exactly per the
contract pinned in `plan.md`:
- running + public IP: `200 {"state": "running", "base_url": "http://<ip>"}`
- running w/o public IP yet, or stopped (StartInstances still called), or
  transitional (`pending`/`stopping`/`shutting-down`):
  `200 {"state": "starting", "retry_after_seconds": 5}`
- terminated/unrecoverable: `500 {"state": "error", "message": "..."}`
- bad/missing secret: `403 {"state": "forbidden"}`

Existing HTML/redirect branches are untouched (same status codes, same
pages); JSON mode reuses the same `_describe_instance`/state-checking
logic, branching only at the response-building step. `Content-Type` is
`application/json` for these responses vs. `text/html; charset=utf-8` for
the existing HTML ones.

Tests: `python -m pytest lambda/tests/test_env_wake.py -q` →
**21 passed** (8 original, unchanged, still green + 13 new covering all
four JSON states, both trigger mechanisms, the no-trigger/HTML-unchanged
case, and that JSON mode makes identical AWS calls to HTML mode). Full
`lambda/tests/` suite: **29 passed**.

**Terraform:** `terraform plan` in `infra/terraform/envs/pilot` showed
exactly one destroy (`aws_eip.pilot`) plus one expected in-place update
to `aws_lambda_function.env_wake` (new source hash from the handler.py
JSON-mode change, deploying the new code in the same apply) — nothing
else. Applied cleanly: `Apply complete! Resources: 0 added, 1 changed, 1
destroyed.` Removed the `static_public_ip` output; `marketing_site_url` /
`admin_web_url` / `instance_public_ip` now read from
`module.ec2_app.public_ip` (the instance's own dynamic IP) instead of the
EIP, with descriptions updated to note they're no longer stable across
stop/start.

**New IP after EIP removal:** at apply time the pilot instance was
already **stopped** (idle auto-stop, unrelated to this change — confirmed
via `aws ec2 describe-instances`, state `stopped`, `PublicIpAddress`
`null`). A stopped instance has no public IP regardless of the EIP, so
there is no new concrete IP to record yet. Per the plan's explicit
guidance not to force a live wake purely to test this, the live wake
Lambda was not invoked to force one now (the sandbox session's AWS
credentials also could not reach the live SSM secret anyway —
`ParameterNotFound`/decrypt-permission boundary, separate from Terraform's
own credentials). The next time the instance starts — scheduled start,
idle-alarm recovery, or a manual wake — it will receive a fresh ephemeral
public IP, retrievable via `terraform output instance_public_ip`,
`aws ec2 describe-instances`, or the wake Lambda's own JSON `base_url`.
This is expected post-EIP-removal behavior, not a defect.

**Runbook (`docs/runbooks/env-start-stop.md`):** replaced the
static-IP-specific section with the JSON-mode contract table, an
explanation that the env-wake Lambda Function URL is now the only stable
address, and an explicit warning that bare-IP bookmarks go stale after
any stop/start.

**`apps/mobile` check:** searched for the literal static IP
(`15.206.247.148`) and for `API_BASE_URL`/`apiUrl` patterns across
`apps/mobile/**`, including root-level `app.json` (no `eas.json` present
in this repo). No hardcoded static IP found anywhere in `apps/mobile`.
`apps/mobile/src/core/config.ts` already reads
`process.env.EXPO_PUBLIC_API_BASE_URL` with a `localhost` dev fallback —
no static-IP literal to remove. Nothing touched in `apps/mobile/**`; left
entirely to the mobile subtask.

**Out-of-scope finding, flagged but not fixed:** `.github/workflows/deploy.yml`
hardcodes `ADMIN_WEB_PUBLIC_API_BASE_URL: http://15.206.247.148` (admin-web's
build-time public API base URL). This is neither in the infra subtask's
owned paths nor in `apps/mobile`, so it was deliberately left untouched —
but it **will go stale** the next time the pilot instance stops/starts,
since that value is no longer a stable Elastic IP. admin-web has no
dynamic-discovery mechanism analogous to the mobile app's; this is a
genuine follow-up gap, not part of this task's scope. Flagged in the
runbook too (see "App URLs" section).
