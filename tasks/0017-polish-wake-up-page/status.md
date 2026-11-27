# Status: 0017-polish-wake-up-page

**State:** done

## Definition-of-done checklist

- [x] Redesigned `_WAITING_PAGE`, `_ERROR_PAGE`, and `_FORBIDDEN_PAGE` in
      `lambda/env-wake/handler.py` as one consistent dark-themed product
      surface: near-black radial-gradient background, centered rounded card
      (`#1c1a21`, subtle white-alpha border, dark drop shadow + faint
      brand-color glow), inline-SVG heart glyph + "Dating App" wordmark,
      coral/rose accent `#e51d57` (marketing-site's `primary-600`, confirmed
      against `apps/marketing-site/tailwind.config.js`), CSS spinner and an
      animated indeterminate progress bar on the waiting page, and
      consistent (simpler) icon-in-circle treatments — amber warning
      triangle for the error page, rose lock icon for the forbidden page.
      Headline "Starting the app" kept verbatim (required by existing
      tests); subtext rewritten to state the actual mechanism ("The server
      was idle and is starting back up. This page refreshes
      automatically"). `{state}` kept visible as small muted/debug text on
      the waiting and error pages. The existing
      `<meta http-equiv="refresh" content="{retry_seconds}">` tag is
      unchanged. All hand-written CSS in an inline `<style>` block, no
      external framework/CDN. No changes to any function logic, signatures,
      or state handling in `handler.py` — string constants only.
- [x] Existing unit tests (`lambda/tests/test_env_wake.py`, 9 tests, from
      task 0005) run unchanged and pass:
      `python -m pytest lambda/tests/test_env_wake.py -q` -> `9 passed`.
- [x] Rendered the real `.format(retry_seconds=5, state=...)` /
      `.format(state=...)` output locally to static HTML files, then took
      **actual headless-Chrome screenshots** (`chrome.exe --headless=new
      --screenshot`, available locally) of all three pages and visually
      reviewed them — not just a source-code read. Confirmed: card layout,
      heart+wordmark brand row, spinner, progress bar, headline, subtext,
      and debug state text all render as intended on `_WAITING_PAGE`;
      warning icon + headline + debug state render correctly on
      `_ERROR_PAGE`; lock icon + headline render correctly on
      `_FORBIDDEN_PAGE`.
- [x] Did not force-stop or otherwise touch the live pilot instance to test
      this — verification was local rendering + unit tests only, per the
      plan's explicit instruction (the instance had just auto-stopped and
      restarted from idle during this session and is in active use).
- [x] Confirmed how this Lambda is deployed: `infra/terraform/envs/pilot/main.tf`
      packages `lambda/env-wake/` via `data.archive_file.env_wake` into
      `aws_lambda_function.env_wake`, keyed on `source_code_hash`. Ran
      `terraform plan` in `infra/terraform/envs/pilot/` — it showed exactly
      one change: `aws_lambda_function.env_wake` updated in-place
      (`source_code_hash` only), `Plan: 0 to add, 1 to change, 0 to
      destroy`, nothing else touched. Ran `terraform apply -auto-approve` —
      applied cleanly: `Apply complete! Resources: 0 added, 1 changed, 0
      destroyed.`
- [x] Committed and pushed to `main`.

Moves to `done` only once every box above is independently verified.
