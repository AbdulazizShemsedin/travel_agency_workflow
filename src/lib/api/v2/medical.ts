import { requestV2 } from "./client";

export interface V2MedicalCurrent {
  stage?: "Registration" | "Selection" | "Pre-departure" | string;
  status?: "Pending" | "FIT" | "UNFIT" | string | null;
  exam_date?: string | null;
  expiry_date?: string | null;
  expired?: boolean;
}

export interface V2MedicalStageRecord {
  status?: "Pending" | "FIT" | "UNFIT" | string | null;
  exam_date?: string | null;
  expiry_date?: string | null;
  expired?: boolean;
  medical_center?: string | null;
  notes?: string | null;
  [key: string]: any;
}

export interface V2MedicalStatusResponse {
  current?: V2MedicalCurrent;
  registration?: V2MedicalStageRecord | null;
  selection?: V2MedicalStageRecord | null;
  predeparture?: V2MedicalStageRecord | null;
  [key: string]: any;
}

export interface EffectiveMedicalResult {
  /** Effective display status: "FIT" | "UNFIT" | "Pending" | "FIT (expired)" | "" */
  status: "FIT" | "UNFIT" | "Pending" | "FIT (expired)" | "";
  /** Base status without expiration qualifier: "FIT" | "UNFIT" | "Pending" | "" */
  rawStatus: "FIT" | "UNFIT" | "Pending" | "";
  /** The stage that produced the effective result: "Registration" | "Selection" | "Pre-departure" | undefined */
  stage?: "Registration" | "Selection" | "Pre-departure" | string;
  /** Whether the FIT result is past its expiration date */
  isExpired: boolean;
  /** Examination/issue date of the effective medical stage */
  examDate?: string | null;
  /** Expiration date of the effective medical stage */
  expiryDate?: string | null;
  /** Days remaining until expiration (positive if active, negative if expired, null if no expiry) */
  daysRemaining?: number | null;
}

/**
 * Resolves the authoritative effective medical status according to the documented backend rules:
 * 1. The most recent medical stage with a FIT or UNFIT result determines the current medical result.
 * 2. Medical stages that are Pending or empty are skipped when looking for a completed result.
 * 3. If no medical stage has a completed result, the registration medical status is used.
 * 4. A FIT result that is past its expiry date remains FIT, but the UI must display "FIT (expired)".
 * 5. Distinguishes genuine Pending from missing/unloaded data.
 */
export function resolveEffectiveMedical(
  applicant: any,
  placement?: any
): EffectiveMedicalResult {
  if (!applicant && !placement) {
    return {
      status: "",
      rawStatus: "",
      isExpired: false,
      examDate: null,
      expiryDate: null,
      daysRemaining: null,
    };
  }

  // 1. Authoritative 0.-22: medical_current provided directly by backend
  const medCurrent = applicant?.medical_current || placement?.medical_current;
  if (medCurrent && medCurrent.status) {
    const raw = String(medCurrent.status).toUpperCase().trim();
    const stage = medCurrent.stage || "Registration";
    const examDate = medCurrent.exam_date || null;
    const expiryDate = medCurrent.expiry_date || null;
    let isExpired = Boolean(medCurrent.expired);
    if (!isExpired && expiryDate && raw === "FIT") {
      isExpired = new Date(expiryDate).getTime() < Date.now();
    }
    let days: number | null = null;
    if (expiryDate) {
      const diff = new Date(expiryDate).getTime() - Date.now();
      days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    if (raw === "FIT") {
      return {
        status: isExpired ? "FIT (expired)" : "FIT",
        rawStatus: "FIT",
        stage,
        isExpired,
        examDate,
        expiryDate,
        daysRemaining: days,
      };
    }
    if (raw === "UNFIT") {
      return {
        status: "UNFIT",
        rawStatus: "UNFIT",
        stage,
        isExpired: false,
        examDate,
        expiryDate,
        daysRemaining: days,
      };
    }
    if (raw === "PENDING" || raw === "IN PROGRESS") {
      return {
        status: "Pending",
        rawStatus: "Pending",
        stage,
        isExpired: false,
        examDate,
        expiryDate,
        daysRemaining: days,
      };
    }
  }

  // 2. Multi-stage hierarchical calculation per documented rules:
  // Stage 3: Pre-departure (Medical 2 on placement)
  const med2Raw = String(placement?.medical_2_status || applicant?.medical_2_status || "").toUpperCase().trim();
  if (med2Raw === "FIT" || med2Raw === "UNFIT") {
    const examDate =
      placement?.medical_2_examination_date ||
      placement?.medical_2_date ||
      applicant?.medical_2_examination_date ||
      null;
    return {
      status: med2Raw as "FIT" | "UNFIT",
      rawStatus: med2Raw as "FIT" | "UNFIT",
      stage: "Pre-departure",
      isExpired: false,
      examDate,
      expiryDate: null,
      daysRemaining: null,
    };
  }

  // Stage 2: Selection (Medical 1 on placement)
  const medSelRaw = String(
    placement?.medical_selected_status || applicant?.medical_selected_status || ""
  ).toUpperCase().trim();
  if (medSelRaw === "FIT" || medSelRaw === "UNFIT") {
    const examDate =
      placement?.medical_selected_examination_date ||
      placement?.medical_selected_date ||
      applicant?.medical_selected_examination_date ||
      null;
    const expiryDate =
      placement?.medical_selected_expiry_date ||
      applicant?.medical_selected_expiry_date ||
      null;
    let isExpired = false;
    let days: number | null = null;
    if (expiryDate) {
      const diff = new Date(expiryDate).getTime() - Date.now();
      days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (medSelRaw === "FIT" && diff < 0) {
        isExpired = true;
      }
    }
    return {
      status: isExpired ? "FIT (expired)" : (medSelRaw as "FIT" | "UNFIT"),
      rawStatus: medSelRaw as "FIT" | "UNFIT",
      stage: "Selection",
      isExpired,
      examDate,
      expiryDate,
      daysRemaining: days,
    };
  }

  // Stage 1: Registration
  const medRegRaw = String(applicant?.medical_status || "").toUpperCase().trim();
  if (medRegRaw === "FIT" || medRegRaw === "UNFIT") {
    const examDate = applicant?.exam_date || applicant?.medical_issue_date || null;
    const expiryDate = applicant?.medical_expiry_date || null;
    let isExpired = false;
    let days: number | null = null;
    if (expiryDate) {
      const diff = new Date(expiryDate).getTime() - Date.now();
      days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (medRegRaw === "FIT" && diff < 0) {
        isExpired = true;
      }
    }
    return {
      status: isExpired ? "FIT (expired)" : (medRegRaw as "FIT" | "UNFIT"),
      rawStatus: medRegRaw as "FIT" | "UNFIT",
      stage: "Registration",
      isExpired,
      examDate,
      expiryDate,
      daysRemaining: days,
    };
  }

  // Rule 3: If no medical stage has a completed result, registration medical status is used.
  if (medRegRaw === "PENDING" || medRegRaw === "IN PROGRESS") {
    const examDate = applicant?.exam_date || applicant?.medical_issue_date || null;
    const expiryDate = applicant?.medical_expiry_date || null;
    return {
      status: "Pending",
      rawStatus: "Pending",
      stage: "Registration",
      isExpired: false,
      examDate,
      expiryDate,
      daysRemaining: null,
    };
  }

  // If Selection or Pre-departure is explicitly "Pending" while registration was empty
  if (medSelRaw === "PENDING" || medSelRaw === "IN PROGRESS") {
    return {
      status: "Pending",
      rawStatus: "Pending",
      stage: "Selection",
      isExpired: false,
      examDate: placement?.medical_selected_examination_date || null,
      expiryDate: placement?.medical_selected_expiry_date || null,
      daysRemaining: null,
    };
  }

  // If no medical record at all, do not fabricate "Pending"
  return {
    status: "",
    rawStatus: "",
    isExpired: false,
    examDate: null,
    expiryDate: null,
    daysRemaining: null,
  };
}

/**
 * Retrieves the authoritative 3-stage medical status (Registration, Selection, Pre-departure)
 * along with the current authoritative `medical_current` for an applicant or placement.
 * Backend RPC: POST /api/method/agency_tracking.medical_status.get_medical_status
 */
export async function getMedicalStatusV2(params: {
  applicant_name?: string;
  placement_name?: string;
}): Promise<V2MedicalStatusResponse> {
  return requestV2<V2MedicalStatusResponse>(
    "/api/method/agency_tracking.medical_status.get_medical_status",
    {
      method: "POST",
      body: params,
    }
  );
}

