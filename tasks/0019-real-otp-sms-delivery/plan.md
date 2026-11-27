# Plan: 0019-real-otp-sms-delivery

## Goal

Replace the log-only OTP SMS stub (`send_otp_sms` in
`services/backend/packages/api/features/auth/otp_service.py`) with real
delivery: **Twilio as primary**, **TextBee as fallback** (a phone-based
SMS gateway, explicitly a temporary testing measure — mark it clearly
removable later, not production-grade). If both fail, fall back to the
existing log-only behavior so the OTP flow itself never breaks.

## Current credential state (stored in SSM, SecureString except the
from-number which is plain)

- `/dating-app/pilot/twilio_api_key_sid`
- `/dating-app/pilot/twilio_api_key_secret`
- `/dating-app/pilot/twilio_from_number` (`+17372508034`)
- `/dating-app/pilot/textbee_device_id`
- `/dating-app/pilot/textbee_api_key`

**Important: no `TWILIO_ACCOUNT_SID` exists yet.** Twilio's API requires
it alongside the API Key SID/Secret (`Client(api_key_sid, api_key_secret,
account_sid)`) — without it, a real API call cannot succeed. Build the
code to read it from an env var (`TWILIO_ACCOUNT_SID`) that is currently
**unset**, and treat an unset/empty value as "Twilio unavailable right
now" — skip straight to the TextBee fallback, log clearly why, and do
NOT crash or raise. This means right now, **real SMS delivery works via
TextBee alone**, and Twilio activates automatically the moment someone
adds the account SID later — no code change needed then.

## Implementation

1. **`otp_service.py`**: rewrite `send_otp_sms(phone_number, code)` to
   try, in order: Twilio (skip if `TWILIO_ACCOUNT_SID` unset or the API
   call raises) → TextBee (skip if its call raises) → existing
   log-only stub behavior (always keep this final fallback — during
   this pilot phase, keep logging the OTP code at this final stage too,
   so testing via logs still works when both providers are
   unavailable/unconfigured). Every stage logs clearly which path was
   taken (`otp_sms_twilio_sent` / `otp_sms_textbee_sent` /
   `otp_sms_stub_fallback`) with the phone number, so it's obvious from
   logs alone which path delivered (or didn't).
2. **Twilio call**: use the official `twilio` Python package. Read
   `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_ACCOUNT_SID`,
   `TWILIO_FROM_NUMBER` from env vars (no hardcoded defaults for the
   actual secret values — placeholder/empty defaults only, matching the
   existing Razorpay/FCM stub-credential convention in this codebase).
   Send a plain SMS with the OTP code as the body (not Twilio Verify —
   keep using this codebase's own OTP generation/storage, just swap the
   delivery mechanism, since that's the smaller, more isolated change
   and matches the credential shape already provided).
3. **TextBee call**: read TextBee's actual current API docs/README
   (`github.com/vernu/textbee`) to confirm the exact request shape
   (method, path, headers, body field names) — don't guess from the
   partial description already given in this plan. Read
   `TEXTBEE_DEVICE_ID`/`TEXTBEE_API_KEY` from env vars. Use the
   existing `httpx` dependency already in `requirements.txt` for this
   call (don't add `requests` as a redundant second HTTP client).
4. **New dependency**: add the `twilio` package to
   `services/backend/requirements.txt` (check current latest stable
   version rather than guessing one). This is a single-agent task
   (no parallel conflict), so adding it directly here is fine, unlike
   the multi-agent-wave convention where backend deps route through an
   integration step.
5. **Secrets flow to the running container**: check exactly how
   existing secrets (e.g. the Razorpay webhook secret, the env-wake
   shared secret) currently get from SSM into the backend container's
   environment at deploy time (likely in `.github/workflows/deploy.yml`
   or however `.env.pilot` gets rendered on the instance) and add the
   five new SSM parameter reads following that exact same pattern — do
   not invent a new secrets-delivery mechanism.
6. **Tests**: mock the Twilio client and the TextBee HTTP call (httpx
   mock/respx or whatever this codebase's existing test conventions
   use for external HTTP calls — check an existing test for the
   pattern). Cover: Twilio succeeds (TextBee/stub not called); Twilio
   account SID unset (skips straight to TextBee, succeeds); Twilio
   raises an error (falls to TextBee); both Twilio and TextBee fail
   (falls to stub log, does not raise); phone number and code are
   correctly passed through in every path. Run the full existing
   `features/auth` test suite too and confirm nothing regressed.
7. Update `tasks/0019-real-otp-sms-delivery/status.md` with what's
   live now (TextBee) vs. pending (Twilio, once `TWILIO_ACCOUNT_SID` is
   provided) — and add a one-line note to
   `docs/runbooks/env-start-stop.md` or wherever provider credentials
   are documented, so a future reader knows TextBee is an **intentional
   temporary testing fallback**, not a permanent production choice, and
   should be removed once a durable SMS strategy is chosen.
8. Commit and push to `main` (triggers normal CI/CD).

## Verification

- Full `pytest` suite green, including new OTP-delivery tests.
- Does NOT require live-sending a real SMS to prove correctness — mock
  the external calls, same convention as every other external-provider
  stub in this codebase (Razorpay, FCM). If you want to sanity-check
  the TextBee path for real at the end (one real test message), that's
  a bonus, not a requirement — don't block completion on it.

## Risks

- TextBee is a personal-phone SMS relay — explicitly temporary/testing
  only, not suitable for real user-facing production traffic at any
  real volume (carrier rate limits, single point of failure if the
  phone is off/offline). Document this clearly so it isn't mistaken
  for a permanent choice.
- Twilio will silently no-op (route straight to TextBee) until
  `TWILIO_ACCOUNT_SID` is added later — this is intentional, not a bug,
  but worth being unambiguous about in logs and docs so nobody is
  confused later about why Twilio "isn't working."

## Rollback

Revert `otp_service.py` to the log-only stub; the SSM parameters can
stay (harmless if unused).
