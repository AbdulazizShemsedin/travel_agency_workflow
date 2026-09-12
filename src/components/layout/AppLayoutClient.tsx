"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { useAuth } from "@/components/providers/AuthProvider";
import { isPureForeignAgency } from "@/lib/auth/permissions";

interface AppLayoutClientProps {
  children: React.ReactNode;
}

export function AppLayoutClient({ children }: AppLayoutClientProps) {
  const pathname = usePathname();
  const { user, authUser, isLoading } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);


  // Load sidebar preference from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // Ensure navigation and clicks are never stuck by orphan modal states or pointer locks
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
      if (document.body.hasAttribute("data-scroll-locked")) {
        document.body.removeAttribute("data-scroll-locked");
      }
    }
  }, [pathname]);

  // Global watcher ensuring body pointer-events never permanently freeze the screen
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleCaptureClick = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };
    const interval = setInterval(() => {
      const hasOpenDialog = document.querySelector('[role="dialog"], [data-state="open"]');
      if (!hasOpenDialog && document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    }, 400);

    window.addEventListener("click", handleCaptureClick, { capture: true });
    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleCaptureClick, { capture: true });
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  const isAgentRoute = pathname?.startsWith("/agent");
  const isLoginRoute = pathname === "/login" || pathname?.startsWith("/login");
  const isForeignAgency = isPureForeignAgency(authUser);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Never wrap login pages, unauthenticated states, or agent routes in the management portal shell
  if (
    isAgentRoute ||
    isLoginRoute ||
    (pathname === "/chat" && isForeignAgency) ||
    (!authUser && !user && !isLoading)
  ) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-clip flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors duration-200">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onToggleCollapse={toggleSidebar}
      />
      <div
        className={`flex flex-1 min-w-0 w-full max-w-full flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
        }`}
      >
        <AppNavbar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onMobileMenuToggle={toggleMobileMenu}
        />
        <main className="flex-1 min-w-0 w-full max-w-full p-3 sm:p-5 lg:p-6 animate-in fade-in duration-150">
          {children}
        </main>
      </div>
    </div>
  );
}
