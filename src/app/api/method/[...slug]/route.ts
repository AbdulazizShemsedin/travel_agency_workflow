import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://agencytracking-production.up.railway.app";

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");
  const csrfToken = req.headers.get("x-frappe-csrf-token");

  // Forward CSRF token for state-changing operations
  if (csrfToken) {
    headers["X-Frappe-CSRF-Token"] = csrfToken;
  }

  // Forward user session credentials transparently
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (process.env.FRAPPE_API_KEY && process.env.FRAPPE_API_SECRET) {
    const hasValidUserSession = Boolean(
      cookie &&
      cookie.includes("sid=") &&
      !cookie.includes("sid=Guest") &&
      !cookie.includes("sid=;")
    );
    if (!hasValidUserSession) {
      headers["Authorization"] = `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`;
    }
  }

  return {
    url: url.replace(/\/$/, ""),
    headers,
  };
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
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
      const res = await fetchWithRetry(`${config.url}/api/method/${methodPath}`, {
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

    const res = await fetchWithRetry(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
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
    const res = await fetchWithRetry(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
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
