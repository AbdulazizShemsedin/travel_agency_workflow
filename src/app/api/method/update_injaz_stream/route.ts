import { NextRequest, NextResponse } from "next/server";
import { updateInjazStreamInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, injaz_data } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = updateInjazStreamInStore(applicant_name, injaz_data || {});
    return NextResponse.json({
      data: updated,
      message: `Injaz / Teashir processing stream for ${applicant_name} updated successfully.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to update Injaz stream." }, { status: 400 });
  }
}
