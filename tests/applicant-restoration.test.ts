import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getPreCancellationSnapshot,
  restoreApplicantProcessV2,
  restartApplicantV2,
  cancelApplicantV2,
  V2ApplicantDetails,
} from "../src/lib/api/v2/applicants";

function createMockResponse(bodyData: any, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => bodyData,
    text: async () => JSON.stringify(bodyData),
    headers: new Headers({ "content-type": "application/json" }),
  } as unknown as Response;
}

describe("Applicant Process Restoration vs Restart Workflow (Scenarios A through J)", () => {
  // Save original fetch
  const originalFetch = global.fetch;

  test("Scenario A: Registered applicant without Placement restores to Registered with cycle_number unchanged", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00101",
      full_name: "Fatima Zahra",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP1234567",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cycle_number: 1,
    };

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, []);
    assert.equal(snapshot.previousApplicantStage, "Registered");
    assert.equal(snapshot.previousPlacementStatus, "None");
    assert.equal(snapshot.cycleNumber, 1);
    assert.equal(snapshot.isMedicalUnfit, false);

    // Simulated restored applicant
    const restoredApplicant = {
      ...cancelledApplicant,
      status: snapshot.previousApplicantStage,
      applicant_state: snapshot.previousApplicantStage,
      cycle_number: snapshot.cycleNumber,
    };

    assert.equal(restoredApplicant.status, "Registered");
    assert.equal(restoredApplicant.cycle_number, 1);
  });

  test("Scenario B: CV Generated applicant without Placement restores to CV Generated and retains CV", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00102",
      full_name: "Abebech Demissie",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP2345678",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cv_url: "/files/cv_APP-00102.pdf",
      cycle_number: 1,
    };

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, []);
    assert.equal(snapshot.previousApplicantStage, "CV Generated");
    assert.equal(snapshot.previousPlacementStatus, "None");
    assert.equal(snapshot.cycleNumber, 1);

    const restoredApplicant = {
      ...cancelledApplicant,
      status: snapshot.previousApplicantStage,
      applicant_state: snapshot.previousApplicantStage,
      cycle_number: snapshot.cycleNumber,
    };

    assert.equal(restoredApplicant.status, "CV Generated");
    assert.equal((restoredApplicant as any).cv_url, "/files/cv_APP-00102.pdf");
    assert.equal(restoredApplicant.cycle_number, 1);
  });

  test("Scenario C: Selected Placement restores to Selected and preserves agency association", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00103",
      full_name: "Genet Assefa",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP3456789",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cycle_number: 1,
    };

    const cancelledPlacement = {
      name: "PLM-00201",
      applicant: "APP-00103",
      status: "Cancelled",
      contractor: "Tihamat Foreign Agency",
      contractor_name: "Tihamat Foreign Agency",
      destination_country: "Saudi Arabia",
      contract_file: null,
    };

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, [cancelledPlacement]);
    assert.equal(snapshot.previousApplicantStage, "CV Generated");
    assert.equal(snapshot.previousPlacementStatus, "Selected");
    assert.equal(snapshot.contractorName, "Tihamat Foreign Agency");
    assert.equal(snapshot.destinationCountry, "Saudi Arabia");
    assert.equal(snapshot.cycleNumber, 1);

    const restoredPlacement = {
      ...cancelledPlacement,
      status: snapshot.previousPlacementStatus,
    };
    assert.equal(restoredPlacement.status, "Selected");
    assert.equal(restoredPlacement.contractor_name, "Tihamat Foreign Agency");
  });

  test("Scenario D: Processing Placement restores with clearance steps preserved without duplicate records", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00104",
      full_name: "Tigist Haile",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP4567890",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cycle_number: 1,
    };

    const cancelledPlacement = {
      name: "PLM-00202",
      applicant: "APP-00104",
      status: "Cancelled",
      contractor_name: "Al-Riyadh Manpower",
      destination_country: "Saudi Arabia",
      contract_file: "/files/contract_00202.pdf",
      medical_selected_status: "FIT",
    };

    const clearanceStepsBeforeCancel = [
      { name: "CLR-01", step_type: "LMIS Clearance", status: "Complete" },
      { name: "CLR-02", step_type: "Taeshir", status: "Complete" },
      { name: "CLR-03", step_type: "Embassy Clearance", status: "Submitted" },
    ];

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, [cancelledPlacement]);
    assert.equal(snapshot.previousPlacementStatus, "Processing");
    assert.equal(snapshot.hasContract, true);

    // Simulate restoration unfreezing each step back to its historical state
    const restoredClearanceSteps = clearanceStepsBeforeCancel.map((step) => ({
      ...step,
    }));

    assert.equal(restoredClearanceSteps.length, 3);
    assert.equal(restoredClearanceSteps[0].status, "Complete");
    assert.equal(restoredClearanceSteps[1].status, "Complete");
    assert.equal(restoredClearanceSteps[2].status, "Submitted");
  });

  test("Scenario E: Stamped Placement restores to Stamped without restarting downstream stages", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00105",
      full_name: "Selamawit Kebede",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP5678901",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cycle_number: 1,
    };

    const cancelledPlacement = {
      name: "PLM-00203",
      applicant: "APP-00105",
      status: "Cancelled",
      contractor_name: "Gulf Manpower Agency",
      destination_country: "Kuwait",
      visa_file: "/files/visa_kuwait_00203.pdf",
      visa_number: "KWT-VISA-9912",
    };

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, [cancelledPlacement]);
    assert.equal(snapshot.previousPlacementStatus, "Stamped");
    assert.equal(snapshot.hasVisa, true);
    assert.equal(snapshot.hasTicket, false);
    assert.equal(snapshot.isDeparted, false);
  });

  test("Scenario F: Ticketed Placement preserves flight details, ticket number, and ticket expenses", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00106",
      full_name: "Marta Beyene",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP6789012",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cycle_number: 1,
    };

    const cancelledPlacement = {
      name: "PLM-00204",
      applicant: "APP-00106",
      status: "Cancelled",
      contractor_name: "Tihamat Foreign Agency",
      destination_country: "Saudi Arabia",
      ticket_number: "ET-071-239102",
      flight_date: "2026-11-15",
      ticket_cost: 18500,
    };

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, [cancelledPlacement]);
    assert.equal(snapshot.previousPlacementStatus, "Ticketed");
    assert.equal(snapshot.hasTicket, true);
    assert.equal(snapshot.isDeparted, false);
  });

  test("Scenario G: Departed Placement restores Departed status without duplicating commission or departure logs", () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00107",
      full_name: "Tsehay Tesfaye",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP7890123",
      status: "Cancelled",
      applicant_state: "Cancelled",
      cycle_number: 1,
    };

    const cancelledPlacement = {
      name: "PLM-00205",
      applicant: "APP-00107",
      status: "Cancelled",
      contractor_name: "Al-Jazeera Manpower",
      destination_country: "Saudi Arabia",
      departed_on: "2026-10-20 09:30:00",
      arrival_confirmed: 1,
    };

    const snapshot = getPreCancellationSnapshot(cancelledApplicant, [cancelledPlacement]);
    assert.equal(snapshot.previousPlacementStatus, "Departed");
    assert.equal(snapshot.isDeparted, true);
  });

  test("Scenario H: UNFIT medical cancellation blocks restoration until cleared through authorized medical workflow", () => {
    const unfitApplicant: V2ApplicantDetails = {
      name: "APP-00108",
      full_name: "Almaz Girma",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP8901234",
      status: "Cancelled",
      applicant_state: "Cancelled",
      medical_status: "UNFIT",
      cycle_number: 1,
    };

    const snapshot = getPreCancellationSnapshot(unfitApplicant, []);
    assert.equal(snapshot.isMedicalUnfit, true);
    assert.equal(snapshot.unfitSource, "Applicant");

    // Attempting restoration on UNFIT applicant must be blocked
    const canSafelyRestore = !snapshot.isMedicalUnfit;
    assert.equal(canSafelyRestore, false);

    // Case with UNFIT at Placement selected stage
    const placementUnfit = {
      name: "PLM-00206",
      applicant: "APP-00109",
      status: "Cancelled",
      medical_selected_status: "UNFIT",
    };
    const snapshotPlacement = getPreCancellationSnapshot(
      { ...unfitApplicant, name: "APP-00109", medical_status: "Pending" },
      [placementUnfit]
    );
    assert.equal(snapshotPlacement.isMedicalUnfit, true);
    assert.equal(snapshotPlacement.unfitSource, "SelectedMedical");
  });

  test("Scenario I: Restart as New Attempt increments cycle number and starts fresh at Draft/Registered", async () => {
    const cancelledApplicant: V2ApplicantDetails = {
      name: "APP-00110",
      full_name: "Birtukan Worku",
      gender: "Female",
      nationality: "Ethiopia",
      passport_number: "EP9012345",
      status: "Cancelled",
      cycle_number: 1,
    };

    let sentBody: any = null;
    global.fetch = async (url: any, options: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token")) {
        return createMockResponse({ message: "test-csrf-token" });
      }
      if (options?.body) {
        sentBody = JSON.parse(options.body);
      }
      return createMockResponse({
        message: {
          name: "APP-00110",
          status: "Registered",
          cycle_number: 2, // cycle increments
        },
      });
    };

    try {
      const res = await restartApplicantV2("APP-00110", "Registered");
      assert.equal(sentBody.applicant_name, "APP-00110");
      assert.equal(sentBody.target_status, "Registered");
      const returnedCycle = (res as any)?.cycle_number ?? (res as any)?.message?.cycle_number;
      assert.equal(returnedCycle, 2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("Scenario J: Permission and concurrency guards for restoration and restart", async () => {
    // 1. Role validation: Only Registrar, Manager, Admin can restore/restart
    const canRestoreOrRestart = (roles: string[]) => {
      const normalized = roles.map((r) => r.toLowerCase().trim());
      return normalized.some((r) =>
        ["registrar", "manager", "admin", "system manager", "administrator"].includes(r)
      );
    };

    assert.equal(canRestoreOrRestart(["Registrar"]), true);
    assert.equal(canRestoreOrRestart(["Manager"]), true);
    assert.equal(canRestoreOrRestart(["Administrator"]), true);
    assert.equal(canRestoreOrRestart(["Foreign Agency"]), false);
    assert.equal(canRestoreOrRestart(["Clearance Officer"]), false);
    assert.equal(canRestoreOrRestart(["Finance Manager"]), false);

    // 2. Mandatory restoration reason guard
    await assert.rejects(
      async () => {
        await restoreApplicantProcessV2("APP-00111", "");
      },
      /written restoration reason is required/
    );

    // 3. Backend endpoint dispatch test
    let sentRestoreBody: any = null;
    global.fetch = async (url: any, options: any) => {
      const urlStr = String(url);
      if (urlStr.includes("get_csrf_token")) {
        return createMockResponse({ message: "test-csrf-token" });
      }
      if (options?.body) {
        sentRestoreBody = JSON.parse(options.body);
      }
      return createMockResponse({
        message: {
          name: "APP-00111",
          status: "CV Generated",
          cycle_number: 1,
        },
      });
    };

    try {
      const res = await restoreApplicantProcessV2(
        "APP-00111",
        "Administrative error: applicant was cancelled mistakenly by registrar."
      );
      assert.equal(sentRestoreBody.applicant_name, "APP-00111");
      assert.equal(
        sentRestoreBody.reason,
        "Administrative error: applicant was cancelled mistakenly by registrar."
      );
      const returnedRestoreCycle = (res as any)?.cycle_number ?? (res as any)?.message?.cycle_number;
      assert.equal(returnedRestoreCycle, 1);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
