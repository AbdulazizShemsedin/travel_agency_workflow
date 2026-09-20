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
      if (p.status === "Cancelled") continue;
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
      let plc = placementsByApplicant.get(applicantKey);
      if (applicant.active_placement) {
        const preferred = placementsByApplicant.get(
          String(applicant.active_placement).toLowerCase().trim()
        );
        if (preferred) plc = preferred;
      }
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
      if (streamType === "wakala") {
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
        (s) =>
          s.step_type === "Embassy" ||
          s.step_type === "Saudi Embassy" ||
          s.step_type === "Kuwait Embassy" ||
          (s.step_type || "").toLowerCase().includes("embassy")
      );

      // Check step completion statuses
      const isSaudi = dest.toLowerCase().includes("saudi");

      // 1. LMIS Completion: LMIS step must be Issued/Completed, and COC fields finished (for Saudi)
      const isLmsIssued =
        lmsStep?.status === "Issued" ||
        lmsStep?.status === "Completed" ||
        lmsStep?.status === "Complete" ||
        lmsStep?.status === "Approved";

      const hasCocFinished =
        !isSaudi ||
        applicant.coc_status === "Issued" ||
        applicant.coc_status === "Passed" ||
        (lmsStep as any)?.coc_status === "Issued" ||
        (lmsStep as any)?.coc_status === "Passed" ||
        Boolean(applicant.exam_date || (lmsStep as any)?.exam_date);

      const isLmsFullyCompleted = Boolean(lmsStep && isLmsIssued && hasCocFinished);

      // 2. Te'shir Completion: Step must be completed/issued and Injaz must be paid
      const isTeshirStepFinished =
        injazStep?.status === "Completed" ||
        injazStep?.status === "Complete" ||
        injazStep?.status === "Issued" ||
        injazStep?.status === "Approved";

      const isInjazPaid =
        (injazStep?.payment_status || "").toLowerCase().includes("paid") ||
        (injazStep as any)?.injaz_payment_status === "Paid" ||
        injazStep?.status === "Completed" ||
        injazStep?.status === "Issued";

      const isTeshirFullyCompleted = Boolean(injazStep && isTeshirStepFinished && (!isSaudi || isInjazPaid));

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
      // OPERATIONAL SHEET STAGE-GATING:
      // The excel-like sheets (LMIS / Te'shir / Embassy / Departure / Wakala) only
      // list applicants that have actually entered the placement flow. A Placement is
      // created exclusively by Foreign Agency selection or the direct Muayena intake,
      // and the contract/visa documents are uploaded against it. Applicants still in
      // the intake pool (no Placement, no uploaded documents) are not yet on any of
      // these stages and must never appear in the sheets.
      // ---------------------------------------------------------------------
      if (["lms", "injaz", "wakala", "embassy", "departure"].includes(streamType) && !plc) {
        continue;
      }

      if (streamType === "embassy") {
        const isAlreadyStampedOrBeyond =
          plc?.status === "Stamped" ||
          plc?.status === "Ticketed" ||
          plc?.status === "Departed" ||
          applicant.applicant_state === "Stamped" ||
          applicant.applicant_state === "Ticketed" ||
          applicant.applicant_state === "Departed";

        // Candidate must have finished Te'shir before entering the Embassy stage
        if (!isAlreadyStampedOrBeyond && !isTeshirFullyCompleted) {
          continue;
        }
        if (!embassyStep && !isAlreadyStampedOrBeyond) {
          continue;
        }
      } else if (streamType === "wakala") {
        const isEmbassyState =
          plc?.status === "Processing" ||
          plc?.status === "Stamped" ||
          plc?.status === "Ticketed" ||
          plc?.status === "Departed";
        if (!embassyStep && !isEmbassyState) {
          continue;
        }
      } else if (streamType === "departure") {
        const isAlreadyTicketedOrBeyond =
          plc?.status === "Ticketed" ||
          plc?.status === "Departed" ||
          applicant.applicant_state === "Ticketed" ||
          applicant.applicant_state === "Departed";

        // Must be stamped by Embassy (and completed Te'shir) before entering Ticket/Departure stage
        const isReadyForDeparture =
          (isEmbassyFinished && isTeshirFullyCompleted) ||
          plc?.status === "Stamped";

        if (!isAlreadyTicketedOrBeyond && !isReadyForDeparture) {
          continue;
        }
      } else if (streamType === "injaz") {
        // Te'shir sheet: candidate must have completed LMIS (or already advanced beyond)
        const isAlreadyPastLms =
          isTeshirFullyCompleted ||
          isEmbassyFinished ||
          plc?.status === "Stamped" ||
          plc?.status === "Ticketed" ||
          plc?.status === "Departed";

        if (!isAlreadyPastLms && !isLmsFullyCompleted) {
          continue;
        }
        if (!injazStep && !isAlreadyPastLms) {
          continue;
        }
      } else if (streamType === "lms") {
        // LMIS sheet: placement must be in Processing or beyond
        const isProcessingOrBeyond =
          plc?.status === "Processing" ||
          plc?.status === "Stamped" ||
          plc?.status === "Ticketed" ||
          plc?.status === "Departed";
        if (!lmsStep && !isProcessingOrBeyond) {
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
        applicant.medical_issue_date ||
        applicant.medical_date ||
        (plc as any)?.medical_selected_examination_date ||
        undefined;
      const medicalExpiryDate =
        applicant.medical_expiry_date ||
        (plc as any)?.medical_selected_expiry_date ||
        undefined;
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
      const wakalaStatus =
        (embassyStep as any)?.wakala_status ||
        (plc as any)?.wakala_status ||
        "Pending";
      const wakalaAmount =
        typeof (embassyStep as any)?.wakala_amount === "number"
          ? (embassyStep as any).wakala_amount
          : undefined;
      const wakalaPaidDate = (embassyStep as any)?.wakala_paid_date || undefined;
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

      const rawApplicantMed = (applicant.medical_status || "").toUpperCase().trim();
      const rawPlcMed = ((plc as any)?.medical_selected_status || "").toUpperCase().trim();
      const resolvedMedical =
        rawApplicantMed === "FIT" || rawPlcMed === "FIT"
          ? "FIT"
          : rawApplicantMed === "UNFIT" || rawPlcMed === "UNFIT"
          ? "UNFIT"
          : applicant.medical_status || (plc as any)?.medical_selected_status || "Pending";

      const row: WorkspaceApplicantRow = {
        applicantId: applicant.name,
        applicant: applicant as any,
        dossier: null,
        dsrName: plc?.name,
        destinationCountry: dest,
        fullName: (
          applicant.full_name ||
          `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() ||
          applicant.name
        ).toUpperCase(),
        passportNumber: applicant.passport_number || "—",
        phone: applicant.phone || applicant.phone_number || undefined,
        medicalStatus: resolvedMedical,
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
        contractIssueDate: contractDate || "—",

        // Sheet normalized properties (labor_id is strictly applicant.labor_id, NEVER applicant ID or national ID)
        laborId: applicant.labor_id && !applicant.labor_id.toUpperCase().startsWith("APP-") ? applicant.labor_id : "",
        nationalId: applicant.national_id || "",
        emergencyContactName: applicant.emergency_contact_name || (applicant as any).relative_name || "",
        emergencyContactPhone: applicant.emergency_contact_phone || (applicant as any).relative_phone || "",
        cocStatus: applicant.coc_status || "Not Started",
        contractDate: contractDate || "—",
        duration: duration || 0,
        medicalRemaining,
        medicalRemainingDays,
        injazPayment,
        injazApplicationId:
          (injazStep as any)?.injaz_application_id ||
          (injazStep as any)?.reference_no ||
          "",
        appointmentDate:
          injazStep?.appointment_date ||
          injazStep?.date_started ||
          injazStep?.due_date ||
          "—",
        contact:
          lmsStep?.assigned_officer ||
          applicant.phone ||
          applicant.phone_number ||
          "—",
        remark:
          applicant.remarks ||
          lmsStep?.rejection_remark ||
          lmsStep?.notes ||
          embassyStep?.rejection_remark ||
          embassyStep?.notes ||
          "",
        wakalaStatus,
        wakalaAmount,
        wakalaPaidDate,
        embassyStatus,
        telephone: applicant.phone || applicant.phone_number || "—",
        company: plc?.contractor_name || plc?.contractor || "—",
        lmisStatus,
        issueDate: lmsStep?.date_completed || (lmsStep?.creation ? lmsStep.creation.split(" ")[0] : undefined),
        ticketStatus,
        ticketNumber,
        flightDate: plc?.flight_date ? plc.flight_date.split(" ")[0] : "",
        flightTime:
          (plc as any)?.flight_time ||
          (plc?.flight_date?.includes(" ") ? plc.flight_date.split(" ")[1] : "") ||
          "",

        // Clearances records
        lms: lmsStep,
        injaz: injazStep,
        wakala: undefined,
        embassy: embassyStep,
        stamp: embassyStep?.status === "Stamped" ? embassyStep : undefined,
        ticket: plc
          ? ({
              ticket_number: plc.ticket_number || "",
              flight_date: plc.flight_date ? plc.flight_date.split(" ")[0] : "",
              flight_time:
                (plc as any)?.flight_time ||
                (plc.flight_date?.includes(" ") ? plc.flight_date.split(" ")[1] : "") ||
                "",
            } as any)
          : undefined,
        departure: plc?.departed_on ? ({ departed_on: plc.departed_on } as any) : undefined,

        // V2 Context
        placementId: plc?.name,
        placementStatus: plc?.status,
        clearanceStepName: activeStep?.name,
        isDeparted: plc?.status === "Departed" || applicant.applicant_state === "Departed" || applicant.status === "Departed",
      };

      rows.push(row);
    }

    return rows;
  } catch (err) {
    console.error("fetchOperationalWorkspaceDataV2 error:", err);
    return [];
  }
}
