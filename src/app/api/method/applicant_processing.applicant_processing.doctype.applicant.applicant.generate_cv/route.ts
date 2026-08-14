import { NextRequest, NextResponse } from "next/server";
import { generateCVInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const applicantName = body.applicant_name;

    if (!applicantName) {
      return NextResponse.json(
        { message: "applicant_name is required." },
        { status: 400 }
      );
    }

    const cvData = generateCVInStore(applicantName);

    return NextResponse.json({
      message: cvData,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to generate CV." },
      { status: 400 }
    );
  }
}
