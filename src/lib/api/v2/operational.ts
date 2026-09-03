/**
 * Canonical V2 Operational Workspace Data Access Layer
 * Powers the Excel-like operational workspaces:
 * - LMISWorkspace
 * - InjazWorkspace
 * - EmbassyWorkspace
 * - WakalaWorkspace
 * - DepartureWorkspace
 *
 * Source of truth: Real Railway V2 backend via:
 * - listApplicantsV2
 * - listPlacementsV2
 * - listMyClearanceStepsV2
 */

import { listApplicantsV2, V2ApplicantDetails } from "./applicants";
import { listPlacementsV2, V2PlacementRecord } from "./placements";
import { listMyClearanceStepsV2, V2ClearanceStepItem } from "./clearance";
import type { WorkspaceApplicantRow, OperationalStreamType } from "@/types/workspace";

export async function fetchOperationalWorkspaceDataV2(
  streamType: OperationalStreamType,
  corridorFilter: string = "All"
): Promise<WorkspaceApplicantRow[]> {
  try {
    const [applicants, placements, clearanceSteps] = await Promise.all([
      listApplicantsV2().catch((err) => {
        console.warn("fetchOperationalWorkspaceDataV2: listApplicantsV2 failed", err);
        return [] as V2ApplicantDetails[];
      }),
      listPlacementsV2().catch((err) => {
        console.warn("fetchOperationalWorkspaceDataV2: listPlacementsV2 failed", err);
        return [] as V2PlacementRecord[];
      }),
      listMyClearanceStepsV2().catch((err) => {
        console.warn("fetchOperationalWorkspaceDataV2: listMyClearanceStepsV2 failed", err);
        return [] as V2ClearanceStepItem[];
      }),
    ]);

    const placementsByApplicant = new Map<string, V2PlacementRecord>();
    for (const p of placements) {
      if (p.applicant) {
        placementsByApplicant.set(p.applicant.toLowerCase().trim(), p);
      }
      if (p.name) {
        placementsByApplicant.set(p.name.toLowerCase().trim(), p);
      }
    }

    const stepsByPlacement = new Map<string, V2ClearanceStepItem[]>();
    const stepsByApplicant = new Map<string, V2ClearanceStepItem[]>();

    for (const s of clearanceSteps) {
      if (s.placement) {
        const key = s.placement.toLowerCase().trim();
        if (!stepsByPlacement.has(key)) stepsByPlacement.set(key, []);
        stepsByPlacement.get(key)!.push(s);
      }
      if (s.applicant) {
        const aKey = s.applicant.toLowerCase().trim();
        if (!stepsByApplicant.has(aKey)) stepsByApplicant.set(aKey, []);
        stepsByApplicant.get(aKey)!.push(s);
      }
    }

    const rows: WorkspaceApplicantRow[] = [];

    // Process all applicants
    for (const applicant of applicants) {
      const applicantKey = applicant.name.toLowerCase().trim();
      const plc = placementsByApplicant.get(applicantKey);
      const dest =
        plc?.destination_country ||
        applicant.destination_country ||
        "Saudi Arabia";

      // Corridor filtering
      if (
        corridorFilter &&
        corridorFilter !== "All" &&
        dest.toLowerCase() !== corridorFilter.toLowerCase()
      ) {
        continue;
      }

      // Stream corridor isolation
      if (streamType === "injaz" || streamType === "wakala") {
        if (dest.toLowerCase() === "kuwait") continue;
      }

      const siblingSteps = plc
        ? stepsByPlacement.get(plc.name.toLowerCase().trim()) || []
        : stepsByApplicant.get(applicantKey) || [];

      const lmsStep = siblingSteps.find(
        (s) => s.step_type === "LMIS Clearance" || s.step_type === "Kuwait LMIS"
      );
      const injazStep = siblingSteps.find(
        (s) => s.step_type === "Taeshir" || s.step_type === "Telesign"
      );
      const embassyStep = siblingSteps.find(
        (s) => s.step_type === "Embassy" || s.step_type === "Kuwait Embassy"
      );

      // Check step completion statuses
      const isLmsFinished =
        lmsStep?.status === "Completed" ||
        lmsStep?.status === "Approved" ||
        lmsStep?.status === "Issued";

      const isInjFinished =
        injazStep?.status === "Completed" ||
        injazStep?.status === "Approved" ||
        injazStep?.status === "Issued" ||
        (injazStep?.payment_status || "").toLowerCase().includes("paid");

      const isEmbassyFinished =
        embassyStep?.status === "Stamped" ||
        embassyStep?.status === "Completed" ||
        embassyStep?.status === "Approved" ||
        embassyStep?.status === "Issued" ||
        plc?.status === "Stamped" ||
        plc?.status === "Ticketed" ||
        plc?.status === "Departed" ||
        applicant.applicant_state === "Stamped" ||
        applicant.applicant_state === "Ticketed" ||
        applicant.applicant_state === "Departed";

      // ---------------------------------------------------------------------
      // WORKSPACE PROGRESSION PREREQUISITES GATING:
      // "an applicant on LMIS , teshir must not be on embassy or ticket if not finished."
      // ---------------------------------------------------------------------
      if (streamType === "embassy") {
        // Must be in Processing or Stamped or have embassy step
        if (
          !embassyStep &&
          !plc &&
          applicant.applicant_state !== "Processing" &&
          applicant.applicant_state !== "Stamped"
        ) {
          continue;
        }
        // Strict Gate: Both LMIS and Taeshir/Telesign must be finished (unless direct step exists)
        if (!embassyStep && (!isLmsFinished || !isInjFinished)) {
          continue;
        }
      } else if (streamType === "departure") {
        // Strict Gate: Embassy (visa stamping) must be finished
        if (!isEmbassyFinished && plc?.status !== "Ticketed" && plc?.status !== "Departed") {
          continue;
        }
      } else if (streamType === "injaz") {
        if (
          !injazStep &&
          !plc &&
          applicant.applicant_state !== "Processing"
        ) {
          continue;
        }
      } else if (streamType === "lms") {
        if (
          !lmsStep &&
          !plc &&
          applicant.applicant_state !== "Processing" &&
          applicant.applicant_state !== "Registered"
        ) {
          continue;
        }
      }

      const contractDate =
        plc?.contract_signed_date ||
        (applicant.creation ? String(applicant.creation).split(" ")[0] : "");

      let duration = 0;
      if (contractDate) {
        const cd = new Date(contractDate);
        if (!isNaN(cd.getTime())) {
          duration = Math.max(0, Math.floor((Date.now() - cd.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      const medicalDate =
        applicant.medical_issue_date || applicant.medical_date || undefined;
      const medicalExpiryDate = applicant.medical_expiry_date;
      let medicalRemaining = "—";
      let medicalRemainingDays: number | undefined = undefined;

      if (medicalExpiryDate) {
        const exp = new Date(medicalExpiryDate);
        if (!isNaN(exp.getTime())) {
          const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          medicalRemainingDays = diffDays;
          medicalRemaining = `${diffDays} DAYS LEFT`;
        }
      }

      const injazPayment =
        (injazStep?.payment_status || "").toLowerCase().includes("paid") ||
        injazStep?.status === "Completed" ||
        injazStep?.status === "Issued"
          ? "PAID"
          : "UNPAID";

      const lmisStatus = lmsStep?.status || (plc ? "In Progress" : "Pending");
      const wakalaStatus = plc ? "Authorized" : "Pending";
      const embassyStatus =
        embassyStep?.status ||
        (plc?.status === "Stamped" ? "Approved" : "Pending");
      const ticketStatus =
        plc?.status === "Ticketed" || plc?.status === "Departed"
          ? "Booked"
          : "Pending";
      const ticketNumber = plc?.ticket_number || "—";

      // Select active clearance step for this stream
      const activeStep =
        streamType === "lms"
          ? lmsStep
          : streamType === "injaz"
          ? injazStep
          : streamType === "embassy"
          ? embassyStep
          : streamType === "wakala"
          ? embassyStep || lmsStep
          : undefined;

      const row: WorkspaceApplicantRow = {
        applicantId: applicant.name,
        applicant: applicant as any,
        dossier: null,
        dsrName: plc?.name,
        destinationCountry: dest,
        fullName:
          applicant.full_name ||
          `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() ||
          applicant.name,
        passportNumber: applicant.passport_number || "—",
        phone: applicant.phone || applicant.phone_number || undefined,
        medicalStatus: applicant.medical_status || "Pending",
        medicalDate,
        medicalExpiryDate,
        jobApplied: applicant.target_job || applicant.job_applied || "Housemaid",
        lockedContractor:
          plc?.contractor_name ||
          plc?.contractor ||
          (applicant as any).contractor_name ||
          applicant.locked_contractor ||
          "—",
        sponsorName:
          plc?.employer_name ||
          (applicant as any).sponsor_name ||
          "—",
        sponsorId:
          (plc as any)?.employer_national_id ||
          (applicant as any).sponsor_id ||
          "—",
        visaNumber:
          plc?.visa_number ||
          (applicant as any).visa_number ||
          "—",
        contractNumber:
          plc?.contract_number ||
          (applicant as any).contract_number ||
          "—",
        contractIssueDate: contractDate || "2026-08-13",

        // Sheet normalized properties
        laborId: applicant.labor_id || applicant.national_id || applicant.name,
        contractDate: contractDate || "—",
        duration: duration || 0,
        medicalRemaining,
        medicalRemainingDays,
        injazPayment,
        appointmentDate:
          injazStep?.date_started ||
          injazStep?.appointment_date ||
          injazStep?.due_date ||
          "—",
        contact:
          lmsStep?.assigned_officer ||
          applicant.phone ||
          applicant.phone_number ||
          "—",
        remark:
          lmsStep?.rejection_remark ||
          lmsStep?.notes ||
          embassyStep?.rejection_remark ||
          embassyStep?.notes ||
          "",
        wakalaStatus,
        embassyStatus,
        telephone: applicant.phone || applicant.phone_number || "—",
        company: plc?.contractor_name || plc?.contractor || "—",
        lmisStatus,
        issueDate: lmsStep?.date_completed || (lmsStep?.creation ? lmsStep.creation.split(" ")[0] : undefined),
        ticketStatus,
        ticketNumber,

        // Clearances records
        lms: lmsStep,
        injaz: injazStep,
        wakala: undefined,
        embassy: embassyStep,
        stamp: embassyStep?.status === "Stamped" ? embassyStep : undefined,
        ticket: plc?.ticket_number ? ({ ticket_number: plc.ticket_number, flight_date: plc.flight_date } as any) : undefined,
        departure: plc?.departed_on ? ({ departed_on: plc.departed_on } as any) : undefined,

        // V2 Context
        placementId: plc?.name,
        clearanceStepName: activeStep?.name,
      };

      rows.push(row);
    }

    return rows;
  } catch (err) {
    console.error("fetchOperationalWorkspaceDataV2 error:", err);
    return [];
  }
}
