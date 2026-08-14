import { NextRequest, NextResponse } from "next/server";
import { approveContractorDocInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, approved } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = approveContractorDocInStore(applicant_name, approved !== false);
    return NextResponse.json({
      data: updated,
      message: approved !== false
        ? `Contractor document approved! Applicant ${applicant_name} is now Selected.`
        : `Contractor document rejected. Applicant status updated to Cancelled.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to process contractor document." }, { status: 400 });
  }
}
