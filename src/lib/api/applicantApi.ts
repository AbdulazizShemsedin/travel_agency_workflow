import {
  Applicant,
  ApplicantFormData,
  BackendResponse,
  CVGenerationResponse,
  ProcessingRoleType,
  ContractorDocument,
  LMSProcessing,
  InjazProcessing,
  WakalaProcessing,
  EmbassyProcessing,
  DepartureInfo,
  StreamAssignmentPayload,
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
  payload: Partial<Applicant>
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

export async function transitionToRequestPendingApi(
  applicantName: string
): Promise<Applicant> {
  const res = await fetch("/api/method/request_pending", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function uploadAndExtractContractorDocApi(
  applicantName: string,
  docData: Partial<ContractorDocument>
): Promise<Applicant> {
  const res = await fetch("/api/method/upload_contractor_doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, doc_data: docData }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function approveContractorDocApi(
  applicantName: string,
  approved: boolean = true
): Promise<Applicant> {
  const res = await fetch("/api/method/approve_contractor_doc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, approved }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function assignEmployeeApi(
  applicantIds: string[],
  roleType: ProcessingRoleType = "All Roles / Operations Lead",
  employeeId?: string,
  notes?: string,
  streamAssignments?: StreamAssignmentPayload,
  employeeIds?: string[]
): Promise<Applicant[]> {
  const res = await fetch("/api/method/assign_employee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      applicant_ids: applicantIds,
      role_type: roleType,
      employee_id: employeeId,
      notes,
      stream_assignments: streamAssignments,
      employee_ids: employeeIds,
    }),
  });
  return handleApiResponse<Applicant[]>(res);
}

export async function updateLmsStreamApi(
  applicantName: string,
  lmsData: Partial<LMSProcessing>
): Promise<Applicant> {
  const res = await fetch("/api/method/update_lms_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, lms_data: lmsData }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function updateInjazStreamApi(
  applicantName: string,
  injazData: Partial<InjazProcessing>
): Promise<Applicant> {
  const res = await fetch("/api/method/update_injaz_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, injaz_data: injazData }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function updateWakalaStreamApi(
  applicantName: string,
  wakalaData: Partial<WakalaProcessing>
): Promise<Applicant> {
  const res = await fetch("/api/method/update_wakala_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, wakala_data: wakalaData }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function updateEmbassyStreamApi(
  applicantName: string,
  embassyData: Partial<EmbassyProcessing>
): Promise<Applicant> {
  const res = await fetch("/api/method/update_embassy_stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, embassy_data: embassyData }),
  });
  return handleApiResponse<Applicant>(res);
}

export async function markDepartedApi(
  applicantName: string,
  departureData: Partial<DepartureInfo>
): Promise<Applicant> {
  const res = await fetch("/api/method/mark_departed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: applicantName, departure_data: departureData }),
  });
  return handleApiResponse<Applicant>(res);
}
