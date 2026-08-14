import { NextRequest, NextResponse } from "next/server";
import { transitionToRequestPending } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = transitionToRequestPending(applicant_name);
    return NextResponse.json({ data: updated, message: `Applicant ${applicant_name} is now in Request Pending stage.` });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to update status." }, { status: 400 });
  }
}
