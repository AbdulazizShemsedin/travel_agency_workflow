import { NextResponse } from "next/server";

const startTime = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      service: "travel_agency_workflow_portal",
      corridors: ["Saudi Arabia", "Kuwait"],
      version: "2.0.0",
    },
    { status: 200 }
  );
}
