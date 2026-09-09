import assert from "node:assert/strict";
import test from "node:test";

const routes = [
  ["/enterprise", "ShiftNote"],
  ["/enterprise/demo", "Step inside your Enterprise workspace"],
  ["/enterprise/subscription", "Enterprise Features"],
  ["/enterprise/request-demo", "Work Email"],
  ["/enterprise/request-demo/success", "no request was submitted"],
  ["/enterprise/dashboard", "Your organization at a glance"],
  ["/enterprise/organizations", "Organization structure"],
  ["/enterprise/facilities", "Riverbend Senior Care"],
  ["/enterprise/departments", "Care Coordination"],
  ["/enterprise/users", "Alex Morgan"],
  ["/enterprise/analytics", "Monthly Usage"],
  ["/enterprise/integrations", "Homecare Homebase"],
  ["/enterprise/billing", "No subscription, invoices, or payment methods"],
  ["/enterprise/settings", "Organization preferences"],
  ["/enterprise/support", "About this preview"],
];

test("every Enterprise route renders publicly without a backend request", async () => {
  const { default: worker } = await import("../dist/server/index.js");
  const originalFetch = globalThis.fetch;
  const unexpectedRequests = [];
  globalThis.fetch = async input => {
    unexpectedRequests.push(String(input));
    throw new Error("Enterprise prototype must render without external services");
  };
  try {
    for (const [path, content] of routes) {
      const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(response.status, 200, `${path} must be public`);
      assert.equal(response.headers.get("location"), null, `${path} must not redirect`);
      const html = await response.text();
      assert.ok(html.includes(content), `${path} must contain its own content`);
      assert.ok(!html.includes('aria-label="Open ShiftNote assistant"'), `${path} must not include the Professional PIP`);
    }
    assert.deepEqual(unexpectedRequests, [], "Enterprise rendered without Supabase, Stripe, or other backend requests");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
