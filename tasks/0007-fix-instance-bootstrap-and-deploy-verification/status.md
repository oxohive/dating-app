# Status: 0007-fix-instance-bootstrap-and-deploy-verification

**State:** blocked (this task's own two fixes are done, verified, and
shipped — but the same deploy chain hit a **fourth**, different,
pre-existing bug: the EC2 instance's Docker daemon isn't authenticated to
ECR, so pulling the private backend image fails)

## What was fixed and verified

1. **AWS CLI hot-patched onto the live instance** (`i-0d1b0c7d979b384f5`,
   Ubuntu 22.04, x86_64) via SSM `AWS-RunShellScript`: installed `unzip`
   (missing — first attempt failed with `unzip: not found`), then AWS CLI
   v2 via the official zip/installer, with `set -e` in the script.
   Verified: `which aws` → `/usr/local/bin/aws`; `aws --version` →
   `aws-cli/2.42.4 Python/3.14.10 Linux/6.8.0-1070-aws exe/x86_64.ubuntu.22`.
   This is on the live instance now, not just in a future AMI/user_data.

2. **Root cause fixed in `infra/terraform/modules/ec2-app/user_data.sh.tpl`**:
   added AWS CLI v2 installation (and `unzip` as an apt dependency)
   alongside the existing Docker install, for any future replacement
   instance.
   - **Terraform plan gate, as instructed:** `terraform plan` in
     `infra/terraform/envs/pilot` showed this as `~ update in-place`
     (`0 to add, 1 to change, 0 to destroy`) — not a destroy/recreate.
     However, `public_ip`/`public_dns` both showed as `(known after
     apply)`, which reveals that applying it would still require AWS to
     **stop and restart the live, running instance** (`ModifyInstanceAttribute`
     on `UserData` only succeeds while the instance is stopped) — for zero
     actual benefit, since cloud-init only runs `user_data` once per
     instance ID and this instance already completed its first boot.
     Per the spirit of the task's gate (don't disrupt the live, billed
     instance), added `user_data` to the `aws_instance.app` lifecycle's
     `ignore_changes` (alongside the pre-existing `ami`). Re-ran
     `terraform plan`: **"No changes. Your infrastructure matches the
     configuration."** No disruptive apply was needed or performed; the
     live instance keeps running on the version hot-patched in step 1, and
     the committed template is correct for any future instance.

3. **`deploy.yml` hardened** (`.github/workflows/deploy.yml`, "Pull and
   restart Docker Compose stack on instance" step):
   - Prefixed the SSM `commands` list with `"set -e"` so a failing command
     mid-script now aborts the rest instead of letting a later, unrelated
     command (`docker image prune -f`) mask the failure.
   - After `aws ssm get-command-invocation`, explicitly parse `.Status`
     with `jq` and `exit 1` (printing `StandardErrorContent` and
     `StandardOutputContent` first) if it isn't `Success`, instead of
     trusting the step's own exit code.
   - **This hardening is confirmed working for real**, not just in theory
     — see below: the very next deploy run hit a genuine failure, and this
     time the GitHub Actions job correctly went red with a clear error,
     instead of reporting false "Success" the way it did for the AWS-CLI
     bug this task was chartered to fix.

4. Committed and pushed to `main`:
   - `1b03102` — "Install AWS CLI v2 in ec2-app user_data; ignore_changes
     on live instance" (missing the `Co-Authored-By` trailer — an
     oversight caught only after committing; per the repo's strict
     no-amend policy this was left as-is rather than rewritten, and the
     next commit carries the trailer correctly).
   - `103fbc8` — "Harden deploy.yml SSM step to fail fast and surface real
     failures".
   - Pushed `16eb89d..103fbc8` to `main` successfully.

## New blocker found (a fourth, different, pre-existing bug — not patched here)

Re-triggered `Deploy` (push-triggered run
[45899928303](https://github.com/oxohive/dating-app/actions/runs/45899928303),
commit `103fbc8`; a duplicate manually-dispatched run,
`45899942460`, was cancelled to avoid double-billing the same deploy).

Result: **the "Pull and restart Docker Compose stack on instance" step now
correctly fails the job** (this is the hardening in this task working as
designed) with:

- `aws s3 sync` **succeeded this time** — `/opt/dating-app` now has
  `docker-compose.pilot.yml`, `nginx.conf`, and `.env.pilot` staged (the
  AWS-CLI fix from this task is confirmed working end-to-end).
- `docker compose ... pull` then failed:

      Image 767398004313.dkr.ecr.ap-south-1.amazonaws.com/dating-app-backend:103fbc8...
      Error failed to resolve reference "...dating-app-backend:103fbc8...":
      pull access denied, repository does not exist or may require
      authorization: authorization failed: no basic auth credentials

- SSM `get-command-invocation` correctly reported `Status: Failed`, and
  the new post-invocation check in `deploy.yml` correctly `exit 1`'d the
  job — **the hardening worked**: this is a real failure and it is
  reported as one, not masked as green.

**Root cause:** the GitHub Actions runner logs in to ECR
(`aws-actions/amazon-ecr-login@v2`) to build and push the image, but that
Docker-login session lives on the *runner*, not on the EC2 instance. The
EC2 instance's own Docker daemon has never been authenticated to ECR, so
`docker compose pull` for the private `dating-app-backend` image on the
instance fails with `no basic auth credentials`. (The other three images —
`redis:7-alpine`, `nginx:1.27-alpine`, `postgis/postgis:16-3.4` — are
public Docker Hub images and would pull fine; compose aborts the whole
pull on the first image's error, so they show `Interrupted`.)

This is a **fourth, distinct, pre-existing bug** — not caused by, and not
in scope of, this task's two fixes (AWS CLI bootstrap gap, deploy.yml
silent-failure gap). Per this task's own instructions ("If yet another
distinct failure appears, stop and report precisely rather than continuing
to patch blindly"), this is reported here rather than patched. A follow-up
task should add an ECR login step to the deploy pipeline's SSM script on
the instance (e.g. `aws ecr get-login-password --region ap-south-1 |
docker login --username AWS --password-stdin
<account>.dkr.ecr.ap-south-1.amazonaws.com` before `docker compose pull`),
relying on the AWS CLI now confirmed present on the instance (this task's
fix) and the instance's existing IAM role (which would need an ECR
read policy added if it doesn't already have one — not checked here, out
of scope).

## Independent verification performed (current real state)

- Public IP unchanged: `13.203.80.98` (confirmed via
  `describe-instances` immediately before and after the latest deploy
  attempt).
- `curl -sS -m 15 http://13.203.80.98/health` → `curl: (7) Failed to
  connect ... Couldn't connect to server` (connection refused — nginx
  container never started, since the image pull step failed before
  `docker compose up -d`).
- `docker ps -a` via SSM → empty (`CONTAINER ID   IMAGE   COMMAND ...`
  header only, no rows).
- `/opt/dating-app` via SSM → now contains `.env.pilot`,
  `docker-compose.pilot.yml`, `nginx.conf`, and `bootstrap.done` (staging
  succeeded — progress over the previous bug, where only `bootstrap.done`
  existed).

The app is **still not live**, but for a new, different reason than
before, and the failure is now reported accurately instead of silently
swallowed.

## Definition-of-done checklist

- [x] AWS CLI hot-patched onto the live instance, verified (`aws --version`)
- [x] `ec2-app` module's `user_data` updated for future instances;
      confirmed via `terraform plan` that an in-place update would still
      require a disruptive stop/start of the live instance for zero
      benefit — `lifecycle.ignore_changes` added instead, re-plan now
      shows "No changes"
- [x] `deploy.yml` deploy job hardened to fail loudly on any real
      failure — confirmed working on a real failure (see above), not just
      reviewed
- [x] Deploy re-triggered and watched to completion — **completed, but
      red** (correctly red, not falsely green)
- [ ] `/health` independently confirmed reachable — **not reachable**,
      connection refused; blocked on the new ECR-auth bug above
- [ ] `docker compose ps` confirms all 5 services up — **zero containers
      exist**; blocked on the same new issue
- [ ] `tasks/0003`, `0004`, `0006` status files closed to `done` — **not
      closed**; liveness still isn't real, so none of their checklists are
      genuinely complete. Each updated with a note pointing to this task's
      new finding, but left in `blocked` state as they were.

Cannot move to `done`: this task's own two chartered fixes (AWS CLI
bootstrap, deploy.yml silent-failure hardening) are both done, verified,
and shipped — and the hardening is proven to work by catching a real
failure for real. But the pilot still isn't live, blocked now on a fourth,
distinct, pre-existing bug (EC2 instance Docker daemon not authenticated
to ECR). Needs a new follow-up task (recommend
`0009-fix-ec2-ecr-auth` or similar — `0008-mvp-feature-completion`
already exists for unrelated work) to add an ECR login step to the
on-instance deploy script, and to confirm the instance's IAM role has ECR
read access.
