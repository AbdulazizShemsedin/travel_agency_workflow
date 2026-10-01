import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest) {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://agencytracking-production-2a06.up.railway.app";

  const userSessionHeaders: Record<string, string> = {
    Accept: "*/*",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");

  if (cookie) {
    userSessionHeaders["Cookie"] = cookie;
  }
  if (authHeader) {
    userSessionHeaders["Authorization"] = authHeader;
  }

  return {
    url: url.replace(/\/$/, ""),
    userSessionHeaders,
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
  const rawPath = slug.join("/");
  const encodedPath = slug.map(encodeURIComponent).join("/");
  const config = getFrappeConfig(req);

  const { userSessionHeaders, url } = config;

  const attempts = [
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/files/${rawPath}`)}`,
      headers: userSessionHeaders,
      label: "download_file /files/",
    },
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/private/files/${rawPath}`)}`,
      headers: userSessionHeaders,
      label: "download_file /private/files/",
    },
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/files/${encodedPath}`)}`,
      headers: userSessionHeaders,
      label: "download_file encoded /files/",
    },
    {
      url: `${url}/files/${encodedPath}`,
      headers: userSessionHeaders,
      label: "direct /files/",
    },
    {
      url: `${url}/private/files/${encodedPath}`,
      headers: userSessionHeaders,
      label: "direct /private/files/",
    },
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

          const responseHeaders: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
            "Accept-Ranges": "bytes",
          };
          const isViewableInline =
            contentType.includes("pdf") ||
            contentType.startsWith("image/") ||
            contentType.startsWith("text/");
          const urlObj = new URL(req.url);
          const forceDownload = urlObj.searchParams.get("download") === "1";

          if (isViewableInline && !forceDownload) {
            responseHeaders["Content-Disposition"] = "inline";
          } else {
            const contentDisposition = res.headers.get("content-disposition");
            if (contentDisposition) {
              responseHeaders["Content-Disposition"] = contentDisposition;
            }
          }

          const response = new NextResponse(buffer, {
            status: 200,
            headers: responseHeaders,
          });
          const setCookie = res.headers.get("set-cookie");
          if (setCookie) response.headers.set("set-cookie", setCookie);
          return response;
        }
        // Track the last non-ok response for error forwarding
        if (!lastRes || res.status !== 403) {
          lastRes = res;
        }
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
        message: `Unable to fetch file from backend engine: ${err.message}`,
      },
      { status: 502 }
    );
  }
}
