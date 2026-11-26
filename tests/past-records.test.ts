import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  createPastRecordV2,
  getPastRecordFormV2,
  listPastRecordsV2,
  undoPastRecordV2,
  V2PastRecordCreatePayload,
} from "../src/lib/api/v2/pastRecords";
import { formatCleanErrorMessage } from "../src/lib/utils/error-formatter";

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

describe("Past Records API & Stage-Aware Conformance Tests", () => {
  const originalFetch = globalThis.fetch;

  test("1. CV Generated applicant payload: only includes registered_on and cv_generated_on, omits later dates", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    globalThis.fetch = (async (url: any, init: any) => {
      capturedUrl = String(url);
      if (init?.body && typeof init.body === "string") {
        capturedBody = JSON.parse(init.body);
      }
      return createMockResponse({
        message: { name: "REC-001", applicant: "APP-001", status: "Saved" },
      });
    }) as any;

    try {
      const payload: V2PastRecordCreatePayload = {
        worker: {
          full_name: "TIRUWORK BEKELE",
          passport_number: "EP1234567",
          gender: "Female",
          entry_track: "Standard",
          destination_country: "Saudi Arabia",
        },
        stage: "CV Generated",
        dates: {
          registered_on: "2026-08-01",
          cv_generated_on: "2026-08-05",
        },
      };

      const res = await createPastRecordV2(payload);
      assert.strictEqual(res.name || (res as any).message?.name, "REC-001");
      assert.ok(capturedUrl.includes("/v1/past-records") || capturedUrl.includes("create_past_record"));
      assert.strictEqual(capturedBody.stage, "CV Generated");
      assert.strictEqual(capturedBody.dates.registered_on, "2026-08-01");
      assert.strictEqual(capturedBody.dates.cv_generated_on, "2026-08-05");
      assert.strictEqual(capturedBody.dates.processing_on, undefined);
      assert.strictEqual(capturedBody.dates.processing_started_on, undefined);
      assert.strictEqual(capturedBody.dates.departed_on, undefined);
      assert.strictEqual(capturedBody.case, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("2. Departed applicant payload: maps processing_started_on to processing_on and preserves all stage dates", async () => {
    let capturedBody: any = null;

    globalThis.fetch = (async (_url: any, init: any) => {
      if (init?.body && typeof init.body === "string") {
        capturedBody = JSON.parse(init.body);
      }
      return createMockResponse({
        name: "REC-002",
        applicant: "APP-002",
        placement: "PLC-002",
        status: "Saved",
      });
    }) as any;

    try {
      const payload: V2PastRecordCreatePayload = {
        worker: {
          full_name: "ALMAZ AYANA DEMISSIE",
          passport_number: "EP7654321",
          gender: "Female",
          entry_track: "Standard",
          destination_country: "Kuwait",
        },
        stage: "Departed",
        dates: {
          registered_on: "2026-05-01",
          cv_generated_on: "2026-05-03",
          selected_on: "2026-05-10",
          processing_started_on: "2026-05-15", // Legacy alias that caused 417
          stamped_on: "2026-06-01",
          ticketed_on: "2026-06-10",
          departed_on: "2026-06-15",
        },
        case: {
          contractor: "AL-SHAMEL AGENCY",
          visa_number: "1300998811",
          ticket_number: "ET-071-889900",
          medical_result: "FIT",
          medical_2_result: "FIT",
        },
        commission: {
          contractor: "AL-SHAMEL AGENCY",
          amount: 4500,
          currency: "SAR",
        },
      };

      const res = await createPastRecordV2(payload);
      assert.strictEqual(res.name, "REC-002");
      // Critical check: processing_started_on must be sanitized to processing_on
      assert.strictEqual(capturedBody.dates.processing_on, "2026-05-15");
      assert.strictEqual(capturedBody.dates.processing_started_on, undefined);
      assert.strictEqual(capturedBody.dates.registered_on, "2026-05-01");
      assert.strictEqual(capturedBody.dates.departed_on, "2026-06-15");
      assert.strictEqual(capturedBody.case.contractor, "AL-SHAMEL AGENCY");
      assert.strictEqual(capturedBody.case.visa_number, "1300998811");
      assert.strictEqual(capturedBody.commission.amount, 4500);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("3. Direct processing_on key is preserved without distortion", async () => {
    let capturedBody: any = null;

    globalThis.fetch = (async (_url: any, init: any) => {
      if (init?.body && typeof init.body === "string") {
        capturedBody = JSON.parse(init.body);
      }
      return createMockResponse({ name: "REC-003", status: "Saved" });
    }) as any;

    try {
      const payload: V2PastRecordCreatePayload = {
        worker: {
          full_name: "FATUMA ROBE",
          passport_number: "EP9988776",
          gender: "Female",
          entry_track: "Standard",
          destination_country: "Saudi Arabia",
        },
        stage: "Processing",
        dates: {
          registered_on: "2026-07-01",
          processing_on: "2026-07-10",
        },
      };

      await createPastRecordV2(payload);
      assert.strictEqual(capturedBody.dates.processing_on, "2026-07-10");
      assert.strictEqual(capturedBody.dates.processing_started_on, undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("4. Empty date strings are stripped from payload to prevent backend closed-schema validation errors", async () => {
    let capturedBody: any = null;

    globalThis.fetch = (async (_url: any, init: any) => {
      if (init?.body && typeof init.body === "string") {
        capturedBody = JSON.parse(init.body);
      }
      return createMockResponse({ name: "REC-004", status: "Saved" });
    }) as any;

    try {
      const payload: V2PastRecordCreatePayload = {
        worker: {
          full_name: "MERON TADESSE",
          passport_number: "EP5544332",
          gender: "Female",
          entry_track: "Standard",
          destination_country: "Saudi Arabia",
        },
        stage: "Registered",
        dates: {
          registered_on: "2026-09-01",
          cv_generated_on: "",
          selected_on: "   ",
          processing_on: undefined as any,
          departed_on: "",
        },
      };

      await createPastRecordV2(payload);
      assert.strictEqual(capturedBody.dates.registered_on, "2026-09-01");
      assert.strictEqual(capturedBody.dates.cv_generated_on, undefined);
      assert.strictEqual(capturedBody.dates.selected_on, undefined);
      assert.strictEqual(capturedBody.dates.departed_on, undefined);
      assert.deepStrictEqual(Object.keys(capturedBody.dates), ["registered_on"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("5. Error Formatter: Sanitizes 'Unknown dates: processing_started_on.' into friendly feedback", () => {
    const rawError = "Unknown dates: processing_started_on.";
    const cleanMsg = formatCleanErrorMessage(rawError);
    assert.strictEqual(
      cleanMsg,
      "We couldn't save this record because one of its date fields is not supported by the system. Please review your milestone dates or contact the administrator."
    );
    assert.ok(!cleanMsg.includes("processing_started_on"));
    assert.ok(!cleanMsg.includes("Unknown dates"));
  });

  test("6. Error Formatter: Sanitizes duplicate record error into actionable user feedback", () => {
    const rawError = "ValidationError: Past record already exists for passport EP1234567";
    const cleanMsg = formatCleanErrorMessage(rawError);
    assert.strictEqual(
      cleanMsg,
      "A past record for this applicant or passport number may already exist. Please check the existing records in the History tab."
    );
  });

  test("7. Error Formatter: Sanitizes missing required date error", () => {
    const rawError = "ValidationError: Missing required date: registered_on is mandatory";
    const cleanMsg = formatCleanErrorMessage(rawError);
    assert.strictEqual(cleanMsg, "Please provide the required date before submitting.");
  });

  test("8. Error Formatter: Maps technical date field names in FIELD_NAME_MAP", () => {
    const rawError = "Value required for processing_started_on";
    const cleanMsg = formatCleanErrorMessage(rawError);
    assert.ok(cleanMsg.includes("clearance processing date") || cleanMsg.includes("date"));
    assert.ok(!cleanMsg.includes("processing_started_on"));
  });
});
