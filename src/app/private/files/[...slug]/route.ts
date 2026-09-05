import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://agencytracking-production.up.railway.app";

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

  const systemHeaders: Record<string, string> = { Accept: "*/*" };
  if (process.env.FRAPPE_API_KEY && process.env.FRAPPE_API_SECRET) {
    systemHeaders["Authorization"] = `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`;
  }

  // Candidates for URLs to attempt
  const attempts = [
    { url: `${config.url}/private/files/${filePath}`, headers: config.headers },
    { url: `${config.url}/private/files/${filePath}`, headers: systemHeaders },
    { url: `${config.url}/files/${filePath}`, headers: systemHeaders },
    { url: `${config.url}/files/${filePath}`, headers: config.headers },
  ];

  try {
    let lastRes: Response | null = null;
    for (const attempt of attempts) {
      try {
        const res = await fetchWithRetry(attempt.url, {
          headers: attempt.headers,
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
        lastRes = res;
      } catch {
        // proceed to next attempt
      }
    }

    if (lastRes) {
      const errorBody = await lastRes.text().catch(() => "File Not Found");
      return new NextResponse(errorBody || "File Not Found", { status: lastRes.status });
    }

    return new NextResponse("File Not Found", { status: 404 });
  } catch (err: any) {
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: `Unable to fetch private file from backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
