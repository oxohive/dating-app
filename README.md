# Dating-app

A dating and social-discovery app, built as a focused 3-week MVP slice for a
Chennai pilot before any wider rollout. The backend is a feature-sliced
FastAPI application, the mobile app is Expo/React Native, and the admin and
marketing surfaces are Next.js — all deployed on a cost-controlled, single
AWS EC2 pilot environment.

- Full architecture summary: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- Full original product/business plan: [`docs/product-plan.md`](docs/product-plan.md)

## MVP scope

- Authentication via OTP.
- Onboarding.
- Profiles.
- City-based location and discovery (no GPS yet).
- Swipe-based discovery with a daily like quota.
- Mutual matching.
- Basic text messaging.
- Block and report.
- A minimal admin dashboard.

Deferred to later phases (see `docs/product-plan.md`): payments,
GPS/Premium nearby discovery, profile verification, and compatibility
scoring.

## Local development quickstart

### Backend (`services/backend`)

```bash
cd services/backend
python -m venv .venv
source .venv/bin/activate   # .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn packages.api.main:app --reload
```

### Mobile (`apps/mobile`)

```bash
cd apps/mobile
npm install
npx expo start
```

### Admin web / marketing site (`apps/admin-web`, `apps/marketing-site`)

```bash
cd apps/admin-web        # or apps/marketing-site
npm install
npm run dev
```

## Workflow: task-pipeline

All implementation work in this repository — backend features, frontend
screens, infrastructure changes, CI/CD changes — goes through the
**task-pipeline** workflow defined in
[`.claude/skills/task-pipeline/SKILL.md`](.claude/skills/task-pipeline/SKILL.md).
In short: before any implementation edit, open a `tasks/NNNN-slug/` folder
with a `plan.md`, `ownership.md`, and `status.md`; decompose work along this
repo's existing directory boundaries (one backend feature, one frontend app,
`infra/`, `lambda/`, `.github/workflows/`); delegate each slice to a
background agent with explicit path ownership and a definition of done; and
verify each piece directly before marking it done. See the skill file for
the full set of enforced rules.

## CI/CD

- `.github/workflows/ci.yml` runs backend, mobile, admin-web, marketing-site,
  and infra checks on every push/PR to `main`.
- `.github/workflows/deploy.yml` runs only on merge to `main` (or manual
  `workflow_dispatch`), deploying to the AWS pilot via GitHub OIDC — no
  long-lived AWS keys are stored in this repo. It detects missing
  infrastructure (AWS role/instance not yet provisioned) and skips cleanly
  rather than failing.

See `docs/runbooks/` for deploy, rollback, environment start/stop, and
incident response procedures.
