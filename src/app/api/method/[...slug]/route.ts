import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest, methodPath = "") {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://agencytracking-production-2a06.up.railway.app";

  const clientAccept = req.headers.get("accept");
  const headers: Record<string, string> = {
    Accept: clientAccept || "application/json",
  };

  const cookie = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");
  const csrfToken = req.headers.get("x-frappe-csrf-token");

  const isAuthOrCsrf =
    methodPath === "login" ||
    methodPath === "logout" ||
    methodPath.endsWith("/login") ||
    methodPath.endsWith("/logout") ||
    methodPath.includes("get_csrf_token");

  // Forward CSRF token for state-changing operations (never on auth or token retrieval)
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
      message: "The uploaded file exceeds the server payload size limit. Please compress or optimize the video before uploading (recommended under 30MB).",
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
          message: "The uploaded file exceeds the server payload size limit. Please compress or optimize the video before uploading (recommended under 30MB).",
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

function forwardSetCookieHeaders(sourceRes: Response, targetRes: NextResponse | Response) {
  const sanitizeCookie = (cookie: string) => {
    // Remove explicit domain, secure, and samesite attributes to allow cookie on proxy domain (localhost)
    return cookie
      .replace(/;\s*Domain=[^;]+/gi, "")
      .replace(/;\s*Secure/gi, "")
      .replace(/;\s*SameSite=[^;]+/gi, "");
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

async function checkIsAdminOnly(config: any, forwardHeaders: Record<string, string>): Promise<boolean> {
  try {
    const whoRes = await fetchWithRetry(`${config.url}/api/method/agency_tracking.auth_api.get_current_user`, {
      method: "POST",
      headers: forwardHeaders,
      body: "{}",
    });
    const whoData = await whoRes.json().catch(() => ({}));
    const userMsg = whoData.message || {};
    const loggedUser = (userMsg.user || "").toLowerCase().trim();
    if (!loggedUser || loggedUser === "guest") return false;
    if (loggedUser === "administrator") return true;

    const userRoles: string[] = (userMsg.roles || []).map((r: any) =>
      String(r || "").toLowerCase().trim()
    );
    const allowed = ["administrator", "system manager", "admin"];
    return allowed.some((ar) => userRoles.includes(ar));
  } catch {
    return false;
  }
}

async function checkIsAdminOrCommunicationManager(config: any, forwardHeaders: Record<string, string>): Promise<boolean> {
  try {
    const whoRes = await fetchWithRetry(`${config.url}/api/method/agency_tracking.auth_api.get_current_user`, {
      method: "POST",
      headers: forwardHeaders,
      body: "{}",
    });
    const whoData = await whoRes.json().catch(() => ({}));
    const userMsg = whoData.message || {};
    const loggedUser = (userMsg.user || "").toLowerCase().trim();
    if (!loggedUser || loggedUser === "guest") return false;
    if (loggedUser === "administrator") return true;

    const userRoles: string[] = (userMsg.roles || []).map((r: any) =>
      String(r || "").toLowerCase().trim()
    );
    const allowed = [
      "administrator",
      "system manager",
      "admin",
      "manager",
      "general manager",
      "operations manager",
      "finance manager",
      "registrar",
      "communication manager",
      "contractor manager",
      "staff",
    ];
    if (userRoles.some((ar) => allowed.includes(ar))) {
      return true;
    }
    if (userMsg.is_internal_staff) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

let cachedAllThreads: { data: any[]; timestamp: number } | null = null;

async function getAllThreadsCached(config: any, forwardHeaders: Record<string, string>): Promise<any[]> {
  const now = Date.now();
  if (cachedAllThreads && now - cachedAllThreads.timestamp < 10000) {
    return cachedAllThreads.data;
  }
  try {
    const allRes = await fetchWithRetry(`${config.url}/api/method/agency_tracking.chat_api.list_all_threads`, {
      method: "POST",
      headers: forwardHeaders,
      body: "{}",
    });
    const allData = await allRes.json().catch(() => ({}));
    const allList: any[] = Array.isArray(allData.message)
      ? allData.message
      : Array.isArray(allData.threads)
      ? allData.threads
      : [];
    if (allList.length > 0) {
      cachedAllThreads = { data: allList, timestamp: now };
    }
    return allList;
  } catch (err) {
    console.warn("[PROXY getAllThreadsCached] failed:", err);
    return cachedAllThreads?.data || [];
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig(req, methodPath);

  // Invalidate chat threads cache on thread mutations
  if (
    methodPath.includes("create_internal_thread") ||
    methodPath.includes("create_agency_thread") ||
    methodPath.includes("add_participant")
  ) {
    cachedAllThreads = null;
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


    // Dedicated Whitelisted Endpoint: Update Contractor Agency and linked Foreign Agency User
    if (methodPath === "agency_tracking.contractor_api.update_contractor") {
      // 1. Explicit RBAC Check: Admin, Manager, Communication Manager, Finance Manager, Registrar
      const isAuthorized = await checkIsAdminOrCommunicationManager(config, forwardHeaders);
      if (!isAuthorized) {
        return NextResponse.json(
          { message: "You do not have permission to update contractor agency details." },
          { status: 403 }
        );
      }

      try {
        const parsedBody = JSON.parse(bodyText || "{}");
        const contractorName = parsedBody.name || parsedBody.contractor_name;
        if (!contractorName) {
          return NextResponse.json(
            { message: "Contractor name is required for updates." },
            { status: 400 }
          );
        }

        // 2. Fetch existing Contractor record to verify existence & resolve linked User
        const getConRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
          method: "POST",
          headers: forwardHeaders,
          body: JSON.stringify({
            doctype: "Contractor",
            name: contractorName,
          }),
        });
        const getConData = await getConRes.json().catch(() => ({}));
        if (!getConRes.ok || !getConData.message) {
          return NextResponse.json(
            { message: "Contractor record could not be found." },
            { status: 404 }
          );
        }

        const existingCon = getConData.message;
        const conKeys = new Set(Object.keys(existingCon));

        // 3. Update Contractor fields (country, communication_manager, etc.)
        const contractorUpdates: Record<string, any> = {};
        if (parsedBody.country && parsedBody.country !== existingCon.country) {
          contractorUpdates.country = parsedBody.country;
        }
        if (parsedBody.communication_manager !== undefined && (conKeys.has("communication_manager") || !conKeys.size)) {
          contractorUpdates.communication_manager = parsedBody.communication_manager || "";
        }
        if (parsedBody.contact_person !== undefined && conKeys.has("contact_person")) {
          contractorUpdates.contact_person = parsedBody.contact_person;
        }
        if (parsedBody.phone !== undefined && conKeys.has("phone")) {
          contractorUpdates.phone = parsedBody.phone;
        }
        if (parsedBody.whatsapp !== undefined && conKeys.has("whatsapp")) {
          contractorUpdates.whatsapp = parsedBody.whatsapp;
        }
        if (parsedBody.email !== undefined && conKeys.has("email")) {
          contractorUpdates.email = parsedBody.email;
        }
        if (parsedBody.notes !== undefined && conKeys.has("notes")) {
          contractorUpdates.notes = parsedBody.notes;
        }
        if (parsedBody.company_name && conKeys.has("company_name")) {
          contractorUpdates.company_name = parsedBody.company_name;
        }

        // Rename contractor doc if contractor_name was renamed
        let finalContractorName = contractorName;
        if (parsedBody.contractor_name && parsedBody.contractor_name !== existingCon.contractor_name) {
          if (existingCon.name === existingCon.contractor_name) {
            try {
              const renameRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.rename_doc`, {
                method: "POST",
                headers: forwardHeaders,
                body: JSON.stringify({
                  doctype: "Contractor",
                  old_name: contractorName,
                  new_name: parsedBody.contractor_name,
                }),
              });
              if (renameRes.ok) {
                finalContractorName = parsedBody.contractor_name;
              }
            } catch (renameErr) {
              console.warn("[PROXY update_contractor] rename_doc fallback to set_value:", renameErr);
              contractorUpdates.contractor_name = parsedBody.contractor_name;
            }
          } else if (conKeys.has("contractor_name")) {
            contractorUpdates.contractor_name = parsedBody.contractor_name;
          }
        }

        if (Object.keys(contractorUpdates).length > 0) {
          await fetchWithRetry(`${config.url}/api/method/frappe.client.set_value`, {
            method: "POST",
            headers: forwardHeaders,
            body: JSON.stringify({
              doctype: "Contractor",
              name: finalContractorName,
              fieldname: contractorUpdates,
            }),
          });
        }

        // 4. Update linked Foreign Agency User if contact person, phone, or whatsapp provided
        // RBAC & Tenant Isolation Safety: NEVER mutate root "Administrator" or non-agency users
        const linkedUser = existingCon.user;
        const isSystemAccount = !linkedUser ||
          linkedUser.toLowerCase() === "administrator" ||
          linkedUser.toLowerCase() === "guest";

        if (linkedUser && !isSystemAccount) {
          const userUpdates: Record<string, any> = {};
          if (parsedBody.contact_person) userUpdates.first_name = parsedBody.contact_person;
          if (parsedBody.phone !== undefined) userUpdates.phone = parsedBody.phone;
          if (parsedBody.whatsapp !== undefined) userUpdates.mobile_no = parsedBody.whatsapp;

          if (Object.keys(userUpdates).length > 0) {
            await fetchWithRetry(`${config.url}/api/method/frappe.client.set_value`, {
              method: "POST",
              headers: forwardHeaders,
              body: JSON.stringify({
                doctype: "User",
                name: linkedUser,
                fieldname: userUpdates,
              }),
            });
          }
        }

        return NextResponse.json({
          message: {
            success: true,
            name: finalContractorName,
            contractor_name: parsedBody.contractor_name || existingCon.contractor_name,
          },
        }, { status: 200 });
      } catch (err: any) {
        console.error("[PROXY ERROR update_contractor]", err);
        return NextResponse.json(
          { message: "Failed to update contractor agency details." },
          { status: 500 }
        );
      }
    }

    const isHeavyCvOrPdf =
      methodPath === "agency_tracking.cv_api.generate_cv" ||
      methodPath === "agency_tracking.cv_api.render_cv_pdf";
    const postMaxRetries = isHeavyCvOrPdf ? 0 : 2;
    const postTimeoutMs = isHeavyCvOrPdf ? 180000 : 45000;

    const effectiveBodyText = bodyText || "{}";

    const res = await fetchWithRetry(
      `${config.url}/api/method/${methodPath}${req.nextUrl.search}`,
      {
        method: "POST",
        headers: forwardHeaders,
        body: effectiveBodyText,
      },
      postMaxRetries,
      postTimeoutMs
    );

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
            const threadDocRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
              method: "POST",
              headers: forwardHeaders,
              body: JSON.stringify({ doctype: "Chat Thread", name: targetThreadName }),
            });
            if (threadDocRes.ok) {
              const threadDoc = await threadDocRes.json().catch(() => ({}));
              participants = (threadDoc.message?.participants || []).map((p: any) => ({
                user: p.user,
                last_read_at: p.last_read_at || null,
              }));
            }
          }
        } catch (err) {
          console.warn("[PROXY CHAT] Error fetching participants for thread:", err);
        }

        const response = NextResponse.json({ message: messagesList, participants }, { status: 200 });
        forwardSetCookieHeaders(res, response);
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
      forwardSetCookieHeaders(res, binaryResponse);
      return binaryResponse;
    }

    const data = await parseJsonOrFriendlyMessage(res);

    // Post-query enrichment for contractor user details and portal candidate skills
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
      } else if (methodPath === "agency_tracking.chat_api.list_threads") {
        const rawThreads: any[] = Array.isArray(data.message)
          ? data.message
          : Array.isArray(data.threads)
          ? data.threads
          : Array.isArray(data)
          ? data
          : [];

        if (rawThreads.length > 0) {
          try {
            const allThreads = await getAllThreadsCached(config, forwardHeaders);
            if (allThreads.length > 0) {
              const detailsMap = new Map<string, any>();
              allThreads.forEach((t) => {
                if (t.name) detailsMap.set(t.name, t);
              });

              const enriched = rawThreads.map((t) => {
                const fullThread = detailsMap.get(t.name);
                return {
                  ...t,
                  participants: fullThread?.participants || t.participants || [],
                  contractor: fullThread?.contractor || t.contractor || null,
                  creation: fullThread?.creation || t.creation,
                };
              });

              if (Array.isArray(data.message)) data.message = enriched;
              else if (Array.isArray(data.threads)) data.threads = enriched;
              else if (Array.isArray(data)) (data as any) = enriched;
            }
          } catch (enrichErr) {
            console.warn("[PROXY list_threads] could not enrich participants:", enrichErr);
          }
        }
      } else if (methodPath === "agency_tracking.chat_api.list_all_threads") {
        const rawList = Array.isArray(data?.message) ? data.message : Array.isArray(data) ? data : [];
        if (!res.ok || rawList.length === 0 || data?.exc_type === "PermissionError") {
          try {
            const allThreads = await getAllThreadsCached(config, forwardHeaders);
            data.message = allThreads;
            data.exc_type = undefined;
            data.exception = undefined;
            const response = NextResponse.json({ message: allThreads }, { status: 200 });
            forwardSetCookieHeaders(res, response);
            return response;
          } catch {}
        }
      }
    }

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
    // For logout requests, if backend returns non-ok (e.g. 400 CSRFTokenError or expired session),
    // guarantee clean 200 response with cleared session cookies so client logout is always successful
    const isLogoutMethod = methodPath === "logout" || methodPath.endsWith("/logout");
    if (isLogoutMethod && !res.ok) {
      const logoutResponse = NextResponse.json(
        { message: "Logged out", home_page: "/login", full_name: "Guest" },
        { status: 200 }
      );
      const expiredDate = "Thu, 01 Jan 1970 00:00:00 GMT";
      ["sid", "system_user", "full_name", "user_id", "user_image"].forEach((cookieName) => {
        logoutResponse.headers.append(
          "set-cookie",
          `${cookieName}=; Path=/; Expires=${expiredDate}; Max-Age=0; HttpOnly; SameSite=Lax`
        );
      });
      return logoutResponse;
    }

    const response = NextResponse.json(data, { status: res.status });
    forwardSetCookieHeaders(res, response);
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
      forwardSetCookieHeaders(res, binaryResponse);
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
    // For logout requests, if backend returns non-ok, guarantee clean 200 response with cleared session cookies
    const isLogoutMethod = methodPath === "logout" || methodPath.endsWith("/logout");
    if (isLogoutMethod && !res.ok) {
      const logoutResponse = NextResponse.json(
        { message: "Logged out", home_page: "/login", full_name: "Guest" },
        { status: 200 }
      );
      const expiredDate = "Thu, 01 Jan 1970 00:00:00 GMT";
      ["sid", "system_user", "full_name", "user_id", "user_image"].forEach((cookieName) => {
        logoutResponse.headers.append(
          "set-cookie",
          `${cookieName}=; Path=/; Expires=${expiredDate}; Max-Age=0; HttpOnly; SameSite=Lax`
        );
      });
      return logoutResponse;
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
    forwardSetCookieHeaders(res, response);
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
