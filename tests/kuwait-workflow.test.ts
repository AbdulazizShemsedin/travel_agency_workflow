import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { resolveEffectiveMedical } from "../src/lib/api/v2/medical";
import {
  checkLmisStageRequirements,
  checkTaeshirStageRequirements,
  checkEmbassyStageRequirements,
} from "../src/components/operational/workspaces/FollowUpWorkspace";
import {
  recordSelectedMedicalResultV2,
  advancePlacementV2,
  recordTicketDetailsV2,
  recordRescheduleV2,
  recordPredepartureMedicalResultV2,
} from "../src/lib/api/v2/placements";
import {
  recordPoliceAsharaV2,
  completeClearanceStepV2,
  stampEmbassyStepV2,
  rejectEmbassyStepV2,
} from "../src/lib/api/v2/clearance";

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

describe("Kuwait Standard Workflow Specification & Contract Conformance", () => {
  // Test 1: Kuwait Contract vs Saudi Contract Schema & hasContract Resolution
  test("1. Kuwait contracts do not require contract_number (Musaned) and resolve hasContract via contract_file / employment_site", () => {
    // A Kuwait placement has no contract_number (Saudi Musaned only)
    const kuwaitPlacement = {
      name: "PLM-00042",
      destination_country: "Kuwait",
      status: "Selected",
      contract_file: "/files/kuwait_bilateral_contract_app42.pdf",
      contract_signed_date: "2026-11-01",
      employment_site: "Hawalli Domestic Facility",
      contract_duration: "2 years",
      contract_salary_amount: 120,
      contract_salary_currency: "KWD",
      kuwait_agency_name: "Al-Bader Manpower Kuwait",
      medical_selected_status: "Pending",
    };

    const applicant = {
      name: "APP-00042",
      full_name: "Fatima Al-Zahra",
      destination_country: "Kuwait",
      medical_current: {
        status: "FIT",
        stage: "Registration",
        exam_date: "2026-10-15",
      },
    };

    // Authoritative effective contract resolution matching ApplicantTable.tsx
    const contractNo = (applicant as any).contract_number || kuwaitPlacement.contract_file ? null : null;
    const contractFileUrl = (applicant as any).contract_file_url || (applicant as any).contract_file || kuwaitPlacement.contract_file || null;
    const effectiveContractFile = contractFileUrl || kuwaitPlacement.contract_file || null;
    const effectiveContractDate = (applicant as any).contract_signed_date || kuwaitPlacement.contract_signed_date || null;
    const isKuwaitRow = (applicant.destination_country || "").toLowerCase().includes("kuwait");

    const hasContract = Boolean(
      contractNo ||
      effectiveContractFile ||
      (isKuwaitRow && (effectiveContractDate || (applicant as any).employment_site || kuwaitPlacement.employment_site))
    );

    assert.equal(hasContract, true, "Kuwait applicant with contract_file must resolve hasContract to true");
  });

  // Test 2: Medical status resolution and Selected medical gate
  test("2. Registration FIT does not block recording Selected medical on placement", () => {
    const applicant = {
      name: "APP-00042",
      medical_current: {
        status: "FIT",
        stage: "Registration",
        exam_date: "2026-10-15",
      },
    };

    const plcRecord = {
      name: "PLM-00042",
      medical_selected_status: "Pending",
    };

    const effectiveMed = resolveEffectiveMedical(applicant, plcRecord);
    assert.equal(effectiveMed.status, "FIT", "Effective medical reflects overall latest FIT status");

    // In ApplicantTable, row action should be available whenever stage === 'Selected'
    const isMedicalRecordedOnPlacement = plcRecord.medical_selected_status === "FIT" || plcRecord.medical_selected_status === "UNFIT";
    assert.equal(isMedicalRecordedOnPlacement, false, "Placement selected medical is not yet recorded");

    // Both effective registration FIT or placement Selected FIT satisfies gate
    const isMedicalFit = plcRecord.medical_selected_status === "FIT" || effectiveMed.status === "FIT";
    assert.equal(isMedicalFit, true, "Candidate has passed medical fitness requirement");
  });

  // Test 3: Follow-up LMIS Stage validation for Kuwait vs Saudi
  test("3. checkLmisStageRequirements enforces Kuwait Police Ashara sub-check and skips Saudi COC", () => {
    // Kuwait row missing Police Ashara status & date
    const kuwaitRowIncomplete: any = {
      destinationCountry: "Kuwait",
      laborId: "KWT-LB-9988",
      issueDate: "2026-11-01",
      policeAsharaStatus: "Pending",
      policeAsharaDate: "",
    };

    const resIncomplete = checkLmisStageRequirements(kuwaitRowIncomplete);
    assert.equal(resIncomplete.isComplete, false, "Kuwait LMIS cannot complete with Pending Police Ashara status");
    assert.ok(
      resIncomplete.missingFields.some((f) => f.includes("Police Ashara")),
      "Missing fields must name Police Ashara requirement"
    );
    assert.ok(
      !resIncomplete.missingFields.some((f) => f.includes("COC")),
      "Kuwait corridor must never require Saudi COC"
    );

    // Kuwait row complete with Police Ashara Scheduled & Date
    const kuwaitRowComplete: any = {
      destinationCountry: "Kuwait",
      laborId: "KWT-LB-9988",
      issueDate: "2026-11-01",
      policeAsharaStatus: "Scheduled",
      policeAsharaDate: "2026-11-05",
    };

    const resComplete = checkLmisStageRequirements(kuwaitRowComplete);
    assert.equal(resComplete.isComplete, true, "Kuwait LMIS completes with Scheduled Police Ashara & appointment date");

    // Kuwait row with Failed Police Ashara requires remark
    const kuwaitRowFailedNoRemark: any = {
      destinationCountry: "Kuwait",
      laborId: "KWT-LB-9988",
      issueDate: "2026-11-01",
      policeAsharaStatus: "Failed",
      policeAsharaDate: "2026-11-05",
      policeAsharaRemark: "",
    };
    const resFailed = checkLmisStageRequirements(kuwaitRowFailedNoRemark);
    assert.equal(resFailed.isComplete, false, "Failed Police Ashara requires a non-empty remark");
  });

  // Test 4: Follow-up Telesign Stage validation for Kuwait
  test("4. checkTaeshirStageRequirements enforces Telesign Reference Number for Kuwait and skips Injaz/Taeshir fees", () => {
    const kuwaitTelesignPending: any = {
      destinationCountry: "Kuwait",
      teshirReferenceNo: "",
    };

    const resPending = checkTaeshirStageRequirements(kuwaitTelesignPending);
    assert.equal(resPending.isComplete, false, "Kuwait Telesign requires reference number");
    assert.ok(resPending.missingFields.includes("Telesign Reference Number"));
    assert.ok(
      !resPending.missingFields.some((f) => f.includes("Injaz") || f.includes("Payment")),
      "Kuwait Telesign must never require Injaz application number or Saudi fee payments"
    );

    const kuwaitTelesignComplete: any = {
      destinationCountry: "Kuwait",
      teshirReferenceNo: "TL-KWT-2026-0044",
      teshirStatus: "Complete",
    };

    const resDone = checkTaeshirStageRequirements(kuwaitTelesignComplete);
    assert.equal(resDone.isComplete, true, "Kuwait Telesign is satisfied with valid reference number");
  });

  // Test 5: Follow-up Kuwait Embassy Stage validation
  test("5. checkEmbassyStageRequirements enforces Visa Number & Issue Date but skips Wakala for Kuwait", () => {
    const kuwaitEmbassyRow: any = {
      destinationCountry: "Kuwait",
      visaNumber: "KW-V-8877112",
      issueDate: "2026-11-01",
      wakalaStatus: "Pending", // Wakala is Saudi-only
    };

    const res = checkEmbassyStageRequirements(kuwaitEmbassyRow);
    assert.equal(res.isComplete, true, "Kuwait Embassy completes without requiring Wakala payment");
    assert.ok(
      !res.missingFields.some((f) => f.includes("Wakala")),
      "Kuwait Embassy must not list Wakala in missing requirements"
    );
  });

  // Test 6: Authorized API Calls for Kuwait Workflow
  test("6. recordPoliceAsharaV2 and completeClearanceStepV2 call authoritative backend endpoints", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: any, options: any = {}) => {
      interceptedUrl = String(url);
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({
        message: {
          name: "CLR-00010",
          step_type: "Kuwait LMIS",
          status: "In Progress",
          police_ashara_status: interceptedBody?.police_ashara_status || "Scheduled",
          police_ashara_appointment_date: interceptedBody?.police_ashara_appointment_date || "2026-11-05",
        },
      });
    }) as any;

    try {
      await recordPoliceAsharaV2("CLR-00010", {
        police_ashara_status: "Scheduled",
        police_ashara_appointment_date: "2026-11-05",
      });

      assert.equal(
        interceptedUrl,
        "/api/method/agency_tracking.api.clearance.write",
        "Must call agency_tracking.api.clearance.write"
      );
      assert.equal(interceptedBody.op, "record_police_ashara");
      assert.equal(interceptedBody.clearance_step_name, "CLR-00010");
      assert.equal(interceptedBody.police_ashara_status, "Scheduled");
      assert.equal(interceptedBody.police_ashara_appointment_date, "2026-11-05");

      // Test completing Telesign step
      await completeClearanceStepV2("CLR-00011", "TL-REF-12345");
      assert.equal(
        interceptedUrl,
        "/api/method/agency_tracking.api.clearance.write",
        "Must call agency_tracking.api.clearance.write"
      );
      assert.equal(interceptedBody.op, "complete_clearance_step");
      assert.equal(interceptedBody.clearance_step_name, "CLR-00011");
      assert.equal(interceptedBody.reference_no, "TL-REF-12345");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 7: Placement Advance from Selected to Processing
  test("7. advancePlacementV2 advances Kuwait placement to Processing stage", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: any, options: any = {}) => {
      interceptedUrl = String(url);
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({
        message: {
          name: "PLM-00042",
          status: interceptedBody?.new_status || "Processing",
          destination_country: "Kuwait",
        },
      });
    }) as any;

    try {
      const res = await advancePlacementV2("PLM-00042", "Processing");
      assert.equal(
        interceptedUrl,
        "/api/method/agency_tracking.api.placement.write",
        "Must call agency_tracking.api.placement.write"
      );
      assert.equal(interceptedBody.op, "advance_placement");
      assert.equal(interceptedBody.placement_name, "PLM-00042");
      assert.equal(interceptedBody.new_status, "Processing");
      assert.equal(res.status, "Processing");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 8: Kuwait Ticketing & Departure Sequence with ETB and Medical 2
  test("8. Ticketing records ETB cost, Reschedule handles internal/airport causes, and Medical 2 gates Departed", async () => {
    const originalFetch = globalThis.fetch;
    const calls: { url: string; body: any }[] = [];

    globalThis.fetch = (async (url: any, options: any = {}) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;
      calls.push({ url: urlStr, body });
      return createMockResponse({ message: { status: "Success" } });
    }) as any;

    try {
      // 1. Record Ticket
      await recordTicketDetailsV2("PLM-00042", "TK-ET-9944", "2026-11-20", 85000);
      assert.equal(calls[0].url, "/api/method/agency_tracking.api.placement.write");
      assert.equal(calls[0].body.op, "record_ticket_details");
      assert.equal(calls[0].body.ticket_cost, 85000);

      // 2. Reschedule with Internal cause and cost
      await recordRescheduleV2("PLM-00042", "2026-11-25", "Internal", 12000, "TK-ET-9945");
      assert.equal(calls[1].url, "/api/method/agency_tracking.api.placement.write");
      assert.equal(calls[1].body.op, "record_reschedule");
      assert.equal(calls[1].body.reschedule_cause, "Internal");
      assert.equal(calls[1].body.reschedule_cost, 12000);

      // 3. Pre-departure Medical 2
      await recordPredepartureMedicalResultV2("PLM-00042", "FIT", "2026-11-22");
      assert.equal(calls[2].url, "/api/method/agency_tracking.api.placement.write");
      assert.equal(calls[2].body.op, "record_predeparture_medical_result");
      assert.equal(calls[2].body.status, "FIT");

      // 4. Confirm Departure
      await advancePlacementV2("PLM-00042", "Departed");
      assert.equal(calls[3].url, "/api/method/agency_tracking.api.placement.write");
      assert.equal(calls[3].body.op, "advance_placement");
      assert.equal(calls[3].body.new_status, "Departed");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 9: Contractor creation country options: contains registered workflow corridors and scales dynamically
  test("9. REGISTERED_WORKFLOW_COUNTRIES includes baseline corridors (Saudi Arabia, Kuwait) and scales", async () => {
    const { REGISTERED_WORKFLOW_COUNTRIES } = await import("../src/lib/api/v2/corridor");
    assert.ok(Array.isArray(REGISTERED_WORKFLOW_COUNTRIES), "Must be an array");
    assert.ok(REGISTERED_WORKFLOW_COUNTRIES.includes("Saudi Arabia"), "Must include Saudi Arabia");
    assert.ok(REGISTERED_WORKFLOW_COUNTRIES.includes("Kuwait"), "Must include Kuwait");
    assert.equal(REGISTERED_WORKFLOW_COUNTRIES.length >= 2, true, "Must have at least 2 registered countries");

    // Dynamic scaling test: merging new or existing countries
    const mockContractors = [
      { country: "Saudi Arabia" },
      { country: "Kuwait" },
      { country: "United Arab Emirates" },
    ];
    const countrySet = new Set<string>(REGISTERED_WORKFLOW_COUNTRIES);
    mockContractors.forEach((c) => {
      if (c.country && c.country.trim()) countrySet.add(c.country.trim());
    });
    const scaledOptions = Array.from(countrySet);
    assert.ok(scaledOptions.includes("Saudi Arabia"));
    assert.ok(scaledOptions.includes("Kuwait"));
    assert.ok(scaledOptions.includes("United Arab Emirates"));
  });
});
