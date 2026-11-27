# Plan: 0017-polish-wake-up-page

## Goal

The user showed a reference screenshot (a different product, "Giftory")
of a polished dark-themed "Service is waking up" page shown while an
idle server restarts — spinner, progress bar, reassuring copy, auto-
refresh — and asked for the same quality of experience here. This
repo's equivalent is `lambda/env-wake/handler.py`'s `_WAITING_PAGE`
(and the `_ERROR_PAGE`/`_FORBIDDEN_PAGE` siblings), currently a bare
unstyled HTML page with a plain `<h1>`/`<p>` and a meta-refresh. Upgrade
it to match the reference's visual quality, using this app's own brand
(coral/rose "Dating App" wordmark + heart mark, per
`apps/marketing-site/src/components/Header.tsx`), not Giftory's purple.

## Constraints

- This is a single AWS Lambda returning a raw HTML string (no Next.js/
  Tailwind build pipeline available here) — style it with a self-
  contained `<style>` block of hand-written CSS embedded in the Python
  string template, not a framework.
- Keep all existing logic/behavior in `handler.py` completely unchanged
  (state checks, secret validation, redirect behavior, retry timing) —
  this is a visual-only change to the three HTML templates
  (`_WAITING_PAGE`, `_ERROR_PAGE`, `_FORBIDDEN_PAGE`).
- Keep the existing `<meta http-equiv="refresh">` retry mechanism
  (works without JS) — layer a nicer-looking progress bar/spinner as a
  CSS animation on top, not a replacement for the actual retry logic.
  The progress bar is necessarily cosmetic/approximate (the Lambda has
  no real insight into EC2 boot progress), matching the reference's own
  "Ready in about 30 seconds — no action needed" framing (an estimate,
  not a precise measurement).

## Design direction

Dark theme (matches the reference's register — a "something is
happening in the background, stay calm" tone reads well dark), this
app's coral/rose brand accent (`#e51d57`-ish, matching marketing-site's
`primary-600`) for the spinner/progress-bar/accent text, a centered
rounded card on a near-black background, the "Dating App" wordmark with
a heart glyph, a headline ("Waking up the app" or similar — match this
repo's existing copy tone, not a literal copy of Giftory's wording),
reassuring subtext matching the existing page's actual meaning ("the
server was idle and is restarting; this page refreshes automatically"),
an indeterminate or slow-filling progress bar, and the existing
`retry_seconds`/`state` info kept visible (useful for debugging, can be
styled as small muted text rather than removed).

Apply the same visual language (simpler) to `_ERROR_PAGE` and
`_FORBIDDEN_PAGE` so all three feel like one consistent product surface
instead of the waiting page being styled and the other two left bare.

## Verification

- This Lambda's existing test suite (check `lambda/env-wake/` for
  existing unit tests from task 0005) should still pass unchanged — the
  function signatures/logic aren't changing, only the HTML string
  constants.
- Render the generated HTML locally (write the formatted template to a
  file and open/screenshot it if a headless browser tool is available)
  to visually confirm the result before deploying — don't just trust
  that the CSS looks right from reading the source.
- **Do not force-stop the live pilot instance to test this live** — it's
  actively being used/tested by the user right now, and task 0005
  already proved the underlying wake mechanism works end-to-end live.
  Verify this change via local rendering + the existing unit tests, then
  deploy via the normal Terraform path (this Lambda's code is packaged
  by Terraform — check `infra/terraform/envs/pilot/main.tf` or the
  relevant module for exactly how, likely an `archive_file` +
  `aws_lambda_function` resource) and confirm `terraform plan` shows
  only the Lambda function code updating, nothing else.

## Rollback

Revert `lambda/env-wake/handler.py`'s three HTML constants; functional
behavior is identical either way since no logic changed.
