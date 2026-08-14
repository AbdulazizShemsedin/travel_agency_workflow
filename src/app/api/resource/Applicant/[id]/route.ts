import { NextRequest, NextResponse } from "next/server";
import { getApplicantById, updateApplicant } from "@/lib/server/applicantStore";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const applicant = getApplicantById(decodeURIComponent(id));
    if (!applicant) {
      return NextResponse.json(
        { message: `Applicant ${id} not found.` },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: applicant });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to fetch applicant." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = updateApplicant(decodeURIComponent(id), body);
    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { message: err.message || "Failed to update applicant." },
      { status: 400 }
    );
  }
}
