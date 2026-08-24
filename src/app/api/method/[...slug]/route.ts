import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://applicantprocessing-production.up.railway.app";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");

  // Forward user session credentials transparently
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  return {
    url: url.replace(/\/$/, ""),
    headers,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig(req);

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart file upload transparently
    if (contentType.includes("multipart/form-data") || methodPath === "upload_file") {
      const formData = await req.formData();
      const res = await fetch(`${config.url}/api/method/${methodPath}`, {
        method: "POST",
        headers: config.headers,
        body: formData,
      });

      const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
      const response = NextResponse.json(data, { status: res.status });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) response.headers.set("set-cookie", setCookie);
      return response;
    }

    // JSON / standard payload
    let bodyText = "";
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "{}";
    }

    const forwardHeaders: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
      method: "POST",
      headers: forwardHeaders,
      body: bodyText || "{}",
    });

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    const response = NextResponse.json(data, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig(req);

  try {
    const res = await fetch(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
      method: "GET",
      headers: config.headers,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    const response = NextResponse.json(data, { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
