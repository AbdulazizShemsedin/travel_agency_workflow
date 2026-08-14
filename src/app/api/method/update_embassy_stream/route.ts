import { NextRequest, NextResponse } from "next/server";
import { updateEmbassyStreamInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, embassy_data } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = updateEmbassyStreamInStore(applicant_name, embassy_data || {});
    return NextResponse.json({
      data: updated,
      message: `Embassy visa stamp status for ${applicant_name} updated successfully.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to update Embassy stream." }, { status: 400 });
  }
}
