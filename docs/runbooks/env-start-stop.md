# Runbook: Manually Start/Stop the Pilot Environment

The pilot EC2 instance is normally started and stopped automatically by an
EventBridge-scheduled Lambda (in `lambda/`) to control cost outside expected
Chennai-pilot usage hours. Use this runbook when you need to override that
schedule — e.g. a demo outside normal hours, or taking the instance down for
maintenance.

## Option A: `workflow_dispatch` (preferred)

If a workflow is set up for manual start/stop (check
`.github/workflows/` for an `env-start-stop.yml` or similar, once the infra
task adds one):

```
gh workflow run env-start-stop.yml -f action=start
gh workflow run env-start-stop.yml -f action=stop
```

This goes through the same OIDC-authenticated path as `deploy.yml`, so no
local AWS credentials are needed, and the action is auditable in the Actions
run history.

## Option B: Direct Lambda invoke

If you need to bypass a workflow entirely (e.g. workflow not yet wired up,
or urgent manual override), invoke the control Lambda directly:

```
aws lambda invoke \
  --function-name <pilot-instance-control-lambda-name> \
  --payload '{"action": "start"}' \
  --cli-binary-format raw-in-base64-out \
  response.json
cat response.json
```

Replace `"start"` with `"stop"` to stop the instance. The Lambda name and
payload shape are defined in `lambda/` once the infra task provisions it —
confirm the exact function name and payload contract there before using this
command, since this runbook is written ahead of that infra existing.

This requires AWS CLI credentials with permission to invoke that specific
Lambda (e.g. via `aws sso login` or an assumed role) — it is a deliberate
manual escape hatch, separate from the no-static-keys rule that applies to
GitHub Actions.

## After a manual override

- If you started the instance outside its scheduled window, remember it
  will **not** auto-stop until the next scheduled stop event (or you stop it
  manually) — don't leave it running unnecessarily, since idle EC2 time is
  the main driver of the ₹5,000/month budget.
- If you stopped the instance outside its scheduled window, remember the
  next scheduled *start* event will bring it back up as normal — the
  schedule is not disabled by a manual override, only the current on/off
  state is.
- Check the AWS Budgets alarm / CloudWatch billing metrics if you're running
  an extended manual session outside the normal schedule.
