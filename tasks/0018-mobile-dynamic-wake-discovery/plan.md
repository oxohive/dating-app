# Plan: 0018-mobile-dynamic-wake-discovery

## Goal

Drop the pilot EC2 instance's static Elastic IP (task 0011) to stop
paying its small idle-time cost (~$1-4/month), while keeping the exact
same user-visible behavior: the mobile app should transparently wake the
instance on demand and keep working, the same way the user's other
project ("Giftory") does for its browser-based admin panel — except the
mobile app is a programmatic JSON API client, not a browser, so it needs
its own wake-check flow rather than following an HTML redirect page.

## Why this is safe to do now

The `env-wake` Lambda (task 0005) already dynamically discovers the
instance's *current* public IP on every invocation — it never assumed a
static IP existed. The static IP (task 0011) was added later purely for
a stable bookmarkable browser URL. Once the mobile app does its own
dynamic discovery via this same Lambda, nothing actually depends on the
IP being static anymore.

## Exact JSON contract (pinned here so both sides can build in parallel without guessing)

`lambda/env-wake/handler.py`'s existing endpoint gains a JSON response
mode, selected by **either** an `Accept: application/json` request
header **or** a `?format=json` query-string parameter (support both;
mobile should send the header, which is cleaner, but accept the query
param too in case a browser/manual test wants to force JSON). The
existing default (no header, no param) HTML/redirect behavior for
browsers is **completely unchanged**.

JSON responses (all still require the same `?secret=` query param the
HTML path already requires — identical auth, just a different response
format):

- Instance running, public IP available:
  `200 {"state": "running", "base_url": "http://<current-public-ip>"}`
- Instance running, but no public IP assigned yet (rare/momentary — same
  edge case the HTML path already handles by falling back to waiting):
  `200 {"state": "starting", "retry_after_seconds": 5}`
- Instance stopped (triggers `StartInstances`, same as today) or in a
  transitional state (`pending`/`stopping`/`shutting-down`):
  `200 {"state": "starting", "retry_after_seconds": 5}`
- Instance terminated / unrecoverable:
  `500 {"state": "error", "message": "..."}`
- Missing/incorrect secret:
  `403 {"state": "forbidden"}`

## Decomposition (parallel, disjoint)

1. **Infra**: add the JSON mode to `lambda/env-wake/handler.py` exactly
   as specified above (existing HTML behavior untouched, existing tests
   must still pass, add new tests for the JSON branch). Remove the
   `aws_eip.pilot` resource and its output from
   `infra/terraform/envs/pilot/**` (`terraform plan` should show exactly
   one resource being destroyed, nothing else touched — confirm before
   applying). Apply it. **This will change the instance's public IP the
   moment it's applied** — expected and fine, but note the new IP
   (whatever it becomes) in `status.md` for the record, and update
   `docs/runbooks/env-start-stop.md` to describe the new
   no-static-IP-anymore architecture and that the wake Lambda is now the
   only supported way to reach the instance reliably (manual bare-IP
   bookmarks will go stale after any future stop/start). Also check
   `apps/mobile` for any build config (`.env`, `app.json`,
   `eas.json`, or similar) that currently hardcodes the static IP as an
   API base URL, and update/remove it to point at the wake Lambda's
   Function URL instead (the mobile subtask also touches this area —
   coordinate by searching for the literal IP string first so there's
   no duplicate edit; if the mobile subtask already handles it, leave it
   alone and just confirm in your report).
2. **Mobile**: build a wake-check flow in `apps/mobile` that calls the
   wake Lambda's Function URL (`https://yv2yfc7fvipbrfhru4miygaix40ozzvj.lambda-url.ap-south-1.on.aws/`)
   with `?secret=<value>` and `Accept: application/json`, using the JSON
   contract above. On `state: "running"`, use the returned `base_url`
   as the API client's base URL for the rest of the app session
   (in-memory, re-validated if a subsequent API call fails). On
   `state: "starting"`, show a polished "waking up" screen (same dark/
   coral/spinner/progress-bar visual language as the web version from
   task 0017 — reuse that design language, adapted to React Native
   components, not a copy-paste of HTML/CSS) and retry after
   `retry_after_seconds`, repeating until `running`. On `state: "error"`
   or `"forbidden"`, show a clear error screen (not a silent crash).
   Wire this as a startup gate (run once when the app launches/
   foregrounds, before the main navigator mounts) AND as a recovery path
   (if any API call fails with a network/connection error mid-session,
   re-run the wake-check flow before retrying, since the instance may
   have gone idle-stopped again since the app launched).

## Known limitation (explicitly out of scope, flag clearly)

Dropping the static IP means there is no longer a stable DNS target for
a bare `api.oxo-date.dev.oxohive.com`-style A record pointed at the raw
instance (this came up in earlier research for the Vercel/Porkbun
domain plan). This task does **not** attempt to build the (meaningfully
more complex and costly) CloudFront-plus-dynamic-origin-update
architecture that would be needed to give the backend a real custom
domain with automatically-updated routing — that's explicitly deferred.
For now, the backend has no custom domain; it's reached either via the
mobile app's own dynamic discovery (this task) or by a human manually
using the wake Lambda's URL in a browser (already works, unchanged).

## Verification

- Existing `lambda/tests/test_env_wake.py` suite must still pass
  unchanged; new tests added for the JSON response branch (all four
  states + the 403/500 cases).
- Mobile: existing test conventions (pure-function/hook level, no
  component-rendering tests in this app) — cover the state-machine
  logic (running/starting/error/forbidden handling, retry timing) and
  the API-client base-URL-swap logic.
- **Do not force-stop the live pilot instance purely to test this** —
  verify via unit/mocked tests on both sides; the next natural idle-stop
  cycle will exercise it live, same precedent as task 0005.
- Terraform: `terraform plan` before applying the EIP removal must show
  exactly one destroy (`aws_eip.pilot`), nothing else.

## Rollback

Re-add `aws_eip.pilot` in Terraform and apply to restore a static IP;
the mobile wake-check flow is additive and harmless to leave in place
either way (it just means one extra Lambda call before the first API
call, trivially fast once the instance is already running).
