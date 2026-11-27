# Plan: 0011-static-public-ip

## Goal

Give the pilot EC2 instance a stable, static public IP (AWS Elastic IP)
instead of the current ephemeral public IP that changes every time the
instance stops/starts. The user asked directly for a stable public URL.

## Cost tradeoff (explicitly accepted by the user's request)

An Elastic IP is free while associated with a *running* instance, but AWS
charges a small idle fee (~USD 0.005/hr, ~USD 3.60/month if stopped
continuously) whenever it's associated with a stopped instance. Since the
idle-auto-shutdown feature (task 0005) stops this instance for a real
fraction of each day, this adds a small (likely USD 1-4/month) recurring
cost on top of the existing ~USD 55/month budget. Worth it for a stable
URL; not worth re-litigating further than noting it here.

## Approach

Single sequential agent (same reasoning as prior infra tasks — allocation +
association + output wiring compose into one Terraform apply).

1. Add `aws_eip` resource (domain = "vpc") in
   `infra/terraform/envs/pilot/main.tf` (or the `ec2-app` module if that's
   a cleaner fit — use judgment, consistent with how task 0005 placed its
   alarm/Lambda resources), associated with the existing
   `aws_instance.app` (`i-0d1b0c7d979b384f5`) via `aws_eip_association` or
   the `instance` attribute directly.
2. Add a Terraform output for the new static IP.
3. `terraform plan` — expect exactly one new EIP + one association,
   nothing else modified/destroyed (re-associating a public IP onto an
   already-running instance does not replace or restart it).
4. `terraform apply`.
5. Update anything that referenced the old ephemeral-IP behavior:
   - `docs/runbooks/env-start-stop.md` — the wake Lambda's "already
     running" redirect and the "IP changes across stop/start" caveat are
     now stale; update to describe the static IP instead.
   - `lambda/env-wake/handler.py` — currently looks up the instance's
     current public IP dynamically on every invocation; this still works
     correctly with an EIP (describes the same, now-constant, address), so
     no functional change is required, but simplify/comment if it reduces
     confusion. Don't rewrite working logic for its own sake.
   - Check `.github/workflows/deploy.yml` for any dynamic IP lookup used
     only for display/logging purposes — no functional change needed
     there either (SSM-based deploy doesn't depend on the public IP at
     all), but note the new static IP in any deploy-summary output if one
     already exists.
6. Verify: `curl` the new static IP's `/health` endpoint, confirm 200.
   Confirm the IP survives a stop/start cycle by checking the Terraform
   state's `aws_eip.pilot.public_ip` stays constant — do not actually
   force a stop/start just to test this (the idle alarm will naturally do
   so later; verifying via Terraform state + AWS API is sufficient).
7. Record the new static IP prominently in this task's `status.md` and in
   `docs/runbooks/env-start-stop.md` so it's easy to find later.
8. Commit and push.

## Files / directories touched

- `infra/terraform/envs/pilot/main.tf` (or `infra/terraform/modules/ec2-app/**`
  if better-fit — no unrelated edits either way)
- `docs/runbooks/env-start-stop.md`
- `tasks/0011-static-public-ip/**`

## Risks

- None significant — EIP association on a running instance is a
  routine, non-disruptive, fully reversible AWS operation (Terraform
  tracks it as additive; destroying it just releases the address back to
  AWS's pool).

## Rollback

`terraform destroy -target=aws_eip.pilot` (and its association) releases
the address; the instance reverts to AWS's standard ephemeral public IP
behavior.
