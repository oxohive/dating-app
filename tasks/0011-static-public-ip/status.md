# Status: 0011-static-public-ip

**State:** done

## Result

- **Static public IP (Elastic IP):** `15.206.247.148`
- Allocation: `eipalloc-00e0b92c8a2c36afd`, association:
  `eipassoc-0f386cfbd3518f922`, associated with `i-0d1b0c7d979b384f5`
  (`aws_eip.pilot` in `infra/terraform/envs/pilot/main.tf`).
- Terraform output: `static_public_ip`.

## `terraform apply` summary

```
Plan: 1 to add, 0 to change, 0 to destroy.
  + aws_eip.pilot
Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
```

No other resource (notably not `aws_instance.app`) was modified or
destroyed, as expected for a routine additive EIP association on an
already-running instance.

## Verification performed

1. `terraform plan`/`apply` in `infra/terraform/envs/pilot/` — exactly one
   resource added (`aws_eip.pilot`), nothing else touched.
2. `aws ec2 describe-addresses` confirmed the EIP is associated with
   `i-0d1b0c7d979b384f5`.
3. The pilot instance happened to already be stopped (idle auto-stop) when
   this was checked — confirmed the EIP's `PublicIp` stayed
   `15.206.247.148` while stopped, then started the instance
   (`aws ec2 start-instances`) and confirmed, after it reached `running`,
   that the public IP was still the same `15.206.247.148` — i.e. the
   address survived a real stop/start cycle, not just inferred from state.
4. `curl http://15.206.247.148/health` → `200 OK`, confirmed from inside
   the instance (via SSM `AWS-RunShellScript`, both `localhost` and via
   the EIP) and externally.

## Definition-of-done checklist

- [x] `aws_eip` added to Terraform, applied (associated via the `instance`
      attribute directly on `aws_eip.pilot`; no separate
      `aws_eip_association` resource needed)
- [x] `/health` verified 200 against the new static IP
- [x] Docs/runbook updated with the new static IP
      (`docs/runbooks/env-start-stop.md`)
- [x] Committed and pushed

## Notes on cost tradeoff

As documented in `plan.md`: the EIP is free while associated with the
*running* instance, and incurs a small idle fee (~USD 0.005/hr) while the
instance is stopped (which happens daily via the existing idle-auto-stop /
scheduled-stop mechanisms from tasks 0002/0005). This is a small, accepted
recurring cost in exchange for a stable pilot URL.

## Files not changed (checked, no functional change needed)

- `lambda/env-wake/handler.py` — already looks up
  `instance.get("PublicIpAddress")` dynamically from `describe_instances`
  on every invocation; with the EIP attached this now simply returns the
  same constant `15.206.247.148` every time. No code change required.
  (Its docstring/comments still say "no Elastic IP" in a couple of places —
  left as-is per instructions not to churn working code; the user-facing
  doc, `docs/runbooks/env-start-stop.md`, is the one that was updated.)
- `.github/workflows/deploy.yml` — no dynamic public-IP lookup/display
  logic found; nothing to update.
