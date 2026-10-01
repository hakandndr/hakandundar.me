// Worker entry point.
//
// This project was assets-only until 2026-08-24: `wrangler.jsonc` had no `main`,
// so no code ran on a request and nothing could set a response header. A sweep
// across the whole network found this was the one property sending none at all.
//
// A `_headers` file was tried first, on the basis that Cloudflare's asset layer
// reads one and that would avoid introducing a Worker for five lines of
// configuration. It deployed cleanly and the headers did not appear. Rather than
// keep guessing at why, this uses the arrangement that was verified working on
// turkiyecennet.com the same day: run the Worker first, hand the request to
// ASSETS, add the headers on the way out.
//
// The cost is a Worker invocation per request on a single-page site. That is the
// price of owning the headers; the alternative is not owning them.
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=()",
  // No includeSubDomains: once a browser has seen that directive it refuses
  // plain HTTP for every subdomain of this host for the stated period, including
  // ones that do not exist yet, and it cannot be withdrawn early.
  "Strict-Transport-Security": "max-age=31536000",
};

// Copied rather than mutated — an asset response can have immutable headers, and
// assigning to those throws instead of silently doing nothing.
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
