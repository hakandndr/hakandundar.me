// The two builds: production keeps its page exactly, staging is never indexed
// and never reports to DNDR's production V1 collector.
// Run: node --test

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// Built in a scratch copy so the test never touches dist/ or dist-staging/.
const build = (...args) => {
  const dir = mkdtempSync(join(tmpdir(), "hakandundar-me-build-"));
  try {
    for (const entry of ["build.js", "data", "assets"]) cpSync(join(ROOT, entry), join(dir, entry), { recursive: true });
    execFileSync(process.execPath, ["build.js", ...args], { cwd: dir, stdio: "pipe" });
    const out = args.includes("--staging") ? "dist-staging" : "dist";
    return readFileSync(join(dir, out, "index.html"), "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test("production keeps the V1 beacon and stays indexable", () => {
  const html = build();
  assert.equal((html.match(/https:\/\/dndr\.net\/collect/g) || []).length, 1);
  assert.equal(html.includes('name="robots"'), false);
});

test("staging has no beacon, is noindex, and is otherwise the same page", () => {
  const production = build();
  const staging = build("--staging");
  assert.equal(staging.includes("dndr.net/collect"), false);
  assert.equal(staging.includes("sessionStorage"), false);
  assert.match(staging, /<meta name="robots" content="noindex, nofollow">/);
  const start = production.indexOf("<script>\n(function () {\n  try {\n    var page =");
  const end = production.indexOf("</script>", start) + "</script>".length;
  assert.ok(start > 0 && end > start);
  const withoutBeacon = production.slice(0, start) + production.slice(end);
  assert.equal(staging.replace('\n<meta name="robots" content="noindex, nofollow">', ""), withoutBeacon);
});
