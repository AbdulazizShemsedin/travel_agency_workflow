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

  // System-level API key headers (used as primary auth for private file access)
  const systemHeaders: Record<string, string> = { Accept: "*/*" };
  if (process.env.FRAPPE_API_KEY && process.env.FRAPPE_API_SECRET) {
    systemHeaders["Authorization"] = `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`;
  }

  return {
    url: url.replace(/\/$/, ""),
    userSessionHeaders,
    systemHeaders,
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

  const { systemHeaders, userSessionHeaders, url } = config;

  /**
   * Attempt order — prioritised so that the system API token (which has server-side
   * access to all private files) is always tried before the user's browser session.
   * This fixes the 403 that occurs when the backend checks file ownership against the
   * session cookie and rejects a request for a file owned by another user/system account.
   *
   * Strategy:
   *   1. download_file RPC + system token           (primary — works for all private files)
   *   2. download_file RPC + user session           (fallback — works if user owns the file)
   *   3. /private/files/ direct + system token      (fallback for non-RPC accessible files)
   *   4. /private/files/ direct + user session      (fallback)
   *   5. /files/ direct + system token              (public files with system token)
   *   6. /files/ direct + user session              (public files with user session)
   */
  const attempts = [
    // 1. download_file RPC – /files/ path – system token (PRIMARY for private files)
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/files/${rawPath}`)}`,
      headers: systemHeaders,
      label: "download_file /files/ system",
    },
    // 2. download_file RPC – /files/ path – user session
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/files/${rawPath}`)}`,
      headers: userSessionHeaders,
      label: "download_file /files/ session",
    },
    // 3. download_file RPC – /private/files/ path – system token
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/private/files/${rawPath}`)}`,
      headers: systemHeaders,
      label: "download_file /private/files/ system",
    },
    // 4. download_file RPC – /private/files/ path – user session
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/private/files/${rawPath}`)}`,
      headers: userSessionHeaders,
      label: "download_file /private/files/ session",
    },
    // 5. download_file RPC – URL-encoded /files/ path – system token
    {
      url: `${url}/api/method/frappe.core.doctype.file.file.download_file?file_url=${encodeURIComponent(`/files/${encodedPath}`)}`,
      headers: systemHeaders,
      label: "download_file encoded /files/ system",
    },
    // 6. Direct /private/files/ – system token
    {
      url: `${url}/private/files/${encodedPath}`,
      headers: systemHeaders,
      label: "direct /private/files/ system",
    },
    // 7. Direct /private/files/ – user session
    {
      url: `${url}/private/files/${encodedPath}`,
      headers: userSessionHeaders,
      label: "direct /private/files/ session",
    },
    // 8. Direct /files/ – system token
    {
      url: `${url}/files/${encodedPath}`,
      headers: systemHeaders,
      label: "direct /files/ system",
    },
    // 9. Direct /files/ – user session
    {
      url: `${url}/files/${encodedPath}`,
      headers: userSessionHeaders,
      label: "direct /files/ session",
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
          const contentDisposition = res.headers.get("content-disposition");
          if (contentDisposition) {
            responseHeaders["Content-Disposition"] = contentDisposition;
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
