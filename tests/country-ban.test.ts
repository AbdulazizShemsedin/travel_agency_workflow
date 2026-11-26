import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  setCountryBanV2,
  listCountryBansV2,
  removeCountryBanV2,
  undoCountryBanLiftV2,
  requestCountryBanExceptionV2,
  listCountryBanRequestsV2,
  decideCountryBanRequestV2,
  undoCountryBanDecisionV2,
  V2CountryBanRecord,
  V2CountryBanRequestItem,
} from "../src/lib/api/v2/applicants";

function createMockResponse(bodyData: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {
      get: (header: string) => {
        if (header.toLowerCase() === "content-type") return "application/json";
        return null;
      },
    } as any,
    text: async () => JSON.stringify(bodyData),
    json: async () => bodyData,
    redirected: false,
    type: "basic",
    url: "https://mock.local",
    clone: () => createMockResponse(bodyData, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob([]),
    formData: async () => new FormData(),
    bytes: async () => new Uint8Array([]),
  } as Response;
}

describe("Applicant Country Ban & Ban Requests Conformance", () => {
  const originalFetch = globalThis.fetch;

  test("1. setCountryBanV2 sends correct applicant, country, and reason payload to /v1/country-bans", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      capturedBody = init?.body ? JSON.parse(init.body) : null;
      return createMockResponse({
        name: "ACB-0001",
        applicant: "APP-00001",
        country: "Saudi Arabia",
        reason: "Returned worker with active complaint CMP-01",
      });
    }) as any;

    try {
      const res = await setCountryBanV2(
        "APP-00001",
        "Saudi Arabia",
        "Returned worker with active complaint CMP-01"
      );
      assert.ok(capturedUrl.includes("/v1/country-bans"));
      assert.equal(capturedBody?.applicant_name, "APP-00001");
      assert.equal(capturedBody?.country, "Saudi Arabia");
      assert.equal(capturedBody?.reason, "Returned worker with active complaint CMP-01");
      assert.equal((res as any).name, "ACB-0001");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("2. listCountryBansV2 distinguishes active vs full audit history via query params", async () => {
    const mockBans: V2CountryBanRecord[] = [
      {
        name: "ACB-0001",
        applicant: "APP-00001",
        country: "Saudi Arabia",
        reason: "Past dispute",
        active: 1,
        set_by: "registrar@agency.com",
      },
      {
        name: "ACB-0002",
        applicant: "APP-00002",
        country: "Kuwait",
        reason: "Regulatory block",
        active: 0,
        set_by: "manager@agency.com",
        lifted_by: "admin@agency.com",
        lift_reason: "Dispute settled",
      },
    ];

    const capturedUrls: string[] = [];

    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      capturedUrls.push(urlStr);
      return createMockResponse(mockBans);
    }) as any;

    try {
      // 2a. Active only (default)
      const activeRes = await listCountryBansV2(undefined, 1);
      assert.equal(activeRes.length, 2);
      assert.ok(capturedUrls[0]?.includes("/v1/country-bans"));
      assert.ok(capturedUrls[0]?.includes("active_only=1"));

      // 2b. Full history for one applicant
      await listCountryBansV2("APP-00001", 0);
      assert.ok(capturedUrls[1]?.includes("/v1/country-bans"));
      assert.ok(capturedUrls[1]?.includes("active_only=0"));
      assert.ok(capturedUrls[1]?.includes("applicant_name=APP-00001"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("3. removeCountryBanV2 routes to /v1/country-bans/{name}/lift with lift_reason", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      capturedBody = init?.body ? JSON.parse(init.body) : null;
      return createMockResponse({
        lifted: "ACB-0001",
        status: "success",
      });
    }) as any;

    try {
      const res = await removeCountryBanV2("ACB-0001", "Employer withdrawn complaint");
      assert.ok(capturedUrl.includes("/v1/country-bans/ACB-0001/lift"));
      assert.equal(capturedBody?.lift_reason, "Employer withdrawn complaint");
      assert.equal(res.lifted, "ACB-0001");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("4. undoCountryBanLiftV2 routes to /v1/country-bans/{name}/undo-lift", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      capturedBody = init?.body ? JSON.parse(init.body) : null;
      return createMockResponse({
        message: "Ban restored to active status",
      });
    }) as any;

    try {
      const res = await undoCountryBanLiftV2("ACB-0001", "Lift was granted in error");
      assert.ok(capturedUrl.includes("/v1/country-bans/ACB-0001/undo-lift"));
      assert.equal(capturedBody?.reason, "Lift was granted in error");
      assert.ok((res as any).message?.includes("restored"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("5. requestCountryBanExceptionV2 enforces action-specific Override vs Lift", async () => {
    const capturedBodies: any[] = [];
    const capturedUrls: string[] = [];

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      capturedUrls.push(urlStr);
      capturedBodies.push(init?.body ? JSON.parse(init.body) : null);
      return createMockResponse({ message: "Request filed successfully" });
    }) as any;

    try {
      // 5a. Action-specific Override request for Register
      await requestCountryBanExceptionV2(
        "APP-00001",
        "Override",
        "Candidate submitted new clearance evidence",
        "Register"
      );
      assert.ok(capturedUrls[0]?.includes("/v1/country-ban-requests"));
      assert.equal(capturedBodies[0]?.applicant_name, "APP-00001");
      assert.equal(capturedBodies[0]?.request_type, "Override");
      assert.equal(capturedBodies[0]?.action, "Register");

      // 5b. Action-specific Override request for Change Destination
      await requestCountryBanExceptionV2(
        "APP-00001",
        "Override",
        "Switching applicant from banned corridor",
        "Change Destination",
        "Kuwait"
      );
      assert.equal(capturedBodies[1]?.action, "Change Destination");
      assert.equal(capturedBodies[1]?.country, "Kuwait");

      // 5c. Permanent Lift request
      await requestCountryBanExceptionV2(
        "APP-00001",
        "Lift",
        "Old ban expired under ministry pardon policy"
      );
      assert.equal(capturedBodies[2]?.request_type, "Lift");
      assert.equal(capturedBodies[2]?.action, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("6. decideCountryBanRequestV2 and undoCountryBanDecisionV2 route to REST paths", async () => {
    const capturedBodies: any[] = [];
    const capturedUrls: string[] = [];

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      capturedUrls.push(urlStr);
      capturedBodies.push(init?.body ? JSON.parse(init.body) : null);
      return createMockResponse({ message: "Decision recorded" });
    }) as any;

    try {
      // 6a. Approve
      await decideCountryBanRequestV2("CBR-0001", "Approve", "Approved single-use override for registration");
      assert.ok(capturedUrls[0]?.includes("/v1/country-ban-requests/CBR-0001/decide"));
      assert.equal(capturedBodies[0]?.decision, "Approve");
      assert.equal(capturedBodies[0]?.note, "Approved single-use override for registration");

      // 6b. Reject
      await decideCountryBanRequestV2("CBR-0002", "Reject", "Insufficient clearance verification");
      assert.ok(capturedUrls[1]?.includes("/v1/country-ban-requests/CBR-0002/decide"));
      assert.equal(capturedBodies[1]?.decision, "Reject");

      // 6c. Undo Decision
      await undoCountryBanDecisionV2("CBR-0001");
      assert.ok(capturedUrls[2]?.includes("/v1/country-ban-requests/CBR-0001/undo-decision"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("7. Handles 417 expectation failures for duplicate requests cleanly", async () => {
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("csrf-token") || urlStr.includes("get_csrf_token")) {
        return createMockResponse({ csrf_token: "mock-csrf-token" });
      }
      return createMockResponse(
        {
          exc_type: "ValidationError",
          message: "An active country ban exception request is already pending for this applicant and action.",
        },
        417
      );
    }) as any;

    try {
      await assert.rejects(
        async () => {
          await requestCountryBanExceptionV2("APP-00001", "Override", "Duplicate attempt", "Register");
        },
        (err: any) => {
          assert.ok(err.message.includes("already pending") || err.status === 417);
          return true;
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
