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
import { handleOutbound, injectOutbound, outboundScriptResponse } from "./outbound/outbound-source.js";
const OUTBOUND_ALIASES = ["hakandundar.me", "www.hakandundar.me"];

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

// ---------------------------------------------------------------------------
// DNDR Analytics V2 (staging and production).
//
// hakandundar.me is an independent property in DNDR (prop_hakandundar_me).
// Where the DNDR_COLLECTOR Service Binding exists and ENVIRONMENT is listed
// below, the Worker itself reports one PAGE event for each document
// navigation to the site's one page. The visitor's response never waits for
// it and nothing about the page changes; a DNDR failure is logged as an
// outcome and ignored. The producer identity is the binding's
// props.producerId (wrangler.jsonc), read by DNDR - this code sends none. The
// hostname is the one the Worker was invoked on; the address, geography,
// agent and referrer come from the request Cloudflare delivered, never from
// the page.
//
// Staging binds dndr-collector-staging; production (since 2026-10-03) binds
// dndr-collector with its own producer, each declared in wrangler.jsonc, so
// neither can write the other's identity. Production also keeps the page's
// existing V1 browser beacon to dndr.net/collect, which stays this site's
// original analytics; the Worker report is an additional, best-effort copy.
// ---------------------------------------------------------------------------

export const DNDR_FORWARD_ENVIRONMENTS = Object.freeze(["staging", "production"]);
const PAGE_PATHS = new Set(["/", "/index.html"]);
const FORWARD_ATTEMPTS = 2;

export function dndrForwardingEnabled(env) {
  return Boolean(env && env.DNDR_COLLECTOR && typeof env.DNDR_COLLECTOR.recordPage === "function") &&
    DNDR_FORWARD_ENVIRONMENTS.includes(env.ENVIRONMENT || "");
}

/**
 * A page view: a GET for the page document that was served (200, or 304 to a
 * revalidation). Assets, the not-found page, HEAD, non-document fetches and
 * speculative prefetches are not.
 */
export function isPageView(request, response) {
  if (request.method !== "GET") return false;
  if (!PAGE_PATHS.has(new URL(request.url).pathname)) return false;
  if (response.status !== 200 && response.status !== 304) return false;
  const purpose = `${request.headers.get("sec-purpose") || ""} ${request.headers.get("purpose") || ""}`.toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("prerender")) return false;
  const dest = request.headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return (request.headers.get("accept") || "").includes("text/html");
}

/** The PAGE event for DNDR, keyed by this request's own Cloudflare ray id. */
export function pageEvent(request) {
  const url = new URL(request.url);
  const cf = request.cf || {};
  const ray = request.headers.get("cf-ray");
  return {
    producerEventId: `request:${ray || crypto.randomUUID()}`,
    hostname: url.hostname,
    path: url.pathname === "/index.html" ? "/" : url.pathname,
    referrer: request.headers.get("referer") || "",
    ip: request.headers.get("cf-connecting-ip") || "",
    userAgent: request.headers.get("user-agent") || "",
    country: cf.country || "",
    region: cf.region || "",
    regionCode: cf.regionCode || "",
    city: cf.city || "",
    asn: typeof cf.asn === "number" ? cf.asn : null,
  };
}

export async function forwardToDndr(env, event) {
  for (let attempt = 1; attempt <= FORWARD_ATTEMPTS; attempt += 1) {
    try {
      const result = await env.DNDR_COLLECTOR.recordPage(event);
      const status = result && ["accepted", "duplicate", "rejected", "error"].includes(result.status) ? result.status : "error";
      if (status !== "error" || attempt === FORWARD_ATTEMPTS) {
        // The event id and the outcome only: never the address or the agent.
        console.log(`dndr-forward: ${status}${result && result.reason ? ` (${result.reason})` : ""} ${event.producerEventId}`);
        return status;
      }
    } catch (error) {
      if (attempt === FORWARD_ATTEMPTS) {
        console.error(`dndr-forward: error (${error && error.message ? error.message : String(error)}) ${event.producerEventId}`);
        return "error";
      }
    }
  }
  return "error";
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (env.ENVIRONMENT === "production" && path === "/__analytics/outbound.js") return withSecurityHeaders(outboundScriptResponse());
    if (env.ENVIRONMENT === "production" && path === "/__analytics/outbound") return withSecurityHeaders(await handleOutbound(request, env, ctx, { aliases: OUTBOUND_ALIASES, acceptsPath: path => PAGE_PATHS.has(path) }));
    const response = withSecurityHeaders(await env.ASSETS.fetch(request));
    // A staging deployment is never indexed.
    if (env && env.ENVIRONMENT === "staging") response.headers.set("X-Robots-Tag", "noindex, nofollow");
    if (dndrForwardingEnabled(env) && ctx && typeof ctx.waitUntil === "function" && isPageView(request, response)) {
      ctx.waitUntil(forwardToDndr(env, pageEvent(request)).catch(() => "error"));
    }
    return env.ENVIRONMENT === "production" && request.method === "GET" && PAGE_PATHS.has(path) ? injectOutbound(response, OUTBOUND_ALIASES) : response;
  },
};
