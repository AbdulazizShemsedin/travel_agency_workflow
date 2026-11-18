/**
 * Core API Client for Agency Tracking Backend V2
 * 
 * Strict Architectural Rules:
 * 1. Callers name an operation the old way (`/api/method/agency_tracking.*`); requestV2 sends it to
 *    the backend's /v1 route for that operation (see ./v1.ts). A `/v1/...` endpoint is sent as is.
 * 2. Raw `/api/resource/*` requests are strictly forbidden in V2.
 * 3. Automatic CSRF token resolution (`X-Frappe-CSRF-Token`) for state-changing requests.
 * 4. Honest error propagation preserving backend 400, 401, 403, 417, 500 error messages and exceptions.
 * 5. Session cookies transmitted with credentials: "include".
 */

import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { toV1Call } from "./v1";

export class ApiV2Error extends Error {
  public statusCode: number;
  public excType?: string;
  public serverMessages?: string;
  public rawResponse?: any;
  public technicalDetails?: string;

  constructor(message: string, statusCode: number, excType?: string, serverMessages?: string, rawResponse?: any) {
    const cleanMsg = formatCleanErrorMessage(message);
    super(cleanMsg);
    this.name = "ApiV2Error";
    this.statusCode = statusCode;
    this.excType = excType;
    this.serverMessages = serverMessages;
    this.rawResponse = rawResponse;
    this.technicalDetails = message;
  }
}

// In-memory CSRF token cache
let cachedCsrfToken: string | null = null;
let isFetchingCsrfToken: Promise<string | null> | null = null;

export async function getCachedOrFetchCsrfToken(forceFresh = false): Promise<string | null> {
  if (!forceFresh && cachedCsrfToken) {
    return cachedCsrfToken;
  }

  if (isFetchingCsrfToken && !forceFresh) {
    return isFetchingCsrfToken;
  }

  isFetchingCsrfToken = (async () => {
    try {
      const ask = (url: string) =>
        fetch(url, { method: "GET", credentials: "include", headers: { Accept: "application/json" } });
      let res = v1Missing ? null : await ask("/v1/csrf-token");
      if (!res || (res.status === 404 && !(res.headers.get("content-type") || "").includes("problem+json"))) {
        if (res) v1Missing = true; // a backend without /v1
        res = await ask("/api/method/agency_tracking.api.auth.read?op=get_csrf_token");
      }

      if (res.ok) {
        const json = await res.json();
        const token =
          (typeof json === "string" ? json : null) ||
          (typeof json?.message === "string" ? json.message : json?.message?.csrf_token) ||
          json?.csrf_token ||
          null;
        if (token) {
          cachedCsrfToken = token;
          return token;
        }
      }
      return null;
    } catch (err) {
      console.warn("[V2 Client] Failed to fetch CSRF token:", err);
      return null;
    } finally {
      isFetchingCsrfToken = null;
    }
  })();

  return isFetchingCsrfToken;
}

export function setCachedCsrfToken(token: string | null) {
  cachedCsrfToken = token;
}

export function clearCsrfToken() {
  cachedCsrfToken = null;
}

interface RequestV2Options {
  method?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, any> | FormData;
  headers?: Record<string, string>;
  isMultipart?: boolean;
  /** For a /v1 list route: answer the whole body (e.g. items and total), not just its items. */
  raw?: boolean;
  /** Send to the old route as written, without /v1 (for a backend that has no /v1). */
  legacy?: boolean;
}

/**
 * Whether the backend serves /v1. Until a backend with /v1 is deployed, a translated call meets a
 * plain 404 (no problem+json); from then on this session uses the old routes, so the frontend works
 * with either backend.
 */
let v1Missing = false;
export function isV1Unavailable(): boolean {
  return v1Missing;
}

/**
 * Arguments a /v1 route does not take, by operation. Kept so a test run (and the console in
 * development) shows every argument the backend no longer reads.
 */
function reportDropped(op: string, dropped: string[]) {
  if (typeof window === "undefined") return;
  const w = window as any;
  const seen: Record<string, string[]> = (w.__v1Dropped ||= {});
  const before = new Set(seen[op] || []);
  const fresh = dropped.filter((d) => !before.has(d));
  if (!fresh.length) return;
  seen[op] = [...before, ...fresh];
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[V2 Client] /v1 ${op} does not take: ${fresh.join(", ")}`);
  }
}

/**
 * Executes a whitelisted V2 backend method.
 */
export async function requestV2<T = any>(
  endpoint: string,
  options: RequestV2Options = {}
): Promise<T> {
  // Prohibit raw resource calls in V2
  if (endpoint.startsWith("/api/resource/") || endpoint.includes("/api/resource/")) {
    throw new ApiV2Error(
      `Direct DocType REST access (${endpoint}) is prohibited in V2. Use whitelisted agency_tracking.* RPC methods.`,
      400
    );
  }

  let method: string = options.method || "POST";
  let url = endpoint;
  let payload = options.body;
  let answerField: string | undefined;
  let isV1 = endpoint.startsWith("/v1/");
  let translated = false;
  if (!isV1 && !v1Missing && !options.legacy) {
    let call;
    try {
      call = toV1Call(endpoint, payload);
    } catch (err: any) {
      throw new ApiV2Error(String(err?.message || err), 400, "ValidationError");
    }
    if (call) {
      isV1 = true;
      translated = true;
      url = call.url;
      method = call.method;
      payload = call.body;
      answerField = call.answer;
      if (call.dropped.length) reportDropped(call.op, call.dropped);
    } else if (process.env.NODE_ENV !== "production") {
      console.warn(`[V2 Client] no /v1 route for ${endpoint}; using the old route`);
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  // Attach the CSRF token to every state-changing request but a login or the token fetch itself.
  const isLogin = url === "/v1/login" || endpoint.endsWith("login");
  if (
    method !== "GET" &&
    !isLogin &&
    !endpoint.includes("get_csrf_token") &&
    url !== "/v1/csrf-token"
  ) {
    const csrfToken = await getCachedOrFetchCsrfToken();
    if (csrfToken) {
      headers["X-Frappe-CSRF-Token"] = csrfToken;
    }
  }

  // Each endpoint serves several operations, named by `op`. A GET keeps `op` in the query
  // string; a POST sends it in the body, because the server reads only the body of a JSON POST.
  const queryStart = endpoint.indexOf("?");
  if (!isV1 && method !== "GET" && queryStart !== -1) {
    const params = new URLSearchParams(endpoint.slice(queryStart + 1));
    const op = params.get("op");
    if (op) {
      params.delete("op");
      const rest = params.toString();
      url = endpoint.slice(0, queryStart) + (rest ? `?${rest}` : "");
      if (payload instanceof FormData) {
        payload.set("op", op);
      } else {
        payload = { ...(payload || {}), op };
      }
    }
  }

  let bodyData: BodyInit | undefined = undefined;

  if (payload) {
    if (options.isMultipart || payload instanceof FormData) {
      bodyData = payload as FormData;
      // Do not manually set Content-Type for multipart; browser calculates boundary
    } else {
      headers["Content-Type"] = "application/json";
      bodyData = JSON.stringify(payload);
    }
  }

  if (typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine) {
    throw new ApiV2Error(
      "No internet connection detected. Please check your network and try again.",
      0,
      "NetworkError"
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: bodyData,
    });
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    const isOffline = typeof window !== "undefined" && typeof navigator !== "undefined" && !navigator.onLine;
    throw new ApiV2Error(
      isAbort
        ? "The server took too long to respond. Please check your connection and try again."
        : isOffline
        ? "No internet connection detected. Please check your network and try again."
        : "Unable to reach the server. Please check your internet connection (even if connected to Wi-Fi) and try again.",
      isAbort ? 504 : 0,
      "NetworkError",
      undefined,
      undefined
    );
  }

  // Handle binary streams (e.g. XLSX export, PDF invoice)
  const contentType = response.headers.get("content-type") || "";

  // A /v1 route the backend doesn't have: a plain 404, not a problem+json "record not found".
  if (translated && response.status === 404 && !contentType.includes("problem+json")) {
    v1Missing = true;
    console.warn("[V2 Client] the backend has no /v1 routes; using the old routes");
    return requestV2<T>(endpoint, { ...options, legacy: true });
  }
  const contentDisposition = response.headers.get("content-disposition") || "";
  const isBinaryResponse =
    contentType.includes("application/vnd.openxmlformats") ||
    contentType.includes("application/vnd.ms-excel") ||
    contentType.includes("text/csv") ||
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream") ||
    contentType.includes("binary/octet-stream") ||
    contentDisposition.includes("attachment");

  if (isBinaryResponse) {
    if (!response.ok) {
      let errorMsg = `File download failed with HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson?.message) {
          errorMsg = typeof errJson.message === "string" ? errJson.message : JSON.stringify(errJson.message);
        }
      } catch {}
      throw new ApiV2Error(errorMsg, response.status);
    }
    const blob = await response.blob();
    if (contentDisposition) {
      const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        try {
          const parsed = decodeURIComponent(match[1].trim());
          Object.defineProperty(blob, "filename", {
            value: parsed,
            writable: true,
            enumerable: true,
            configurable: true,
          });
        } catch {
          Object.defineProperty(blob, "filename", {
            value: match[1].trim(),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }
    }
    return blob as unknown as T;
  }


  let jsonResponse: any = null;
  try {
    jsonResponse = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiV2Error(`HTTP ${response.status}: Server returned non-JSON response`, response.status);
    }
    return {} as T;
  }

  // Auto-heal on CSRFTokenError: purge cache, fetch fresh CSRF token, and retry once
  if (
    (jsonResponse?.exc_type === "CSRFTokenError" ||
      jsonResponse?.kind === "CSRFTokenError" ||
      (response.status === 400 && String(jsonResponse?._server_messages || "").includes("Invalid Request"))) &&
    !(options as any)._isRetry &&
    !endpoint.endsWith("login") &&
    !endpoint.includes("get_csrf_token")
  ) {
    console.warn(`[V2 Client] CSRF token mismatch on ${endpoint}. Refreshing token and retrying...`);
    clearCsrfToken();
    const freshToken = await getCachedOrFetchCsrfToken(true);
    const retryHeaders: Record<string, string> = {
      ...options.headers,
    };
    if (freshToken) {
      retryHeaders["X-Frappe-CSRF-Token"] = freshToken;
    }
    return requestV2<T>(endpoint, {
      ...options,
      headers: retryHeaders,
      _isRetry: true,
    } as any);
  }

  // Parse Frappe standard errors and validation failures
  if (!response.ok || jsonResponse?.exc || jsonResponse?.exception || jsonResponse?.exc_type) {
    let errorMsg = "";

    // 1. Try _server_messages first (often carries exact Frappe ValidationError text)
    if (typeof jsonResponse?._server_messages === "string") {
      try {
        const parsedMsgs = JSON.parse(jsonResponse._server_messages);
        if (Array.isArray(parsedMsgs)) {
          errorMsg = parsedMsgs
            .map((m: any) => {
              if (typeof m === "string") {
                try {
                  const inner = JSON.parse(m);
                  return inner.message || m;
                } catch {
                  return m;
                }
              }
              return m.message || (typeof m === "object" ? JSON.stringify(m) : String(m));
            })
            .filter(Boolean)
            .join(" • ");
        }
      } catch {
        errorMsg = jsonResponse._server_messages;
      }
    }

    // 1b. A /v1 error (problem+json): `detail` is the message for the user, `kind` the error type
    if (!errorMsg && isV1 && typeof jsonResponse?.detail === "string" && jsonResponse.detail) {
      errorMsg = jsonResponse.detail;
    }

    // 2. Try message field
    if (!errorMsg && typeof jsonResponse?.message === "string") {
      errorMsg = jsonResponse.message;
    } else if (!errorMsg && jsonResponse?.message && typeof jsonResponse.message === "object") {
      errorMsg = jsonResponse.message.error || jsonResponse.message.message || jsonResponse.message.detail || "";
    }

    if (errorMsg === "Application not found" || (response.status === 404 && typeof jsonResponse?.message === "string" && jsonResponse.message.includes("Application not found"))) {
      errorMsg = "Cannot connect to backend server: Application not found at configured host. Please ensure the backend is deployed and running.";
    }

    // 3. Try exception field (strip Python/Frappe exception classes)
    if (!errorMsg && typeof jsonResponse?.exception === "string") {
      const rawExc = jsonResponse.exception.trim();
      const cleaned = rawExc
        .replace(/^(?:frappe\.)?(?:exceptions\.)?(?:pymysql\.err\.)?[a-zA-Z0-9_]+Error:\s*/i, "")
        .replace(/^[a-zA-Z0-9_]+Error:\s*/i, "")
        .trim();
      if (cleaned) {
        errorMsg = cleaned;
      }
    }

    // 4. Try error / errors fields
    if (!errorMsg && typeof jsonResponse?.error === "string") {
      errorMsg = jsonResponse.error;
    } else if (!errorMsg && Array.isArray(jsonResponse?.errors) && jsonResponse.errors.length > 0) {
      errorMsg = jsonResponse.errors
        .map((e: any) => (typeof e === "string" ? e : e?.message || JSON.stringify(e)))
        .join(" • ");
    }

    // 5. Try exc traceback (take the last meaningful line)
    if (!errorMsg && typeof jsonResponse?.exc === "string") {
      const lines = jsonResponse.exc.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (last && !last.startsWith("Traceback") && !last.startsWith("File ")) {
        const cleanedLast = last.replace(/^(?:frappe\.)?(?:exceptions\.)?[a-zA-Z0-9_]+Error:\s*/i, "").trim();
        if (cleanedLast) errorMsg = cleanedLast;
      }
    }

    // 6. Actionable status-code fallbacks (avoid technical terms or generic "Unexpected server error")
    if (!errorMsg) {
      if (response.status === 400) {
        errorMsg = "Some of the entered details need correction. Please check the form and try again.";
      } else if (response.status === 401) {
        errorMsg = "Your session has expired. Please sign in again.";
      } else if (response.status === 403) {
        errorMsg = "You have read-only access here, or your assigned role does not have authorization for this operation.";
      } else if (response.status === 404) {
        errorMsg = "The requested record was not found.";
      } else if (response.status === 409) {
        errorMsg = "A record with these details already exists or was modified by another user.";
      } else if (response.status === 417) {
        errorMsg = "The entered information does not meet system rules. Please review the details.";
      } else if (response.status === 429) {
        errorMsg = "Too many requests. Please wait a moment and try again.";
      } else if (response.status >= 500) {
        errorMsg = "The server could not complete this request right now. Please try again in a few moments.";
      } else {
        errorMsg = "Could not complete this action. Please review your entries and try again.";
      }
    }

    throw new ApiV2Error(
      errorMsg,
      response.status,
      jsonResponse?.exc_type || (isV1 ? jsonResponse?.kind : undefined),
      jsonResponse?._server_messages,
      jsonResponse
    );
  }

  // A /v1 answer is the operation's answer itself (a list route's in `items`).
  if (isV1) {
    if (answerField && !options.raw && jsonResponse && typeof jsonResponse === "object" && answerField in jsonResponse) {
      return jsonResponse[answerField] as T;
    }
    return jsonResponse as T;
  }

  // Return unpacked message payload or entire response
  return (jsonResponse.message !== undefined ? jsonResponse.message : jsonResponse) as T;
}
