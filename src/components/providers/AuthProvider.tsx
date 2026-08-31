"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { loginUser, logoutUser, getLoggedUser, fetchCurrentUserContext, AuthUser } from "@/lib/api/auth";
import { hasRole, hasAnyRole, hasAllRoles, can, PermissionAction } from "@/lib/auth/permissions";
import { isDemoMode } from "@/lib/config/env";
import { DEMO_USERS, DemoUserProfile } from "@/lib/demo/users";
import { AgencyContextResponse } from "@/types/applicant";

interface AuthContextType {
  user: string | null;
  authUser: AuthUser | null;
  roles: string[];
  agencyContext: AgencyContextResponse | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
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
  login: async () => {},
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
      const loggedUser = await getLoggedUser();
      if (loggedUser) {
        setUser(loggedUser);
        const fullContext = await fetchCurrentUserContext();
        if (fullContext) {
          setAuthUser(fullContext);
          if (fullContext.contractor) {
            setAgencyContext({
              user: fullContext.email,
              full_name: fullContext.full_name || fullContext.email,
              roles: fullContext.roles,
              is_internal_staff: fullContext.is_internal_staff ?? false,
              contractor: fullContext.contractor,
            });
          }
        } else {
          setAuthUser({
            email: loggedUser,
            full_name: loggedUser,
            roles: [],
            is_internal_staff: false,
          });
        }
      } else if (isDemoMode()) {
        switchDemoUser("admin");
      } else {
        setUser(null);
        setAuthUser(null);
        setAgencyContext(null);
      }
    } catch {
      if (isDemoMode()) {
        switchDemoUser("admin");
      } else {
        setUser(null);
        setAuthUser(null);
        setAgencyContext(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [switchDemoUser]);

  React.useEffect(() => {
    loadUserContext();
  }, [loadUserContext]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      await loginUser(email, pass);
      await loadUserContext();
      if (pathname === "/login") {
        router.push("/applicants");
      }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        authUser,
        roles: authUser?.roles || [],
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

export function useAuth() {
  return React.useContext(AuthContext);
}
