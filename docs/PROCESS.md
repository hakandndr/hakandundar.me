# Process

Append-only engineering history. Earlier entries are never rewritten; a
correction is a new entry that names what the earlier one got wrong.

## 2026-10-01 — Reconciliation, independent property, staging analytics

Requested: clean up tool residue, reconcile the live site with Git, and give
the site a staging environment that reports page views to DNDR Analytics as an
independent property; no production deploy, no production DNS change.

Done:

- Baseline backup first (Git bundle, working tree, live Worker, settings,
  custom domain, workers.dev state, deployed script, public DNS, HTTP
  behaviour, served page).
- Removed untracked tool residue (a local assistant-tool settings directory
  and a skills lock file); both are in the backup. The tracked tree and
  history held none.
- Found the deployed Worker (`main: worker.js`, `run_worker_first: ["/*"]`,
  security headers) uncommitted in the working copy. Proved the deployed
  script equals its bundle and the served page equals the build, then
  committed it as `e21dc6f`.
- The owner decided the site stays independent: an earlier plan, discussed
  during planning, to redirect it to `hakan.run` is cancelled.
- `build.js --staging` writes `dist-staging/` (noindex, no V1 beacon); the
  production build is byte-identical to before. `worker.js` reports page views
  to DNDR only where the binding exists and `ENVIRONMENT` is `staging`.
  `wrangler.jsonc` gained `env.staging`; the top level is unchanged. Tests:
  `node --test`, 8 of 8.
- Deployed staging as a new Worker on `hakandundar-me-staging.dndr.net`;
  three controlled views reached DNDR, non-page requests did not.

Found:

- The README said every push to `main` deploys. No Git-connected build
  exists; corrected.
- Plain HTTP is not redirected, and production has workers.dev and preview
  URLs enabled. Recorded (DNDR P18), not changed.

Not done, deliberately: no production deploy, DNS or zone change; production
keeps its V1 beacon.
