import { NextRequest, NextResponse } from "next/server";
import { updateWakalaStreamInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, wakala_data } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = updateWakalaStreamInStore(applicant_name, wakala_data || {});
    return NextResponse.json({
      data: updated,
      message: `Wakala authorization stream for ${applicant_name} updated successfully.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to update Wakala stream." }, { status: 400 });
  }
}
