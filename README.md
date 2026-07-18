# hakandundar.me

Personal index. One page, no framework, no build dependencies.

```
data/projects.json   all content lives here
assets/style.css     all styling lives here
assets/favicon.svg   favicon
build.js             renders dist/ from the JSON
wrangler.jsonc       Cloudflare deploy config
dist/                generated output — gitignored, never edit
```

## Build

```bash
node build.js
```

Node 14+. No `npm install`, no `package.json`, nothing to update.

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

The repo deploys as a Workers static-asset project (`wrangler.jsonc` points at
`dist/`). In the Cloudflare import-from-GitHub flow:

- Project name: `hakandundar-me` (no dots — Workers names are alphanumeric + hyphens)
- Build command: `node build.js`
- Deploy command: `npx wrangler deploy`
- Path: `/`

Deploys on every push to `main`.

Custom domain: project → Settings → Domains & Routes → add `hakandundar.me`.
The domain's nameservers need to be on Cloudflare first — `dndr.net` will need
the same later for Workers, KV and R2.

## Notes

- Font is JetBrains Mono from Google Fonts, with a system monospace fallback.
  To self-host later, drop the woff2 into `assets/` and swap the `<link>` for an
  `@font-face` rule in `style.css`.
- The `reveal` animation respects `prefers-reduced-motion`.
- `hakan.pro`, `hakandundar.net` and `hakand.net` should 301 to `hakan.run`,
  not here. This page is the index; `hakan.run` is the portfolio.
