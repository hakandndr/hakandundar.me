# hakandundar.me

Personal index. One page, no framework, no build dependencies.

```
data/projects.json   all content lives here
assets/style.css     all styling lives here
assets/favicon.svg   favicon
build.js             renders dist/ from the JSON (dist-staging/ with --staging)
worker.js            Worker in front of the assets: security headers; on staging
                     only, the server-side page view report to DNDR
wrangler.jsonc       Cloudflare deploy config (top level = production, env.staging)
tests/               node --test, no dependencies
docs/                CURRENT_STATE, OPERATIONS, PROCESS
dist/                generated output — gitignored, never edit
dist-staging/        generated staging output — gitignored, never edit
```

## Build

```bash
node build.js
```

Node 14+. No `npm install`, no `package.json`, nothing to update.

`node build.js --staging` writes `dist-staging/` instead: the same page with
`noindex` and without the browser beacon (see Analytics below). The production
build is unaffected by the flag's existence.

## Test

```bash
node --test
```

Node 22+. Checks the Worker (headers, staging-only page view report, failure
isolation, configuration) and both builds.

## Preview locally

```bash
node build.js
cd dist
python -m http.server 8080
```

Then open http://localhost:8080. Opening `dist/index.html` directly from disk also works.

## Add or change a project

Edit `data/projects.json`, run `node build.js`, commit. Never edit anything in `dist/`.

Each item:

```json
{
  "domain": "example.com",
  "url": "https://example.com",
  "desc": "One or two sentences. Keep under 54 characters per line visually.",
  "status": "live",
  "metric": "142 posts"
}
```

`status` is one of `live`, `wip`, `client`, `down`.
`metric` is optional — leave it as `""` and it renders nothing.

## Live status (optional, later)

At build time the statuses come from the JSON. On page load the site also calls
`statusEndpoint` (default `https://api.dndr.net/status.json`) and overwrites them
if the call succeeds. If it fails — endpoint not built yet, offline, blocked —
nothing happens and the baked-in values stay. So the site is fully functional
before `api.dndr.net` exists.

Expected response shape:

```json
{
  "americawhat.com": { "status": "live", "metric": "142 posts" },
  "oc-ca.com":       { "status": "live" },
  "dndr.net":        { "status": "wip" }
}
```

To disable the live check entirely, set `"statusEndpoint": ""` in the JSON.

## Deploy — Cloudflare

Deploys are manual, with Wrangler, from this working copy. A push to `main`
does not deploy: there is no Git-connected build (no check runs, statuses,
webhooks or deployments on the GitHub repository, and every recorded
deployment was uploaded by Wrangler seconds *before* its commit). See
`docs/OPERATIONS.md` for the exact commands, the rollback version and what
must be checked first.

- Production: Worker `hakandundar-me`, custom domain `hakandundar.me`.
  `node build.js && npx wrangler deploy --env=""`
- Staging: Worker `hakandundar-me-staging`, custom domain
  `hakandundar-me-staging.dndr.net`, no workers.dev, no preview URLs.
  `node build.js --staging && npx wrangler deploy --env staging`

## Analytics

hakandundar.me is its own property in DNDR Analytics (`prop_hakandundar_me`).
It is not redirected anywhere and nothing about it is attributed to hakan.run.

- Production (unchanged): the page carries a small browser beacon to DNDR's V1
  collector, `https://dndr.net/collect`, sending `hostname + pathname + query`.
  The browser sends at most one event per page per tab session; the collector
  also applies its existing 60-second `IP + page` rate limit.
- Staging: no browser beacon. The Worker reports one PAGE event per document
  view of the page to DNDR Analytics V2 through a Cloudflare Service Binding
  (`DNDR_COLLECTOR`, producer `prd_hakandundar_me_staging_binding`, taken from
  the binding, never from this code). The visitor's response never waits for
  it, and a DNDR failure changes nothing but a log line with the event id.
- Moving production from the beacon to the Worker report is a separate,
  separately approved change.

## Notes

- Font is JetBrains Mono from Google Fonts, with a system monospace fallback.
  To self-host later, drop the woff2 into `assets/` and swap the `<link>` for an
  `@font-face` rule in `style.css`.
- The `reveal` animation respects `prefers-reduced-motion`.
- `hakan.pro`, `hakandundar.net` and `hakand.net` should 301 to `hakan.run`,
  not here. This page is the index; `hakan.run` is the portfolio.
  hakandundar.me itself stays an independent site and is not redirected.
