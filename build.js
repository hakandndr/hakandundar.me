#!/usr/bin/env node
/**
 * hakandundar.me — static build
 * Reads data/projects.json and writes index.html.
 * No dependencies. Run: node build.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const OUT = path.join(ROOT, "dist");

const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, "data", "projects.json"), "utf8")
);

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const STATUS_LABEL = {
  live: "live",
  wip: "wip",
  client: "client",
  down: "down",
};

const STATUS_CLASS = {
  live: "s-live",
  wip: "s-wip",
  client: "s-live",
  down: "s-down",
};

let delay = 0;

const step = () =>
  `style="animation-delay:${(delay += 28)}ms"`;

function entry(item) {
  const cls = STATUS_CLASS[item.status] || "";
  const label = STATUS_LABEL[item.status] || item.status;

  const metric = item.metric
    ? `<span class="metric">${esc(item.metric)}</span>`
    : "";

  return `        <div class="entry reveal" ${step()} data-domain="${esc(
    item.domain
  )}">
          <div class="entry-head">
            <a class="entry-domain" href="${esc(item.url)}">${esc(
    item.domain
  )}</a>
            <span class="leader" aria-hidden="true"></span>
            <span class="entry-status ${cls}"><span class="dot" aria-hidden="true"></span>${esc(
    label
  )}${metric}</span>
          </div>
          <p class="entry-desc">${esc(item.desc)}</p>
        </div>`;
}

function section(sec) {
  return `      <section class="section">
        <div class="section-label reveal" ${step()}>${esc(sec.label)}</div>
${sec.items.map(entry).join("\n")}
      </section>`;
}

const id = data.identity;
const footer = data.footer;

const contact = footer.contact
  .map((item) => `<a href="${esc(item.url)}">${esc(item.label)}</a>`)
  .join('<span class="sep">·</span>');

/**
 * These are Hakan Dundar's official identity profiles.
 *
 * Project websites are intentionally NOT included in sameAs.
 * sameAs should identify profiles/accounts representing the same person,
 * not every website or project created by that person.
 */
const officialProfiles = [
  "https://github.com/hakandndr",
  "https://www.linkedin.com/in/hdundar/",
];

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  "@id": `${id.canonical}#profile-page`,
  url: id.canonical,
  name: id.title,
  description: id.metaDescription,
  mainEntity: {
    "@type": "Person",
    "@id": `${id.canonical}#hakan-dundar`,
    name: id.name,
    url: id.canonical,
    email: "mailto:hakan@dndr.net",
    jobTitle: "Software Developer",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Orange County",
      addressRegion: "CA",
      addressCountry: "US",
    },
    sameAs: officialProfiles,
  },
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${esc(id.title)}</title>
<meta name="description" content="${esc(id.metaDescription)}">

<link rel="canonical" href="${esc(id.canonical)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(id.name)}">
<meta property="og:title" content="${esc(id.title)}">
<meta property="og:description" content="${esc(id.metaDescription)}">
<meta property="og:url" content="${esc(id.canonical)}">

<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0a0c0e">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

<link rel="stylesheet" href="assets/style.css">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">

<script type="application/ld+json">
${JSON.stringify(structuredData, null, 2)}
</script>
</head>

<body>
  <main class="wrap">
    <header>
      <h1 class="name reveal" ${step()}>${esc(id.name).toUpperCase()}</h1>
      <p class="role reveal" ${step()}>${esc(id.role)}</p>
      <p class="line reveal" ${step()}>${esc(id.line)}</p>
    </header>

${data.sections.map(section).join("\n\n")}

    <footer class="foot reveal" ${step()}>
      <div class="foot-row">
        <div class="foot-key">Writing</div>
        <div class="foot-val">
          <a href="${esc(footer.writing.url)}">${esc(
  footer.writing.domain
)}</a> — ${esc(footer.writing.note)}
        </div>
      </div>

      <div class="foot-row">
        <div class="foot-key">Now</div>
        <div class="foot-val">${esc(footer.now)}</div>
      </div>

      <div class="foot-row">
        <div class="foot-key">Contact</div>
        <div class="foot-val">${contact}</div>
      </div>
    </footer>
  </main>

<script>
(function () {
  var endpoint = ${JSON.stringify(data.statusEndpoint)};

  if (!endpoint) return;

  var cls = {
    live: "s-live",
    wip: "s-wip",
    client: "s-live",
    down: "s-down"
  };

  fetch(endpoint, { cache: "no-store" })
    .then(function (response) {
      return response.ok
        ? response.json()
        : Promise.reject(new Error("Status endpoint failed"));
    })
    .then(function (map) {
      Object.keys(map).forEach(function (domain) {
        var element = document.querySelector(
          '[data-domain="' + domain + '"]'
        );

        if (!element) return;

        var statusElement = element.querySelector(".entry-status");
        var info = map[domain] || {};

        if (info.status && cls[info.status]) {
          statusElement.className =
            "entry-status " + cls[info.status];

          statusElement.innerHTML =
            '<span class="dot"></span>' +
            info.status +
            (info.metric
              ? '<span class="metric">' + info.metric + "</span>"
              : "");
        }
      });
    })
    .catch(function () {
      /* Keep the values baked in at build time. */
    });
})();
</script>

<script>
(function () {
  try {
    var page =
      location.hostname +
      location.pathname +
      location.search;

    var sessionKey = "dndr-visit:" + page;

    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, "1");

    // Was run/log_hakanrun.php on Hostinger. That endpoint is being retired —
    // /collect is the Worker that writes straight to D1. Same query string, so
    // this is an endpoint swap and nothing else.
    new Image().src =
      "https://dndr.net/collect" +
      "?path=" + encodeURIComponent(page) +
      "&referrer=" +
      encodeURIComponent(document.referrer || "") +
      "&t=" +
      Date.now();
  } catch (error) {
    /* Analytics must never affect the page. */
  }
})();
</script>
</body>
</html>
`;

fs.rmSync(OUT, {
  recursive: true,
  force: true,
});

fs.mkdirSync(path.join(OUT, "assets"), {
  recursive: true,
});

for (const file of fs.readdirSync(path.join(ROOT, "assets"))) {
  fs.copyFileSync(
    path.join(ROOT, "assets", file),
    path.join(OUT, "assets", file)
  );
}

fs.writeFileSync(
  path.join(OUT, "index.html"),
  html,
  "utf8"
);

console.log(
  "dist/index.html written — " +
    html.length +
    " bytes"
);