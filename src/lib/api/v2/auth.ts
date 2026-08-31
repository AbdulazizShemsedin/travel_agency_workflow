/**
 * V2 Authentication & Session API
 * 
 * Endpoints:
 * - POST /api/method/login
 * - POST /api/method/logout
 * - POST /api/method/agency_tracking.auth_api.get_current_user
 * - POST /api/method/agency_tracking.auth_api.get_csrf_token
 */

import { requestV2, setCachedCsrfToken, clearCsrfToken } from "./client";
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
    const csrfToken = await getCsrfTokenV2();
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

  return {
    user: data.user,
    full_name: data.full_name || data.user,
    roles: Array.isArray(data.roles) ? data.roles : [],
    contractor: data.contractor || null,
  };
}

/**
 * Explicitly fetches CSRF token.
 */
export async function getCsrfTokenV2(): Promise<string | null> {
  const data = await requestV2<{ csrf_token?: string } | string>(
    "/api/method/agency_tracking.auth_api.get_csrf_token",
    { method: "POST" }
  );

  if (typeof data === "string") {
    return data;
  }
  return data?.csrf_token || null;
}
