import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { requestV2 } from "../src/lib/api/v2/client";

type Call = { url: string; method: string; body: any };

function captureFetch(calls: Call[]) {
  globalThis.fetch = (async (url: any, options: any = {}) => {
    const urlStr = String(url);
    if (urlStr.includes("get_csrf_token")) {
      return new Response(JSON.stringify({ message: { csrf_token: "t" } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    let body: any = options.body;
    if (typeof body === "string") body = JSON.parse(body);
    calls.push({ url: urlStr, method: options.method, body });
    return new Response(JSON.stringify({ message: { ok: 1 } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as any;
}

describe("Grouped endpoints: op travels where the server reads it", () => {
  test("a JSON POST sends op in the body and drops it from the address", async () => {
    const original = globalThis.fetch;
    const calls: Call[] = [];
    captureFetch(calls);
    try {
      await requestV2("/api/method/agency_tracking.api.placement.write?op=record_ticket_details", {
        method: "POST",
        body: { placement_name: "P1" },
      });
      assert.equal(calls[0].url, "/api/method/agency_tracking.api.placement.write");
      assert.deepEqual(calls[0].body, { placement_name: "P1", op: "record_ticket_details" });
    } finally {
      globalThis.fetch = original;
    }
  });

  test("a POST with no body still sends op", async () => {
    const original = globalThis.fetch;
    const calls: Call[] = [];
    captureFetch(calls);
    try {
      await requestV2("/api/method/agency_tracking.api.notification.write?op=mark_alerts_read");
      assert.equal(calls[0].url, "/api/method/agency_tracking.api.notification.write");
      assert.deepEqual(calls[0].body, { op: "mark_alerts_read" });
    } finally {
      globalThis.fetch = original;
    }
  });

  test("a file upload puts op in the form and keeps other query fields", async () => {
    const original = globalThis.fetch;
    const calls: Call[] = [];
    captureFetch(calls);
    try {
      const form = new FormData();
      form.append("field", "logo");
      await requestV2("/api/method/agency_tracking.api.settings.write?op=set_company_image&x=1", {
        method: "POST",
        body: form,
      });
      assert.equal(calls[0].url, "/api/method/agency_tracking.api.settings.write?x=1");
      assert.ok(calls[0].body instanceof FormData);
      assert.equal(calls[0].body.get("op"), "set_company_image");
      assert.equal(calls[0].body.get("field"), "logo");
    } finally {
      globalThis.fetch = original;
    }
  });

  test("a GET keeps op and its other fields in the query string", async () => {
    const original = globalThis.fetch;
    const calls: Call[] = [];
    captureFetch(calls);
    try {
      await requestV2("/api/method/agency_tracking.api.complaint.read?op=list_complaints&status=Open", { method: "GET" });
      assert.equal(calls[0].url, "/api/method/agency_tracking.api.complaint.read?op=list_complaints&status=Open");
      assert.equal(calls[0].body, undefined);
    } finally {
      globalThis.fetch = original;
    }
  });
});
