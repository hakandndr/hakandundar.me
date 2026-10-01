# Operations

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

Unchanged by the staging work and not deployed on 2026-10-01. Before a
production deploy:

1. `node --test`.
2. `node build.js`, then compare `dist/index.html` with the live page:
   `curl -s https://hakandundar.me/ | sha256sum` against
   `sha256sum dist/index.html`. A difference that is not the intended content
   change means the working copy and production disagree; stop.
3. `npx wrangler deploy --env="" --dry-run`: one binding, `ASSETS`; no
   `DNDR_COLLECTOR`.

The next production deploy also ships the staging-only forwarding code in
`worker.js`; it is inert there (no binding, `ENVIRONMENT` unset). Moving
production from the V1 beacon to the Worker report is a separate change with
its own approval.

Rollback: `npx wrangler rollback b58612a6-948a-4951-b67b-688c55d51770`.
