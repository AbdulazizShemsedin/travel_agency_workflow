"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { loginUser, logoutUser, getLoggedUser, fetchCurrentUserContext, AuthUser } from "@/lib/api/auth";
import { hasRole, hasAnyRole, hasAllRoles, can, PermissionAction, ROUTE_PERMISSION_MAP } from "@/lib/auth/permissions";
import { isDemoMode } from "@/lib/config/env";
import { DEMO_USERS, DemoUserProfile } from "@/lib/demo/users";
import { AgencyContextResponse } from "@/types/applicant";
import { toast } from "sonner";

interface AuthContextType {
  user: string | null;
  authUser: AuthUser | null;
  roles: string[];
  agencyContext: AgencyContextResponse | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refreshContext: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAllRoles: (roles: string[]) => boolean;
  can: (action: PermissionAction) => boolean;
  demoUserKey?: string;
  switchDemoUser?: (userKey: string) => void;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  authUser: null,
  roles: [],
  agencyContext: null,
  isLoading: true,
  login: async () => null,
  logout: async () => {},
  refreshContext: async () => {},
  hasRole: () => false,
  hasAnyRole: () => false,
  hasAllRoles: () => false,
  can: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<string | null>(null);
  const [authUser, setAuthUser] = React.useState<AuthUser | null>(null);
  const [agencyContext, setAgencyContext] = React.useState<AgencyContextResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [demoUserKey, setDemoUserKey] = React.useState<string>("admin");
  const router = useRouter();
  const pathname = usePathname();

  const switchDemoUser = React.useCallback((key: string) => {
    const profile = DEMO_USERS[key] || DEMO_USERS.admin;
    setDemoUserKey(key);
    setUser(profile.email);
    setAuthUser({
      email: profile.email,
      full_name: profile.full_name,
      roles: profile.roles,
      is_internal_staff: !profile.roles.includes("Foreign Agency"),
      contractor: profile.roles.includes("Foreign Agency") ? "CON-001" : undefined,
    });
    if (profile.roles.includes("Foreign Agency")) {
      setAgencyContext({
        user: profile.email,
        full_name: profile.full_name,
        roles: profile.roles,
        is_internal_staff: false,
        contractor: {
          name: "CON-001",
          company_name: profile.full_name,
          country: profile.email.includes("kuwait") ? "Kuwait" : "Saudi Arabia",
        },
      });
    } else {
      setAgencyContext(null);
    }
  }, []);

  const loadUserContext = React.useCallback(async () => {
    try {
      const fullContext = await fetchCurrentUserContext();
      if (fullContext && fullContext.email && fullContext.email !== "Guest") {
        setUser(fullContext.email);
        setAuthUser(fullContext);
        if (fullContext.contractor) {
          setAgencyContext({
            user: fullContext.email,
            full_name: fullContext.full_name || fullContext.email,
            roles: fullContext.roles,
            is_internal_staff: fullContext.is_internal_staff ?? false,
            contractor: fullContext.contractor,
          });
        } else {
          setAgencyContext(null);
        }
      } else if (isDemoMode()) {
        switchDemoUser("admin");
      } else {
        setUser(null);
        setAuthUser(null);
        setAgencyContext(null);
      }
      return fullContext;
    } catch {
      if (isDemoMode()) {
        switchDemoUser("admin");
      } else {
        setUser(null);
        setAuthUser(null);
        setAgencyContext(null);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [switchDemoUser]);

  React.useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  // Route protection: redirect unauthenticated users to /login
  React.useEffect(() => {
    if (!isLoading) {
      if (!authUser && pathname !== "/login" && !pathname.startsWith("/login")) {
        router.push("/login");
      } else if (authUser && (pathname === "/login" || pathname?.startsWith("/login"))) {
        if (authUser.roles?.includes("Foreign Agency") && !authUser.is_internal_staff) {
          router.push("/agent");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [isLoading, authUser, pathname, router]);

  // RBAC Route Guard: block access to pages the user's role doesn't permit
  React.useEffect(() => {
    if (isLoading || !authUser || !pathname) return;
    // Skip login, agent portal, and settings routes (always accessible)
    if (pathname === "/login" || pathname.startsWith("/login") || pathname.startsWith("/agent") || pathname === "/settings") return;

    // Find the matching route permission
    // Check exact match first, then prefix match for dynamic routes like /applicants/[id]
    let requiredAction: PermissionAction | undefined = ROUTE_PERMISSION_MAP[pathname];
    if (!requiredAction) {
      // Find the longest matching route prefix
      const matchedRoute = Object.keys(ROUTE_PERMISSION_MAP)
        .filter((route) => pathname.startsWith(route))
        .sort((a, b) => b.length - a.length)[0];
      if (matchedRoute) {
        requiredAction = ROUTE_PERMISSION_MAP[matchedRoute];
      }
    }

    // If a required action was found and the user doesn't have permission, redirect
    if (requiredAction && !can(authUser, requiredAction)) {
      toast.error("Access Denied", {
        description: "You do not have permission to access this section. Contact your administrator if you believe this is an error.",
        duration: 5000,
      });
      router.replace("/dashboard");
    }
  }, [isLoading, authUser, pathname, router]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await loginUser(email, pass);
      const userContext = await loadUserContext();
      if (userContext) {
        if (userContext.roles?.includes("Foreign Agency") && !userContext.is_internal_staff) {
          router.push("/agent");
        } else {
          router.push("/dashboard");
        }
      }
      return userContext;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setAuthUser(null);
      setAgencyContext(null);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshContext = async () => {
    await loadUserContext();
  };

  const userHasRole = React.useCallback((role: string) => hasRole(authUser, role), [authUser]);
  const userHasAnyRole = React.useCallback((r: string[]) => hasAnyRole(authUser, r), [authUser]);
  const userHasAllRoles = React.useCallback((r: string[]) => hasAllRoles(authUser, r), [authUser]);
  const userCan = React.useCallback((action: PermissionAction) => can(authUser, action), [authUser]);

  // Prevent protected pages from mounting and triggering unauthenticated API cascades during initialization
  if (isLoading && pathname !== "/login" && !pathname?.startsWith("/login")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        roles: authUser?.roles || EMPTY_ROLES,
        agencyContext,
        isLoading,
        login,
        logout,
        refreshContext,
        hasRole: userHasRole,
        hasAnyRole: userHasAnyRole,
        hasAllRoles: userHasAllRoles,
        can: userCan,
        demoUserKey,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const EMPTY_ROLES: string[] = [];

export function useAuth() {

  return React.useContext(AuthContext);
}
