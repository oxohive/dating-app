# Plan: 0005-idle-auto-shutdown

## Goal

Add activity-based (not just fixed-schedule) cost optimization to the pilot
EC2 instance: if it sits idle for ~15-30 minutes, stop it automatically;
when something tries to use it again, start it back up on demand. This is
additional to (not a replacement for) the fixed-schedule start/stop from
task 0001/0002 (`infra/terraform/modules/env-scheduler`) — the schedule is
the outer bound (e.g. always off overnight), this is the finer-grained
saver during on-hours.

## Approach

Single sequential agent (same reasoning as prior infra tasks — the alarm,
the Lambda, and the IAM wiring all compose into one Terraform apply).

1. **Auto-stop on idle**: a CloudWatch Alarm on the instance's
   `CPUUtilization` (Average, 5-minute periods, ~4 evaluation periods ≈ 20
   minutes — a reasonable middle of the user's "15 to 30 minutes" ask,
   configurable via a tfvar), threshold low (e.g. <5%), treating missing
   data as not-breaching. Alarm action targets the **existing**
   `lambda/env-stop` function directly (CloudWatch alarms can invoke a
   Lambda ARN directly as an action — no new SNS topic needed), with the
   matching `aws_lambda_permission` so CloudWatch is allowed to invoke it.
   Reuses infra already built; no change to `lambda/env-stop/handler.py`
   itself needed (it's already an idempotent stop-if-running function).
2. **Wake on demand**: a new small Lambda (`lambda/env-wake/handler.py`)
   behind a Lambda Function URL (cheapest option — no API Gateway needed).
   It checks the instance state; if stopped, calls `ec2:StartInstances`
   (idempotent) and returns a small HTML page ("Starting the app — this
   takes about a minute, this page will retry automatically") with a
   meta-refresh; if already running, redirects to the instance's current
   public IP. Protect it from random internet abuse with a simple shared
   secret (query param checked against an SSM SecureString value) rather
   than leaving it fully open — starting an instance repeatedly isn't
   dangerous but shouldn't be free-for-all public either.
3. Wire both into `infra/terraform/envs/pilot/main.tf` (composition layer;
   the alarm + permission can live there directly, or as a small addition
   to the existing `cloudwatch`/`env-scheduler` modules if that's a cleaner
   fit — use judgment, but don't rewrite unrelated module internals).
4. `terraform plan` (expect only additions — new alarm, new Lambda + role +
   permission + function URL, new SSM parameter — nothing modified or
   destroyed on existing resources) then `terraform apply`.
5. Verify: alarm exists and is in `OK`/`INSUFFICIENT_DATA` state (not
   `ALARM` — the instance is actively serving traffic right after task
   0003/0004's verification, so this is expected); the wake Lambda's
   "already running" code path works end-to-end via its Function URL
   (don't force-stop the live, just-verified instance purely to test the
   other path — verify the "instance is stopped → start it" path via a
   mocked unit test instead, same pattern as the existing env-start/env-stop
   Lambda tests).
6. Update `docs/runbooks/env-start-stop.md` to describe both mechanisms
   together (fixed schedule = outer bound, idle alarm = inner optimization,
   wake Function URL = how to bring it back without waiting for the
   schedule) and give the actual wake URL + how the shared secret is
   obtained/rotated.
7. Commit and push.

## Files / directories touched

- `lambda/env-wake/**` (new)
- `infra/terraform/envs/pilot/main.tf` (additive: alarm, wake Lambda infra,
  SSM parameter) — or minimal additive changes inside
  `infra/terraform/modules/cloudwatch` / `env-scheduler` if that's the
  better-fit location; no unrelated edits to either module
- `docs/runbooks/env-start-stop.md`
- `tasks/0005-idle-auto-shutdown/**`

## Risks

- **False-positive idle detection** (e.g. a long-lived low-CPU connection
  mistaken for idle) — acceptable, documented heuristic limitation for a
  pilot; not solved with ALB/request-count metrics here since there's no
  load balancer in front of this single instance.
- **Wake endpoint abuse** — mitigated by the shared-secret check; starting
  an already-running instance is a harmless no-op regardless.
- **No stable DNS/domain exists yet for the pilot**, so the wake page
  redirects to the instance's current public IP (which can change across
  stop/start without an Elastic IP) rather than a fixed hostname — note
  this as a known limitation, not something to over-engineer here.

## Post-build note (what actually happened)

Built as planned, with two things worth recording that weren't anticipated:

- **Function URL public-invoke permission needed two statements, not
  one.** `authorization_type = "NONE"` alone doesn't make a Function URL
  publicly invocable — AWS requires an explicit resource-based permission
  for `lambda:InvokeFunctionUrl`, **and** (confirmed live against this
  account) a *second* permission for `lambda:InvokeFunction`, or every
  request 403s before the handler ever runs. The installed `hashicorp/aws`
  provider (`~> 5.0`) doesn't expose the `InvokedViaFunctionUrl` condition
  key AWS recommends for scoping that second grant, so it's unconditioned
  (any AWS principal could call Invoke directly, bypassing the URL) — an
  accepted risk, not an oversight, since the actual gate is the app-level
  shared-secret check inside `lambda/env-wake/handler.py`, enforced on
  every invocation regardless of path. See the comments above
  `aws_lambda_permission.allow_public_invoke_function_env_wake` in
  `infra/terraform/envs/pilot/main.tf` for the full reasoning.
- **The idle alarm fired for real during this task**, naturally (the pilot
  instance was genuinely idle after prior tasks' verification work ended),
  invoking the real `env-stop` Lambda and stopping the real instance —
  confirmed via CloudTrail. This wasn't forced; it's the mechanism working
  exactly as designed, and it happened to give a stronger live proof of
  the whole pipeline than the planned verification asked for. The `env-wake`
  Function URL was then used (also live) to bring the instance back up,
  verifying both the "stopped → start" and "running → redirect" code paths
  against real AWS, not just the mocked unit tests.
- **The idle alarm re-fired almost immediately after that wake**, which
  would have defeated the whole wake-on-demand feature. Root cause,
  confirmed via the alarm's own `evaluatedDatapoints` in the CloudWatch
  Logs trigger payload: with `treat_missing_data = "notBreaching"`,
  CloudWatch looks *back past* a gap in the metric to find enough real
  datapoints to fill `evaluation_periods`, rather than only ever comparing
  the most recent consecutive window. It filled its 4-period window with
  3 stale pre-stop datapoints plus 1 fresh one, not 4 fresh post-wake
  ones, and re-triggered within ~2 minutes of the wake. Fixed by changing
  `treat_missing_data` to `"missing"` (a 1-attribute, in-place Terraform
  change, applied after discovering this live), which holds the alarm's
  current state through a data gap instead of substituting a value and
  searching backward for it — re-triggering after a wake now requires
  genuinely fresh, consecutive low-CPU periods. Verified: woke the
  instance again after the fix and it stayed up.

## Rollback

Delete the alarm/Lambda/permission/SSM parameter via `terraform destroy
-target` on just those resources; the rest of the pilot stack is
unaffected.
