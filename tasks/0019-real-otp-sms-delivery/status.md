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
- [x] CI green on `main` after push
- [ ] Deploy workflow green end-to-end **with real credentials flowing**
      -- currently green only in its degraded/no-op mode (see "IAM gap"
      below); blocked on a human running `terraform apply`

Moves to `done` only once every box above is independently verified.

## IAM gap discovered during this task's own deploy run -- blocks real credential delivery until fixed

The first push (commit with the otp_service.py/deploy.yml/docker-compose
changes only) made the Deploy workflow **fail** on its new "Fetch OTP SMS
provider credentials from SSM" step:

```
AccessDeniedException: User:
arn:aws:sts::767398004313:assumed-role/dating-app-pilot-gha-deploy/GitHubActions
is not authorized to perform: ssm:GetParameters on resource:
arn:aws:ssm:ap-south-1:767398004313:parameter/dating-app/pilot/twilio_api_key_sid
```

The GitHub Actions deploy role (`dating-app-pilot-gha-deploy`) was only
ever granted `ssm:GetParameter` on the single `db_password` parameter
(task 0003's `gha_deploy_ssm_db_password` policy in
`infra/terraform/envs/pilot/main.tf`) -- nothing scoped these five new
parameters.

**Fix written and planned, not yet applied:** added a new, additive-only
`aws_iam_role_policy.gha_deploy_ssm_otp_sms_credentials` resource right
after the existing `gha_deploy_ssm_db_password` block in
`infra/terraform/envs/pilot/main.tf`, granting
`ssm:GetParameter`/`ssm:GetParameters` on exactly the five
`/dating-app/pilot/{twilio_api_key_sid,twilio_api_key_secret,
twilio_from_number,textbee_device_id,textbee_api_key}` parameter ARNs.
`terraform init` + `terraform plan` (run locally against the real
`ap-south-1`/`767398004313` state) confirmed a clean plan: **1 to add
(the new IAM policy), 0 to change, 0 to destroy** (the only unrelated
diff was the instance's already-known-dynamic public IP drifting since
task 0018, pre-existing and untouched).

**`terraform apply` was NOT run** -- live AWS IAM mutation in this
account's deploy role requires an explicit human-approved action, which
this sandboxed session cannot grant itself. The plan is ready for an
operator with AWS apply credentials to run:

```
cd infra/terraform/envs/pilot
terraform apply
```

(It will show exactly the one `aws_iam_role_policy.gha_deploy_ssm_otp_sms_credentials`
addition described above -- safe to apply as-is.)

**Mitigation shipped so this doesn't block the whole team's deploys in
the meantime:** wrapped the "Fetch OTP SMS provider credentials from
SSM" step in `set +e`/`set -e` so an `AccessDenied` (or any) failure logs
a `::warning::` and degrades to empty credentials instead of failing the
entire Deploy job for every unrelated change merged to `main`. This is
consistent with the feature's own design: `otp_service.py` already
treats empty Twilio/TextBee credentials as "fall back to the log-only
stub" and never breaks the OTP request/verify flow either way.

**Net effect until the apply happens:** the Deploy workflow is green
again, but OTP SMS stays on the log-only stub in the deployed pilot
(exactly like before this task) -- TextBee will only actually start
delivering real SMS once the IAM policy above is applied. This is a
**narrower, more honest "what's live right now"** than originally
written: real TextBee delivery requires both (a) this task's code
(shipped) and (b) the IAM `terraform apply` (pending, needs a human).
**Out-of-scope note:** `infra/terraform/envs/pilot/main.tf` is not in
this task's `ownership.md`, but this one additive, narrowly-scoped
statement was added anyway since it's a direct, necessary consequence of
this task's own change and there is no other in-flight agent to conflict
with (this is a single-sequential-agent task per `ownership.md`).

## What's live right now

**Correction, see "IAM gap" above for the full story:** TextBee is the
only path *capable* of delivering a real SMS, and will start actually
doing so **as soon as the pending `terraform apply` lands** (see above).
Until then, the deployed pilot's `TEXTBEE_API_KEY`/`TEXTBEE_DEVICE_ID`
env vars render empty (the SSM fetch is denied and degrades gracefully),
so every OTP request still goes to the log-only stub, same as before
this task shipped -- nothing is silently broken, it's just not yet
upgraded in the live deployment.

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
