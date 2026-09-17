/**
 * V2 CV Generation API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.cv_api.generate_cv
 */

import { ApiV2Error, requestV2 } from "./client";
import { getApplicantV2 } from "./applicants";

export interface V2GenerateCvResponse {
  applicant_name: string;
  cv_file_url?: string;
  cv_record?: string;
  status?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Compiles and generates official bilateral recruitment CV dossier.
 * Authoritative Backend Endpoint: cv_api.generate_cv
 */
export async function generateCvV2(applicantName: string): Promise<V2GenerateCvResponse> {
  try {
    const res = await requestV2<{ message?: any; applicant_status?: string; cv_record?: string } | any>(
      "/api/method/agency_tracking.cv_api.generate_cv",
      {
        method: "POST",
        body: { applicant_name: applicantName },
      }
    );

    const cvRecord =
      res?.message?.cv_file_url ||
      res?.message?.cv_record ||
      res?.cv_file_url ||
      res?.cv_record ||
      (typeof res?.message === "string" ? res.message : undefined);

    return {
      applicant_name: applicantName,
      cv_file_url: cvRecord,
      cv_record: cvRecord,
      status: res?.message?.applicant_status || res?.applicant_status || "CV Generated",
      message: "Official bilateral CV compiled and generated successfully",
      ...res,
    } as V2GenerateCvResponse;
  } catch (err: any) {
    // If the server took long or an error occurred, check if the backend actually finished
    // generating the CV record and transitioning state in the background.
    for (let check = 0; check < 3; check++) {
      try {
        if (check > 0) {
          await new Promise((r) => setTimeout(r, 2000));
        }
        const app = await getApplicantV2(applicantName);
        const state = app?.applicant_state || app?.status;
        if (state === "CV Generated" || app?.cv_record) {
          return {
            applicant_name: applicantName,
            cv_file_url: app.cv_record || (app as any).cv_pdf_url,
            cv_record: app.cv_record,
            status: "CV Generated",
            message: "Official bilateral CV compiled and generated successfully",
          };
        }
      } catch {
        // Continue checking
      }
    }
    throw err;
  }
}

/**
 * Renders the authoritative compiled CV PDF as a binary download stream.
 * Authoritative Backend Endpoint: cv_api.render_cv_pdf
 * Note (2026-09-12): On render failure (template error, missing photo, etc.),
 * returns an honest 417 ValidationError ("Could not generate the CV PDF. Try again shortly or contact support.")
 * instead of a 200 fake stub.
 */
export async function renderCvPdfV2(applicantName?: string): Promise<Blob> {
  const blob = await requestV2<Blob>(
    "/api/method/agency_tracking.cv_api.render_cv_pdf",
    {
      method: "POST",
      body: applicantName ? { applicant_name: applicantName } : {},
      headers: {
        Accept: "application/pdf, application/octet-stream, */*",
      },
    }
  );

  // Safety guard against legacy fake stubs (~60 bytes)
  if (blob && typeof blob.size === "number" && blob.size < 100) {
    throw new ApiV2Error(
      "Could not generate the CV PDF. Try again shortly or contact support.",
      417
    );
  }

  return blob;
}
