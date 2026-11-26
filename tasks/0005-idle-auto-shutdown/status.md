# Status: 0005-idle-auto-shutdown

**State:** done

## Definition-of-done checklist

- [x] CloudWatch idle alarm created, targeting the existing `env-stop`
      Lambda directly, with the matching invoke permission
      (`aws_cloudwatch_metric_alarm.idle_auto_stop` +
      `aws_lambda_permission.allow_cloudwatch_alarm_invoke_env_stop` in
      `infra/terraform/envs/pilot/main.tf`). `env-stop`'s handler itself
      was not modified.
- [x] `env-wake` Lambda authored, tested (mocked — 9 new unit tests in
      `lambda/tests/test_env_wake.py`, all 17 lambda/tests tests pass),
      deployed behind a Function URL
      (`https://yv2yfc7fvipbrfhru4miygaix40ozzvj.lambda-url.ap-south-1.on.aws/`)
- [x] Shared-secret protection in place for the wake endpoint; secret is a
      Terraform-managed `random_password` stored as an SSM SecureString
      at `/dating-app/pilot/env_wake_shared_secret`, rotatable via
      `terraform apply -replace=random_password.env_wake_secret`
- [x] `terraform plan` showed additions only across all 4 applies this
      task made (8 + 1 + 1 + 1 resources added, 0 changed, 0 destroyed
      total); every `terraform apply` succeeded
- [x] Alarm confirmed **not** `ALARM` post-apply — observed `OK` and
      `INSUFFICIENT_DATA` at different points; it also genuinely fired
      once during this task (naturally idle instance, not forced) and
      was confirmed back at `OK` after the instance was woken via the
      wake Lambda — see report for the full sequence
- [x] `docs/runbooks/env-start-stop.md` updated to describe the fixed
      schedule + idle-alarm + wake-URL together, including how to fetch
      the current URL/secret and how to rotate the secret
- [x] Committed and pushed

All boxes verified directly (live AWS checks, CloudTrail, CloudWatch Logs,
unit tests) — see the handback report for the full account of what was
built, the live verification sequence (including an unplanned but
successfully self-healed real idle-stop event), and the two Function-URL
permission bugs found and fixed along the way.
