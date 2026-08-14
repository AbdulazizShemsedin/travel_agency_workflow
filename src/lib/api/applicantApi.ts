import {
  Applicant,
  ApplicantFormData,
  BackendResponse,
  CVGenerationResponse,
} from "@/types/applicant";

export class ApiError extends Error {
  serverMessages?: string[];
  exc?: string;
  statusCode: number;

  constructor(
    message: string,
    statusCode: number = 400,
    serverMessages?: string[],
    exc?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.serverMessages = serverMessages;
    this.exc = exc;
  }
}

async function handleApiResponse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as BackendResponse<T>;

  if (!res.ok) {
    let errorMessage = "An error occurred while communicating with the server.";
    let serverMessages: string[] = [];

    if (json._server_messages) {
      try {
        const parsed = JSON.parse(json._server_messages);
        if (Array.isArray(parsed)) {
          serverMessages = parsed;
          errorMessage = parsed.join(", ");
        } else if (typeof parsed === "string") {
          serverMessages = [parsed];
          errorMessage = parsed;
        }
      } catch {
        serverMessages = [json._server_messages];
        errorMessage = json._server_messages;
      }
    } else if (typeof json.message === "string") {
      errorMessage = json.message;
    }

    throw new ApiError(errorMessage, res.status, serverMessages, json.exc);
  }

  // Handle standard Frappe / REST response wrapper { data: ... } or { message: ... } or raw
  if (json.data !== undefined) return json.data as T;
  if (json.message !== undefined) return json.message as T;
  return json as unknown as T;
}

export async function createApplicantDraft(
  payload: ApplicantFormData
): Promise<Applicant> {
  const res = await fetch("/api/resource/Applicant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<Applicant>(res);
}

export async function updateApplicantDraft(
  applicantName: string,
  payload: Partial<ApplicantFormData>
): Promise<Applicant> {
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<Applicant>(res);
}

export async function getApplicant(applicantName: string): Promise<Applicant> {
  const res = await fetch(`/api/resource/Applicant/${encodeURIComponent(applicantName)}`);
  return handleApiResponse<Applicant>(res);
}

export async function getApplicantsList(): Promise<Applicant[]> {
  const res = await fetch("/api/resource/Applicant");
  return handleApiResponse<Applicant[]>(res);
}

export async function registerApplicant(
  applicantName: string
): Promise<{ message: string; applicant: Applicant }> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.register_applicant",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantName }),
    }
  );
  return handleApiResponse<{ message: string; applicant: Applicant }>(res);
}

export async function generateCV(
  applicantName: string
): Promise<CVGenerationResponse> {
  const res = await fetch(
    "/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: applicantName }),
    }
  );
  return handleApiResponse<CVGenerationResponse>(res);
}
