import { getCurrentUserV2, loginV2, logoutV2 } from "./v2/auth";
import { getCachedOrFetchCsrfToken, clearCsrfToken } from "./v2/client";

export interface AuthUser {
  email: string;
  full_name?: string;
  roles: string[];
  enabled?: boolean;
  is_internal_staff?: boolean;
  contractor?: any | null;
}

export async function loginUser(
  email: string,
  pwd: string
): Promise<{ success: boolean; message: string; full_name?: string; home_page?: string }> {
  const data = await loginV2(email, pwd);
  await getCachedOrFetchCsrfToken();
  return {
    success: true,
    message: data?.message || "Logged In",
    full_name: data?.full_name,
    home_page: data?.home_page,
  };
}

export async function logoutUser(): Promise<void> {
  try {
    await logoutV2();
  } catch (err) {
    console.error("Logout request error:", err);
  } finally {
    clearCsrfToken();
  }
}

export async function getLoggedUser(): Promise<string | null> {
  try {
    const user = await getCurrentUserV2();
    return user?.user || null;
  } catch {
    return null;
  }
}

export async function fetchCurrentUserContext(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUserV2();
    if (!user || !user.user || user.user === "Guest") {
      return null;
    }

    const rawRoles = Array.isArray(user.roles) ? user.roles : [];
    const hasInternalStaffRole = rawRoles.some((r) => {
      const norm = (typeof r === "string" ? r : "").toLowerCase().trim();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "admin" ||
        norm === "manager" ||
        norm === "registrar" ||
        norm === "clearance officer" ||
        norm === "finance manager" ||
        norm === "complaint manager" ||
        norm === "ticketer"
      );
    });

    const isForeignAgency =
      !hasInternalStaffRole &&
      rawRoles.some((r) => (typeof r === "string" ? r.toLowerCase().trim() : "") === "foreign agency");

    return {
      email: user.user,
      full_name: user.full_name || user.user,
      roles: rawRoles,
      is_internal_staff: hasInternalStaffRole || !isForeignAgency,
      contractor: isForeignAgency ? { name: user.user } : user.contractor || null,
      enabled: true,
    };
  } catch (err) {
    console.warn("[Auth] fetchCurrentUserContext error:", err);
    return null;
  }
}
