/**
 * Core API Client for Agency Tracking Backend V2
 * 
 * Strict Architectural Rules:
 * 1. ONLY whitelisted `/api/method/agency_tracking.*` and standard `/api/method/login`, `/api/method/logout`, `/api/method/upload_file` endpoints are permitted.
 * 2. Raw `/api/resource/*` requests are strictly forbidden in V2.
 * 3. Automatic CSRF token resolution (`X-Frappe-CSRF-Token`) for state-changing POST requests.
 * 4. Honest error propagation preserving backend 400, 401, 403, 417, 500 error messages and exceptions.
 * 5. Session cookies transmitted with credentials: "include".
 */

import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";

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
      const res = await fetch("/api/method/agency_tracking.auth_api.get_csrf_token", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });

      if (res.ok) {
        const json = await res.json();
        const token =
          (typeof json.message === "string" ? json.message : json.message?.csrf_token) ||
          json.csrf_token ||
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
  method?: "POST" | "GET";
  body?: Record<string, any> | FormData;
  headers?: Record<string, string>;
  isMultipart?: boolean;
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

  const method = options.method || "POST";
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...options.headers,
  };

  // Attach CSRF token on POST requests if not logging in/out or fetching CSRF token
  if (
    method === "POST" &&
    !endpoint.endsWith("/login") &&
    !endpoint.endsWith("/logout") &&
    !endpoint.includes("get_csrf_token")
  ) {
    const csrfToken = await getCachedOrFetchCsrfToken();
    if (csrfToken) {
      headers["X-Frappe-CSRF-Token"] = csrfToken;
    }
  }

  let bodyData: BodyInit | undefined = undefined;

  if (options.body) {
    if (options.isMultipart || options.body instanceof FormData) {
      bodyData = options.body as FormData;
      // Do not manually set Content-Type for multipart; browser calculates boundary
    } else {
      headers["Content-Type"] = "application/json";
      bodyData = JSON.stringify(options.body);
    }
  }

  const response = await fetch(endpoint, {
    method,
    headers,
    credentials: "include",
    body: bodyData,
  });

  // Handle binary streams (e.g. XLSX export, PDF invoice)
  const contentType = response.headers.get("content-type") || "";
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
    return (await response.blob()) as unknown as T;
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
      (response.status === 400 && String(jsonResponse?._server_messages || "").includes("Invalid Request"))) &&
    !(options as any)._isRetry &&
    !endpoint.endsWith("/login") &&
    !endpoint.endsWith("/logout") &&
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
  if (!response.ok || jsonResponse.exc || jsonResponse.exception || jsonResponse.exc_type) {
    let errorMsg = "An unexpected server error occurred.";

    if (typeof jsonResponse.message === "string") {
      errorMsg = jsonResponse.message;
    } else if (jsonResponse.message && typeof jsonResponse.message.error === "string") {
      errorMsg = jsonResponse.message.error;
    } else if (typeof jsonResponse._server_messages === "string") {
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
              return m.message || JSON.stringify(m);
            })
            .join(" • ");
        }
      } catch {
        errorMsg = jsonResponse._server_messages;
      }
    } else if (response.status === 403) {
      errorMsg = "Permission denied: Your assigned role does not have authorization for this operation.";
    } else if (response.status === 417) {
      errorMsg = "Validation error: Operation violated backend business rules.";
    }

    throw new ApiV2Error(
      errorMsg,
      response.status,
      jsonResponse.exc_type,
      jsonResponse._server_messages,
      jsonResponse
    );
  }

  // Return unpacked message payload or entire response
  return (jsonResponse.message !== undefined ? jsonResponse.message : jsonResponse) as T;
}
