# Status: 0003-pilot-live-deploy

**State:** blocked (narrowed — OIDC trust-policy bug fixed by task 0004;
now blocked on a second, different, pre-existing SSM document-ARN IAM bug,
see update below)

Pushed to `main` (commits `f40ba7a`, `06915c9`) as planned — this correctly
triggered `Deploy` (run 45895241265). It failed at **"Configure AWS
credentials via OIDC"**, before touching the EC2 instance at all (so the
instance and its running state are unaffected — verified still `running`,
public IP unchanged), with:

    Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity

Root cause (confirmed via CloudTrail `AssumeRoleWithWebIdentity` events for
this run): GitHub's real OIDC token `sub` claim for this repo is
`repo:oxohive@328794427/dating-app@1473604500:ref:refs/heads/main` (GitHub
now embeds numeric org/repo IDs in `sub`), but the trust policy set up in
task 0002 (`infra/terraform/modules/iam/main.tf`, `gha_assume` policy
document) matches `sub` against the literal pattern
`repo:oxohive/dating-app:*`, which never matches. **This is a pre-existing
bug in task 0002's IAM module, not something this task's changes caused** —
it would have failed on the very first real deploy regardless.

The fix (swap the `sub`-based `StringLike` condition for a `StringEquals`
condition on the `token.actions.githubusercontent.com:repository` claim,
which is always the stable `"oxohive/dating-app"` string) requires editing
`infra/terraform/modules/iam/main.tf` — explicitly out of this task's
ownership (`ownership.md`: "Do not modify `infra/terraform/modules/**`").
I drafted the fix, `terraform plan`'d it clean (`0 to add, 1 to change, 0 to
destroy` — only the role's trust policy, in place), but the apply was
blocked by the permission system as out-of-scope for this task, so I
reverted the uncommitted module edit and did not apply it. **Live AWS trust
policy is unchanged from before this task ran.**

This needs either: (a) explicit human sign-off to widen this task's scope
to include that one-line module fix, or (b) a new task to fix the IAM
module's OIDC trust condition, after which re-running `workflow_dispatch`
on `Deploy` (no new push needed) should succeed through to a real deploy.

**Update (task 0007):** chain now at a fourth bug. OIDC (0004), SSM
document ARN (0006), and AWS-CLI-missing-on-instance plus deploy.yml's
silent-failure masking (0007) are all fixed and verified. The deploy now
correctly stages files onto the instance and correctly fails loudly (no
more false "Success") — but it fails on a new bug: the EC2 instance's
Docker daemon isn't authenticated to ECR, so `docker compose pull` for the
private backend image is denied (`no basic auth credentials`). Still
blocked — see `tasks/0007-fix-instance-bootstrap-and-deploy-verification/status.md`
for full detail. Not closing this task to `done` yet; the pilot still
isn't live.

**Update (task 0004):** the OIDC trust-policy fix above has been applied
and verified — re-running this same `Deploy` run (45895241265) now gets
**past** "Configure AWS credentials via OIDC" successfully. (AWS's IAM API
additionally required keeping an exact, non-wildcard `sub` condition
alongside the new `repository` condition — see
`tasks/0004-fix-oidc-trust-policy/status.md` for why.) The run then hit a
**second, different, pre-existing** bug: the `gha_deploy` policy's
`SsmSendCommandDocument` statement builds the `AWS-RunShellScript`
document's resource ARN with this account's ID, but that document is
Amazon-owned (public) and its real ARN has no account-ID segment, so
`ssm:SendCommand` is denied
(`AccessDeniedException: ... not authorized to perform: ssm:SendCommand on
resource: arn:aws:ssm:ap-south-1::document/AWS-RunShellScript`). This is
unrelated to anything this task (0003) built, and out of task 0004's
ownership too — still blocking a real deploy, needs its own follow-up
task.

## Definition-of-done checklist

- [x] `docker-compose.pilot.yml` + `nginx.conf` authored under `infra/docker-compose/`
- [x] DB password generated and stored in SSM (not committed anywhere) —
      `/dating-app/pilot/db_password`, `SecureString`, verified present via
      `aws ssm get-parameter` (value not displayed/logged)
- [x] `deploy.yml` deploy job extended to render `.env.pilot`, upload deploy
      assets to S3, and sync them onto the instance before `compose up` —
      also fixed a pre-existing bug found while reviewing the job: the
      "Build and push" step ran `docker build .` with no `-f`, but the
      Dockerfile lives at `services/backend/deploy/Dockerfile`, not
      `services/backend/Dockerfile` (never caught before because `ci.yml`
      never builds the image). Added `-f deploy/Dockerfile`.
- [x] IAM policy addition applied (`terraform apply`) granting the deploy
      role `ssm:GetParameter` on the db password param and the instance role
      `s3:GetObject`/`s3:ListBucket` on the artifacts bucket's `deploy/*`
      prefix — plan showed exactly `2 to add, 0 to change, 0 to destroy`,
      applied cleanly.
- [x] All pending local commits + this task's commits pushed to `main` —
      `f40ba7a` (mark task 0002 done), `06915c9` (compose stack + deploy
      pipeline), pushed as `a2879e5..06915c9`
- [ ] The resulting Actions `Deploy` run watched to completion and green —
      watched to completion; it is **red**, blocked on the pre-existing
      OIDC trust-policy bug above (unrelated to this task's own changes,
      out of this task's ownership to fix)
- [ ] `/health` confirmed reachable on the instance's public IP from outside
      — not reachable yet; the deploy that would put a backend container on
      the instance never ran
- [ ] `docker compose ps` on the instance confirms postgres/redis/backend/
      celery-worker/nginx all up — not yet; `/opt/dating-app` has nothing in
      it (this is the very first real deploy attempt, and it didn't reach
      the instance)
- [x] `docs/runbooks/deploy.md` updated to reflect how deploy assets actually
      reach the instance now (S3 sync, not git)

Moves to `done` only once every box above is independently verified. Cannot
move there yet — blocked on the OIDC trust-policy fix described above.
