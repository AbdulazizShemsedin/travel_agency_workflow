"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  KeyRound,
  Shield,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Calendar,
  MoreVertical,
  X,
  UserCheck,
  UserX,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  listEmployeesV2,
  createEmployeeV2,
  updateEmployeeRolesV2,
  resetEmployeePasswordV2,
  toggleEmployeeStatusV2,
  V2EmployeeRecord,
} from "@/lib/api/v2";
import { cn } from "@/lib/utils";

// Canonical Roles Definition mapped directly to active database roles
export interface CanonicalRoleDefinition {
  name: string;
  category: "Core & Admin" | "Intake & Registry" | "Clearance Pipeline" | "Operations & Finance";
  description: string;
  permissionsSummary: string;
  accessSurface: string[];
}

export const CANONICAL_V2_ROLES: CanonicalRoleDefinition[] = [
  // 1. Core & Admin
  {
    name: "Administrator",
    category: "Core & Admin",
    description: "Root system administrator with complete write and override authority across all operational modules.",
    permissionsSummary: "Full CRUD on all records; financial approval queue; country-ban override; clearance step reassignment.",
    accessSurface: ["All Modules", "System Administration", "System Settings"],
  },
  {
    name: "System Manager",
    category: "Core & Admin",
    description: "Core administrative role managing agency operations, staff role grants, and operational parameters.",
    permissionsSummary: "Complete operational management; staff user provisioning; role assignment; financial approvals.",
    accessSurface: ["All Modules", "User Management", "Audit Logs"],
  },
  {
    name: "Admin",
    category: "Core & Admin",
    description: "Executive agency administrator overseeing candidate pipelines, financial health, and cross-corridor status.",
    permissionsSummary: "Full read/write on Applicants, Placements, Clearance Steps, Reports, and Approval Queues.",
    accessSurface: ["Applicants", "Placements", "Reports", "Approvals", "Finance"],
  },
  {
    name: "Manager",
    category: "Core & Admin",
    description: "Operational team lead managing day-to-day clearance execution, step assignments, and workflow overrides.",
    permissionsSummary: "Full read/write on Applicants & Placements; clearance step reassignment; country-ban override; daily work reports.",
    accessSurface: ["Applicants", "Placements", "Clearance Steps", "Daily Reports"],
  },

  // 2. Intake & Registry
  {
    name: "Registrar",
    category: "Intake & Registry",
    description: "Front-office intake officer responsible for candidate dossier registration and initial documentation.",
    permissionsSummary: "Create, edit, and register Applicants; set country bans. Strictly no write access to Placements or Finance.",
    accessSurface: ["Applicant Registration", "Intake Registry", "Country Bans (Create Only)"],
  },
  {
    name: "Contract Parser",
    category: "Intake & Registry",
    description: "Specialist managing digital employment contracts, candidate matching verification, and visa data ingestion.",
    permissionsSummary: "Read/write placement records; verify contract details; upload official visa documents.",
    accessSurface: ["Contract Ingestion", "Placement Verification", "Visa Records"],
  },

  // 3. Clearance Pipeline
  {
    name: "Clearance Officer",
    category: "Clearance Pipeline",
    description: "Cross-corridor clearance specialist operating assigned clearance tasks across destination countries.",
    permissionsSummary: "Operate assigned Clearance Steps (start/complete/submit); read-only on Applicants & Placements.",
    accessSurface: ["Assigned Clearance Steps", "Candidate Dossier (Read-Only)"],
  },
  {
    name: "Saudi LMIS",
    category: "Clearance Pipeline",
    description: "Specialized officer for Saudi Labor Market Information System (LMIS), COC exam, and labor ID clearance.",
    permissionsSummary: "Operate LMIS Clearance steps (start/complete); narrow candidate edit via update_applicant_for_lmis.",
    accessSurface: ["Saudi LMIS Steps", "COC / Labor ID Fields"],
  },
  {
    name: "Saudi Taeshir",
    category: "Clearance Pipeline",
    description: "Specialized officer managing Saudi visa service center (VFS / Taeshir) biometric coordination and fees.",
    permissionsSummary: "Operate Taeshir clearance steps (start/complete); reference and fee recording.",
    accessSurface: ["Saudi Taeshir Steps", "Biometric Reference Logging"],
  },
  {
    name: "Saudi Embassy",
    category: "Clearance Pipeline",
    description: "Consular liaison officer managing Monday dossier submission and Thursday visa stamping outcomes for Saudi Arabia.",
    permissionsSummary: "Submit dossier to embassy; stamp visa (reference recording); reject visa (mandatory remark).",
    accessSurface: ["Saudi Embassy Steps", "Consular Submissions", "Visa Stamping"],
  },
  {
    name: "Kuwait LMIS",
    category: "Clearance Pipeline",
    description: "Specialized clearance officer managing Kuwait ministry labor clearance and work permit approvals.",
    permissionsSummary: "Operate Kuwait LMIS clearance steps (start/complete); narrow candidate edit via update_applicant_for_lmis.",
    accessSurface: ["Kuwait LMIS Steps", "Labor Approval Logging"],
  },
  {
    name: "Kuwait Telesign",
    category: "Clearance Pipeline",
    description: "Specialized officer managing Kuwait Telesign authentication, biometric clearance, and COC certification.",
    permissionsSummary: "Operate Telesign clearance steps (start/complete); reference number and fee recording.",
    accessSurface: ["Kuwait Telesign Steps", "COC Certification"],
  },
  {
    name: "Kuwait Embassy",
    category: "Clearance Pipeline",
    description: "Consular liaison officer managing Monday dossier submission and Thursday visa stamping outcomes for Kuwait.",
    permissionsSummary: "Submit dossier to embassy; stamp visa (reference recording); reject visa (mandatory remark).",
    accessSurface: ["Kuwait Embassy Steps", "Consular Submissions", "Visa Stamping"],
  },

  // 4. Operations & Finance
  {
    name: "Ticketer",
    category: "Operations & Finance",
    description: "Travel coordinator managing flight itinerary booking, ticket upload, pre-departure fit medical, and departure dispatch.",
    permissionsSummary: "Record ticket details; log Medical 2 fit results; execute placement departure transition.",
    accessSurface: ["Tickets", "Medical 2 Gate", "Departure Execution"],
  },
  {
    name: "Finance Manager",
    category: "Operations & Finance",
    description: "Chief accountant managing transaction approvals, currency exchange rates, commission batching, and invoicing.",
    permissionsSummary: "Approve, reject, or void applicant transactions; batch commissions; generate PDF invoices; settle batches.",
    accessSurface: ["Financial Approvals", "Commission Batches", "Invoice PDF Exports", "FX Rates"],
  },
  {
    name: "Complaint Manager",
    category: "Operations & Finance",
    description: "Welfare officer managing applicant grievance intake, investigation aging, and dispute resolution.",
    permissionsSummary: "List, create, update, and resolve complaints; set country bans; view complaint aging metrics.",
    accessSurface: ["Complaints Queue", "Welfare Actions", "Country Bans"],
  },
  {
    name: "Communication Manager",
    category: "Operations & Finance",
    description: "Internal and agency messaging supervisor managing chat channels and external agency communication threads.",
    permissionsSummary: "Create internal/agency threads; post messages; attach documents; manage participant rosters.",
    accessSurface: ["Chat System", "Agency Channels"],
  },
];

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { authUser, roles } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [roleFilter, setRoleFilter] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [showRoleDocs, setShowRoleDocs] = React.useState<boolean>(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false);
  const [selectedForRoles, setSelectedForRoles] = React.useState<V2EmployeeRecord | null>(null);
  const [editingRoles, setEditingRoles] = React.useState<string[]>([]);
  const [selectedForPassword, setSelectedForPassword] = React.useState<V2EmployeeRecord | null>(null);
  const [newPassword, setNewPassword] = React.useState<string>("");
  const [showNewPassword, setShowNewPassword] = React.useState<boolean>(false);

  // Add Employee Form State
  const [addForm, setAddForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    roles: [] as string[],
    send_welcome_email: false,
  });
  const [showAddPassword, setShowAddPassword] = React.useState<boolean>(false);

  // Check admin privileges
  const isManagerOrAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator" || emailOrName.startsWith("admin")) return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "admin" ||
        norm === "agency admin" ||
        norm === "manager"
      );
    });
  }, [authUser, roles]);

  // Query: Fetch staff employees
  const {
    data: employees = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<V2EmployeeRecord[]>({
    queryKey: ["v2_employees_directory"],
    queryFn: listEmployeesV2,
    staleTime: 20000,
  });

  // Filtered employees
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      // Status filter
      if (statusFilter === "Active" && emp.enabled !== 1) return false;
      if (statusFilter === "Inactive" && emp.enabled !== 0) return false;

      // Role filter
      if (roleFilter !== "All") {
        if (!emp.roles.some((r) => r.toLowerCase() === roleFilter.toLowerCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = emp.full_name.toLowerCase().includes(q);
        const matchesEmail = emp.email.toLowerCase().includes(q);
        const matchesPhone = emp.phone?.toLowerCase().includes(q) || emp.mobile_no?.toLowerCase().includes(q);
        const matchesRole = emp.roles.some((r) => r.toLowerCase().includes(q));
        if (!matchesName && !matchesEmail && !matchesPhone && !matchesRole) {
          return false;
        }
      }

      return true;
    });
  }, [employees, statusFilter, roleFilter, searchQuery]);

  // Mutation 1: Create Employee
  const createMutation = useMutation({
    mutationFn: createEmployeeV2,
    onSuccess: (newEmp) => {
      queryClient.invalidateQueries({ queryKey: ["v2_employees_directory"] });
      setIsAddModalOpen(false);
      setAddForm({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        roles: [],
        send_welcome_email: false,
      });
      toast.success("Employee account created successfully!", {
        description: `${newEmp.full_name} (${newEmp.email}) is now registered.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to create employee", {
        description: err.message || "Please verify the information and try again.",
      });
    },
  });

  // Mutation 2: Update Security Roles
  const updateRolesMutation = useMutation({
    mutationFn: (payload: { email: string; roles: string[] }) =>
      updateEmployeeRolesV2(payload.email, payload.roles),
    onSuccess: (updatedRoles, variables) => {
      queryClient.invalidateQueries({ queryKey: ["v2_employees_directory"] });
      setSelectedForRoles(null);
      toast.success("Security roles updated!", {
        description: `Roles updated for ${variables.email}.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to update security roles", {
        description: err.message || "Please try again.",
      });
    },
  });

  // Mutation 3: Reset Password
  const resetPasswordMutation = useMutation({
    mutationFn: (payload: { email: string; newPassword: string }) =>
      resetEmployeePasswordV2(payload.email, payload.newPassword),
    onSuccess: (_, variables) => {
      setSelectedForPassword(null);
      setNewPassword("");
      toast.success("Password reset successfully!", {
        description: `New credentials active for ${variables.email}.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to reset password", {
        description: err.message || "Please try again.",
      });
    },
  });

  // Mutation 4: Toggle Active Status
  const toggleStatusMutation = useMutation({
    mutationFn: (payload: { email: string; enabled: boolean }) =>
      toggleEmployeeStatusV2(payload.email, payload.enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["v2_employees_directory"] });
      toast.success(
        variables.enabled ? "Employee account activated" : "Employee account deactivated",
        {
          description: variables.email,
        }
      );
    },
    onError: (err: any) => {
      toast.error("Failed to update status", {
        description: err.message || "Please try again.",
      });
    },
  });

  // Handlers for role selection in Add Modal
  const handleToggleAddRole = (roleName: string) => {
    setAddForm((prev) => {
      const exists = prev.roles.includes(roleName);
      const newRoles = exists
        ? prev.roles.filter((r) => r !== roleName)
        : [...prev.roles, roleName];
      return { ...prev, roles: newRoles };
    });
  };

  // Handlers for role selection in Edit Modal
  const handleToggleEditRole = (roleName: string) => {
    setEditingRoles((prev) => {
      const exists = prev.includes(roleName);
      return exists ? prev.filter((r) => r !== roleName) : [...prev, roleName];
    });
  };

  const handleOpenEditRoles = (emp: V2EmployeeRecord) => {
    setSelectedForRoles(emp);
    setEditingRoles(emp.roles.filter((r) => r !== "Desk User"));
  };

  const handleOpenResetPassword = (emp: V2EmployeeRecord) => {
    setSelectedForPassword(emp);
    setNewPassword("");
    setShowNewPassword(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAddForm((prev) => ({ ...prev, password: pwd }));
    setShowAddPassword(true);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Page Header                                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Employee & Staff Management
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            >
              STAFF DIRECTORY
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Provision internal user accounts, configure multi-role permissions, and manage staff credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="text-xs h-9"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefetching && "animate-spin text-emerald-600")} />
            Refresh
          </Button>

          {isManagerOrAdmin && (
            <Button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-xs"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add New Employee
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Current Active Session & Security Notice                      */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#121216] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-400 font-bold text-sm">
              {(authUser?.full_name || "Staff")
                .split(/\s+/)
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {authUser?.full_name || "Agency Staff"}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
                >
                  Active Session
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                Staff Email: <strong>{authUser?.email || "Unknown"}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              Active Session Security Roles:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.isArray(roles) && roles.length > 0 ? (
                roles.map((role: string) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="text-[10px] font-semibold bg-slate-100 dark:bg-[#181822] text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-[#282835]"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" />
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-slate-400">Standard Staff Access</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Search & Filter Toolbar                                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] shadow-xs">
        <div className="flex items-center gap-2.5 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name, email, phone, or role..."
              className="h-8 pl-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
            >
              <option value="All">All Roles ({CANONICAL_V2_ROLES.length})</option>
              {CANONICAL_V2_ROLES.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-slate-500 dark:text-zinc-400">
          <span>
            Showing <strong>{filteredEmployees.length}</strong> of {employees.length} employees
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRoleDocs(!showRoleDocs)}
            className="text-xs h-8 text-slate-600 dark:text-zinc-300 hover:text-slate-900"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            {showRoleDocs ? "Hide Role Guide" : "Role Guide"}
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Employees Directory Table                                     */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
            <p className="text-xs font-medium">Loading employee directory...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-[#1a1a22] flex items-center justify-center text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Employees Found
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
              {searchQuery || roleFilter !== "All" || statusFilter !== "All"
                ? "No employee records match the active search filters. Try clearing your search or filter options."
                : "No employee accounts are registered yet. Click 'Add New Employee' to create your first team member."}
            </p>
            {isManagerOrAdmin && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                Add New Employee
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1f1f27] bg-slate-50/75 dark:bg-[#17171e] text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Security Roles</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  {isManagerOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a22]">
                {filteredEmployees.map((emp) => {
                  const initials = (emp.full_name || emp.first_name || emp.email)
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const displayRoles = emp.roles.filter((r) => r !== "Desk User");

                  return (
                    <tr
                      key={emp.name}
                      className="hover:bg-slate-50/60 dark:hover:bg-[#16161d] transition-colors"
                    >
                      {/* Staff Member */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-[#1c1c26] border border-slate-200 dark:border-[#282835] flex items-center justify-center font-bold text-slate-700 dark:text-zinc-300 text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">
                              {emp.full_name || `${emp.first_name} ${emp.last_name || ""}`.trim() || emp.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-600 dark:text-zinc-300">
                        {emp.phone || emp.mobile_no ? (
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {emp.phone || emp.mobile_no}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Security Roles */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap max-w-md">
                          {displayRoles.length > 0 ? (
                            displayRoles.map((role) => {
                              const isCore = ["Administrator", "System Manager", "Admin", "Manager"].includes(role);
                              const isPipeline = ["Clearance Officer", "Saudi LMIS", "Saudi Taeshir", "Saudi Embassy", "Kuwait LMIS", "Kuwait Telesign", "Kuwait Embassy"].includes(role);
                              const isFinance = ["Finance Manager", "Complaint Manager", "Communication Manager", "Ticketer"].includes(role);

                              return (
                                <Badge
                                  key={role}
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0 font-medium",
                                    isCore && "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800",
                                    isPipeline && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                                    isFinance && "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                                    !isCore && !isPipeline && !isFinance && "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                  )}
                                >
                                  {role}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard Staff</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {emp.enabled === 1 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-slate-500 dark:text-zinc-400 text-[11px] font-mono">
                        {emp.creation ? emp.creation.split(" ")[0] : "—"}
                      </td>

                      {/* Actions */}
                      {isManagerOrAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditRoles(emp)}
                              className="h-7 px-2 text-[11px] text-slate-700 dark:text-zinc-300 hover:text-emerald-600"
                              title="Edit Security Roles"
                            >
                              <Shield className="h-3 w-3 mr-1 text-emerald-600" />
                              Roles
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenResetPassword(emp)}
                              className="h-7 px-2 text-[11px] text-slate-700 dark:text-zinc-300 hover:text-amber-600"
                              title="Reset Password"
                            >
                              <KeyRound className="h-3 w-3 mr-1 text-amber-600" />
                              Password
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  email: emp.email,
                                  enabled: emp.enabled !== 1,
                                })
                              }
                              disabled={toggleStatusMutation.isPending}
                              className={cn(
                                "h-7 px-2 text-[11px]",
                                emp.enabled === 1
                                  ? "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              )}
                              title={emp.enabled === 1 ? "Deactivate Account" : "Activate Account"}
                            >
                              {emp.enabled === 1 ? (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Enable
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Add New Employee                                     */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Add New Employee
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  Register an internal staff account, grant security roles, and define initial login credentials.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!addForm.email.trim() || !addForm.first_name.trim()) {
                toast.error("Please fill in full name and a valid email address.");
                return;
              }
              if (!addForm.password.trim()) {
                toast.error("Please provide an initial password.");
                return;
              }
              createMutation.mutate(addForm);
            }}
            className="space-y-4 py-3 text-xs"
          >
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add_first_name" className="text-xs font-semibold">
                  First Name *
                </Label>
                <Input
                  id="add_first_name"
                  required
                  placeholder="e.g. Sara"
                  value={addForm.first_name}
                  onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                  className="h-8.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add_last_name" className="text-xs font-semibold">
                  Last Name
                </Label>
                <Input
                  id="add_last_name"
                  placeholder="e.g. Mekonnen"
                  value={addForm.last_name}
                  onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add_email" className="text-xs font-semibold">
                  Staff Email Address (Login ID) *
                </Label>
                <Input
                  id="add_email"
                  type="email"
                  required
                  placeholder="staff@agency.et"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="h-8.5 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add_phone" className="text-xs font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="add_phone"
                  placeholder="+251 911 223 344"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="add_password" className="text-xs font-semibold">
                  Initial Password *
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateRandomPassword}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Strong Password
                </button>
              </div>
              <div className="relative">
                <Input
                  id="add_password"
                  type={showAddPassword ? "text" : "password"}
                  required
                  placeholder="Set account password"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="h-8.5 text-xs pr-8 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword(!showAddPassword)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Roles Picker */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Assign System Security Roles ({addForm.roles.length} selected) *
                </Label>
                <span className="text-[11px] text-slate-400">
                  Select all operational duties that apply
                </span>
              </div>

              <div className="max-h-52 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CANONICAL_V2_ROLES.map((role) => {
                  const isSelected = addForm.roles.includes(role.name);
                  return (
                    <label
                      key={role.name}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition border text-[11px]",
                        isSelected
                          ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                          : "bg-white dark:bg-[#1c1c24] border-slate-200 dark:border-[#282835] text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleAddRole(role.name)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-1.5">
                          {role.name}
                          <span className="text-[9px] font-normal text-slate-400">
                            ({role.category.split(" ")[0]})
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
                          {role.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notification Checkbox */}
            <label className="flex items-center gap-2 pt-1 text-slate-600 dark:text-zinc-400 cursor-pointer">
              <input
                type="checkbox"
                checked={addForm.send_welcome_email}
                onChange={(e) => setAddForm({ ...addForm, send_welcome_email: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-[11px]">
                Send account onboarding notification email with login credentials
              </span>
            </label>

            <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 shadow-xs"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Creating Employee...
                  </>
                ) : (
                  "Create Employee Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Edit Security Roles                                  */}
      {/* ------------------------------------------------------------- */}
      {selectedForRoles && (
        <Dialog open={Boolean(selectedForRoles)} onOpenChange={(open) => !open && setSelectedForRoles(null)}>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Synchronize Security Roles
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                    Modifying role grants for <strong>{selectedForRoles.full_name}</strong> ({selectedForRoles.email}).
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-slate-600 dark:text-zinc-300">
                Assigned roles dictate access surfaces, clearance step authorizations, and pipeline approval limits:
              </p>

              <div className="max-h-60 overflow-y-auto p-2.5 rounded-xl border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CANONICAL_V2_ROLES.map((role) => {
                  const isSelected = editingRoles.includes(role.name);
                  return (
                    <label
                      key={role.name}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition border text-[11px]",
                        isSelected
                          ? "bg-purple-50/90 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-950 dark:text-purple-200 font-semibold"
                          : "bg-white dark:bg-[#1c1c24] border-slate-200 dark:border-[#282835] text-slate-700 dark:text-zinc-300 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleEditRole(role.name)}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-1">
                          {role.name}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight font-normal">
                          {role.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedForRoles(null)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={updateRolesMutation.isPending}
                onClick={() =>
                  updateRolesMutation.mutate({
                    email: selectedForRoles.email,
                    roles: editingRoles,
                  })
                }
                className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold h-9 shadow-xs"
              >
                {updateRolesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Saving Roles...
                  </>
                ) : (
                  "Save Security Roles"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 3: Reset Password                                       */}
      {/* ------------------------------------------------------------- */}
      {selectedForPassword && (
        <Dialog open={Boolean(selectedForPassword)} onOpenChange={(open) => !open && setSelectedForPassword(null)}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
            <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Reset Staff Password
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                    Set a new secure password for <strong>{selectedForPassword.email}</strong>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="reset_new_pwd" className="text-xs font-semibold">
                  New Secure Password
                </Label>
                <div className="relative">
                  <Input
                    id="reset_new_pwd"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-8.5 text-xs pr-8 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Password must be at least 8 characters. The employee can immediately authenticate with these new credentials.
                </p>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedForPassword(null)}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!newPassword.trim() || resetPasswordMutation.isPending}
                onClick={() =>
                  resetPasswordMutation.mutate({
                    email: selectedForPassword.email,
                    newPassword,
                  })
                }
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold h-9 shadow-xs"
              >
                {resetPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Role Architecture Reference Guide                             */}
      {/* ------------------------------------------------------------- */}
      {showRoleDocs && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#22222b]">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Role Permissions & Responsibilities Guide
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Role permissions strictly enforced in the backend state machine and API routers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {CANONICAL_V2_ROLES.map((role) => (
              <div
                key={role.name}
                className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] p-4 flex flex-col justify-between space-y-3 shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {role.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 font-medium",
                        role.category === "Core & Admin" &&
                          "border-purple-300 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20",
                        role.category === "Intake & Registry" &&
                          "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
                        role.category === "Clearance Pipeline" &&
                          "border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
                        role.category === "Operations & Finance" &&
                          "border-amber-300 text-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      {role.category}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                    {role.description}
                  </p>

                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#181820] text-[11px] text-slate-700 dark:text-zinc-300">
                    <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                      Authority:
                    </span>
                    {role.permissionsSummary}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#1e1e24]">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                    Access Surface:
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {role.accessSurface.map((surface) => (
                      <span
                        key={surface}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#1a1a22] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#272732]"
                      >
                        {surface}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
