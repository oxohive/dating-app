# Runbook: Incident Response

## First steps

1. **Establish scope.** Is this one user's request failing, or everything?
   Check CloudWatch dashboards/alarms first for an obvious signal (CPU/disk
   saturation, error rate spike, instance status check failure).

2. **Check CloudWatch logs filtered by `correlation_id`.** Every request
   carries an `X-Correlation-ID` that's propagated into structured JSON logs
   and into any Celery task it triggers (see
   `docs/architecture/overview.md`). If you have a specific failing request
   (from a user report, a client-side error, or an API error response),
   get its correlation id and filter CloudWatch Logs Insights by it:

   ```
   fields @timestamp, level, message, correlation_id
   | filter correlation_id = "<the-id>"
   | sort @timestamp asc
   ```

   This gives the full causal chain for that one request across the API
   process and any background Celery task it enqueued, which is almost
   always the fastest way to find where things actually broke.

3. **If there's no specific correlation id yet** (e.g. a general "the app is
   down" report), check for a spike in error-level log lines across all
   requests in the relevant time window first, then pick representative
   correlation ids from that spike to drill into.

4. **Check instance health** directly: CPU, memory, disk, DB connection
   count (see `docs/architecture/overview.md` → Observability). A single-EC2
   pilot (see `docs/adr/0001-initial-architecture.md`) means resource
   exhaustion on that one box can look like an application bug when it's
   actually infra pressure.

5. **Check whether this follows a recent deploy.** Compare the incident
   start time against the latest `deploy.yml` run. If they correlate,
   go straight to `docs/runbooks/rollback.md` rather than debugging forward
   under pressure.

## While mitigating

- Prefer rollback (see `docs/runbooks/rollback.md`) over a rushed hotfix if
  a recent deploy is implicated and you're not confident in a fast forward
  fix.
- Do not SSH in and manually patch running containers — see the rollback
  runbook for why; any live fix should still go through a commit + CI +
  the normal deploy pipeline unless the instance itself needs to be
  stopped/restarted (see `docs/runbooks/env-start-stop.md`) as an immediate
  stop-the-bleeding step.
- If the instance needs a full restart, note that this is a single point of
  failure by design during the pilot (ADR 0001) — a restart will cause a
  brief full outage, which is the accepted trade-off, not a surprise.

## After the incident

- Record what happened, the correlation id(s) involved, root cause, and
  fix, somewhere durable (a `tasks/NNNN-slug/` entry if the fix is
  substantial work, otherwise at minimum a note in the relevant PR).
- If the root cause reveals a gap in monitoring/alerting, file that as
  follow-up work rather than letting it recur silently.
- If the incident required a rollback, confirm the forward-fix PR
  (per `docs/runbooks/rollback.md` step 3) actually lands before closing
  the incident out.
