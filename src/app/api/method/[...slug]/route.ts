import { NextRequest, NextResponse } from "next/server";
import {
  registerApplicantInStore,
  generateCVInStore,
  sendContractRequestInStore,
  parseDossierFileInStore,
  cancelApplicantInStore,
  restoreApplicantInStore,
  getAccountingSummaryInStore,
} from "@/lib/server/applicantStore";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const methodPath = slug.join("/");

    // 1. Upload File RPC (Multipart)
    if (methodPath === "upload_file") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const doctype = formData.get("doctype") as string || "Applicant";
      const docname = formData.get("docname") as string || "";
      const fieldname = formData.get("fieldname") as string || "file_attachment";

      const fileName = file ? file.name : "uploaded_document.pdf";
      const fileUrl = `/private/files/${docname ? `${docname}-` : ""}${fileName}`;

      return NextResponse.json({
        message: {
          file_url: fileUrl,
          name: fileName,
          doctype,
          docname,
          fieldname,
        },
      });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    // 2. Register Applicant RPC
    if (methodPath.endsWith("register_applicant")) {
      const applicantName = body.applicant_name;
      if (!applicantName) {
        return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
      }
      const updated = registerApplicantInStore(applicantName);
      return NextResponse.json({
        message: `Applicant ${applicantName} is now Registered.`,
        applicant: updated,
      });
    }

    // 3. Generate CV RPC
    if (methodPath.endsWith("generate_cv")) {
      const applicantName = body.applicant_name;
      if (!applicantName) {
        return NextResponse.json({ message: "applicant_name is required" }, { status: 400 });
      }
      const res = generateCVInStore(applicantName);
      return NextResponse.json({ message: res });
    }

    // 4. Send Contract Request (WhatsApp) RPC
    if (methodPath.endsWith("send_contract_request")) {
      const crName = body.contract_request_name || `CR-${Date.now()}`;
      const res = sendContractRequestInStore(crName);
      return NextResponse.json({ message: res });
    }

    // 5. Batch Send Contract Requests RPC
    if (methodPath.endsWith("batch_send_contract_requests")) {
      const cvRefs: string[] = body.cv_references || [];
      const contractor: string = body.contractor || "Al Qurashi Recruitment Office";
      return NextResponse.json({
        message: {
          total: cvRefs.length,
          created_count: cvRefs.length,
          sent_count: cvRefs.length,
          failed_count: 0,
          results: cvRefs.map((ref) => ({ cv_reference: ref, status: "sent", contractor })),
        },
      });
    }

    // 6. Parse Dossier File RPC
    if (methodPath.endsWith("parse_dossier_file")) {
      const dossierName = body.dossier_name || `DOSSIER-${Date.now()}`;
      const res = parseDossierFileInStore(dossierName);
      return NextResponse.json({ message: res });
    }

    // 7. Cancel Applicant RPC
    if (methodPath.endsWith("cancel_applicant")) {
      const applicantName = body.applicant_name;
      const remarks = body.cancel_remarks || "Process cancelled by user.";
      const res = cancelApplicantInStore(applicantName, remarks);
      return NextResponse.json(res);
    }

    // 8. Restore Applicant RPC
    if (methodPath.endsWith("restore_applicant")) {
      const applicantName = body.applicant_name;
      const res = restoreApplicantInStore(applicantName, body.restore_option || "auto");
      return NextResponse.json({ message: res });
    }

    return NextResponse.json({ message: "RPC executed successfully." });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        message: err.message || "Failed to execute method RPC.",
        _server_messages: JSON.stringify([err.message]),
      },
      { status: 417 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");

  if (methodPath.endsWith("get_accounting_summary")) {
    const summary = getAccountingSummaryInStore();
    return NextResponse.json({ message: summary });
  }

  return NextResponse.json({ message: "RPC GET executed." });
}
