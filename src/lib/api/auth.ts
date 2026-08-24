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
  const res = await fetch("/api/method/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ usr: email, pwd }),
  });

  const data = await res.json();
  if (!res.ok || data.exc || data.exception) {
    const errorMsg =
      data.message ||
      (typeof data._server_messages === "string" ? data._server_messages : "") ||
      "Invalid email or password.";
    throw new Error(typeof errorMsg === "string" ? errorMsg : "Authentication failed");
  }

  return {
    success: true,
    message: data.message || "Logged In",
    full_name: data.full_name,
    home_page: data.home_page,
  };
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch("/api/method/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Logout request error:", err);
  }
}

export async function getLoggedUser(): Promise<string | null> {
  try {
    const res = await fetch("/api/method/frappe.auth.get_logged_user", {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.message && typeof data.message === "string" && data.message !== "Guest") {
      return data.message;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchCurrentUserContext(): Promise<AuthUser | null> {
  try {
    const loggedUserEmail = await getLoggedUser();
    if (!loggedUserEmail) return null;

    // Fetch agency and role context
    const res = await fetch("/api/method/applicant_processing.applicant_processing.api.get_my_agency_context", {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      const ctx = data.message || data;
      if (ctx && typeof ctx === "object") {
        const rawRoles = Array.isArray(ctx.roles) ? ctx.roles : [];
        return {
          email: ctx.user || loggedUserEmail,
          full_name: ctx.full_name || loggedUserEmail,
          roles: rawRoles.map((r: any) => (typeof r === "string" ? r : r.role || "")).filter(Boolean),
          is_internal_staff: ctx.is_internal_staff ?? true,
          contractor: ctx.contractor || null,
          enabled: true,
        };
      }
    }

    // Safe non-privileged user when context endpoint cannot load roles
    return {
      email: loggedUserEmail,
      full_name: loggedUserEmail,
      roles: [], // Safe unprivileged state: Authenticated != Authorized
      is_internal_staff: false,
      contractor: null,
      enabled: true,
    };
  } catch (err) {
    console.warn("fetchCurrentUserContext error:", err);
    return null;
  }
}
