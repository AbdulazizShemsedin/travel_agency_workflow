import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest, methodPath = "") {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://agencytracking-production.up.railway.app";

  const clientAccept = req.headers.get("accept");
  const headers: Record<string, string> = {
    Accept: clientAccept || "application/json",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");
  const csrfToken = req.headers.get("x-frappe-csrf-token");

  // Forward CSRF token for state-changing operations (never on auth or token retrieval)
  if (
    csrfToken &&
    !methodPath.endsWith("/login") &&
    !methodPath.endsWith("/logout") &&
    !methodPath.includes("get_csrf_token")
  ) {
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

function forwardSetCookieHeaders(sourceRes: Response, targetRes: NextResponse | Response) {
  if (typeof (sourceRes.headers as any).getSetCookie === "function") {
    const cookies: string[] = (sourceRes.headers as any).getSetCookie();
    for (const cookie of cookies) {
      targetRes.headers.append("set-cookie", cookie);
    }
  } else {
    const setCookie = sourceRes.headers.get("set-cookie");
    if (setCookie) {
      targetRes.headers.set("set-cookie", setCookie);
    }
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig(req, methodPath);

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
      forwardSetCookieHeaders(res, response);
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

    const resContentType = res.headers.get("content-type") || "";
    const contentDisposition = res.headers.get("content-disposition") || "";
    const isBinary =
      resContentType.includes("application/pdf") ||
      resContentType.includes("application/vnd.openxmlformats") ||
      resContentType.includes("application/vnd.ms-excel") ||
      resContentType.includes("text/csv") ||
      resContentType.includes("application/octet-stream") ||
      resContentType.includes("binary/octet-stream") ||
      contentDisposition.includes("attachment");

    if (isBinary && res.ok) {
      const buffer = await res.arrayBuffer();
      const headers = new Headers();
      headers.set("Content-Type", resContentType);
      const contentDisposition = res.headers.get("content-disposition");
      if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
      const binaryResponse = new Response(buffer, { status: res.status, headers });
      forwardSetCookieHeaders(res, binaryResponse);
      return binaryResponse;
    }

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    if (!res.ok) {
      console.error("[PROXY ERROR POST]", methodPath, res.status, data);
    }
    const response = NextResponse.json(data, { status: res.status });
    forwardSetCookieHeaders(res, response);
    return response;
  } catch (err: any) {
    console.error("[PROXY CATCH POST]", methodPath, err);
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
  const config = getFrappeConfig(req, methodPath);

  try {
    const res = await fetchWithRetry(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
      method: "GET",
      headers: config.headers,
      cache: "no-store",
    });

    const resContentType = res.headers.get("content-type") || "";
    const contentDisposition = res.headers.get("content-disposition") || "";
    const isBinary =
      resContentType.includes("application/pdf") ||
      resContentType.includes("application/vnd.openxmlformats") ||
      resContentType.includes("application/vnd.ms-excel") ||
      resContentType.includes("text/csv") ||
      resContentType.includes("application/octet-stream") ||
      resContentType.includes("binary/octet-stream") ||
      contentDisposition.includes("attachment");

    if (isBinary && res.ok) {
      const buffer = await res.arrayBuffer();
      const headers = new Headers();
      headers.set("Content-Type", resContentType);
      const contentDisposition = res.headers.get("content-disposition");
      if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
      const binaryResponse = new Response(buffer, { status: res.status, headers });
      forwardSetCookieHeaders(res, binaryResponse);
      return binaryResponse;
    }

    const data = await res.json().catch(() => ({ message: "Non-JSON response from backend" }));
    if (!res.ok) {
      console.error("[PROXY ERROR GET]", methodPath, res.status, data);
    }
    const response = NextResponse.json(data, { status: res.status });
    forwardSetCookieHeaders(res, response);
    return response;
  } catch (err: any) {
    console.error("[PROXY CATCH GET]", methodPath, err);
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to connect to backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
