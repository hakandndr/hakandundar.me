# Operations

## Current standalone outbound release — 2026-10-06

Verified production: 69206be0-8508-4a4a-a9f6-b228091c0bd5 at 100%; immediate pre-correction rollback 92585735-4bbd-4f88-a6f6-ebb60fd55c17 retains the standalone-script defect and is a public-delivery recovery baseline, not proof of outbound collection. 15 tests and build and production dry-run passed. No new migration or binding change; public assets and existing source authority are preserved.

The browser component is now literal standalone source. Serializing a function after bundling introduced an unavailable __name helper: endpoint-only acceptance had missed actual browser execution. The corrected deployed script is byte-identical to the shared component and was executed twice in a browser fixture with exactly one listener set, one normalized external request, internal-alias exclusion and uninterrupted navigation during network failure. Trusted binding identity, PAGE writers, source panels and historical records are preserved. Earlier checkpoints below are historical; no retention or business-data change was planned. Current build-trigger settings remain unknown; capture fresh rollback and compare the active deployment after any push.

## Outbound release operation — 2026-10-06

Production version and rollback are in CURRENT_STATE. `node --test` runs all 15 source tests. The source asset files do not change: response-time HTML injection supplies `/__analytics/outbound.js`, and `POST /__analytics/outbound` accepts only UUID/path/destination with exact same-origin/source-path validation. Forwarding retries use the same identity through the existing Service Binding. A 204 is scheduled telemetry, not a durable-write acknowledgement.

When comparing the live page to `dist/index.html`, remove only the inserted outbound script before comparing; the existing content, V1 beacon, styles and navigation remain the baseline. Do not repeat broad visual acceptance. Current build-trigger readback is unavailable; treat a push as a possible production mutation and re-read the active version afterwards.


Run Wrangler with the owner's OAuth login. If `CLOUDFLARE_API_TOKEN` is set in
the shell to a token without Workers permissions, unset it for the command.

## Test

```bash
node --test
```

## Staging

```bash
node build.js --staging
npx wrangler deploy --env staging --dry-run   # expect DNDR_COLLECTOR (dndr-collector-staging#ProducerApi), ASSETS, ENVIRONMENT "staging"
npx wrangler deploy --env staging
```

Verify: `https://hakandundar-me-staging.dndr.net/` answers 200 with
`X-Robots-Tag: noindex, nofollow` and the security headers, and its HTML has
no `dndr.net/collect`; `npx wrangler tail --env staging` prints
`dndr-forward: accepted request:<ray>` for a browser view of `/`.

Stop staging analytics without a deploy: DNDR disables
`prd_hakandundar_me_staging_binding` in its staging registry (refused within a
minute; the page is unaffected). Remove staging entirely: delete the
`hakandundar-me-staging` Worker; production is a different Worker.

## Production

Since 2026-10-03 production reports page views to DNDR Analytics production
through `DNDR_COLLECTOR` (`prd_hakandundar_me_binding`); the page and its V1
beacon are unchanged. Before a production deploy:

1. `node --test`.
2. `node build.js`, then compare `dist/index.html` with the live page:
   `curl -s https://hakandundar.me/ | sha256sum` against
   `sha256sum dist/index.html`. A difference that is not the intended content
   change means the working copy and production disagree; stop.
3. `npx wrangler deploy --dry-run`: `ASSETS`, `DNDR_COLLECTOR
   (dndr-collector#ProducerApi)`, `ENVIRONMENT ("production")`.

Stop the DNDR copy without a deploy: DNDR disables `prd_hakandundar_me_binding`
(refused within a minute; the page is unaffected). Rollback of the Worker:
`npx wrangler rollback b58612a6-948a-4951-b67b-688c55d51770` (the version
before the DNDR copy).
