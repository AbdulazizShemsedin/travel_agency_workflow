import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest, methodPath = "") {
  const url = process.env.FRAPPE_BASE_URL;
  if (!url) {
    return null;
  }

  const clientAccept = req.headers.get("accept");
  const headers: Record<string, string> = {
    Accept: clientAccept || "application/json",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");
  const csrfToken = req.headers.get("x-frappe-csrf-token");

  const isAuthOrCsrf =
    methodPath === "login" ||
    methodPath.endsWith("/login") ||
    methodPath.includes("get_csrf_token");

  // Forward CSRF token for state-changing operations including logout (never on login or token retrieval)
  if (csrfToken && !isAuthOrCsrf) {
    headers["X-Frappe-CSRF-Token"] = csrfToken;
  }

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

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 2, timeoutMs = 45000): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError?.name === "AbortError") {
    lastError = new Error("The server took too long to respond. Please try again in a moment.");
  }
  throw lastError;
}

async function parseJsonOrFriendlyMessage(res: Response) {
  if (res.status === 413) {
    return {
      message: "The uploaded file exceeds the server payload size limit. Please compress or optimize the file before uploading (recommended under 20MB).",
      error: "Request Entity Too Large",
      status_code: 413,
    };
  }

  const isUpstreamError = !res.ok && res.status >= 500;
  const fallbackMessage = isUpstreamError
    ? "The server is temporarily busy or timed out processing the file. Please try again with a compressed or smaller file."
    : "Could not complete this request right now. Please try again in a moment.";

  try {
    const rawText = await res.text();
    if (!rawText || !rawText.trim()) {
      return { message: fallbackMessage };
    }
    try {
      return JSON.parse(rawText);
    } catch {
      // Non-JSON response (e.g. Werkzeug or Nginx HTML error page)
      if (
        res.status === 413 ||
        rawText.includes("413 Request Entity Too Large") ||
        rawText.includes("Request Entity Too Large") ||
        rawText.includes("The file is too large")
      ) {
        return {
          message: "The uploaded file exceeds the server payload size limit. Please compress or optimize the file before uploading (recommended under 20MB).",
          error: "Request Entity Too Large",
          status_code: 413,
        };
      }
      const cleanSnippet = rawText
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160);
      return {
        message: cleanSnippet ? `${fallbackMessage} (${cleanSnippet})` : fallbackMessage,
        raw_error: cleanSnippet || undefined,
        status_code: res.status,
      };
    }
  } catch {
    return { message: fallbackMessage };
  }
}

function forwardSetCookieHeaders(req: NextRequest, sourceRes: Response, targetRes: NextResponse | Response) {
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const sanitizeCookie = (cookie: string) => {
    // Keep removing Domain; keep SameSite (use Lax when backend sent none); add Secure when browser is on HTTPS
    let cleaned = cookie.replace(/;\s*Domain=[^;]+/gi, "");

    if (!/;\s*SameSite=/i.test(cleaned)) {
      cleaned += "; SameSite=Lax";
    }

    if (isHttps) {
      if (!/;\s*Secure/i.test(cleaned)) {
        cleaned += "; Secure";
      }
    } else {
      cleaned = cleaned.replace(/;\s*Secure/gi, "");
    }

    return cleaned;
  };

  if (typeof (sourceRes.headers as any).getSetCookie === "function") {
    const cookies: string[] = (sourceRes.headers as any).getSetCookie();
    for (const cookie of cookies) {
      targetRes.headers.append("set-cookie", sanitizeCookie(cookie));
    }
  } else {
    const setCookie = sourceRes.headers.get("set-cookie");
    if (setCookie) {
      targetRes.headers.set("set-cookie", sanitizeCookie(setCookie));
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
  if (!config) {
    return NextResponse.json(
      { message: "Backend address not configured" },
      { status: 503 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart file upload transparently
    if (contentType.includes("multipart/form-data") || methodPath === "upload_file") {
      const formData = await req.formData();
      const res = await fetchWithRetry(
        `${config.url}/api/method/${methodPath}`,
        {
          method: "POST",
          headers: config.headers,
          body: formData,
        },
        0,
        300000
      );

      const data = await parseJsonOrFriendlyMessage(res);
      const response = NextResponse.json(data, { status: res.status });
      forwardSetCookieHeaders(req, res, response);
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

    const isHeavyCvOrPdf =
      methodPath === "agency_tracking.cv_api.generate_cv" ||
      methodPath === "agency_tracking.cv_api.render_cv_pdf";
    const isLoginMethod = methodPath === "login" || methodPath.endsWith("/login");
    const postMaxRetries = isHeavyCvOrPdf || isLoginMethod ? 0 : 2;
    const postTimeoutMs = isHeavyCvOrPdf ? 180000 : isLoginMethod ? 90000 : 45000;

    const effectiveBodyText = bodyText || "{}";

    let res = await fetchWithRetry(
      `${config.url}/api/method/${methodPath}${req.nextUrl.search}`,
      {
        method: "POST",
        headers: forwardHeaders,
        body: effectiveBodyText,
      },
      postMaxRetries,
      postTimeoutMs
    );

    // If login returned 417 (TimestampMismatchError: User document was modified concurrently),
    // wait briefly for the concurrent transaction to commit, then retry once with the latest document state.
    if (isLoginMethod && res.status === 417) {
      console.warn("[PROXY LOGIN] Received 417 TimestampMismatchError on login. Retrying once after 600ms...");
      await new Promise((resolve) => setTimeout(resolve, 600));
      res = await fetchWithRetry(
        `${config.url}/api/method/${methodPath}${req.nextUrl.search}`,
        {
          method: "POST",
          headers: forwardHeaders,
          body: effectiveBodyText,
        },
        0,
        45000
      );
    }

    // Special handler for get_thread_messages: enrich with thread participants presence & read receipts
    if (methodPath === "agency_tracking.chat_api.get_thread_messages") {
      if (res.ok) {
        const rawData = await res.json().catch(() => ({ message: [] }));
        const messagesList: any[] = Array.isArray(rawData.message)
          ? rawData.message
          : Array.isArray(rawData)
          ? rawData
          : [];

        let participants: any[] = [];
        try {
          const parsed = JSON.parse(bodyText || "{}");
          const targetThreadName = parsed.thread_name;
          if (targetThreadName) {
            const threadDocRes = await fetchWithRetry(
              `${config.url}/api/method/agency_tracking.chat_api.get_thread_participants`,
              {
                method: "POST",
                headers: forwardHeaders,
                body: JSON.stringify({ thread_name: targetThreadName }),
              }
            );
            if (threadDocRes.ok) {
              const partData = await threadDocRes.json().catch(() => ({}));
              participants = Array.isArray(partData.message)
                ? partData.message
                : Array.isArray(partData.participants)
                ? partData.participants
                : Array.isArray(partData)
                ? partData
                : [];
            }
          }
        } catch (err) {
          console.warn("[PROXY CHAT] Error fetching participants for thread:", err);
        }

        const response = NextResponse.json({ message: messagesList, participants }, { status: 200 });
        forwardSetCookieHeaders(req, res, response);
        return response;
      }
    }

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
      headers.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");
      const binaryResponse = new Response(buffer, { status: res.status, headers });
      forwardSetCookieHeaders(req, res, binaryResponse);
      return binaryResponse;
    }

    const data = await parseJsonOrFriendlyMessage(res);

    // Post-query enrichment for contractor user details
    if (res.ok && data) {
      if (methodPath === "agency_tracking.contractor_api.list_contractors") {
        const list: any[] = Array.isArray(data.message) ? data.message : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const enriched = await Promise.all(
            list.map(async (c) => {
              if (!c.user) return c;
              try {
                const uRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
                  method: "POST",
                  headers: forwardHeaders,
                  body: JSON.stringify({ doctype: "User", name: c.user }),
                });
                const uData = await uRes.json().catch(() => ({}));
                const u = uData.message || {};
                return {
                  ...c,
                  contact_person: c.contact_person || u.first_name || "",
                  phone: c.phone || u.phone || u.mobile_no || "",
                  whatsapp: c.whatsapp || u.mobile_no || u.phone || "",
                  email: c.email || u.email || c.user,
                };
              } catch {
                return c;
              }
            })
          );
          if (Array.isArray(data.message)) data.message = enriched;
          else if (Array.isArray(data)) (data as any) = enriched;
        }
      }
    }

    if (!res.ok) {
      const isExpectedAuthChallenge = (res.status === 401 || (res.status === 417 && isLoginMethod)) && (
        methodPath.includes("login") ||
        methodPath.includes("logout") ||
        methodPath.includes("get_current_user") ||
        methodPath.includes("get_logged_user")
      );
      const isPermissionError = res.status === 403 && (
        data?.exc_type === "PermissionError" ||
        String(data?.exception || "").includes("PermissionError") ||
        String(data?._error_message || "").includes("No permission")
      );
      if (!isExpectedAuthChallenge && !isPermissionError) {
        const cleanMsg =
          data?._server_messages
            ? (() => {
                try {
                  const parsed = JSON.parse(data._server_messages);
                  return JSON.parse(parsed[0])?.message || data.exception;
                } catch {
                  return data?.exception;
                }
              })()
            : data?.exception || data?.message || data?._error_message || "Backend Error";
        console.error(`[PROXY ERROR POST] ${methodPath} ${res.status}:`, cleanMsg);
      } else if (isPermissionError) {
        console.warn(`[PROXY 403 FORBIDDEN] ${methodPath}:`, data?._error_message || "Permission Denied");
      }
    }

    // For logout requests: forward backend response and clear cookies only after backend invalidates session
    const isLogoutMethod = methodPath === "logout" || methodPath.endsWith("/logout");
    if (isLogoutMethod) {
      if (res.ok) {
        const logoutResponse = NextResponse.json(
          data || { message: "Logged out", home_page: "/login", full_name: "Guest" },
          { status: 200 }
        );
        forwardSetCookieHeaders(req, res, logoutResponse);
        const expiredDate = "Thu, 01 Jan 1970 00:00:00 GMT";
        const isHttps =
          req.headers.get("x-forwarded-proto") === "https" ||
          req.nextUrl.protocol === "https:";
        const sec = isHttps ? "; Secure" : "";
        ["sid", "system_user", "full_name", "user_id", "user_image"].forEach((cookieName) => {
          logoutResponse.headers.append(
            "set-cookie",
            `${cookieName}=; Path=/; Expires=${expiredDate}; Max-Age=0; HttpOnly; SameSite=Lax${sec}`
          );
        });
        return logoutResponse;
      }
      const errorResponse = NextResponse.json(data, { status: res.status });
      forwardSetCookieHeaders(req, res, errorResponse);
      return errorResponse;
    }

    const response = NextResponse.json(data, { status: res.status });
    forwardSetCookieHeaders(req, res, response);
    return response;
  } catch (err: any) {
    console.error("[PROXY CATCH POST]", methodPath, err);
    const detail =
      typeof err?.message === "string" && err.message.length > 0
        ? err.message
        : "Unable to connect to the server. Please check your network connection and try again.";
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: detail.includes("took too long")
          ? detail
          : "Unable to connect to the server. Please check your network connection and try again.",
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
  if (!config) {
    return NextResponse.json(
      { message: "Backend address not configured" },
      { status: 503 }
    );
  }

  try {
    const isHeavyCvOrPdf =
      methodPath === "agency_tracking.cv_api.render_cv_pdf" ||
      methodPath.includes("get_batch_invoice_pdf");
    const getMaxRetries = isHeavyCvOrPdf ? 0 : 2;
    const getTimeoutMs = isHeavyCvOrPdf ? 180000 : 45000;

    const res = await fetchWithRetry(
      `${config.url}/api/method/${methodPath}${req.nextUrl.search}`,
      {
        method: "GET",
        headers: config.headers,
        cache: "no-store",
      },
      getMaxRetries,
      getTimeoutMs
    );

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
      headers.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");
      const binaryResponse = new Response(buffer, { status: res.status, headers });
      forwardSetCookieHeaders(req, res, binaryResponse);
      return binaryResponse;
    }

    const data = await parseJsonOrFriendlyMessage(res);
    if (!res.ok) {
      const isExpectedAuthChallenge = res.status === 401 && (
        methodPath.includes("login") ||
        methodPath.includes("logout") ||
        methodPath.includes("get_current_user") ||
        methodPath.includes("get_logged_user")
      );
      const isPermissionError = res.status === 403 && (
        data?.exc_type === "PermissionError" ||
        String(data?.exception || "").includes("PermissionError") ||
        String(data?._error_message || "").includes("No permission")
      );
      const isPhotoNotFoundError = res.status === 404 && methodPath.includes("get_candidate_photo");
      if (!isExpectedAuthChallenge && !isPermissionError && !isPhotoNotFoundError) {
        console.error("[PROXY ERROR GET]", methodPath, res.status, data);
      } else if (isPermissionError) {
        console.warn(`[PROXY 403 FORBIDDEN] ${methodPath}:`, data?._error_message || "Permission Denied");
      }
    }
    // For logout requests, forward backend response and clear cookies only after backend invalidates session
    const isLogoutMethod = methodPath === "logout" || methodPath.endsWith("/logout");
    if (isLogoutMethod) {
      if (res.ok) {
        const logoutResponse = NextResponse.json(
          data || { message: "Logged out", home_page: "/login", full_name: "Guest" },
          { status: 200 }
        );
        forwardSetCookieHeaders(req, res, logoutResponse);
        const expiredDate = "Thu, 01 Jan 1970 00:00:00 GMT";
        const isHttps =
          req.headers.get("x-forwarded-proto") === "https" ||
          req.nextUrl.protocol === "https:";
        const sec = isHttps ? "; Secure" : "";
        ["sid", "system_user", "full_name", "user_id", "user_image"].forEach((cookieName) => {
          logoutResponse.headers.append(
            "set-cookie",
            `${cookieName}=; Path=/; Expires=${expiredDate}; Max-Age=0; HttpOnly; SameSite=Lax${sec}`
          );
        });
        return logoutResponse;
      }
      const errorResponse = NextResponse.json(data, { status: res.status });
      forwardSetCookieHeaders(req, res, errorResponse);
      return errorResponse;
    }

    // If photo is not found on backend (404), return a 1x1 transparent GIF with 200 OK
    // so browser <img> tags render cleanly without broken image icons or terminal 404 noise
    const isPhotoNotFound = res.status === 404 && methodPath.includes("get_candidate_photo");
    if (isPhotoNotFound) {
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      return new NextResponse(transparentGif, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const response = NextResponse.json(data, { status: res.status });
    forwardSetCookieHeaders(req, res, response);
    return response;
  } catch (err: any) {
    console.error("[PROXY CATCH GET]", methodPath, err);
    const detail =
      typeof err?.message === "string" && err.message.length > 0
        ? err.message
        : "Unable to connect to the server. Please check your network connection and try again.";
    return NextResponse.json(
      {
        exc_type: "BackendConnectionError",
        message: detail.includes("took too long")
          ? detail
          : "Unable to connect to the server. Please check your network connection and try again.",
      },
      { status: 502 }
    );
  }
}
