"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";

interface AppLayoutClientProps {
  children: React.ReactNode;
}

export function AppLayoutClient({ children }: AppLayoutClientProps) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isAgentRoute = pathname?.startsWith("/agent");
  const isLoginRoute = pathname === "/login";

  // Load sidebar preference from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  if (isAgentRoute || isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onToggleCollapse={toggleSidebar}
      />
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <AppNavbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onMobileMenuToggle={toggleMobileMenu}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-150">
          {children}
        </main>
      </div>
    </div>
  );
}
