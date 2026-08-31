/**
 * V2 CV Generation API
 * 
 * Endpoints:
 * - POST /api/method/agency_tracking.cv_api.generate_cv
 */

import { requestV2 } from "./client";
import { isDemoMode } from "@/lib/config/env";
import { demoStore } from "@/lib/demo/store";

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
  if (isDemoMode()) {
    const updated = demoStore.generateCv(applicantName);
    return {
      applicant_name: updated.name,
      cv_file_url: `/applicants/${encodeURIComponent(applicantName)}/cv`,
      status: "CV Generated",
      message: "Official CV generated successfully",
    };
  }

  return requestV2<V2GenerateCvResponse>(
    "/api/method/agency_tracking.cv_api.generate_cv",
    {
      method: "POST",
      body: { applicant_name: applicantName },
    }
  );
}
