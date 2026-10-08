"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  BarChart3,
  Receipt,
  DollarSign,
  Plus,
  Globe2,
  X,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Compass,
  HelpCircle,
  Keyboard,
  LogOut,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DemoRoleSwitcher } from "@/components/demo/DemoRoleSwitcher";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { useAuth } from "@/components/providers/AuthProvider";
import { useTour } from "@/components/tour/TourProvider";
import { PermissionAction, isPureForeignAgency, normalizeRoleDisplay, isAdminUser } from "@/lib/auth/permissions";

interface NavItemConfig {
  label: string;
  href: string;
  icon: any;
  action: PermissionAction;
  tourId: string;
}

const navItems: NavItemConfig[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, action: "viewDashboard", tourId: "sidebar-nav-dashboard" },
  { label: "Applicants", href: "/applicants", icon: Users, action: "viewApplicants", tourId: "sidebar-nav-applicants" },
  { label: "Messages", href: "/chat", icon: MessageSquare, action: "manageCommunication", tourId: "sidebar-nav-chat" },
  { label: "Employees", href: "/employees", icon: Briefcase, action: "manageUsers", tourId: "sidebar-nav-employees" },
  { label: "Foreign Agencies", href: "/contractors", icon: Building2, action: "manageContractors", tourId: "sidebar-nav-contractors" },
  { label: "Commissions", href: "/commission", icon: DollarSign, action: "manageCommission", tourId: "sidebar-nav-commission" },
  { label: "Complaints", href: "/complaints", icon: AlertCircle, action: "manageComplaints", tourId: "sidebar-nav-complaints" },
  { label: "Reports", href: "/reports", icon: BarChart3, action: "viewReports", tourId: "sidebar-nav-reports" },
  { label: "Finance", href: "/expenses-income", icon: Receipt, action: "viewFinance", tourId: "sidebar-nav-finance" },
];

interface AppSidebarProps {
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleCollapse?: () => void;
}

export function AppSidebar({
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
  onToggleCollapse,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, authUser, can, roles, logout } = useAuth();
  const { openTourSelectModal, startPresentation, startOnboarding, openShortcutsModal } = useTour();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Check if current user is an external Foreign Agency partner
  const isForeignAgency = isPureForeignAgency(authUser);

  // Check if current user holds an authoritative admin role
  const isAdmin = Boolean(
    isAdminUser(authUser) ||
    user === "Administrator" ||
    (authUser?.email && authUser.email.toLowerCase() === "administrator") ||
    (roles || []).some((r: any) => {
      const s = String(r?.role || r?.name || r).toLowerCase().trim();
      return s === "administrator" || s === "system manager" || s === "admin";
    })
  );

  // If user is authenticated, filter nav items based on verified backend roles
  const visibleNavItems = React.useMemo(() => {
    if (isForeignAgency) {
      // Pure foreign agency is isolated from internal operational links
      return [];
    }
    if (!user) return navItems; // Unauthenticated preview
    return navItems.filter((item) => {
      // The contractor sidebar page section (/contractors) is strictly reserved for users with an Admin role
      if (item.action === "manageContractors" && !isAdmin) {
        return false;
      }
      return can(item.action);
    });
  }, [user, authUser, can, isForeignAgency, isAdmin]);

  const canRegister =
    !isForeignAgency && (Boolean(user) ? can("registerApplicant") : false);
  const canAccessAgentPortal =
    (isAdmin && can("accessAgentPortal")) || isForeignAgency;
  const showLabels = isMobileOpen || !isCollapsed;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#0d0d10] transition-all duration-300 shadow-sm",
          // Mobile state: always full width (w-64) when opened
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          // Desktop collapsed state
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
        {/* Brand Header */}
        <div data-tour="sidebar-brand" className="flex h-16 items-center justify-between border-b border-slate-100 dark:border-[#222227] px-4">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center gap-3 overflow-hidden group hover:opacity-90 transition-opacity cursor-pointer"
            title="Navigate to Dashboard"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-900 dark:bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
              <Globe2 className="h-5 w-5" />
            </div>
            {showLabels && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Travel Agency
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                  Travel Agency
                </p>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Action: Add Applicant Button */}
        {canRegister && (
          <div className="p-3" data-tour="add-applicant-button">
            <Link href="/applicants/new" onClick={onCloseMobile}>
              <Button
                className={cn(
                  "w-full justify-center gap-2 bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white shadow-xs font-medium text-xs",
                  !showLabels ? "px-0" : ""
                )}
                title={!showLabels ? "Add Applicant" : undefined}
              >
                <Plus className="h-4 w-4 shrink-0" />
                {showLabels && <span>Add Applicant</span>}
              </Button>
            </Link>
          </div>
        )}

        {/* Navigation Links (Role-Aware) */}
        <nav data-tour="sidebar-nav" className="flex-1 space-y-1 px-2.5 py-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/applicants"
                ? pathname.startsWith("/applicants") || pathname === "/"
                : pathname === item.href;

            return (
              <React.Fragment key={item.label}>
                <Link
                  href={item.href}
                  onClick={onCloseMobile}
                  data-tour={item.tourId}
                  title={!showLabels ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300 font-semibold border-l-4 border-emerald-800 dark:border-emerald-500 rounded-l-none"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white",
                    !showLabels ? "justify-center px-2" : ""
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-emerald-800 dark:text-emerald-400" : "text-slate-400"
                    )}
                  />
                  {showLabels && <span>{item.label}</span>}
                </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-slate-100 dark:border-[#222227] p-3 space-y-2">
          {canAccessAgentPortal && (
            <Link
              href="/agent"
              onClick={onCloseMobile}
              title={!showLabels ? "Agency Portal" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-800/80 px-2.5 py-2 text-xs font-semibold text-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition",
                !showLabels ? "justify-center px-1" : ""
              )}
            >
              <Globe2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400 shrink-0" />
              {showLabels && (
                <div className="flex flex-1 items-center justify-between">
                  <span>Partner Agency Portal</span>
                  <ExternalLink className="h-3 w-3 text-emerald-600" />
                </div>
              )}
            </Link>
          )}

          {/* User Card Popover Trigger */}
          {user ? (
            <Popover open={isUserMenuOpen} onOpenChange={setIsUserMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-tour="sidebar-user-card"
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-[#222227] bg-slate-50/90 dark:bg-[#141418] hover:bg-slate-100 dark:hover:bg-[#1c1c22] p-2 text-left transition cursor-pointer group shadow-2xs",
                    !showLabels ? "justify-center p-1.5" : ""
                  )}
                  title={!showLabels ? (authUser?.full_name || user) : "Account settings and tour"}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                    {(authUser?.full_name || user).slice(0, 2)}
                  </div>
                  {showLabels && (
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {authUser?.full_name || user}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="truncate text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                          {authUser?.email || user}
                        </span>
                        <ChevronUp className="h-3 w-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition-transform" />
                      </div>
                    </div>
                  )}
                </button>
              </PopoverTrigger>

              <PopoverContent
                side="top"
                align={isCollapsed ? "center" : "start"}
                sideOffset={10}
                className="w-64 p-2 shadow-2xl border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#121215] z-50"
              >
                {/* User Details */}
                <div className="px-2 py-2 border-b border-slate-100 dark:border-[#222227] mb-1">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                      {(authUser?.full_name || user).slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {authUser?.full_name || user}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate font-mono">
                        {authUser?.email || user}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => {
                      const seen = new Set<string>();
                      return roles.reduce<React.ReactElement[]>((acc, r) => {
                        const display = normalizeRoleDisplay(r);
                        if (!seen.has(display)) {
                          seen.add(display);
                          acc.push(
                            <span
                              key={r}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60"
                            >
                              {display}
                            </span>
                          );
                        }
                        return acc;
                      }, []).slice(0, 3);
                    })()}
                  </div>
                </div>

                {/* Demo Role Switcher inside popover (visible when demo mode active) */}
                <div className="px-1 py-1">
                  <DemoRoleSwitcher />
                </div>

                {/* Interactive Tour & Demo actions */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    openTourSelectModal();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition font-semibold cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Interactive Tour &amp; Demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    startPresentation();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1a1a22] rounded-md transition font-medium cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                  <span>Presentation Mode</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    startOnboarding();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1a1a22] rounded-md transition font-medium cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5 text-slate-400" />
                  <span>Onboarding Tour</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    openShortcutsModal();
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#1a1a22] rounded-md transition font-medium cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-3.5 w-3.5 text-slate-400" />
                    <span>Keyboard Shortcuts</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
                    ?
                  </kbd>
                </button>

                <div className="h-px bg-slate-100 dark:bg-[#222227] my-1" />

                {/* Sign Out Action */}
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsLogoutConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition font-semibold cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log Out</span>
                </button>
              </PopoverContent>
            </Popover>
          ) : null}

          {/* Logout Confirmation Modal */}
          <ConfirmationModal
            isOpen={isLogoutConfirmOpen}
            onClose={() => setIsLogoutConfirmOpen(false)}
            onConfirm={async () => {
              try {
                setIsLoggingOut(true);
                await logout();
              } finally {
                setIsLoggingOut(false);
                setIsLogoutConfirmOpen(false);
              }
            }}
            title="Log Out of System?"
            description="Any unsaved progress will be lost."
            confirmLabel="Log Out"
            cancelLabel="Stay Signed In"
            variant="danger"
            icon={LogOut}
            isLoading={isLoggingOut}
          />
        </div>
      </aside>
    </>
  );
}
