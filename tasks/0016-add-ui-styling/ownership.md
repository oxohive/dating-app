# Ownership: 0016-add-ui-styling

Two concurrently-running subtasks, disjoint paths.

| Subtask | Owned paths | Do-not-touch |
|---|---|---|
| Marketing-site styling | `apps/marketing-site/**` | backend, mobile, admin-web |
| Admin-web styling | `apps/admin-web/**` | backend, mobile, marketing-site |

No new dependency routing concerns — Tailwind/PostCSS/Autoprefixer are
frontend dev dependencies, each app manages its own `package.json`
directly (same precedent as mobile adding `expo-location`/
`expo-notifications` directly in prior waves).

An integration step deploys both (push to `main`, triggers existing
CI/CD) and does a final live visual check against the real pilot URLs
(`http://15.206.247.148` for marketing-site, `http://15.206.247.148:8081`
for admin-web) once both land.
