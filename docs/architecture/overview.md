# Architecture Overview

This document is the technical architecture summary for the Dating-app MVP.
For the full original product and business plan — market positioning,
pricing experiments, validation programme, roadmap, and business metrics —
see [`docs/product-plan.md`](../product-plan.md). This document covers only
how the system is built and operated during the initial 3-week focused-slice
build and the Chennai pilot.

## Positioning and scope

The product is a dating and social-discovery app launching as a tightly
scoped MVP for a Chennai pilot before any wider rollout. The MVP intentionally
excludes payments, GPS/Premium nearby discovery, identity verification, and
compatibility scoring — all deferred to later phases per
`docs/product-plan.md`. The MVP slice is:

- Authentication via OTP.
- Onboarding.
- Profiles.
- City-based (not GPS-based) location and discovery.
- Swipe-based discovery with a daily like quota.
- Mutual matching.
- Basic text messaging.
- Block and report.
- A minimal admin surface.

Everything else in the product plan is real future scope, not abandoned —
it is simply out of this slice.

## Repository shape

This is a single monorepo, `oxohive/dating-app` (private), containing:

- `services/backend/` — the FastAPI backend.
- `apps/mobile/` — the Expo/React Native mobile app.
- `apps/admin-web/` — the Next.js admin dashboard.
- `apps/marketing-site/` — the Next.js public marketing site.
- `infra/` — Terraform for the AWS pilot environment.
- `lambda/` — the EventBridge-triggered Lambda(s) for instance auto on/off.
- `.github/workflows/` — CI and deploy automation.
- `docs/` — this documentation set.
- `tasks/` — the task-pipeline work log (see below).

## Backend conventions

The backend is a **vertical-slice-per-feature** FastAPI application. Each
feature owns its own directory under
`services/backend/packages/api/features/<name>/` with:

- `routes.py` — HTTP route handlers for the feature.
- `service.py` — business logic.
- `schemas.py` — Pydantic request/response models.
- `validation.py` — feature-specific validation rules.
- `models.py` — SQLAlchemy models owned by the feature.
- `utils.py` — feature-local helpers.

Cross-cutting concerns live in a shared `core/` package: configuration,
structured logging, the correlation-id middleware, tracing, and the database
session/engine setup. Features depend on `core/`; `core/` never depends back
on a feature.

### Correlation IDs

Every inbound request carries (or is assigned) an `X-Correlation-ID` header.
Middleware in `core/` reads or generates this id, attaches it to the request
context, and ensures:

- Every structured JSON log line emitted while handling that request
  includes the correlation id.
- When a request enqueues a Celery task, the correlation id is passed into
  the task's arguments/headers so the task's own log lines carry the same id
  through to completion.

This is what makes it possible to trace one user action end-to-end across
the API process and any background workers it triggered, which is the
primary tool used during incident response (see
`docs/runbooks/incident-response.md`).

## Frontend conventions

All three frontend apps (`apps/mobile`, `apps/admin-web`,
`apps/marketing-site`) follow the same rule: **strictly component-based**
UI. Each component is small, single-responsibility, and lives in its own
file under a `components/` directory. Screens (mobile) and pages
(admin-web/marketing-site) do not contain significant inline markup or
business logic themselves — they compose already-defined components. This
keeps feature review, reuse, and testing tractable as the UI grows past the
MVP slice.

## AWS pilot design

The pilot runs on a deliberately minimal, single-instance footprint to keep
cost predictable during validation:

- One EC2 `t3.medium` in `ap-south-1` (Mumbai), running Nginx, FastAPI,
  PostgreSQL/PostGIS, Redis, and Celery workers, all orchestrated by Docker
  Compose.
- Amazon S3 for media storage (private buckets, signed URLs).
- Amazon SES for transactional email.
- Amazon CloudWatch for logs, metrics, and billing/operational alarms.
- Amazon Cognito is planned for a later phase of authentication; OTP auth in
  the MVP does not depend on it yet.

### Cost control: scheduled auto on/off

Because a single EC2 instance billed 24/7 is the dominant pilot cost, an
EventBridge schedule invokes a Lambda (`lambda/`) that starts and stops the
instance on a fixed daily window appropriate for the Chennai pilot's expected
usage hours. This can be overridden manually (see
`docs/runbooks/env-start-stop.md`) without touching the schedule itself.

An AWS Budgets alarm is configured at **₹5,000/month** so that unexpected
spend is caught immediately rather than at month-end billing.

### Why single-EC2, not managed services yet

A single EC2 instance is a single point of failure, which is an explicit,
accepted trade-off during the pilot (see
`docs/adr/0001-initial-architecture.md`) — not an oversight. The pilot's goal
is validating product-market fit in one city, not building a highly
available production system before there are users to justify it.

## CI/CD flow

- `.github/workflows/ci.yml` runs on every push/PR to `main`: separate jobs
  for backend (Python/pytest/ruff), mobile (Expo/RN, lint/typecheck/test),
  admin-web and marketing-site (Next.js, lint/typecheck/test), and infra
  (`terraform fmt`/`validate`).
- `.github/workflows/deploy.yml` runs only on merge to `main` (plus manual
  `workflow_dispatch`). It authenticates to AWS via **GitHub OIDC** — there
  are no long-lived AWS access keys stored as GitHub secrets. If the AWS IAM
  role or EC2 instance id isn't configured yet (infra not provisioned), the
  deploy job detects this and exits cleanly rather than failing.
- Deploys are never manual. Merging to `main` is the only way code reaches
  the pilot instance. See `docs/runbooks/deploy.md` and
  `docs/runbooks/rollback.md`.

## Observability approach

- All backend logs are structured JSON, tagged with the request's
  correlation id, shipped to CloudWatch Logs.
- Celery task logs carry the same correlation id as the request that
  enqueued them, so a single user action can be traced across process
  boundaries.
- CloudWatch alarms cover basic operational health (CPU, disk, error rate)
  and AWS spend (the ₹5,000/month Budgets alarm).
- Incident response starts from the correlation id of the affected request —
  see `docs/runbooks/incident-response.md`.

## Workflow enforcement

All implementation work in this repository — backend features, frontend
screens, infra changes, workflow changes — goes through the task-pipeline
process defined in
[`.claude/skills/task-pipeline/SKILL.md`](../../.claude/skills/task-pipeline/SKILL.md).
That skill is what turns the conventions above into something enforced
rather than aspirational: it requires a `tasks/NNNN-slug/` folder with a
plan, explicit ownership of touched paths, and a concrete definition of done
before any task is considered finished.
