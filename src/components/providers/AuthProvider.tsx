"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { loginUser, logoutUser, getLoggedUser, fetchCurrentUserContext, AuthUser } from "@/lib/api/auth";
import { hasRole, hasAnyRole, hasAllRoles, can, PermissionAction } from "@/lib/auth/permissions";
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
  const router = useRouter();
  const pathname = usePathname();

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
            roles: [], // Safe unprivileged state: Authenticated != Authorized
            is_internal_staff: false,
          });
        }
      } else {
        setUser(null);
        setAuthUser(null);
        setAgencyContext(null);
      }
    } catch {
      setUser(null);
      setAuthUser(null);
      setAgencyContext(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
