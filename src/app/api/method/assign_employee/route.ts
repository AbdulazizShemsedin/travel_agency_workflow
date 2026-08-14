import { NextRequest, NextResponse } from "next/server";
import { assignEmployeeInStore } from "@/lib/server/applicantStore";
import { ProcessingRoleType } from "@/types/applicant";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_ids, role_type, employee_id, notes } = body;
    if (!applicant_ids || !Array.isArray(applicant_ids) || applicant_ids.length === 0) {
      return NextResponse.json({ message: "applicant_ids array is required" }, { status: 400 });
    }
    if (!role_type) {
      return NextResponse.json({ message: "role_type is required" }, { status: 400 });
    }
    if (!employee_id) {
      return NextResponse.json({ message: "employee_id is required" }, { status: 400 });
    }

    const updated = assignEmployeeInStore(
      applicant_ids,
      role_type as ProcessingRoleType,
      employee_id,
      notes
    );

    return NextResponse.json({
      data: updated,
      message: `Successfully assigned ${updated.length} applicant(s) to ${role_type}. Status transitioned to Processing.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to assign employees." }, { status: 400 });
  }
}
