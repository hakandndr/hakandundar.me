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

## 2026-10-03 — Production page views to DNDR Analytics (DNDR Batch C1)

Requested: production reports page views to DNDR Analytics as an additive
copy; the page, its headers and its V1 beacon stay as they are; no redirect
to `hakan.run`.

Done:

- Baseline first (Git bundle, versions, the live files and headers). The
  production build was byte-identical to the live page before any change.
- Drift since the deployed `e21dc6f`: only the staging integration
  (`3a3d72b`, inert in production; the production build unchanged).
- `worker.js`: `"production"` added to `DNDR_FORWARD_ENVIRONMENTS`;
  `wrangler.jsonc`: top-level `ENVIRONMENT=production` and the production
  `DNDR_COLLECTOR` binding (`prd_hakandundar_me_binding`). Tests: two adapted,
  five added (production report; every collector failure and a missing
  binding leave the response byte-for-byte unchanged; a slow collector is not
  waited for; one id per request; the browser cannot choose an identity;
  configuration separation). `node --test`: 12 of 12. Commit `49350f1`.
- Deployed `a9d262c5-046f-4b9f-86ac-f82477121284`; live files, the 307, the
  404s and the headers identical to before.
- DNDR enrolled the site; one controlled browser view was recorded by the V1
  beacon (row 4535) and by DNDR (event 268, native start).

Not done, deliberately: no page change, DNS or zone change; workers.dev and
preview URLs unchanged (P18); the V1 beacon stays.
