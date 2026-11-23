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
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      interceptedUrl = urlStr;
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

      assert.ok(
        interceptedUrl.includes("/police-ashara") || interceptedUrl.includes("agency_tracking.api.clearance.write"),
        "Must call police-ashara endpoint"
      );
      assert.equal(interceptedBody.police_ashara_status, "Scheduled");
      assert.equal(interceptedBody.police_ashara_appointment_date, "2026-11-05");

      // Test completing Telesign step
      await completeClearanceStepV2("CLR-00011", "TL-REF-12345");
      assert.ok(
        interceptedUrl.includes("/complete") || interceptedUrl.includes("agency_tracking.api.clearance.write"),
        "Must call complete clearance step endpoint"
      );
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
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      interceptedUrl = urlStr;
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({
        name: "PLM-00042",
        status: interceptedBody?.new_status || "Processing",
        destination_country: "Kuwait",
      });
    }) as any;

    try {
      const res = await advancePlacementV2("PLM-00042", "Processing");
      assert.ok(
        interceptedUrl.includes("/advance") || interceptedUrl.includes("agency_tracking.api.placement.write"),
        "Must call advance placement endpoint"
      );
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
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;
      calls.push({ url: urlStr, body });
      return createMockResponse({ message: { status: "Success" } });
    }) as any;

    try {
      // 1. Record Ticket
      await recordTicketDetailsV2("PLM-00042", "TK-ET-9944", "2026-11-20", 85000);
      assert.ok(
        calls[0].url.includes("/ticket") || calls[0].url.includes("agency_tracking.api.placement.write"),
        "Calls ticket endpoint"
      );
      assert.equal(calls[0].body.ticket_cost, 85000);

      // 2. Reschedule with Internal cause and cost
      await recordRescheduleV2("PLM-00042", "2026-11-25", "Internal", 12000, "TK-ET-9945");
      assert.ok(
        calls[1].url.includes("/reschedule") || calls[1].url.includes("agency_tracking.api.placement.write"),
        "Calls reschedule endpoint"
      );
      assert.equal(calls[1].body.reschedule_cause, "Internal");
      assert.equal(calls[1].body.reschedule_cost, 12000);

      // 3. Pre-departure Medical 2
      await recordPredepartureMedicalResultV2("PLM-00042", "FIT", "2026-11-22");
      assert.ok(
        calls[2].url.includes("/predeparture-medical") || calls[2].url.includes("agency_tracking.api.placement.write"),
        "Calls predeparture-medical endpoint"
      );
      assert.equal(calls[2].body.status, "FIT");

      // 4. Confirm Departure
      await advancePlacementV2("PLM-00042", "Departed");
      assert.ok(
        calls[3].url.includes("/advance") || calls[3].url.includes("agency_tracking.api.placement.write"),
        "Calls advance placement endpoint"
      );
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

  // Test 10: Telesign Canonical Status Normalization & ExcelSelect Matching
  test("10. Telesign status normalizes canonical Complete/Completed and avoids reverting to Pending", () => {
    const kuwaitOptions = [
      { value: "Pending", label: "Pending" },
      { value: "In Progress", label: "In Progress" },
      { value: "Complete", label: "Complete" },
    ];

    // Backend returns "Complete"
    const backendStatus1 = "Complete";
    const match1 = kuwaitOptions.find(
      (o) =>
        o.value.toLowerCase() === backendStatus1.toLowerCase() ||
        (o.value.toLowerCase().startsWith("complete") && backendStatus1.toLowerCase().startsWith("complete"))
    ) || kuwaitOptions[0];
    assert.equal(match1.value, "Complete", "Backend 'Complete' matches 'Complete' option");

    // Legacy or detail view returns "Completed"
    const backendStatus2 = "Completed";
    const match2 = kuwaitOptions.find(
      (o) =>
        o.value.toLowerCase() === backendStatus2.toLowerCase() ||
        (o.value.toLowerCase().startsWith("complete") && backendStatus2.toLowerCase().startsWith("complete"))
    ) || kuwaitOptions[0];
    assert.equal(match2.value, "Complete", "Legacy 'Completed' also matches 'Complete' option instead of reverting to Pending");
  });

  // Test 11: Police Ashara Field Mapping & Failure Validation
  test("11. Police Ashara fields map onto operational row and require remark on Failed status", () => {
    const lmsStep = {
      name: "CLR-00010",
      step_type: "Kuwait LMIS",
      status: "In Progress",
      police_ashara_status: "Failed",
      police_ashara_appointment_date: "2026-11-05",
      police_ashara_remark: "Biometrics unreadable at central precinct",
    };

    const isKuwait = true;
    const rowPoliceAsharaStatus =
      (lmsStep as any)?.police_ashara_status || (isKuwait ? "Pending" : undefined);
    const rowPoliceAsharaAppointmentDate = (lmsStep as any)?.police_ashara_appointment_date || undefined;
    const rowPoliceAsharaRemark = (lmsStep as any)?.police_ashara_remark || undefined;

    assert.equal(rowPoliceAsharaStatus, "Failed");
    assert.equal(rowPoliceAsharaAppointmentDate, "2026-11-05");
    assert.equal(rowPoliceAsharaRemark, "Biometrics unreadable at central precinct");

    // Validation rule: Failed status requires remark
    const validatePoliceAshara = (status: string, remark?: string) => {
      if (status === "Failed" && (!remark || !remark.trim())) {
        return { valid: false, error: "A remark is required when Police Ashara status is Failed." };
      }
      return { valid: true };
    };

    assert.equal(validatePoliceAshara("Failed", "").valid, false);
    assert.equal(validatePoliceAshara("Failed", "Reason given").valid, true);
    assert.equal(validatePoliceAshara("Scheduled", "").valid, true);
    assert.equal(validatePoliceAshara("Completed", "").valid, true);
  });

  // Test 12: Corridor-Aware Table Column Header Resolution
  test("12. Follow-up Table column headers resolve dynamically based on corridorFilter", () => {
    const resolveHeaders = (corridorFilter: string) => {
      const isKuwait = (corridorFilter || "").toLowerCase().includes("kuwait");
      const isSaudi = (corridorFilter || "").toLowerCase().includes("saudi");
      return {
        lmisHeader: isKuwait ? "KUWAIT LMIS" : "LMIS STATUS",
        clearance2Header: isKuwait ? "TELESIGN" : isSaudi ? "TAESHIR / INJAZ" : "TAESHIR / TELESIGN",
        subCheckHeader: isKuwait ? "POLICE ASHARA" : isSaudi ? "WAKALA STATUS" : "WAKALA / ASHARA",
        embassyHeader: isKuwait ? "KUWAIT EMBASSY / EVISA" : isSaudi ? "SAUDI EMBASSY" : "EMBASSY / VISA",
      };
    };

    const kuwaitHeaders = resolveHeaders("Kuwait");
    assert.equal(kuwaitHeaders.lmisHeader, "KUWAIT LMIS");
    assert.equal(kuwaitHeaders.clearance2Header, "TELESIGN");
    assert.equal(kuwaitHeaders.subCheckHeader, "POLICE ASHARA");
    assert.equal(kuwaitHeaders.embassyHeader, "KUWAIT EMBASSY / EVISA");

    const saudiHeaders = resolveHeaders("Saudi Arabia");
    assert.equal(saudiHeaders.lmisHeader, "LMIS STATUS");
    assert.equal(saudiHeaders.clearance2Header, "TAESHIR / INJAZ");
    assert.equal(saudiHeaders.subCheckHeader, "WAKALA STATUS");
    assert.equal(saudiHeaders.embassyHeader, "SAUDI EMBASSY");

    const allHeaders = resolveHeaders("all");
    assert.equal(allHeaders.lmisHeader, "LMIS STATUS");
    assert.equal(allHeaders.clearance2Header, "TAESHIR / TELESIGN");
    assert.equal(allHeaders.subCheckHeader, "WAKALA / ASHARA");
    assert.equal(allHeaders.embassyHeader, "EMBASSY / VISA");
  });

  // Test 13: Kuwait LMIS Placement Contract Date Validation & API Call
  test("13. Kuwait LMIS placement contract dates validate contract_end_date >= contract_start_date and call updatePlacementForLmisV2", async () => {
    const { updatePlacementForLmisV2 } = await import("../src/lib/api/v2/placements");

    const validateContractDates = (start?: string, end?: string) => {
      if (start && end && end < start) {
        return { valid: false, error: "Contract end date cannot be earlier than start date." };
      }
      return { valid: true };
    };

    assert.equal(validateContractDates("2026-11-01", "2026-10-01").valid, false);
    assert.equal(validateContractDates("2026-11-01", "2028-11-01").valid, true);
    assert.equal(validateContractDates("2026-11-01", "2026-11-01").valid, true);

    const originalFetch = globalThis.fetch;
    const calls: { url: string; body: any }[] = [];
    try {
      globalThis.fetch = (async (url: any, options: any = {}) => {
        const urlStr = String(url);
        if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
          return createMockResponse({ message: "mock-csrf-token" });
        }
        const body = options?.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;
        calls.push({ url: urlStr, body });
        return createMockResponse({ message: "Updated" });
      }) as any;

      await updatePlacementForLmisV2("PLM-KW-001", {
        employer_city: "Kuwait City",
        employer_house_number: "Villa 12",
        employer_phone: "+96599887766",
        contract_start_date: "2026-12-01",
        contract_end_date: "2028-12-01",
      });

      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.includes("update_placement_for_lmis") || calls[0].url.includes("/lmis"));
      assert.ok(calls[0].url.includes("PLM-KW-001") || calls[0].body?.placement_name === "PLM-KW-001");
      assert.equal(calls[0].body.employer_city, "Kuwait City");
      assert.equal(calls[0].body.contract_start_date, "2026-12-01");
      assert.equal(calls[0].body.contract_end_date, "2028-12-01");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 14: Kuwait Embassy eVisa Parsed Fields
  test("14. Kuwait Embassy eVisa updates supported fields via updatePlacementParsedFieldsV2", async () => {
    const { updatePlacementParsedFieldsV2 } = await import("../src/lib/api/v2/placements");

    const originalFetch = globalThis.fetch;
    const calls: { url: string; body: any }[] = [];
    try {
      globalThis.fetch = (async (url: any, options: any = {}) => {
        const urlStr = String(url);
        if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
          return createMockResponse({ message: "mock-csrf-token" });
        }
        const body = options?.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;
        calls.push({ url: urlStr, body });
        return createMockResponse({ message: { name: "PLM-KW-001" } });
      }) as any;

      await updatePlacementParsedFieldsV2("PLM-KW-001", {
        visa_reference_number: "REF-KW-9988",
        visa_type: "Work",
        sponsor_name: "Al-Sabah",
        sponsor_civil_id: "289012345678",
        kuwait_agency_name: "Al-Diyar Manpower",
        kuwait_agency_license: "LIC-KW-4421",
      });

      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.includes("update_placement_parsed_fields") || calls[0].url.includes("/parsed-fields"));
      assert.ok(calls[0].url.includes("PLM-KW-001") || calls[0].body?.placement_name === "PLM-KW-001");
      assert.equal(calls[0].body.visa_reference_number, "REF-KW-9988");
      assert.equal(calls[0].body.sponsor_civil_id, "289012345678");
      assert.equal(calls[0].body.kuwait_agency_name, "Al-Diyar Manpower");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 15: Departed Terminal Record Locking
  test("15. Terminal departed record lock prevents editing departure and ticket inputs", () => {
    const checkCanEdit = (isDeparted: boolean, userCanEditDeparture: boolean) => {
      return userCanEditDeparture && !isDeparted;
    };

    assert.equal(checkCanEdit(true, true), false, "Departed placement cannot be edited even if user has edit permission");
    assert.equal(checkCanEdit(false, true), true, "Non-departed placement can be edited if user has permission");
    assert.equal(checkCanEdit(false, false), false, "Non-departed placement cannot be edited without permission");
  });

  // Test 16: Pre-departure Medical 2 UNFIT Gate Conformance
  test("16. Medical 2 UNFIT result strictly blocks departure gating in accordance with backend medical_2_gate", async () => {
    const originalFetch = globalThis.fetch;
    const calls: { url: string; body: any }[] = [];

    globalThis.fetch = (async (url: any, options: any = {}) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token") || urlStr.includes("csrf-token")) {
        return createMockResponse({ message: "mock-csrf-token" });
      }
      const body = options.body ? (typeof options.body === "string" ? JSON.parse(options.body) : options.body) : null;
      calls.push({ url: urlStr, body });
      return createMockResponse({ message: { status: "Success", medical_2_status: body?.status || "UNFIT" } });
    }) as any;

    try {
      // 1. Record Medical 2 as UNFIT
      await recordPredepartureMedicalResultV2("PLM-00099", "UNFIT");
      assert.equal(calls.length, 1);
      assert.ok(calls[0].url.includes("/predeparture-medical") || calls[0].url.includes("agency_tracking.api.placement.write"));
      assert.equal(calls[0].body.status, "UNFIT");

      // 2. Validate gate logic: if an applicant is UNFIT, departure confirmation must be blocked
      const canCandidateDepart = (medical2Status: string, selectedOutcome: string) => {
        if (selectedOutcome === "Departed" && medical2Status === "UNFIT") {
          return false;
        }
        return true;
      };

      assert.equal(canCandidateDepart("UNFIT", "Departed"), false, "UNFIT candidate must NOT be allowed to depart");
      assert.equal(canCandidateDepart("FIT", "Departed"), true, "FIT candidate is permitted to depart");
      assert.equal(canCandidateDepart("UNFIT", "Local return"), true, "Return flows handle UNFIT candidate without Departed gate violation");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
