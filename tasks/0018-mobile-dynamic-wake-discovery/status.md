# Status: 0018-mobile-dynamic-wake-discovery

**State:** done

## Definition-of-done checklist

- [x] Infra: JSON mode added to env-wake Lambda, existing tests still
      green, new tests for JSON branch
- [x] Infra: `aws_eip.pilot` removed, `terraform plan` confirmed clean
      before apply, applied; new (ephemeral) IP noted here
- [x] Infra: runbook docs updated; mobile static-IP config checked
- [x] Mobile: wake-check flow built (startup gate + mid-session
      recovery), polished waking-up UI, tests green
- [x] Final cross-check: both sides agree on the JSON contract as
      actually implemented (not just as planned)
- [x] Committed and pushed

Moves to `done` only once every box above is independently verified.

## Mobile subtask notes (completed)

Built `apps/mobile/src/features/server-wake/**`:

- `api/serverWake.api.ts` — `fetchWakeStatus` calls the env-wake Lambda
  Function URL with `?secret=<value>` and `Accept: application/json`;
  `parseWakeResponse` maps the JSON contract (`running`/`starting`/
  `error`/`forbidden`) into a typed `WakeCheckOutcome`, defensively total
  over malformed/unexpected bodies (never throws).
- `wakeState.ts` — pure state machine (`toWakeState`,
  `isTerminalWakeState`) mapping a `WakeCheckOutcome` onto the UI-facing
  `WakeState` (`checking`/`running`/`starting`/`error`/`forbidden`).
- `wakeCheckLoop.ts`, `hooks/useServerWakeGate.ts`,
  `store/serverWakeStore.ts` — retry-until-terminal loop driven by
  `retry_after_seconds`, holding the discovered `base_url` in memory.
- `components/ServerWakeGate.tsx`, `WakeUpScreen.tsx`,
  `WakeErrorScreen.tsx` — startup gate wired into `App.tsx` ahead of
  `RootNavigator`/`NotificationsBootstrap`, plus the waking-up and error
  screens (dark/coral/spinner/progress-bar language from task 0017,
  adapted to React Native).
- `src/core/apiClient.ts` — added `NetworkError`/`isNetworkError`,
  `configureDynamicBaseUrl` (dynamic `base_url` takes priority over the
  static `config.apiBaseUrl` once discovered), and
  `configureServerWakeRecovery` — on a connection-level `fetch` failure
  (not a reachable server's non-2xx response), re-runs the wake check
  once and retries the same request before giving up.
- `src/core/config.ts` — added `serverWakeUrl` (defaults to the real,
  already-deployed Function URL) and `serverWakeSecret`
  (`EXPO_PUBLIC_SERVER_WAKE_SECRET`, empty by default — a missing secret
  surfaces as the Lambda's `forbidden` state, handled by the error
  screen, not a silent failure).

Tests: `apps/mobile/__tests__/features/server-wake/**` (new) +
`apps/mobile/__tests__/core/apiClient.test.ts` (new) cover the
state-machine logic, retry timing, and base-URL-swap/recovery logic per
the plan's verification section — no component-rendering tests, per this
app's existing convention.

## Final cross-check (verified independently, not just trusted)

Read both sides' actual implementations side by side against the pinned
contract in `plan.md`:

- **`running`:** handler.py line 512 emits
  `{"state": "running", "base_url": f"http://{public_ip}"}`;
  `serverWake.api.ts`'s `parseWakeResponse` (line 46) requires
  `status === 200 && record.state === 'running'` and a non-empty string
  `base_url` — field names and shape match exactly.
- **`starting`:** handler.py emits
  `{"state": "starting", "retry_after_seconds": RETRY_SECONDS}` from all
  three call sites (running-without-IP line 519, stopped line 527,
  transitional line 534), with `RETRY_SECONDS = 5` (handler.py line 66).
  Mobile's `parseWakeResponse` (line 50) matches on
  `status === 200 && record.state === 'starting'` and defaults
  `retry_after_seconds` to `DEFAULT_RETRY_AFTER_SECONDS = 5` if missing/
  invalid — same field name, same default value as the Lambda's actual
  constant.
- **`error`:** handler.py's terminal unrecoverable-state branch (line
  538) emits `500 {"state": "error", "message": "..."}`. Mobile's
  fallthrough branch (line 61) reads `record.message` when present, else
  a generic fallback — field names match.
- **`forbidden`:** handler.py line 498 emits `403 {"state": "forbidden"}`
  on a bad/missing secret; mobile matches on `status === 403` exactly
  (line 57).
- Both sides require the same `?secret=` query param; mobile's
  `fetchWakeStatus` sends it (`serverWake.api.ts` line 76) alongside the
  `Accept: application/json` header per the contract.

No field-name, status-code, or default-value mismatches found — the
contract is implemented identically on both sides, not just as planned.

## Mobile verification (reproduced fresh)

Run from `apps/mobile`:

- `npm run typecheck` → clean, no errors.
- `npm run lint` → clean, no errors/warnings.
- `npm test` → `Test Suites: 20 passed, 20 total`, `Tests: 129 passed,
  129 total` — matches the subtask's own reported numbers, reproduced
  independently rather than trusted.

## Out-of-scope finding re-confirmed (not fixed, still accurately flagged)

`.github/workflows/deploy.yml` (line 61) still hardcodes
`ADMIN_WEB_PUBLIC_API_BASE_URL: http://15.206.247.148` for admin-web's
build-time API base URL. Confirmed this is still accurately documented
in `docs/runbooks/env-start-stop.md`'s "App URLs" section (lines 136-142)
as a known-stale, explicitly out-of-scope follow-up for whoever owns
admin-web's deploy config — left untouched by this task on both the
infra and mobile sides, as intended.

## Infra subtask notes (completed)

**JSON mode:** added to `lambda/env-wake/handler.py`, triggered by either
an `Accept: application/json` header or `?format=json`, exactly per the
contract pinned in `plan.md`:
- running + public IP: `200 {"state": "running", "base_url": "http://<ip>"}`
- running w/o public IP yet, or stopped (StartInstances still called), or
  transitional (`pending`/`stopping`/`shutting-down`):
  `200 {"state": "starting", "retry_after_seconds": 5}`
- terminated/unrecoverable: `500 {"state": "error", "message": "..."}`
- bad/missing secret: `403 {"state": "forbidden"}`

Existing HTML/redirect branches are untouched (same status codes, same
pages); JSON mode reuses the same `_describe_instance`/state-checking
logic, branching only at the response-building step. `Content-Type` is
`application/json` for these responses vs. `text/html; charset=utf-8` for
the existing HTML ones.

Tests: `python -m pytest lambda/tests/test_env_wake.py -q` →
**21 passed** (8 original, unchanged, still green + 13 new covering all
four JSON states, both trigger mechanisms, the no-trigger/HTML-unchanged
case, and that JSON mode makes identical AWS calls to HTML mode). Full
`lambda/tests/` suite: **29 passed**.

**Terraform:** `terraform plan` in `infra/terraform/envs/pilot` showed
exactly one destroy (`aws_eip.pilot`) plus one expected in-place update
to `aws_lambda_function.env_wake` (new source hash from the handler.py
JSON-mode change, deploying the new code in the same apply) — nothing
else. Applied cleanly: `Apply complete! Resources: 0 added, 1 changed, 1
destroyed.` Removed the `static_public_ip` output; `marketing_site_url` /
`admin_web_url` / `instance_public_ip` now read from
`module.ec2_app.public_ip` (the instance's own dynamic IP) instead of the
EIP, with descriptions updated to note they're no longer stable across
stop/start.

**New IP after EIP removal:** at apply time the pilot instance was
already **stopped** (idle auto-stop, unrelated to this change — confirmed
via `aws ec2 describe-instances`, state `stopped`, `PublicIpAddress`
`null`). A stopped instance has no public IP regardless of the EIP, so
there is no new concrete IP to record yet. Per the plan's explicit
guidance not to force a live wake purely to test this, the live wake
Lambda was not invoked to force one now (the sandbox session's AWS
credentials also could not reach the live SSM secret anyway —
`ParameterNotFound`/decrypt-permission boundary, separate from Terraform's
own credentials). The next time the instance starts — scheduled start,
idle-alarm recovery, or a manual wake — it will receive a fresh ephemeral
public IP, retrievable via `terraform output instance_public_ip`,
`aws ec2 describe-instances`, or the wake Lambda's own JSON `base_url`.
This is expected post-EIP-removal behavior, not a defect.

**Runbook (`docs/runbooks/env-start-stop.md`):** replaced the
static-IP-specific section with the JSON-mode contract table, an
explanation that the env-wake Lambda Function URL is now the only stable
address, and an explicit warning that bare-IP bookmarks go stale after
any stop/start.

**`apps/mobile` check:** searched for the literal static IP
(`15.206.247.148`) and for `API_BASE_URL`/`apiUrl` patterns across
`apps/mobile/**`, including root-level `app.json` (no `eas.json` present
in this repo). No hardcoded static IP found anywhere in `apps/mobile`.
`apps/mobile/src/core/config.ts` already reads
`process.env.EXPO_PUBLIC_API_BASE_URL` with a `localhost` dev fallback —
no static-IP literal to remove. Nothing touched in `apps/mobile/**`; left
entirely to the mobile subtask.

**Out-of-scope finding, flagged but not fixed:** `.github/workflows/deploy.yml`
hardcodes `ADMIN_WEB_PUBLIC_API_BASE_URL: http://15.206.247.148` (admin-web's
build-time public API base URL). This is neither in the infra subtask's
owned paths nor in `apps/mobile`, so it was deliberately left untouched —
but it **will go stale** the next time the pilot instance stops/starts,
since that value is no longer a stable Elastic IP. admin-web has no
dynamic-discovery mechanism analogous to the mobile app's; this is a
genuine follow-up gap, not part of this task's scope. Flagged in the
runbook too (see "App URLs" section).
