import { NextRequest, NextResponse } from "next/server";

/**
 * Raw /api/resource/* Proxy Endpoint — DISABLED IN V2
 * 
 * Strict V2 Architectural Rule:
 * All business operations must use sanctioned whitelisted RPCs under /api/method/agency_tracking.*
 * Raw /api/resource/* access is forbidden.
 */

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { error: "Raw /api/resource/* access is permanently disabled in V2. Use whitelisted /api/method/agency_tracking.* endpoints." },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Raw /api/resource/* mutations are permanently disabled in V2. Use whitelisted /api/method/agency_tracking.* endpoints." },
    { status: 403 }
  );
}

export async function PUT(req: NextRequest) {
  return NextResponse.json(
    { error: "Raw /api/resource/* mutations are permanently disabled in V2. Use whitelisted /api/method/agency_tracking.* endpoints." },
    { status: 403 }
  );
}

export async function DELETE(req: NextRequest) {
  return NextResponse.json(
    { error: "Raw /api/resource/* mutations are permanently disabled in V2. Use whitelisted /api/method/agency_tracking.* endpoints." },
    { status: 403 }
  );
}
