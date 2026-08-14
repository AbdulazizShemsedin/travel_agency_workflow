import { NextRequest, NextResponse } from "next/server";
import { registerApplicantInStore } from "@/lib/server/applicantStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const applicantName = body.applicant_name;

    if (!applicantName) {
      return NextResponse.json(
        {
          _server_messages: JSON.stringify(["applicant_name is required."]),
          message: "applicant_name is required.",
        },
        { status: 400 }
      );
    }

    const updatedApplicant = registerApplicantInStore(applicantName);

    return NextResponse.json({
      message: `Applicant ${applicantName} is now Registered.`,
      applicant: updatedApplicant,
    });
  } catch (error: unknown) {
    const err = error as Error & { serverMessages?: string[] };
    const serverMessages = err.serverMessages
      ? JSON.stringify(err.serverMessages)
      : JSON.stringify([err.message || "Failed to register applicant."]);

    return NextResponse.json(
      {
        exc: err.stack,
        _server_messages: serverMessages,
        message: err.message || "Failed to register applicant.",
      },
      { status: 400 }
    );
  }
}
