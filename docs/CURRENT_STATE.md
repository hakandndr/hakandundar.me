# Current state

What is verified to exist, with the date it was read. Anything not read from a
live request or the working tree is listed under "Unknown".

## 2026-10-01

**Production** (read 2026-10-01, unchanged since 2026-08-24):

- Worker `hakandundar-me`, deployment `b58612a6-948a-4951-b67b-688c55d51770`
  (2026-08-24T12:50:18Z, uploaded by Wrangler), custom domain
  `hakandundar.me`, no routes, one binding (`ASSETS`).
- The deployed script is the bundle of the committed `worker.js` as of
  `e21dc6f` (1,188 bytes, compared byte for byte), and the served `/` is
  byte-identical to `node build.js` of the committed source
  (SHA-256 `3e407505…a64a9`). The live system and Git agree.
- The page carries the DNDR V1 browser beacon to `https://dndr.net/collect`.
  DNDR holds 146 V1 rows for this host (2026-07-21 to 2026-09-29).
- workers.dev and preview URLs are **enabled** for this Worker (a second
  origin for the same content); plain HTTP is answered with 200, not
  redirected. Both are recorded in DNDR as proposal P18; neither was changed.
- Deploys are manual: a push to `main` does not deploy. GitHub shows no check
  runs, statuses, webhooks or deployments for the repository, and every
  recorded deployment was uploaded seconds before its commit.

**Staging** (new, 2026-10-01):

- Worker `hakandundar-me-staging`, version `4f1c6c91-a0ad-458f-8a1b-0b65263878cf`,
  custom domain `hakandundar-me-staging.dndr.net` (created by the deploy on
  the `dndr.net` zone; the `hakandundar.me` zone was not touched), workers.dev
  and preview URLs disabled (read back from the API).
- Serves the same page built with `--staging`: `noindex` in the page and in
  an `X-Robots-Tag` header, the same security headers, and no V1 beacon.
- The Worker reports one PAGE event per document view of `/` to DNDR
  Analytics staging through the `DNDR_COLLECTOR` Service Binding, as
  `prop_hakandundar_me` / `site_hakandundar_me_staging`, producer
  `prd_hakandundar_me_staging_binding`. Three controlled views were accepted
  (`request:<cf-ray>` ids); `/index.html` (redirected to `/`), the 404 page and
  the assets were not counted.
- Outside clients found the hostname within seconds of its creation; one
  crawler was classified `human` by DNDR (DNDR proposal P17).

**Independent property.** By owner decision this site is not redirected to
`hakan.run`, has no redirect lifecycle, and nothing it records is attributed
to `hakan.run`.

**Repository.** `main`: `e21dc6f` (the deployed Worker, committed) and the
staging commit on top, both pushed. Untracked tool residue (a local
assistant-tool settings directory and a skills lock file) was removed from the
working copy on 2026-10-01; both are preserved in the backup below.

**Backup.** `D:\IT\_backups\dndr-control-plane\hakandundar.me\20261001T1834Z_phase2a-baseline\`
(outside Git, unencrypted): Git bundle, working-tree archive and hashes,
deployment, settings, custom domains, workers.dev state, deployed script,
public DNS answers, HTTP behaviour and the served page.

## Unknown

- The `hakandundar.me` zone's DNS records and rulesets: neither available
  credential can read them (authentication error). Public DNS answers were
  recorded instead.
