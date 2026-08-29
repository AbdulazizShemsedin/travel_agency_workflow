import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://applicantprocessing-production-e2e7.up.railway.app";

  const headers: Record<string, string> = {
    Accept: "*/*",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");

  // Transparently forward authenticated session credentials
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  if (authHeader) {
    headers["Authorization"] = authHeader;
  } else if (process.env.FRAPPE_API_KEY && process.env.FRAPPE_API_SECRET) {
    headers["Authorization"] = `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`;
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const filePath = slug.map(encodeURIComponent).join("/");
  const config = getFrappeConfig(req);

  try {
    const fileUrl = `${config.url}/files/${filePath}`;
    const res = await fetchWithRetry(fileUrl, {
      headers: config.headers,
      cache: "no-store",
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      const buffer = await res.arrayBuffer();

      const response = new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) response.headers.set("set-cookie", setCookie);
      return response;
    }

    // Return real backend error / status code without synthetic fallbacks
    const errorBody = await res.text().catch(() => "File Not Found");
    const response = new NextResponse(errorBody || "File Not Found", { status: res.status });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) response.headers.set("set-cookie", setCookie);
    return response;
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to fetch file from backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
