import { NextRequest, NextResponse } from "next/server";
import {
  getAllApplicantsFromStore,
  getApplicantFromStore,
  createDraftInStore,
  updateDraftInStore,
  mockContractors,
  mockContractRequests,
  mockDossiers,
  updateLmsClearanceInStore,
  updateWakalaClearanceInStore,
  updateInjazClearanceInStore,
  submitDsrStampInStore,
  submitDsrTicketInStore,
  submitDsrDepartureInStore,
} from "@/lib/server/applicantStore";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : null;

  if (doctype === "Applicant") {
    if (docname) {
      const applicant = getApplicantFromStore(docname);
      if (!applicant) {
        return NextResponse.json({ message: `Applicant ${docname} not found` }, { status: 404 });
      }
      return NextResponse.json({ data: applicant });
    }
    const applicants = getAllApplicantsFromStore();
    return NextResponse.json({ data: applicants });
  }

  if (doctype === "Contractor") {
    return NextResponse.json({ data: Array.from(mockContractors.values()) });
  }

  if (doctype === "Contract Request") {
    return NextResponse.json({ data: Array.from(mockContractRequests.values()) });
  }

  if (doctype === "Applicant Dossier") {
    return NextResponse.json({ data: Array.from(mockDossiers.values()) });
  }

  return NextResponse.json({ data: [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const doctype = decodeURIComponent(slug[0] || "");
    const body = await req.json();

    if (doctype === "Applicant") {
      const newApplicant = createDraftInStore(body);
      return NextResponse.json({ data: newApplicant }, { status: 201 });
    }

    if (doctype === "Contractor") {
      const name = body.name || `CTR-${Math.floor(1000 + Math.random() * 9000)}`;
      const contractor = { ...body, name, status: "Active" };
      mockContractors.set(contractor.company_name || name, contractor);
      return NextResponse.json({ data: contractor }, { status: 201 });
    }

    if (doctype === "Applicant Dossier") {
      const dossier = {
        name: body.name || `DOSSIER-${Math.floor(1000 + Math.random() * 9000)}`,
        ...body,
      };
      mockDossiers.set(dossier.name, dossier);
      return NextResponse.json({ data: dossier }, { status: 201 });
    }

    if (doctype === "DSR Stamp") {
      const stamp = submitDsrStampInStore(body);
      return NextResponse.json({ data: stamp }, { status: 201 });
    }

    if (doctype === "DSR Ticket") {
      const ticket = submitDsrTicketInStore(body);
      return NextResponse.json({ data: ticket }, { status: 201 });
    }

    if (doctype === "DSR Departure") {
      const departure = submitDsrDepartureInStore(body);
      return NextResponse.json({ data: departure }, { status: 201 });
    }

    return NextResponse.json({ data: body }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to create resource." }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const doctype = decodeURIComponent(slug[0] || "");
    const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
    const body = await req.json();

    if (doctype === "Applicant") {
      const updated = updateDraftInStore(docname, body);
      return NextResponse.json({ data: updated });
    }

    if (doctype === "LMS Clearance") {
      const updated = updateLmsClearanceInStore(docname, body);
      return NextResponse.json({ data: updated });
    }

    if (doctype === "Wakala Clearance") {
      const updated = updateWakalaClearanceInStore(docname, body);
      return NextResponse.json({ data: updated });
    }

    if (doctype === "Injaz Clearance") {
      const updated = updateInjazClearanceInStore(docname, body);
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ data: body });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ message: err.message || "Failed to update resource." }, { status: 400 });
  }
}
