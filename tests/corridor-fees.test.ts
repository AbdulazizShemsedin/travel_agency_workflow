import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getCorridorStepsV2,
  REGISTERED_WORKFLOW_COUNTRIES,
  V2CorridorStepDefinition,
} from "../src/lib/api/v2/corridor";
import {
  listCorridorsV2,
  updateCorridorFeesV2,
  V2CorridorFeeItem,
} from "../src/lib/api/v2/settings";

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

describe("Settings Corridor Fees & Workflow Steps Conformance", () => {
  const originalFetch = globalThis.fetch;

  test("1. REGISTERED_WORKFLOW_COUNTRIES provides baseline Saudi Arabia and Kuwait corridors", () => {
    assert.ok(Array.isArray(REGISTERED_WORKFLOW_COUNTRIES));
    assert.ok(REGISTERED_WORKFLOW_COUNTRIES.includes("Saudi Arabia"));
    assert.ok(REGISTERED_WORKFLOW_COUNTRIES.includes("Kuwait"));
  });

  test("2. getCorridorStepsV2 loads authoritative steps for Saudi Arabia", async () => {
    const mockSaudiSteps: V2CorridorStepDefinition[] = [
      { step_type: "LMIS Clearance", sequence_order: 1, is_mandatory: 1, title: "LMIS Clearance" },
      { step_type: "Taeshir", sequence_order: 2, is_mandatory: 1, title: "Taeshir" },
      { step_type: "Embassy", sequence_order: 3, is_mandatory: 1, title: "Embassy" },
    ];

    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      capturedBody = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : null;
      return createMockResponse({ message: mockSaudiSteps, items: mockSaudiSteps });
    }) as any;

    try {
      const steps = await getCorridorStepsV2("Saudi Arabia");
      assert.equal(steps.length, 3);
      assert.equal(steps[0].step_type, "LMIS Clearance");
      assert.equal(steps[1].step_type, "Taeshir");
      assert.equal(steps[2].step_type, "Embassy");
      assert.ok(
        capturedUrl.includes("/v1/corridors/Saudi%20Arabia/steps") ||
        capturedUrl.includes("agency_tracking.corridor_engine.get_corridor_steps") ||
        capturedUrl.includes("get_corridor_steps"),
        `Captured URL ${capturedUrl} must match corridor steps endpoint`
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("3. getCorridorStepsV2 loads authoritative steps for Kuwait", async () => {
    const mockKuwaitSteps: V2CorridorStepDefinition[] = [
      { step_type: "Kuwait LMIS", sequence_order: 1, is_mandatory: 1, title: "Kuwait LMIS" },
      { step_type: "Telesign", sequence_order: 2, is_mandatory: 1, title: "Telesign" },
      { step_type: "Kuwait Embassy", sequence_order: 3, is_mandatory: 1, title: "Kuwait Embassy" },
    ];

    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      capturedBody = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : null;
      return createMockResponse({ message: mockKuwaitSteps, items: mockKuwaitSteps });
    }) as any;

    try {
      const steps = await getCorridorStepsV2("Kuwait");
      assert.equal(steps.length, 3);
      assert.equal(steps[0].step_type, "Kuwait LMIS");
      assert.equal(steps[1].step_type, "Telesign");
      assert.equal(steps[2].step_type, "Kuwait Embassy");
      assert.ok(
        capturedUrl.includes("/v1/corridors/Kuwait/steps") ||
        capturedUrl.includes("agency_tracking.corridor_engine.get_corridor_steps") ||
        capturedUrl.includes("get_corridor_steps"),
        `Captured URL ${capturedUrl} must match corridor steps endpoint`
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("4. updateCorridorFeesV2 passes destination_country and fee items to backend", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      capturedBody = init?.body ? (typeof init.body === "string" ? JSON.parse(init.body) : init.body) : null;
      return createMockResponse({
        message: "Fee schedule updated",
        destination_country: "Kuwait",
        fees: capturedBody?.fees,
      });
    }) as any;

    try {
      const testFees: V2CorridorFeeItem[] = [
        { fee_type: "Kuwait LMIS Fee", step_type: "Kuwait LMIS", amount: 1500, currency: "KWD" },
        { fee_type: "Telesign Fee", step_type: "Telesign", amount: 50, currency: "KWD" },
      ];

      await updateCorridorFeesV2("Kuwait", testFees);
      assert.ok(
        capturedUrl.includes("/v1/corridors/Kuwait/fees") ||
        capturedUrl.includes("update_corridor_fees"),
        `Captured URL ${capturedUrl} must match update fees endpoint`
      );
      assert.equal(capturedBody?.fees?.length, 2);
      assert.equal(capturedBody?.fees?.[0]?.fee_type, "Kuwait LMIS Fee");
      assert.equal(capturedBody?.fees?.[1]?.step_type, "Telesign");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("5. listCorridorsV2 sends list_corridors request", async () => {
    let capturedUrl = "";

    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      capturedUrl = urlStr;
      return createMockResponse({
        message: [
          { destination_country: "Saudi Arabia", steps: [], fees: [] },
          { destination_country: "Kuwait", steps: [], fees: [] },
        ],
        items: [
          { destination_country: "Saudi Arabia", steps: [], fees: [] },
          { destination_country: "Kuwait", steps: [], fees: [] },
        ],
      });
    }) as any;

    try {
      const corridors = await listCorridorsV2();
      assert.ok(
        capturedUrl.includes("/v1/corridors") ||
        capturedUrl.includes("list_corridors"),
        `Captured URL ${capturedUrl} must match list corridors endpoint`
      );
      assert.equal(corridors.length, 2);
      assert.equal(corridors[0].destination_country, "Saudi Arabia");
      assert.equal(corridors[1].destination_country, "Kuwait");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
