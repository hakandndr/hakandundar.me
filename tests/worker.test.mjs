// Worker behaviour: the security headers on every response, and the staging-only
// page view report to DNDR. Addresses are from documentation ranges (RFC 5737).
// Run: node --test

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker, {
  DNDR_FORWARD_ENVIRONMENTS, dndrForwardingEnabled, forwardToDndr, isPageView, pageEvent,
} from "../worker.js";

const assets = (status = 200, body = "<!doctype html>") => ({
  async fetch() {
    return new Response(body, { status, headers: { "content-type": "text/html" } });
  },
});

const page = (path = "/", headers = {}, method = "GET", host = "hakandundar-me-staging.dndr.net") => {
  const request = new Request(`https://${host}${path}`, {
    method,
    headers: {
      "accept": "text/html,application/xhtml+xml",
      "sec-fetch-dest": "document",
      "cf-ray": "8f00000000000001-LAX",
      "cf-connecting-ip": "198.51.100.23",
      "user-agent": "Mozilla/5.0 Chrome/152.0.0.0 Safari/537.36",
      "referer": "https://www.google.com/",
      ...headers,
    },
  });
  Object.defineProperty(request, "cf", { value: { country: "US", region: "California", regionCode: "CA", city: "Irvine", asn: 64496 } });
  return request;
};

const collector = (result = { status: "accepted" }) => {
  const calls = [];
  return {
    calls,
    async recordPage(event) {
      calls.push(event);
      return typeof result === "function" ? result() : result;
    },
  };
};

const context = () => {
  const pending = [];
  return { waitUntil: (promise) => pending.push(promise), settled: () => Promise.all(pending) };
};

const quietly = async (fn) => {
  const saved = [console.log, console.error];
  console.log = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    [console.log, console.error] = saved;
  }
};

const SECURITY = ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "Strict-Transport-Security"];

test("production: security headers, no robots header, nothing forwarded", async () => {
  const dndr = collector();
  const ctx = context();
  // Even a binding present by mistake does nothing outside staging.
  const response = await worker.fetch(page("/", {}, "GET", "hakandundar.me"), { ASSETS: assets(), DNDR_COLLECTOR: dndr }, ctx);
  await ctx.settled();
  for (const name of SECURITY) assert.ok(response.headers.get(name), name);
  assert.equal(response.headers.get("X-Robots-Tag"), null);
  assert.equal(await response.text(), "<!doctype html>");
  assert.equal(dndr.calls.length, 0);
  for (const ENVIRONMENT of ["production", "development", undefined]) {
    assert.equal(dndrForwardingEnabled({ ENVIRONMENT, DNDR_COLLECTOR: dndr }), false, String(ENVIRONMENT));
  }
  assert.deepEqual(DNDR_FORWARD_ENVIRONMENTS, ["staging"]);
});

test("staging: one PAGE event for a document view, with the request's own identity", async () => {
  const dndr = collector();
  const ctx = context();
  const response = await quietly(async () => {
    const r = await worker.fetch(page("/index.html"), { ASSETS: assets(), ENVIRONMENT: "staging", DNDR_COLLECTOR: dndr }, ctx);
    await ctx.settled();
    return r;
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  for (const name of SECURITY) assert.ok(response.headers.get(name), name);
  assert.deepEqual(dndr.calls, [{
    producerEventId: "request:8f00000000000001-LAX",
    hostname: "hakandundar-me-staging.dndr.net",
    path: "/",
    referrer: "https://www.google.com/",
    ip: "198.51.100.23",
    userAgent: "Mozilla/5.0 Chrome/152.0.0.0 Safari/537.36",
    country: "US",
    region: "California",
    regionCode: "CA",
    city: "Irvine",
    asn: 64496,
  }]);
  assert.equal("producerId" in dndr.calls[0], false, "the payload names no producer");
});

test("only a document view of the page counts", () => {
  const ok = new Response("", { status: 200 });
  assert.equal(isPageView(page("/"), ok), true);
  assert.equal(isPageView(page("/"), new Response(null, { status: 304 })), true);
  assert.equal(isPageView(page("/assets/style.css"), ok), false);
  assert.equal(isPageView(page("/missing"), new Response("", { status: 404 })), false);
  assert.equal(isPageView(page("/"), new Response("", { status: 404 })), false);
  assert.equal(isPageView(page("/", {}, "HEAD"), ok), false);
  assert.equal(isPageView(page("/", { "sec-fetch-dest": "image" }), ok), false);
  assert.equal(isPageView(page("/", { "sec-purpose": "prefetch" }), ok), false);
  assert.equal(isPageView(page("/", { "purpose": "prefetch" }), ok), false);
  assert.equal(isPageView(page("/", { "sec-purpose": "prefetch;prerender" }), ok), false);
  // Without fetch metadata, an HTML accept header is the signal.
  assert.equal(isPageView(page("/", { "sec-fetch-dest": "", "accept": "*/*" }), ok), false);
  assert.equal(isPageView(page("/", { "sec-fetch-dest": "" }), ok), true);
});

test("a failing DNDR never changes the response; an error is retried once with the same id", async () => {
  for (const failing of [
    collector(async () => { throw new Error("binding unavailable"); }),
    collector({ status: "error", reason: "write_failed" }),
    collector({ status: "rejected", reason: "producer_disabled" }),
    collector(async () => undefined),
  ]) {
    const ctx = context();
    const response = await quietly(async () => {
      const r = await worker.fetch(page("/"), { ASSETS: assets(), ENVIRONMENT: "staging", DNDR_COLLECTOR: failing }, ctx);
      await ctx.settled();
      return r;
    });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "<!doctype html>");
  }
  let calls = 0;
  const flaky = collector(async () => { calls += 1; if (calls === 1) throw new Error("transient"); return { status: "accepted" }; });
  const event = pageEvent(page("/"));
  assert.equal(await quietly(() => forwardToDndr({ DNDR_COLLECTOR: flaky }, event)), "accepted");
  assert.deepEqual(flaky.calls.map((e) => e.producerEventId), [event.producerEventId, event.producerEventId]);
  const refused = collector({ status: "rejected", reason: "producer_disabled" });
  assert.equal(await quietly(() => forwardToDndr({ DNDR_COLLECTOR: refused }, event)), "rejected");
  assert.equal(refused.calls.length, 1, "a refusal is final");
});

test("the outcome log carries the event id and never the address or the agent", async () => {
  const lines = [];
  const saved = [console.log, console.error];
  console.log = (line) => lines.push(line);
  console.error = (line) => lines.push(line);
  try {
    await forwardToDndr({ DNDR_COLLECTOR: collector() }, pageEvent(page("/")));
    await forwardToDndr({ DNDR_COLLECTOR: collector(async () => { throw new Error("down"); }) }, pageEvent(page("/")));
  } finally {
    [console.log, console.error] = saved;
  }
  assert.equal(lines.length, 2);
  for (const line of lines) {
    assert.match(line, /^dndr-forward: .* request:8f00000000000001-LAX$/);
    assert.equal(line.includes("198.51.100.23"), false);
    assert.equal(line.includes("Mozilla"), false);
  }
});

test("configuration: production has no binding, staging is isolated", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
    .replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
  assert.equal(config.name, "hakandundar-me");
  assert.equal(config.services, undefined);
  assert.equal(config.vars, undefined);
  assert.equal(config.assets.directory, "./dist");
  assert.equal(config.routes, undefined, "production routing is managed outside this file");
  const staging = config.env.staging;
  assert.equal(staging.name, "hakandundar-me-staging");
  assert.deepEqual(staging.vars, { ENVIRONMENT: "staging" });
  assert.equal(staging.assets.directory, "./dist-staging");
  assert.deepEqual(staging.assets.run_worker_first, ["/*"]);
  assert.equal(staging.workers_dev, false);
  assert.equal(staging.preview_urls, false);
  assert.deepEqual(staging.routes, [{ pattern: "hakandundar-me-staging.dndr.net", custom_domain: true }]);
  assert.deepEqual(staging.services, [{
    binding: "DNDR_COLLECTOR", service: "dndr-collector-staging", entrypoint: "ProducerApi",
    props: { producerId: "prd_hakandundar_me_staging_binding" },
  }]);
  assert.deepEqual(Object.keys(config.env), ["staging"]);
});
