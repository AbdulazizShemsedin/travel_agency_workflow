import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig() {
  const url = process.env.FRAPPE_BASE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL || "https://applicantprocessing-production.up.railway.app";
  const key = process.env.FRAPPE_API_KEY || "a7b1bb5c2468fcf";
  const secret = process.env.FRAPPE_API_SECRET || "00337e0b45c9cda";
  return {
    url,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `token ${key}:${secret}`,
    },
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : null;
  const config = getFrappeConfig();

  try {
    const search = req.nextUrl.search || `?fields=${encodeURIComponent('["*"]')}&limit_page_length=1000`;
    const url = docname
      ? `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`
      : `${config.url}/api/resource/${encodeURIComponent(doctype)}${search}`;

    const res = await fetch(url, {
      headers: config.headers,
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy GET Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const body = await req.json();
  const config = getFrappeConfig();

  try {
    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy POST Failed: ${err.message}` },
      { status: 500 }
    );
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
  const config = getFrappeConfig();

  try {
    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: config.headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy PUT Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
  const config = getFrappeConfig();

  try {
    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: config.headers,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy DELETE Failed: ${err.message}` },
      { status: 500 }
    );
  }
}
