import { NextRequest, NextResponse } from "next/server";
import { getAllApplicants, saveApplicantDraft } from "@/lib/server/applicantStore";
import { stage1DraftSchema } from "@/lib/validations/applicant.schema";

const FIELD_LABEL_MAP: Record<string, string> = {
  first_name: "First Name",
  last_name: "Last Name",
  gender: "Gender",
  religion: "Religion",
  marital_status: "Marital Status",
  children: "Children Count",
  nationality: "Nationality",
  phone_number: "Phone Number",
  city: "City",
  country: "Country",
  date_of_birth: "Date of Birth",
  passport_number: "Passport Number",
  highest_education: "Highest Education Level",
  labour_id: "Labour ID Number",
  contact_person_name: "Emergency Contact Name",
  contact_person_phone: "Emergency Contact Phone",
  coc_status: "COC Status",
  exam_date: "COC Exam Date",
  medical_status: "Medical Status",
  medical_expiry_date: "Medical Expiration Date",
};

export async function GET() {
  try {
    const list = getAllApplicants();
    return NextResponse.json({ data: list });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to fetch applicants." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Stage 1 validation (Mandatory for Draft)
    const validationResult = stage1DraftSchema.safeParse(body);
    if (!validationResult.success) {
      const missingFields = validationResult.error.errors.map((e) => {
        const fieldKey = e.path[0] as string;
        return FIELD_LABEL_MAP[fieldKey] || fieldKey;
      });
      const uniqueFields = Array.from(new Set(missingFields));
      const errorMessage = `Missing or invalid required draft field(s): ${uniqueFields.join(", ")}`;

      return NextResponse.json(
        {
          _server_messages: JSON.stringify([errorMessage]),
          message: errorMessage,
          field_errors: validationResult.error.errors.map((e) => ({
            field: e.path[0],
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const savedApplicant = saveApplicantDraft(validationResult.data);
    return NextResponse.json({ data: savedApplicant }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
