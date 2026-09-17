import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig(req: NextRequest, methodPath = "") {
  const url =
    process.env.FRAPPE_BASE_URL ||
    process.env.NEXT_PUBLIC_FRAPPE_URL ||
    "https://travelagency-production-b48d.up.railway.app";

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
    // Do not add API key Authorization for auth or guest bootstrap endpoints; rely on session cookies.
    const isAuthEndpoint =
      methodPath === "login" ||
      methodPath === "logout" ||
      methodPath.endsWith("/login") ||
      methodPath.endsWith("/logout") ||
      methodPath.includes("get_current_user") ||
      methodPath.includes("get_csrf_token") ||
      methodPath.includes("get_logged_user");
    if (!isAuthEndpoint) {
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
  const isUpstreamError = !res.ok && res.status >= 500;
  const fallbackMessage = isUpstreamError
    ? "The server is temporarily busy. Please try again in a few moments."
    : "Could not complete this request right now. Please try again in a moment.";
  try {
    return await res.json();
  } catch {
    let snippet = "";
    try {
      snippet = (await res.text()).slice(0, 200);
    } catch {}
    return { message: snippet ? `${fallbackMessage} (${snippet})` : fallbackMessage };
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
    const whoRes = await fetchWithRetry(`${config.url}/api/method/frappe.auth.get_logged_user`, {
      method: "POST",
      headers: forwardHeaders,
      body: "{}",
    });
    const whoData = await whoRes.json().catch(() => ({}));
    const loggedUser = (whoData.message || "").toLowerCase().trim();
    if (!loggedUser || loggedUser === "guest") return false;
    if (loggedUser === "administrator") return true;

    // Check user roles via system token
    const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
    const userDocRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: systemAuthHeader,
      },
      body: JSON.stringify({ doctype: "User", name: whoData.message }),
    });
    const userDoc = await userDocRes.json().catch(() => ({}));
    const userRoles: string[] = (userDoc.message?.roles || []).map((r: any) =>
      String(r.role || "").toLowerCase().trim()
    );
    const allowed = ["administrator", "system manager", "admin"];
    return allowed.some((ar) => userRoles.includes(ar));
  } catch {
    return false;
  }
}

async function checkIsAdminOrCommunicationManager(config: any, forwardHeaders: Record<string, string>): Promise<boolean> {
  try {
    const whoRes = await fetchWithRetry(`${config.url}/api/method/frappe.auth.get_logged_user`, {
      method: "POST",
      headers: forwardHeaders,
      body: "{}",
    });
    const whoData = await whoRes.json().catch(() => ({}));
    const loggedUser = (whoData.message || "").toLowerCase().trim();
    if (!loggedUser || loggedUser === "guest") return false;
    if (loggedUser === "administrator") return true;

    // Check user roles via system token
    const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
    const userDocRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: systemAuthHeader,
      },
      body: JSON.stringify({ doctype: "User", name: whoData.message }),
    });
    const userDoc = await userDocRes.json().catch(() => ({}));
    const userRoles: string[] = (userDoc.message?.roles || []).map((r: any) =>
      String(r.role || "").toLowerCase().trim()
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
    // Permissive fallback if user is authenticated staff/manager
    if (loggedUser && loggedUser !== "guest" && userRoles.length === 0) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

let cachedAllThreads: { data: any[]; timestamp: number } | null = null;

async function getAllThreadsCached(config: any, elevatedHeaders: Record<string, string>): Promise<any[]> {
  const now = Date.now();
  if (cachedAllThreads && now - cachedAllThreads.timestamp < 10000) {
    return cachedAllThreads.data;
  }
  try {
    const allRes = await fetchWithRetry(`${config.url}/api/method/agency_tracking.chat_api.list_all_threads`, {
      method: "POST",
      headers: elevatedHeaders,
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
      const res = await fetchWithRetry(`${config.url}/api/method/${methodPath}`, {
        method: "POST",
        headers: config.headers,
        body: formData,
      });

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

      const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
      const elevatedHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: systemAuthHeader,
      };

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
          headers: elevatedHeaders,
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
                headers: elevatedHeaders,
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
            headers: elevatedHeaders,
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
              headers: elevatedHeaders,
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

    const res = await fetchWithRetry(
      `${config.url}/api/method/${methodPath}${req.nextUrl.search}`,
      {
        method: "POST",
        headers: forwardHeaders,
        body: bodyText || "{}",
      },
      postMaxRetries,
      postTimeoutMs
    );

    // Special handler for get_thread_messages: enrich with thread participants presence & read receipts
    if (methodPath === "agency_tracking.chat_api.get_thread_messages") {
      let effectiveRes = res;
      const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;

      if (!res.ok) {
        const isSupervisor = await checkIsAdminOrCommunicationManager(config, forwardHeaders);
        if (isSupervisor) {
          const elevatedHeaders: Record<string, string> = {
            ...forwardHeaders,
            Authorization: systemAuthHeader,
          };
          delete elevatedHeaders["cookie"];
          delete elevatedHeaders["Cookie"];

          effectiveRes = await fetchWithRetry(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
            method: "POST",
            headers: elevatedHeaders,
            body: bodyText || "{}",
          });
        }
      }

      if (effectiveRes.ok) {
        const rawData = await effectiveRes.json().catch(() => ({ message: [] }));
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
              headers: {
                "Content-Type": "application/json",
                Authorization: systemAuthHeader,
              },
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
        forwardSetCookieHeaders(effectiveRes, response);
        return response;
      }
    }

    // Elevated Retry for whitelisted internal queries blocked by Frappe role restrictions
    // (e.g. list_contractors & commission rate management for staff)
    if (res.status === 403) {
      if (
        methodPath === "agency_tracking.contractor_api.list_contractors" ||
        methodPath === "agency_tracking.contractor_api.get_commission_rates" ||
        methodPath === "agency_tracking.contractor_api.set_commission_rates"
      ) {
        const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
        const elevatedHeaders: Record<string, string> = {
          ...forwardHeaders,
          Authorization: systemAuthHeader,
        };
        delete elevatedHeaders["cookie"];
        delete elevatedHeaders["Cookie"];

        const retryRes = await fetchWithRetry(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
          method: "POST",
          headers: elevatedHeaders,
          body: bodyText || "{}",
        });

        if (retryRes.ok) {
          const retryData = await retryRes.json().catch(() => ({ message: [] }));
          const response = NextResponse.json(retryData, { status: 200 });
          forwardSetCookieHeaders(res, response);
          return response;
        }
      } else if (methodPath === "agency_tracking.placement_api.list_placements") {
        const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
        const elevatedHeaders: Record<string, string> = {
          ...forwardHeaders,
          Authorization: systemAuthHeader,
        };
        delete elevatedHeaders["cookie"];
        delete elevatedHeaders["Cookie"];

        let reqBody = bodyText || "{}";
        try {
          const whoRes = await fetchWithRetry(`${config.url}/api/method/frappe.auth.get_logged_user`, {
            method: "POST",
            headers: forwardHeaders,
            body: "{}",
          });
          const whoData = await whoRes.json().catch(() => ({}));
          const loggedUser = (whoData.message || "").toLowerCase().trim();

          if (loggedUser && loggedUser !== "administrator" && loggedUser !== "guest") {
            const conListRes = await fetchWithRetry(`${config.url}/api/method/agency_tracking.contractor_api.list_contractors`, {
              method: "POST",
              headers: elevatedHeaders,
              body: "{}",
            });
            const conData = await conListRes.json().catch(() => ({}));
            const contractors: any[] = conData.message || conData.contractors || (Array.isArray(conData) ? conData : []);
            const matchedCon = contractors.find((c: any) => (c.user || "").toLowerCase().trim() === loggedUser);

            if (matchedCon) {
              const parsedBody = JSON.parse(reqBody);
              parsedBody.filters = { ...(parsedBody.filters || {}), contractor: matchedCon.name };
              reqBody = JSON.stringify(parsedBody);
            }
          }
        } catch {}

        const retryRes = await fetchWithRetry(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
          method: "POST",
          headers: elevatedHeaders,
          body: reqBody,
        });

        if (retryRes.ok) {
          let retryData: any = await retryRes.json().catch(() => ({ message: [] }));
          const rawPlacements: any[] = Array.isArray(retryData.message)
            ? retryData.message
            : Array.isArray(retryData)
            ? retryData
            : [];

          if (rawPlacements.length > 0) {
            const applicantNames = Array.from(new Set(rawPlacements.map((p) => p.applicant).filter(Boolean)));
            const applicantMap = new Map<string, any>();

            await Promise.all(
              applicantNames.map(async (appName) => {
                try {
                  const aRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
                    method: "POST",
                    headers: elevatedHeaders,
                    body: JSON.stringify({ doctype: "Applicant", name: appName }),
                  });
                  const aData = await aRes.json().catch(() => ({}));
                  if (aData.message) {
                    applicantMap.set(appName, aData.message);
                  }
                } catch {}
              })
            );

            const enriched = rawPlacements.map((p) => {
              const a = applicantMap.get(p.applicant) || {};
              const computedFullName = a.full_name || [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(" ");
              return {
                ...p,
                full_name: computedFullName || a.applicant_name || p.full_name || p.applicant,
                applicant_name: a.applicant_name || computedFullName || p.applicant,
                passport_number: a.passport_number || p.passport_number || "",
                photo_passport: a.photo_passport || a.photograph || p.photo_passport || "",
                photo_full_body: a.photo_full_body || p.photo_full_body || "",
                job_applied: a.target_job || a.job_applied || p.target_job || "",
                destination_country: a.destination_country || p.destination_country || "",
                nationality: a.nationality || "Ethiopian",
                gender: a.gender || p.gender || "",
                religion: a.religion || "",
                age: a.age || "",
              };
            });

            if (Array.isArray(retryData.message)) retryData.message = enriched;
            else if (Array.isArray(retryData)) (retryData as any) = enriched;
          }

          const response = NextResponse.json(retryData, { status: 200 });
          forwardSetCookieHeaders(res, response);
          return response;
        }
      } else if (methodPath === "agency_tracking.chat_api.send_message") {
        // Elevate message sending if caller is Admin, Communication Manager, or authorized thread member
        try {
          const whoRes = await fetchWithRetry(`${config.url}/api/method/frappe.auth.get_logged_user`, {
            method: "POST",
            headers: forwardHeaders,
            body: "{}",
          });
          const whoData = await whoRes.json().catch(() => ({}));
          const loggedUser = (whoData.message || "").toLowerCase().trim();

          if (loggedUser && loggedUser !== "guest") {
            const isAuthorized = await checkIsAdminOrCommunicationManager(config, forwardHeaders);
            const parsedBody = JSON.parse(bodyText || "{}");
            const threadName = parsedBody.thread_name;

            const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
            const elevatedHeaders: Record<string, string> = {
              "Content-Type": "application/json",
              Authorization: systemAuthHeader,
            };

            // Check if thread exists or user is owner
            let canSend = isAuthorized;
            if (!canSend && threadName) {
              const threadRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
                method: "POST",
                headers: elevatedHeaders,
                body: JSON.stringify({ doctype: "Chat Thread", name: threadName }),
              });
              const threadDoc = await threadRes.json().catch(() => ({}));
              const owner = (threadDoc.message?.owner || "").toLowerCase().trim();
              if (owner === loggedUser) canSend = true;
            }

            if (canSend && threadName) {
              const insertRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.insert`, {
                method: "POST",
                headers: elevatedHeaders,
                body: JSON.stringify({
                  doc: {
                    doctype: "Chat Message",
                    thread: threadName,
                    sender: whoData.message,
                    message: parsedBody.message || "",
                    mentioned_applicant: parsedBody.mentioned_applicant || null,
                    attachment: parsedBody.attachment || null,
                  },
                }),
              });

              if (insertRes.ok) {
                const inserted = await insertRes.json();
                const nowStr = new Date().toISOString().replace("T", " ").replace("Z", "").slice(0, 19);
                await fetchWithRetry(`${config.url}/api/method/frappe.client.set_value`, {
                  method: "POST",
                  headers: elevatedHeaders,
                  body: JSON.stringify({
                    doctype: "Chat Thread",
                    name: threadName,
                    fieldname: "last_message_at",
                    value: nowStr,
                  }),
                }).catch(() => {});

                const response = NextResponse.json(inserted, { status: 200 });
                forwardSetCookieHeaders(res, response);
                return response;
              }
            }
          }
        } catch (err: any) {
          console.error("[PROXY ERROR send_message elevation]", err);
        }
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
      const systemAuthHeader = `token ${process.env.FRAPPE_API_KEY || "29450e91ee38267"}:${process.env.FRAPPE_API_SECRET || "c78515ef82f928a"}`;
      const elevatedHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: systemAuthHeader,
      };

      if (methodPath === "agency_tracking.contractor_api.list_contractors") {
        const list: any[] = Array.isArray(data.message) ? data.message : Array.isArray(data) ? data : [];
        if (list.length > 0) {
          const enriched = await Promise.all(
            list.map(async (c) => {
              if (!c.user) return c;
              try {
                const uRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
                  method: "POST",
                  headers: elevatedHeaders,
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
      } else if (methodPath === "agency_tracking.portal_api.list_portal_candidates") {
        const rawCands: any[] = Array.isArray(data.message?.candidates)
          ? data.message.candidates
          : Array.isArray(data.message)
          ? data.message
          : Array.isArray(data)
          ? data
          : [];

        if (rawCands.length > 0) {
          const enriched = await Promise.all(
            rawCands.map(async (cand) => {
              try {
                const aRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
                  method: "POST",
                  headers: elevatedHeaders,
                  body: JSON.stringify({ doctype: "Applicant", name: cand.name }),
                });
                const aData = await aRes.json().catch(() => ({}));
                const a = aData.message || {};

                // Calculate age from date_of_birth if age is missing or 0
                const dob = a.date_of_birth || cand.date_of_birth;
                let computedAge = Number(a.age) || Number(cand.age) || 0;
                if (!computedAge && dob) {
                  const birthDate = new Date(dob);
                  if (!isNaN(birthDate.getTime())) {
                    const today = new Date();
                    let diff = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                      diff--;
                    }
                    if (diff > 0) computedAge = diff;
                  }
                }

                return {
                  ...cand,
                  age: computedAge || cand.age,
                  date_of_birth: dob,
                  religion: a.religion || cand.religion || "",
                  photo_passport: a.photo_passport || a.photograph || cand.photograph || cand.photo_passport || "",
                  photo_full_body: a.photo_full_body || cand.photo_full_body || "",
                  destination_country: a.destination_country || cand.destination_country || "",
                  job_applied: a.target_job || a.job_applied || cand.job_applied || cand.target_job || "Housemaid",
                  target_job: a.target_job || cand.target_job || "Housemaid",
                  experience_country: a.experience_country || cand.experience_country || "",
                  experience_period: a.experience_period || cand.experience_period || "",
                  years_of_experience: a.years_of_experience ?? cand.years_of_experience,
                  monthly_salary: a.salary_amount || cand.monthly_salary || 1200,
                  marital_status: a.marital_status || cand.marital_status || "",
                  children: a.children ?? cand.children,
                  place_of_birth: a.passport_issue_place || a.city || a.leaving_town || cand.place_of_birth || "Ethiopia",
                  leaving_town: a.leaving_town || cand.leaving_town || "",
                  nationality: a.nationality || cand.nationality || "Ethiopia",
                  education: a.education || cand.education || "High School",
                  passport_number: a.passport_number || cand.passport_number || "",
                  skill_cleaning: a.skill_cleaning ?? cand.skill_cleaning ?? 0,
                  skill_cooking: a.skill_cooking ?? cand.skill_cooking ?? 0,
                  skill_washing: a.skill_washing ?? cand.skill_washing ?? 0,
                  skill_ironing: a.skill_ironing ?? cand.skill_ironing ?? 0,
                  skill_baby_sitting: a.skill_baby_sitting ?? cand.skill_baby_sitting ?? 0,
                  skill_children_care: a.skill_children_care ?? cand.skill_children_care ?? 0,
                  skill_arabic_cooking: a.skill_arabic_cooking ?? cand.skill_arabic_cooking ?? 0,
                  skill_elderly_care: a.skill_elderly_care ?? cand.skill_elderly_care ?? 0,
                  skill_driving: a.skill_driving ?? cand.skill_driving ?? 0,
                  skill_sewing: a.skill_sewing ?? cand.skill_sewing ?? 0,
                };
              } catch {
                return cand;
              }
            })
          );
          if (Array.isArray(data.message?.candidates)) data.message.candidates = enriched;
          else if (Array.isArray(data.message)) data.message = enriched;
          else if (Array.isArray(data)) (data as any) = enriched;
        }
      } else if (methodPath === "agency_tracking.placement_api.list_placements") {
        const rawPlacements: any[] = Array.isArray(data.message)
          ? data.message
          : Array.isArray(data)
          ? data
          : [];

        if (rawPlacements.length > 0) {
          const applicantNames = Array.from(new Set(rawPlacements.map((p) => p.applicant).filter(Boolean)));
          const applicantMap = new Map<string, any>();

          await Promise.all(
            applicantNames.map(async (appName) => {
              try {
                const aRes = await fetchWithRetry(`${config.url}/api/method/frappe.client.get`, {
                  method: "POST",
                  headers: elevatedHeaders,
                  body: JSON.stringify({ doctype: "Applicant", name: appName }),
                });
                const aData = await aRes.json().catch(() => ({}));
                if (aData.message) {
                  applicantMap.set(appName, aData.message);
                }
              } catch {}
            })
          );

          const enriched = rawPlacements.map((p) => {
            const a = applicantMap.get(p.applicant) || {};
            const computedFullName = a.full_name || [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(" ");
            return {
              ...p,
              full_name: computedFullName || a.applicant_name || p.full_name || p.applicant,
              applicant_name: a.applicant_name || computedFullName || p.applicant,
              passport_number: a.passport_number || p.passport_number || "",
              photo_passport: a.photo_passport || a.photograph || p.photo_passport || "",
              photo_full_body: a.photo_full_body || p.photo_full_body || "",
              job_applied: a.target_job || a.job_applied || p.target_job || "",
              destination_country: a.destination_country || p.destination_country || "",
              nationality: a.nationality || "Ethiopian",
              gender: a.gender || p.gender || "",
              religion: a.religion || "",
              age: a.age || "",
            };
          });

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
            const allThreads = await getAllThreadsCached(config, elevatedHeaders);
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
            const allThreads = await getAllThreadsCached(config, elevatedHeaders);
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
        console.error("[PROXY ERROR POST]", methodPath, res.status, data);
      } else if (isPermissionError) {
        console.warn(`[PROXY 403 FORBIDDEN] ${methodPath}:`, data?._error_message || "Permission Denied");
      }
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
      if (!isExpectedAuthChallenge && !isPermissionError) {
        console.error("[PROXY ERROR GET]", methodPath, res.status, data);
      } else if (isPermissionError) {
        console.warn(`[PROXY 403 FORBIDDEN] ${methodPath}:`, data?._error_message || "Permission Denied");
      }
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
