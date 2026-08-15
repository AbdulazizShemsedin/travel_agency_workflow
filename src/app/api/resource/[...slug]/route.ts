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

const FRAPPE_URL = process.env.FRAPPE_BASE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL;
const FRAPPE_KEY = process.env.FRAPPE_API_KEY;
const FRAPPE_SECRET = process.env.FRAPPE_API_SECRET;

const isLiveBackendConfigured = !!(FRAPPE_URL && FRAPPE_KEY && FRAPPE_SECRET);

function getFrappeHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (FRAPPE_KEY && FRAPPE_SECRET) {
    headers["Authorization"] = `token ${FRAPPE_KEY}:${FRAPPE_SECRET}`;
  }
  return headers;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : null;

  // 1. LIVE BACKEND PROXY (If configured with API Keys)
  if (isLiveBackendConfigured) {
    try {
      const search = req.nextUrl.search || `?fields=${encodeURIComponent('["*"]')}&limit_page_length=1000`;
      const url = docname
        ? `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`
        : `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}${search}`;

      const res = await fetch(url, {
        headers: getFrappeHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      console.warn(`[Frappe Proxy Error] Failed to fetch live ${doctype}: ${err.message}. Falling back to local store.`);
    }
  }

  // 2. LOCAL DEV FALLBACK STORE
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
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const body = await req.json();

  // 1. LIVE BACKEND PROXY
  if (isLiveBackendConfigured) {
    try {
      const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: getFrappeHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      console.warn(`[Frappe Proxy Error] Failed to create live ${doctype}: ${err.message}. Falling back to local store.`);
    }
  }

  // 2. LOCAL DEV FALLBACK STORE
  try {
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
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
  const body = await req.json();

  // 1. LIVE BACKEND PROXY
  if (isLiveBackendConfigured) {
    try {
      const url = `${FRAPPE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: getFrappeHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (err: any) {
      console.warn(`[Frappe Proxy Error] Failed to update live ${doctype}: ${err.message}. Falling back to local store.`);
    }
  }

  // 2. LOCAL DEV FALLBACK STORE
  try {
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
