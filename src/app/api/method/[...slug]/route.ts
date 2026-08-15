import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig() {
  const url = process.env.FRAPPE_BASE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL || "https://applicantprocessing-production.up.railway.app";
  const key = process.env.FRAPPE_API_KEY || "a7b1bb5c2468fcf";
  const secret = process.env.FRAPPE_API_SECRET || "00337e0b45c9cda";
  return {
    url,
    key,
    secret,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `token ${key}:${secret}`,
    },
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig();

  try {
    if (methodPath === "upload_file") {
      const formData = await req.formData();
      const res = await fetch(`${config.url}/api/method/upload_file`, {
        method: "POST",
        headers: { Authorization: `token ${config.key}:${config.secret}` },
        body: formData,
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // empty body
    }

    const res = await fetch(`${config.url}/api/method/${methodPath}`, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify(bodyData),
    });
    const data = await res.json();
    const isError = res.status >= 400 || !!(data.exc || data.exception || data.exc_type);
    return NextResponse.json(data, { status: isError ? (res.status >= 400 ? res.status : 400) : res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy RPC Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig();

  try {
    const res = await fetch(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
      headers: config.headers,
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy GET RPC Failed: ${err.message}` },
      { status: 500 }
    );
  }
}
