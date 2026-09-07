/**
 * V2 CV Generation API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.cv_api.generate_cv
 */

import { requestV2 } from "./client";

export interface V2GenerateCvResponse {
  applicant_name?: string;
  cv_file_url?: string;
  cv_record?: string;
  applicant_status?: string;
  status?: string;
  message?: string;
  [key: string]: any;
}

/**
 * Generates and attaches the official Agency CV PDF.
 * Valid only for Standard track candidates at Registered status.
 * Automatically advances the Applicant to CV Generated.
 */
export async function generateCvV2(
  applicantName: string
): Promise<V2GenerateCvResponse> {
  // NOTE: Backend PDF generation can take up to 2 minutes on first run.
  // The response shape per OpenAPI spec is: { cv_record: string, applicant_status: string }
  const res = await requestV2<any>(
    "/api/method/agency_tracking.cv_api.generate_cv",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );

  // Backend returns message: { cv_record, applicant_status } per OpenAPI spec
  // res is already unwrapped from message by requestV2
  const cvRecord: string | undefined =
    res?.cv_record ||
    res?.cv_file_url ||
    res?.file_url ||
    undefined;

  return {
    applicant_name: applicantName,
    cv_file_url: cvRecord,
    cv_record: cvRecord,
    status: res?.applicant_status || "CV Generated",
    message: "Official bilateral CV compiled and generated successfully",
    ...res,
  } as V2GenerateCvResponse;
}

/**
 * Renders the authoritative compiled CV PDF as a binary download stream.
 * Authoritative Backend Endpoint: cv_api.render_cv_pdf
 */
export async function renderCvPdfV2(applicantName?: string): Promise<Blob> {
  return requestV2<Blob>(
    "/api/method/agency_tracking.cv_api.render_cv_pdf",
    {
      method: "POST",
      body: applicantName ? { applicant_name: applicantName } : {},
      headers: {
        Accept: "application/pdf, application/octet-stream, */*",
      },
    }
  );
}
