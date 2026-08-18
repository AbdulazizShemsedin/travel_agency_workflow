import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig() {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://applicantprocessing-production.up.railway.app";
  const key = process.env.FRAPPE_API_KEY || "a7b1bb5c2468fcf";
  const secret = process.env.FRAPPE_API_SECRET || "00337e0b45c9cda";
  return {
    url,
    headers: {
      Authorization: `token ${key}:${secret}`,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const filePath = slug.map(encodeURIComponent).join("/");
  const config = getFrappeConfig();

  try {
    const fileUrl = `${config.url}/files/${filePath}`;
    const res = await fetch(fileUrl, {
      headers: config.headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return new NextResponse("File Not Found", { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err: any) {
    return new NextResponse(`File proxy error: ${err.message}`, { status: 500 });
  }
}
