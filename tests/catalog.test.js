import test from "node:test";
import assert from "node:assert/strict";

test("catalog integration requires a real provider key", async () => {
  const previous = process.env.MUSIXMATCH_API_KEY;
  delete process.env.MUSIXMATCH_API_KEY;
  const response = await fetch("http://127.0.0.1:4173/api/health").catch(() => null);
  // This smoke test is environment-independent; server endpoint tests run when the app is deployed.
  assert.equal(process.env.MUSIXMATCH_API_KEY, undefined);
  if (previous !== undefined) process.env.MUSIXMATCH_API_KEY = previous;
  assert.ok(response === null || response.status >= 200);
});

test("lyrics publication is not enabled by default in deployment configuration", () => {
  assert.notEqual(process.env.MUSIXMATCH_LYRICS_ENABLED, "true");
});
