import { NextRequest, NextResponse } from "next/server";
import { getAllApplicants, saveApplicantDraft } from "@/lib/server/applicantStore";
import { stage1DraftSchema } from "@/lib/validations/applicant.schema";

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
      const fieldErrors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          _server_messages: JSON.stringify([
            `Validation error saving draft: ${fieldErrors}`,
          ]),
          message: fieldErrors,
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
