import { NextRequest, NextResponse } from "next/server";
import { uploadAndExtractContractorDocInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_name, doc_data } = body;
    if (!applicant_name) {
      return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
    }
    const updated = uploadAndExtractContractorDocInStore(applicant_name, doc_data || {});
    return NextResponse.json({ data: updated, message: "Contractor document uploaded and info parsed successfully." });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to upload contractor doc." }, { status: 400 });
  }
}
