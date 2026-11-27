# Ownership: 0019-real-otp-sms-delivery

Single sequential agent — self-contained feature change, no parallel
conflicts.

| Owned paths |
|---|
| `services/backend/packages/api/features/auth/**` |
| `services/backend/requirements.txt` |
| `services/backend/tests/features/auth/**` |
| `.github/workflows/deploy.yml` (only the secrets-rendering section, additive) |
| `docs/runbooks/env-start-stop.md` (additive note only) |
| `tasks/0019-real-otp-sms-delivery/**` |
