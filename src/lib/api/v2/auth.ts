/**
 * V2 Authentication & Session API
 * 
 * Endpoints:
 * - POST /api/method/login
 * - POST /api/method/logout
 * - POST /api/method/agency_tracking.auth_api.get_current_user
 * - POST /api/method/agency_tracking.auth_api.get_csrf_token
 */

import { requestV2, setCachedCsrfToken, clearCsrfToken, getCachedOrFetchCsrfToken } from "./client";
import { V2AuthUser } from "@/lib/auth/v2Roles";

export interface V2LoginResponse {
  message: string;
  home_page?: string;
  full_name?: string;
}

export interface V2CurrentUserResponse {
  user: string;
  full_name: string;
  roles: string[];
  contractor?: string | null;
}

/**
 * Standard Frappe session-cookie login.
 */
export async function loginV2(usr: string, pwd: string): Promise<V2LoginResponse> {
  const result = await requestV2<V2LoginResponse>("/api/method/login", {
    method: "POST",
    body: { usr, pwd },
  });

  // Automatically fetch and cache CSRF token upon successful login
  try {
    const csrfToken = await getCachedOrFetchCsrfToken();
    if (csrfToken) {
      setCachedCsrfToken(csrfToken);
    }
  } catch (e) {
    console.warn("[V2 Auth] Post-login CSRF token resolution warning:", e);
  }

  return result;
}

/**
 * Standard Frappe session logout.
 */
export async function logoutV2(): Promise<void> {
  try {
    await requestV2("/api/method/logout", {
      method: "POST",
    });
  } finally {
    clearCsrfToken();
  }
}

/**
 * Resolves current session user.
 * Note: allow_guest=True on backend -- returns null for Guest.
 */
export async function getCurrentUserV2(): Promise<V2AuthUser | null> {
  const data = await requestV2<V2CurrentUserResponse | null>(
    "/api/method/agency_tracking.auth_api.get_current_user",
    { method: "POST" }
  );

  if (!data || !data.user || data.user === "Guest") {
    return null;
  }

  const rawRoles = Array.isArray(data.roles) ? data.roles : [];
  const normalizedRoles = rawRoles
    .map((r: any) => {
      if (typeof r === "string") return r.trim();
      if (r && typeof r === "object") {
        if (typeof r.role === "string") return r.role.trim();
        if (typeof r.name === "string") return r.name.trim();
      }
      return "";
    })
    .filter(Boolean);

  return {
    user: data.user,
    full_name: data.full_name || data.user,
    roles: normalizedRoles,
    contractor: data.contractor || null,
  };
}

/**
 * Explicitly fetches CSRF token (deduplicated and cached).
 */
export async function getCsrfTokenV2(): Promise<string | null> {
  return getCachedOrFetchCsrfToken();
}
