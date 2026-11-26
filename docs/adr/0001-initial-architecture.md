# ADR 0001: Initial Architecture for the Dating-app MVP

## Status

Accepted

## Context

We are building a dating app MVP for a focused, 3-week build, targeting a
Chennai pilot before any broader rollout. The full product and business
vision is documented in `docs/product-plan.md`; this ADR records the
architectural decisions made to deliver the MVP slice of that plan cheaply,
quickly, and in a way that's safe to iterate on.

Constraints driving these decisions:

- Small team, short timeline (3 weeks) for the initial slice.
- Cost-sensitive pilot: infrastructure spend needs a hard ceiling.
- MVP scope is deliberately narrow (auth/OTP, onboarding, profiles,
  city-based discovery, swipe/likes/quota, matching, basic messaging,
  block/report, minimal admin) — payments, GPS/Premium nearby, verification,
  and compatibility scoring are explicitly deferred.
- Need for the codebase to stay navigable as multiple people/agents work on
  different features concurrently.
- No long-lived cloud credentials should live in GitHub.

## Decision

1. **Monorepo under `oxohive/dating-app`, private visibility.** Backend,
   mobile, admin-web, marketing-site, infra, and lambda code all live in one
   repository so a single PR can span a full vertical change when needed,
   and so CI/CD can reason about the whole system at once. The repo is
   private because it contains business and infrastructure details not
   meant for public visibility during the pilot.

2. **MVP focused-slice scope.** We build only the MVP feature list above for
   the initial pilot. Payments, GPS/Premium nearby discovery, profile
   verification, and compatibility scoring are deferred — they exist in
   `docs/product-plan.md` as real future work, not abandoned scope.

3. **Feature-sliced backend convention.** The FastAPI backend organizes code
   as one directory per feature under
   `services/backend/packages/api/features/<name>/`, each with its own
   `routes/service/schemas/validation/models/utils`, plus a shared `core/`
   for config, logging, correlation-id middleware, tracing, and the database
   layer. This keeps features independently reviewable and lets multiple
   contributors (or agents) work on different features without constant
   merge conflicts.

4. **Component-based frontend convention.** All three frontend apps
   (mobile/Expo RN, admin-web/Next.js, marketing-site/Next.js) require one
   small, single-responsibility component per file under `components/`;
   screens and pages only compose components. This keeps UI code reviewable
   and testable as it grows past the MVP.

5. **Single-EC2 AWS pilot with scheduled auto start/stop.** The pilot runs
   Nginx, FastAPI, PostgreSQL/PostGIS, Redis, and Celery on one EC2
   `t3.medium` in `ap-south-1`, managed by Docker Compose, with S3 for media,
   SES for email, and CloudWatch for monitoring. An EventBridge-scheduled
   Lambda starts and stops the instance automatically to control cost
   outside expected usage hours, with a manual override path. This is an
   explicit single-point-of-failure trade-off, accepted because the pilot's
   purpose is validating demand in one city, not serving production-scale
   traffic.

6. **OIDC-based deploy, no static AWS keys.** `deploy.yml` authenticates to
   AWS using GitHub's OIDC provider and an assumed IAM role
   (`aws-actions/configure-aws-credentials` with `role-to-assume`). No AWS
   access key/secret pair is stored as a GitHub secret.

7. **₹5,000/month AWS Budgets alarm.** A Budgets alarm at ₹5,000/month gives
   an early warning on cost overrun, consistent with the pilot cost estimate
   in `docs/product-plan.md` section 10.

8. **task-pipeline skill as the enforced workflow.** All implementation work
   in this repo must go through the process defined in
   `.claude/skills/task-pipeline/SKILL.md`: open a `tasks/NNNN-slug/` folder
   with `plan.md`/`ownership.md`/`status.md` before implementing, decompose
   along the directory boundaries above, delegate each slice to a background
   agent with explicit ownership and a definition of done, and verify before
   marking anything done. This is how the conventions in this ADR are kept
   enforced rather than aspirational as the codebase grows.

## Consequences

- Positive: features can be built and reviewed independently; the pilot's
  AWS bill is capped and bounded by design; deploy credentials can't leak
  because none exist as long-lived secrets; the task-pipeline skill gives
  every future change a consistent paper trail (plan, ownership, status).
- Positive: because deploy is OIDC-gated and infra-aware
  (`deploy.yml` skips cleanly when secrets/vars are missing), this
  foundation can be merged and iterated on before the AWS infra task
  (`tasks/0002-aws-pilot-infra` or equivalent) actually exists.
- Negative: the single-EC2 pilot has no high availability — an instance
  failure takes down the API, database, and cache together. Mitigated by
  backups and the rollback/incident runbooks, not by redundancy, until usage
  justifies Stage 2 of the scaling plan in `docs/product-plan.md` section 12.
- Negative: the feature-sliced backend and component-based frontend
  conventions add some upfront structure/boilerplate per feature compared to
  a quick flat script, in exchange for parallel-safe ownership boundaries.
- Negative: enforcing the task-pipeline workflow adds process overhead to
  small changes; accepted because the alternative (ad hoc concurrent edits
  across a monorepo) is more expensive to untangle than the overhead it adds.
