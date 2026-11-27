# Status: 0019-real-otp-sms-delivery

**State:** verifying

## Definition-of-done checklist

- [x] `send_otp_sms` rewritten: Twilio primary (no-ops gracefully if
      `TWILIO_ACCOUNT_SID` unset) -> TextBee fallback -> stub-log final
      fallback, never raises
- [x] `twilio` package added to requirements.txt
- [x] Secrets wired from SSM into the deployed container, following the
      existing secrets-delivery pattern
- [x] Tests green (new + full existing auth suite)
- [x] Docs updated noting TextBee is temporary/testing-only
- [x] Committed and pushed
- [ ] CI + Deploy workflow runs confirmed green on `main` after push

Moves to `done` only once every box above is independently verified.

## What's live right now

**TextBee is the only path that actually delivers a real SMS today.**
`send_otp_sms` (`services/backend/packages/api/features/auth/otp_service.py`)
tries, in order:

1. **Twilio** — reads `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` /
   `TWILIO_ACCOUNT_SID` / `TWILIO_FROM_NUMBER` from env vars and calls
   `twilio.rest.Client(api_key_sid, api_key_secret, account_sid)` then
   `client.messages.create(to=phone_number, from_=from_number,
   body=f"Your verification code is {code}")`. **Dormant right now**:
   there is no `/dating-app/pilot/twilio_account_sid` SSM parameter, so
   `TWILIO_ACCOUNT_SID` renders empty in the deployed container and this
   stage is skipped entirely (logged as
   `otp_sms_twilio_skipped_no_account_sid`) — not attempted, so it can't
   fail either. Any other failure (bad creds, Twilio API error) is caught
   and logged as `otp_sms_twilio_failed`, falling through to TextBee.
2. **TextBee** (**the one that actually fires today**) — `POST
   https://api.textbee.dev/api/v1/gateway/send-sms` with header
   `x-api-key: <TEXTBEE_API_KEY>` and JSON body
   `{"recipients": [phone_number], "message": "Your verification code is
   <code>", "deviceId": "<TEXTBEE_DEVICE_ID>"}`, via the existing `httpx`
   dependency (`httpx.post(...)`, mirroring this codebase's existing
   external-call style). Request shape confirmed against TextBee's live
   docs (textbee.dev/docs/sending-sms, github.com/vernu/textbee), not
   guessed. Success logs `otp_sms_textbee_sent`; any failure (unconfigured,
   network error, non-2xx) is caught, logs `otp_sms_textbee_failed` (or
   `otp_sms_textbee_skipped_not_configured` if env vars are empty), and
   falls through to the stub.
3. **Log-only stub** (final safety net, unchanged from before this task) —
   logs `otp_sms_stub_fallback` with the phone number and the actual OTP
   code. Always reached if both providers above were skipped or failed;
   `send_otp_sms` never raises, so `/auth/otp/request` can never fail
   because an SMS provider is down.

## What's pending

- **Twilio activation** — purely an ops step, no code change: add
  `/dating-app/pilot/twilio_account_sid` to SSM (`SecureString`), then add
  it to the same `get-parameters` call and `.env.pilot` render in
  `.github/workflows/deploy.yml` and to the `backend` service's
  `environment:` block in `docker-compose.pilot.yml` (already reads
  `${TWILIO_ACCOUNT_SID}`, currently always empty). The next deploy will
  then route OTP SMS through Twilio first, TextBee becoming the fallback
  it was always meant to be.
- **TextBee is explicitly temporary/testing-only** — a personal-phone SMS
  relay, not suitable for real production volume (carrier rate limits,
  single point of failure if that phone is off/offline). Remove it once a
  durable SMS strategy (fully-wired Twilio, or another provider) is
  chosen for real production traffic. Documented in
  `docs/runbooks/env-start-stop.md` under "OTP SMS delivery credentials".

## Secrets flow (mirrors the existing DB-password pattern exactly)

`.github/workflows/deploy.yml`'s deploy job gained one new step ("Fetch
OTP SMS provider credentials from SSM") that batches all five existing SSM
parameters (`twilio_api_key_sid`, `twilio_api_key_secret`,
`twilio_from_number`, `textbee_device_id`, `textbee_api_key`) into one
`aws ssm get-parameters --with-decryption` call, masks each secret value
(`::add-mask::`), and exposes them as step outputs — same pattern as the
existing "Fetch pilot DB password from SSM" step, just batched since
there are five params instead of one. "Render .env.pilot" writes them
into the rendered env file (plus a literal empty `TWILIO_ACCOUNT_SID=`,
since no SSM parameter exists for it yet), and
`infra/docker-compose/docker-compose.pilot.yml`'s `backend` service
`environment:` block passes all six (`TWILIO_API_KEY_SID`,
`TWILIO_API_KEY_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_FROM_NUMBER`,
`TEXTBEE_DEVICE_ID`, `TEXTBEE_API_KEY`) through into the running
container, exactly like `DATABASE_URL`/`REDIS_URL` already are. No new
secrets-delivery mechanism was invented.

## Tests

New: `services/backend/tests/features/auth/test_otp_sms_delivery.py` (6
tests) — mocks `otp_service.TwilioClient` (a small recording fake class,
same convention as `test_notification_service.py`'s `_FakeFcmClient`) and
`otp_service.httpx.post`. Covers: Twilio succeeds (TextBee/stub not
invoked); `TWILIO_ACCOUNT_SID` unset (skips straight to TextBee, which
succeeds); Twilio raises (falls through to TextBee); both Twilio and
TextBee fail (falls to the stub log, does not raise); neither provider
configured (today's real default — same stub-fallback path); phone
number and OTP code asserted correctly passed through at every stage
(Twilio call kwargs, TextBee JSON body, and the final stub log record's
`phone_number`/`otp_code` fields).

Results (`services/backend/.venv`):
- `pytest tests/features/auth -q` → **16 passed** (10 pre-existing + 6
  new), no regressions.
- `pytest -q` (full backend suite) → **250 passed**.
- `ruff check` on the changed/new files → clean.

## Commit / CI / Deploy

See the commit referenced in this task's PR/push; CI and Deploy workflow
run results to be recorded here once watched to completion.
