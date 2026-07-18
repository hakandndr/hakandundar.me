# hakandundar.me

Personal index. One page, no framework, no build dependencies.

```
data/projects.json   all content lives here
assets/style.css     all styling lives here
build.js             renders index.html from the JSON
index.html           generated output — do not edit by hand
```

## Build

```bash
node build.js
```

Node 14+. No `npm install`, no `package.json`, nothing to update.

## Preview locally

```bash
python -m http.server 8080
# or
npx serve .
```

Then open http://localhost:8080. Opening `index.html` directly from disk also works.

## Add or change a project

Edit `data/projects.json`, run `node build.js`, commit. Never edit `index.html`.

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

## Deploy — Cloudflare Pages

1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build command: `node build.js`
4. Build output directory: `/` (root)
5. Custom domain: `hakandundar.me`

Cloudflare handles TLS and caching. Deploys on every push.

If the DNS is not on Cloudflare yet, move the nameservers first — this is also
what `dndr.net` will need for Workers and R2 later.

## Notes

- Font is JetBrains Mono from Google Fonts, with a system monospace fallback.
  To self-host later, drop the woff2 into `assets/` and swap the `<link>` for an
  `@font-face` rule in `style.css`.
- The `reveal` animation respects `prefers-reduced-motion`.
- `hakan.pro`, `hakandundar.net` and `hakand.net` should 301 to `hakan.run`,
  not here. This page is the index; `hakan.run` is the portfolio.
