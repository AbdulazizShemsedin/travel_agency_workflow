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
    const isForeignAgency = rawRoles.some((r) => {
      const norm = (typeof r === "string" ? r : "").toLowerCase().trim();
      return norm === "foreign agency";
    });
    const internalStaffRoles = [
      "system manager",
      "administrator",
      "admin",
      "manager",
      "registrar",
      "clearance officer",
      "finance manager",
      "complaint manager",
      "ticketer",
      "communication manager",
      "contract parser",
      "saudi lmis",
      "saudi taeshir",
      "saudi embassy",
      "kuwait lmis",
      "kuwait telesign",
      "kuwait embassy",
    ];

    const usernameLower = (user.user || "").toLowerCase().trim();
    const hasInternalStaffRole =
      usernameLower === "administrator" ||
      usernameLower.startsWith("admin") ||
      rawRoles.some((r) => {
        const norm = (typeof r === "string" ? r : "").toLowerCase().trim();
        return internalStaffRoles.includes(norm);
      });

    const isInternalStaff =
      hasInternalStaffRole ||
      (typeof user.is_internal_staff === "boolean"
        ? user.is_internal_staff
        : !isForeignAgency);

    // Use server-provided contractor context directly from auth_api.get_current_user
    const serverContractor = user.contractor;
    let contractorObj: any = null;
    if (serverContractor) {
      contractorObj = typeof serverContractor === "object"
        ? serverContractor
        : { name: serverContractor, contractor_name: serverContractor };
    } else if (isForeignAgency && !hasInternalStaffRole) {
      contractorObj = { name: user.user, contractor_name: user.full_name || user.user };
    }

    return {
      email: user.user,
      full_name: user.full_name || user.user,
      roles: rawRoles,
      is_internal_staff: isInternalStaff,
      contractor: contractorObj,
      enabled: true,
    };
  } catch (err) {
    console.warn("[Auth] fetchCurrentUserContext error:", err);
    return null;
  }
}
