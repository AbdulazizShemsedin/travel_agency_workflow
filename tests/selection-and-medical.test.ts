import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Import modules under test without .ts extension
import { resolveEffectiveMedical } from "../src/lib/api/v2/medical";
import {
  requestCandidateSelectionV2,
  selectCandidateDirectlyV2,
  selectCandidateV2,
  listPortalCandidatesV2,
} from "../src/lib/api/v2/portal";
import {
  listSelectionRequestsV2,
  approveSelectionRequestV2,
  denySelectionRequestV2,
  makeApplicantAvailableV2,
} from "../src/lib/api/v2/placements";
import {
  normalizeApplicantFields,
  mapEducationLevelToBackend,
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

describe("Foreign Agency Selection Request vs Staff Direct Selection Workflow", () => {
  test("1. Foreign agency request helper sends contractor_name and contractor to satisfy backend requirement", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: any, options: any = {}) => {
      interceptedUrl = String(url);
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({ message: { name: "PLM-001", status: "Requested" } });
    }) as any;

    try {
      const res = await requestCandidateSelectionV2("APP-1001", "Test Agency Contractor");
      assert.equal(interceptedUrl.includes("portal_api.select_candidate"), true);
      assert.equal(interceptedBody?.applicant_name, "APP-1001");
      assert.equal(interceptedBody?.contractor_name, "Test Agency Contractor");
      assert.equal(interceptedBody?.contractor, "Test Agency Contractor");
      assert.equal(res.status, "Requested");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("2. Agency request with replacement passes replacement_for and contractor_name", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedBody: any = null;

    globalThis.fetch = (async (_url: any, options: any = {}) => {
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({ message: { name: "PLM-002", status: "Requested" } });
    }) as any;

    try {
      const res = await requestCandidateSelectionV2("APP-1002", "Test Agency Contractor", "PLM-OLD-999");
      assert.equal(interceptedBody?.applicant_name, "APP-1002");
      assert.equal(interceptedBody?.contractor_name, "Test Agency Contractor");
      assert.equal(interceptedBody?.replacement_for, "PLM-OLD-999");
      assert.equal(res.status, "Requested");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("3. Staff direct selection (0.-23) explicitly includes contractor_name", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedBody: any = null;

    globalThis.fetch = (async (_url: any, options: any = {}) => {
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({
        message: { name: "PLM-003", status: "Selected", contractor: "AGY-RIYADH" },
      });
    }) as any;

    try {
      const res = await selectCandidateDirectlyV2("APP-1003", "AGY-RIYADH");
      assert.equal(interceptedBody?.applicant_name, "APP-1003");
      assert.equal(interceptedBody?.contractor_name, "AGY-RIYADH");
      assert.equal(interceptedBody?.contractor, "AGY-RIYADH");
      assert.equal(res.status, "Selected");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("4. Selection helpers reject missing or empty contractorName to prevent 417 errors", async () => {
    await assert.rejects(
      async () => {
        await requestCandidateSelectionV2("APP-1004", "");
      },
      {
        message: /Contractor \/ Agency identity is required/i,
      }
    );

    await assert.rejects(
      async () => {
        await selectCandidateDirectlyV2("APP-1004", "");
      },
      {
        message: /Contractor\/Agency name is required/i,
      }
    );
  });

  test("5. Backward-compatible selectCandidateV2 forwards contractor_name and rejects missing contractor", async () => {
    const originalFetch = globalThis.fetch;
    const interceptedBodies: any[] = [];

    globalThis.fetch = (async (_url: any, options: any = {}) => {
      if (options.body) {
        interceptedBodies.push(typeof options.body === "string" ? JSON.parse(options.body) : options.body);
      }
      return createMockResponse({ message: { name: "PLM-005", status: "Requested" } });
    }) as any;

    try {
      // Call with contractor -> forwards contractor_name
      await selectCandidateV2("APP-1006", "AGY-DUBAI");
      assert.equal(interceptedBodies[0]?.contractor_name, "AGY-DUBAI");

      // Call without contractor -> rejects early
      await assert.rejects(
        async () => {
          await selectCandidateV2("APP-1005");
        },
        {
          message: /Contractor name is required/i,
        }
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("6. listSelectionRequestsV2 handles empty responses and various envelope shapes without throwing", async () => {
    const originalFetch = globalThis.fetch;

    try {
      // Shape A: { message: [] }
      globalThis.fetch = (async () => createMockResponse({ message: [] })) as any;
      const resA = await listSelectionRequestsV2();
      assert.deepEqual(resA, []);

      // Shape B: { message: null }
      globalThis.fetch = (async () => createMockResponse({ message: null })) as any;
      const resB = await listSelectionRequestsV2();
      assert.deepEqual(resB, []);

      // Shape C: { message: { requests: [{ name: "PLM-REQ-1", full_name: "Fatima" }] } }
      globalThis.fetch = (async () =>
        createMockResponse({
          message: { requests: [{ name: "PLM-REQ-1", full_name: "Fatima" }] },
        })) as any;
      const resC = await listSelectionRequestsV2();
      assert.equal(resC.length, 1);
      assert.equal(resC[0].full_name, "Fatima");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("7. approveSelectionRequestV2 calls backend RPC with placement_name and remarks", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: any, options: any = {}) => {
      interceptedUrl = String(url);
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({ message: { name: "PLM-007", status: "Selected" } });
    }) as any;

    try {
      const res = await approveSelectionRequestV2("PLM-007", "Candidate available and confirmed");
      assert.equal(interceptedUrl.includes("placement_api.approve_selection_request"), true);
      assert.equal(interceptedBody?.placement_name, "PLM-007");
      assert.equal(interceptedBody?.remarks, "Candidate available and confirmed");
      assert.equal(res.status, "Selected");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("8. denySelectionRequestV2 calls backend RPC with required reason", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: any, options: any = {}) => {
      interceptedUrl = String(url);
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({ message: { name: "PLM-008", status: "Cancelled", request_denied: 1 } });
    }) as any;

    try {
      const res = await denySelectionRequestV2("PLM-008", "Candidate took another offer");
      assert.equal(interceptedUrl.includes("placement_api.deny_selection_request"), true);
      assert.equal(interceptedBody?.placement_name, "PLM-008");
      assert.equal(interceptedBody?.reason, "Candidate took another offer");
      assert.equal(res.status, "Cancelled");
      assert.equal(res.request_denied, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("9. makeApplicantAvailableV2 calls backend RPC with applicant_name and optional reason", async () => {
    const originalFetch = globalThis.fetch;
    let interceptedUrl = "";
    let interceptedBody: any = null;

    globalThis.fetch = (async (url: any, options: any = {}) => {
      interceptedUrl = String(url);
      if (options.body) {
        interceptedBody = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
      }
      return createMockResponse({ message: { name: "APP-009", unavailable: 0 } });
    }) as any;

    try {
      const res = await makeApplicantAvailableV2("APP-009", "Candidate is ready again");
      assert.equal(interceptedUrl.includes("placement_api.make_applicant_available"), true);
      assert.equal(interceptedBody?.applicant_name, "APP-009");
      assert.equal(interceptedBody?.reason, "Candidate is ready again");
      assert.equal(res.unavailable, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("10. State consistency: Requested case never allows contract upload or premature Selected state", () => {
    const requestedCase = {
      name: "PLM-010",
      status: "Requested",
      request_denied: 0,
    };

    // 1. Verify eligibility for contract upload: only "Selected" is allowed
    const canUploadContract = requestedCase.status === "Selected" && !requestedCase.request_denied;
    assert.equal(canUploadContract, false);

    // 2. Verify display badge terminology: "Requested" is under review, NOT Selected
    const badgeText =
      requestedCase.status === "Requested"
        ? "Selection request under review"
        : requestedCase.status === "Selected"
        ? "Selected"
        : requestedCase.status;
    assert.equal(badgeText, "Selection request under review");

    // 3. Verify denied case display
    const deniedCase = {
      name: "PLM-011",
      status: "Cancelled",
      request_denied: 1,
    };
    const deniedBadgeText =
      deniedCase.request_denied === 1
        ? "Unavailable. Please select another candidate."
        : deniedCase.status;
    assert.equal(deniedBadgeText, "Unavailable. Please select another candidate.");
    const canUploadDenied = deniedCase.status === "Selected" && !deniedCase.request_denied;
    assert.equal(canUploadDenied, false);
  });
});

describe("Medical Status Hierarchical Precedence & Column Audit Rules", () => {
  test("1. Registration FIT produces FIT when no placement medical exists", () => {
    const applicant = {
      name: "APP-001",
      medical_status: "FIT",
      exam_date: "2026-09-01",
      medical_expiry_date: "2027-09-01",
    };
    const res = resolveEffectiveMedical(applicant, null);
    assert.equal(res.status, "FIT");
    assert.equal(res.rawStatus, "FIT");
    assert.equal(res.stage, "Registration");
    assert.equal(res.isExpired, false);
    assert.equal(res.examDate, "2026-09-01");
    assert.equal(res.expiryDate, "2027-09-01");
  });

  test("2. Registration UNFIT produces UNFIT", () => {
    const applicant = {
      name: "APP-002",
      medical_status: "UNFIT",
      medical_issue_date: "2026-08-15",
    };
    const res = resolveEffectiveMedical(applicant, null);
    assert.equal(res.status, "UNFIT");
    assert.equal(res.rawStatus, "UNFIT");
    assert.equal(res.stage, "Registration");
    assert.equal(res.isExpired, false);
  });

  test("3. Registration Pending produces Pending", () => {
    const applicant = {
      name: "APP-003",
      medical_status: "Pending",
    };
    const res = resolveEffectiveMedical(applicant, null);
    assert.equal(res.status, "Pending");
    assert.equal(res.rawStatus, "Pending");
    assert.equal(res.stage, "Registration");
    assert.equal(res.isExpired, false);
  });

  test("4. Missing or unloaded medical data produces empty status, NOT false Pending", () => {
    const applicant = {
      name: "APP-004",
      // medical_status is undefined
    };
    const res = resolveEffectiveMedical(applicant, null);
    assert.equal(res.status, "");
    assert.equal(res.rawStatus, "");
    assert.equal(res.isExpired, false);
    assert.equal(res.examDate, null);
    assert.equal(res.expiryDate, null);
  });

  test("5. Rule 1 & 2: Selection FIT overrides Registration FIT and Selection UNFIT overrides Registration FIT", () => {
    const applicant = {
      name: "APP-005",
      medical_status: "FIT",
      exam_date: "2026-01-01",
    };
    const placementUnfit = {
      name: "PLM-005",
      medical_selected_status: "UNFIT",
      medical_selected_examination_date: "2026-04-01",
    };
    const resUnfit = resolveEffectiveMedical(applicant, placementUnfit);
    assert.equal(resUnfit.status, "UNFIT");
    assert.equal(resUnfit.stage, "Selection");
    assert.equal(resUnfit.examDate, "2026-04-01");

    const placementFit = {
      name: "PLM-006",
      medical_selected_status: "FIT",
      medical_selected_examination_date: "2026-04-01",
      medical_selected_expiry_date: "2027-04-01",
    };
    const resFit = resolveEffectiveMedical(applicant, placementFit);
    assert.equal(resFit.status, "FIT");
    assert.equal(resFit.stage, "Selection");
  });

  test("6. Rule 2: Pending Selection stage is skipped when Registration has a completed result", () => {
    const applicant = {
      name: "APP-007",
      medical_status: "FIT",
      exam_date: "2026-02-15",
      medical_expiry_date: "2027-02-15",
    };
    const placementPending = {
      name: "PLM-007",
      medical_selected_status: "Pending", // Stage 2 pending
    };
    const res = resolveEffectiveMedical(applicant, placementPending);
    // Registration result wins because Selection is Pending
    assert.equal(res.status, "FIT");
    assert.equal(res.stage, "Registration");
    assert.equal(res.examDate, "2026-02-15");
  });

  test("7. Rule 1: Pre-departure (Medical 2) completed result overrides earlier Selection FIT", () => {
    const applicant = {
      name: "APP-008",
      medical_status: "FIT",
    };
    const placement = {
      name: "PLM-008",
      medical_selected_status: "FIT",
      medical_selected_examination_date: "2026-03-01",
      medical_2_status: "UNFIT",
      medical_2_examination_date: "2026-05-01",
    };
    const res = resolveEffectiveMedical(applicant, placement);
    assert.equal(res.status, "UNFIT");
    assert.equal(res.stage, "Pre-departure");
    assert.equal(res.examDate, "2026-05-01");
  });

  test("8. Rule 4: Expired FIT result displays 'FIT (expired)'", () => {
    const applicant = {
      name: "APP-009",
      medical_status: "FIT",
      exam_date: "2024-01-01",
      medical_expiry_date: "2024-04-01", // in the past
    };
    const res = resolveEffectiveMedical(applicant, null);
    assert.equal(res.status, "FIT (expired)");
    assert.equal(res.rawStatus, "FIT");
    assert.equal(res.isExpired, true);
    assert.equal(res.stage, "Registration");
  });

  test("9. Authoritative 0.-22 backend medical_current takes absolute priority", () => {
    const applicant = {
      name: "APP-010",
      medical_status: "Pending",
      medical_current: {
        stage: "Selection",
        status: "FIT",
        exam_date: "2026-05-10",
        expiry_date: "2027-05-10",
        expired: false,
      },
    };
    const res = resolveEffectiveMedical(applicant, null);
    assert.equal(res.status, "FIT");
    assert.equal(res.stage, "Selection");
    assert.equal(res.examDate, "2026-05-10");
  });

  test("10. Different applicants display distinct, independent medical calculations", () => {
    const appA = { name: "APP-A", medical_status: "FIT", medical_expiry_date: "2027-01-01" };
    const appB = { name: "APP-B", medical_status: "UNFIT" };
    const appC = { name: "APP-C", medical_status: "Pending" };
    const appD = { name: "APP-D" }; // empty

    const resA = resolveEffectiveMedical(appA, null);
    const resB = resolveEffectiveMedical(appB, null);
    const resC = resolveEffectiveMedical(appC, null);
    const resD = resolveEffectiveMedical(appD, null);

    assert.equal(resA.status, "FIT");
    assert.equal(resB.status, "UNFIT");
    assert.equal(resC.status, "Pending");
    assert.equal(resD.status, "");
    // Verify no cross-applicant contamination
    assert.notEqual(resA.status, resB.status);
    assert.notEqual(resB.status, resC.status);
    assert.notEqual(resC.status, resD.status);
  });

  test("11. normalizeApplicantFields strips 'Not Done' and 'None' from medical_status to prevent backend 417 ValidationError", () => {
    const rawWithNotDone = normalizeApplicantFields({ medical_status: "Not Done" });
    assert.equal(rawWithNotDone.medical_status, "");

    const rawWithNone = normalizeApplicantFields({ medical_status: "None" });
    assert.equal(rawWithNone.medical_status, "");

    const rawWithFit = normalizeApplicantFields({ medical_status: "FIT" });
    assert.equal(rawWithFit.medical_status, "FIT");
  });

  test("12. listPortalCandidatesV2 sanitizes dummy.jpg / dummy placeholders to empty strings to avoid 500 image errors", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return createMockResponse({
        message: {
          candidates: [
            {
              name: "APP-00190",
              full_name: "Test Candidate With Dummy Photo",
              photograph: "/files/dummy.jpg",
              photo_full_body: "/files/dummy.jpg",
            },
            {
              name: "APP-00195",
              full_name: "Test Candidate With Real Photo",
              photograph: "/files/real_photo.jpg",
              photo_full_body: "/files/real_body.jpg",
            },
          ],
        },
      });
    }) as any;

    try {
      const candidates = (await listPortalCandidatesV2()) as any[];
      assert.equal(candidates.length, 2);
      // Dummy photos must be cleaned to empty strings
      assert.equal(candidates[0].photo_passport, "");
      assert.equal(candidates[0].photo_full_body, "");
      // Real photos must be preserved
      assert.equal(candidates[1].photo_passport, "/files/real_photo.jpg");
      assert.equal(candidates[1].photo_full_body, "/files/real_body.jpg");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("13. Education level mapping conforms to backend choices and resolves 'HIGH SCHOOL' error", () => {
    // 1. Direct mapper checks
    assert.equal(mapEducationLevelToBackend("HIGH SCHOOL"), "High School");
    assert.equal(mapEducationLevelToBackend("SECONDARY LEVEL"), "High School");
    assert.equal(mapEducationLevelToBackend("PRIMARY LEVEL"), "High School");
    assert.equal(mapEducationLevelToBackend("DIPLOMA"), "Associate Degree");
    assert.equal(mapEducationLevelToBackend("BACHELOR'S DEGREE"), "Bachelor's Degree");
    assert.equal(mapEducationLevelToBackend("MASTER'S DEGREE"), "Master's Degree");
    assert.equal(mapEducationLevelToBackend("DOCTORATE"), "Doctorate");
    assert.equal(mapEducationLevelToBackend("OTHER"), "Other");

    // Exact backend case preservation
    assert.equal(mapEducationLevelToBackend("High School"), "High School");
    assert.equal(mapEducationLevelToBackend("Associate Degree"), "Associate Degree");
    assert.equal(mapEducationLevelToBackend("Bachelor's Degree"), "Bachelor's Degree");
    assert.equal(mapEducationLevelToBackend("Master's Degree"), "Master's Degree");
    assert.equal(mapEducationLevelToBackend("Doctorate"), "Doctorate");
    assert.equal(mapEducationLevelToBackend("Other"), "Other");

    // 2. Integration with normalizeApplicantFields:
    // When qualification or education is "HIGH SCHOOL", it must never pass uppercase "HIGH SCHOOL" to backend
    const normalizedApp1 = normalizeApplicantFields({ qualification: "HIGH SCHOOL" } as any);
    assert.equal(normalizedApp1.education, "High School");
    assert.equal(normalizedApp1.qualification, "High School");
    assert.equal(normalizedApp1.highest_education, "High School");

    const normalizedApp2 = normalizeApplicantFields({ education: "HIGH SCHOOL" } as any);
    assert.equal(normalizedApp2.education, "High School");

    const normalizedApp3 = normalizeApplicantFields({ qualification: "DIPLOMA" } as any);
    assert.equal(normalizedApp3.education, "Associate Degree");
  });
});
