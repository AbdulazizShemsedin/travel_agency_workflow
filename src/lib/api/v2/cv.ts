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
  const cvUrl = `/applicants/${encodeURIComponent(applicantName)}/cv`;

  const res = await requestV2<V2GenerateCvResponse>(
    "/api/method/agency_tracking.cv_api.generate_cv",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );
  return {
    applicant_name: applicantName,
    cv_file_url: res?.cv_file_url || cvUrl,
    status: "CV Generated",
    message: res?.message || "Official bilateral CV compiled and generated successfully",
    ...res,
  };
}
