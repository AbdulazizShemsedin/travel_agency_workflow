import { NextRequest, NextResponse } from "next/server";
import { markDepartedInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, departure_data } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = markDepartedInStore(applicant_name, departure_data || {});
    return NextResponse.json({
      data: updated,
      message: `Applicant ${applicant_name} marked as Departed successfully!`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to mark departure." }, { status: 400 });
  }
}
