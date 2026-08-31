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
  return requestV2<V2GenerateCvResponse>(
    "/api/method/agency_tracking.cv_api.generate_cv",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );
}
