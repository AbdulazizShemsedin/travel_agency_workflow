"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  UserPlus,
  X,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  KeyRound,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  UserCog,
  Building2,
  Globe2,
  Plane,
  FileCheck2,
  Layers,
  ChevronRight,
  Sparkles,
  Users,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSystemUsersApi,
  getAvailableRolesApi,
  createSystemUserApi,
  updateSystemUserApi,
  setUserPasswordApi,
  assignUserRolesApi,
  getDefaultRoleOfficersApi,
  updateDefaultRoleOfficersApi,
  SystemUserRecord,
  SystemRoleItem,
} from "@/lib/api/applicantApi";
import { listApplicantsV2, listMyClearanceStepsV2 } from "@/lib/api/v2";
import { useAuth } from "@/components/providers/AuthProvider";
import { AssignEmployeeModal } from "@/components/applicant/AssignEmployeeModal";
import { toast } from "sonner";

// Canonical Operational Roles Configuration
interface RoleDef {
  key: string;
  name: string;
  category: "saudi" | "kuwait" | "general";
  corridor: string;
  description: string;
  icon: any;
  color: string;
}

const OPERATIONAL_ROLES: RoleDef[] = [
  {
    key: "saudi_lmis",
    name: "Saudi LMIS Clearance Officer",
    category: "saudi",
    corridor: "Saudi Arabia",
    description: "Handles Ministry of Labor & Social Development approvals for KSA",
    icon: Building2,
    color: "emerald",
  },
  {
    key: "saudi_taeshir",
    name: "Saudi Taeshir & Injaz Officer",
    category: "saudi",
    corridor: "Saudi Arabia",
    description: "Handles biometric appointments, MOFA Injaz fees & Taeshir visas",
    icon: FileCheck2,
    color: "teal",
  },
  {
    key: "saudi_embassy",
    name: "Saudi Embassy Clearance Officer",
    category: "saudi",
    corridor: "Saudi Arabia",
    description: "Handles Saudi Embassy visa passport submission and endorsement stamping",
    icon: ShieldCheck,
    color: "cyan",
  },
  {
    key: "kuwait_lmis",
    name: "Kuwait LMIS Clearance Officer",
    category: "kuwait",
    corridor: "Kuwait",
    description: "Handles Public Authority for Manpower (PAM) clearances for Kuwait",
    icon: Building2,
    color: "blue",
  },
  {
    key: "kuwait_telesign",
    name: "Kuwait Telesign / Wakala Officer",
    category: "kuwait",
    corridor: "Kuwait",
    description: "Handles Kuwait electronic contract attestation & Telesign verification",
    icon: Globe2,
    color: "indigo",
  },
  {
    key: "kuwait_embassy",
    name: "Kuwait Embassy Clearance Officer",
    category: "kuwait",
    corridor: "Kuwait",
    description: "Handles Kuwait Embassy visa endorsement and entry stamping",
    icon: ShieldCheck,
    color: "violet",
  },
  {
    key: "ticketer",
    name: "Ticketing & Departure Lead",
    category: "general",
    corridor: "Global Operations",
    description: "Issues airline tickets and conducts Bole Airport pre-departure clearance",
    icon: Plane,
    color: "amber",
  },
  {
    key: "registrar",
    name: "Candidate Intake & Registrar",
    category: "general",
    corridor: "Intake Operations",
    description: "Conducts biometric intake, initial screening, and candidate profile setup",
    icon: Users,
    color: "purple",
  },
];

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const isSystemManager = can("manageUsers");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isDefaultOfficersModalOpen, setIsDefaultOfficersModalOpen] = React.useState(false);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = React.useState(false);
  const [selectedRoleToEdit, setSelectedRoleToEdit] = React.useState<string | null>(null);

  // User Action Modals State
  const [selectedUserForPassword, setSelectedUserForPassword] = React.useState<SystemUserRecord | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [logoutSessions, setLogoutSessions] = React.useState(false);
  const [selectedUserForRoles, setSelectedUserForRoles] = React.useState<SystemUserRecord | null>(null);
  const [assignedRoles, setAssignedRoles] = React.useState<string[]>([]);

  // Default Officers Form State
  const [defaultOfficersDraft, setDefaultOfficersDraft] = React.useState<Record<string, string>>({});
  const [applyToActivePending, setApplyToActivePending] = React.useState(true);

  // Form State for Add User
  const [formData, setFormData] = React.useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    roles: ["LMS Employee"],
    send_welcome_email: false,
  });

  // Query Available Roles from Backend
  const { data: availableRoles = [], isLoading: isRolesLoading } = useQuery({
    queryKey: ["available_roles"],
    queryFn: getAvailableRolesApi,
  });

  // Query System Users from Backend
  const {
    data: systemUsers = [],
    isLoading: isUsersLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["system_users"],
    queryFn: () => getSystemUsersApi(),
  });

  // Query Default Role Officers Configuration
  const {
    data: defaultOfficers = {},
    refetch: refetchDefaultOfficers,
  } = useQuery({
    queryKey: ["default_role_officers"],
    queryFn: () => getDefaultRoleOfficersApi(),
  });

  // Query Active Clearance Steps to compute live workload metrics
  const { data: clearanceSteps = [] } = useQuery({
    queryKey: ["all_clearance_steps_workload"],
    queryFn: () => listMyClearanceStepsV2().catch(() => []),
  });

  // Query Processing Candidates for Reassignment
  const { data: processingApplicants = [] } = useQuery({
    queryKey: ["processing_applicants_for_assign"],
    queryFn: () => listApplicantsV2({ stage: "Processing" }).catch(() => []),
  });

  React.useEffect(() => {
    if (defaultOfficers) {
      setDefaultOfficersDraft({ ...defaultOfficers });
    }
  }, [defaultOfficers]);

  // 1. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: createSystemUserApi,
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ["system_users"] });
      setIsAddModalOpen(false);
      setFormData({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        password: "",
        roles: ["LMS Employee"],
        send_welcome_email: false,
      });
      toast.success(`User ${newUser.full_name || newUser.email} created successfully with roles!`);
    },
    onError: (err: any) => {
      toast.error("Failed to create user", {
        description: err.message || "Please verify the details and try again.",
      });
    },
  });

  // 2. Set Password Mutation
  const setPasswordMutation = useMutation({
    mutationFn: setUserPasswordApi,
    onSuccess: () => {
      setSelectedUserForPassword(null);
      setNewPassword("");
      toast.success("Password updated successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to reset password", {
        description: err.message || "Please try again.",
      });
    },
  });

  // 3. Assign Roles Mutation
  const assignRolesMutation = useMutation({
    mutationFn: assignUserRolesApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system_users"] });
      setSelectedUserForRoles(null);
      toast.success("User roles synchronized successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to update roles", {
        description: err.message || "Please try again.",
      });
    },
  });

  // 4. Update Default Role Officers Mutation
  const updateDefaultOfficersMutation = useMutation({
    mutationFn: (updates: Record<string, string>) =>
      updateDefaultRoleOfficersApi(updates, applyToActivePending),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default_role_officers"] });
      queryClient.invalidateQueries({ queryKey: ["system_users"] });
      queryClient.invalidateQueries({ queryKey: ["clearance_steps_v2"] });
      queryClient.invalidateQueries({ queryKey: ["my_clearance_steps_v2"] });
      setIsDefaultOfficersModalOpen(false);
      setSelectedRoleToEdit(null);
      toast.success("Default role officers updated successfully!", {
        description: applyToActivePending
          ? "Updated default assignments and reassigned all active pending candidate clearance steps."
          : "Updated default assignments for future candidate intake.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to update default officers", {
        description: err.message,
      });
    },
  });

  // 5. Toggle Enabled / Disabled Status Mutation
  const toggleUserStatusMutation = useMutation({
    mutationFn: (user: SystemUserRecord) =>
      updateSystemUserApi({
        user: user.email || user.name,
        enabled: user.enabled ? 0 : 1,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["system_users"] });
      toast.success(
        `User ${updated.full_name || updated.email} ${updated.enabled ? "activated" : "deactivated"} successfully.`
      );
    },
    onError: (err: any) => {
      toast.error("Failed to update user status", {
        description: err.message,
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.first_name.trim()) {
      toast.error("Email and First Name are required.");
      return;
    }
    if (formData.roles.length === 0) {
      toast.error("Please select at least one role.");
      return;
    }
    createUserMutation.mutate(formData);
  };

  const handleRoleToggle = (roleName: string) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(roleName);
      if (exists) {
        return { ...prev, roles: prev.roles.filter((r) => r !== roleName) };
      }
      return { ...prev, roles: [...prev.roles, roleName] };
    });
  };

  const handleEditRoleToggle = (roleName: string) => {
    setAssignedRoles((prev) => {
      const exists = prev.includes(roleName);
      if (exists) {
        return prev.filter((r) => r !== roleName);
      }
      return [...prev, roleName];
    });
  };

  // Helper to find officer user record by email
  const findUserByEmail = (email?: string): SystemUserRecord | undefined => {
    if (!email) return undefined;
    const lower = email.toLowerCase().trim();
    return systemUsers.find(
      (u) => (u.email || "").toLowerCase().trim() === lower || (u.name || "").toLowerCase().trim() === lower
    );
  };

  // Count active pending tasks for an officer
  const getOfficerTaskCount = (email?: string): number => {
    if (!email) return 0;
    const lower = email.toLowerCase().trim();
    return clearanceSteps.filter(
      (s: any) =>
        (s.assigned_officer || "").toLowerCase().trim() === lower &&
        (s.status === "Pending" || s.status === "In Progress" || s.status === "Action Required")
    ).length;
  };

  // Find all roles for which a user is designated default
  const getDefaultRolesForUser = (email?: string): RoleDef[] => {
    if (!email || !defaultOfficers) return [];
    const lower = email.toLowerCase().trim();
    return OPERATIONAL_ROLES.filter((r) => {
      const assigned = (defaultOfficers[r.key] || "").toLowerCase().trim();
      return assigned === lower;
    });
  };

  const filteredUsers = systemUsers.filter((u) => {
    if (roleFilter !== "all") {
      const isDefault = getDefaultRolesForUser(u.email).some((r) => r.key === roleFilter);
      const hasRole = Array.isArray(u.roles) && u.roles.some((r) => r.toLowerCase().includes(roleFilter.toLowerCase()));
      if (!isDefault && !hasRole) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roles?.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>User & Employee Management</span>
            <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              Admin Control Center
            </Badge>
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Configure default operational handlers for corridor streams, reassign candidate workloads, and manage user accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchDefaultOfficers();
            }}
            disabled={isRefetching}
            className="text-xs border-slate-200 dark:border-[#26262d]"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </Button>

          {/* 1. Configure Default Role Officers */}
          <Button
            size="sm"
            onClick={() => {
              setSelectedRoleToEdit(null);
              setIsDefaultOfficersModalOpen(true);
            }}
            className="bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
          >
            <UserCog className="mr-1.5 h-3.5 w-3.5" />
            Default Role Officers
          </Button>

          {/* 2. Change Assigned Employee / Reassign Staff */}
          <Button
            size="sm"
            onClick={() => setIsAssignEmployeeModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs shadow-xs"
          >
            <UserCheck className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
            Change Assigned Staff
          </Button>

          {/* 3. Add System User */}
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            variant="outline"
            className="border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-medium text-xs shadow-xs"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add User
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OPERATIONAL ROLE ASSIGNMENTS & DEFAULT HANDLERS DASHBOARD GRID */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-[#26262f] bg-white dark:bg-[#121216] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-[#222227] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Operational Clearance Roles & Default Assignees
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                When applicants enter clearance or are selected, these default employees are automatically assigned to their respective corridor steps.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedRoleToEdit(null);
              setIsDefaultOfficersModalOpen(true);
            }}
            className="text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-semibold"
          >
            Configure All Roles <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {OPERATIONAL_ROLES.map((role) => {
            const assignedEmail = defaultOfficers[role.key];
            const officerUser = findUserByEmail(assignedEmail);
            const activeCount = getOfficerTaskCount(assignedEmail);
            const Icon = role.icon;

            return (
              <div
                key={role.key}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-[#222227] bg-slate-50/50 dark:bg-[#16161c]/60 p-3.5 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-2xs"
              >
                <div>
                  {/* Top: Role Badge & Corridor */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      {role.corridor}
                    </span>
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold bg-slate-200/70 dark:bg-[#252530] text-slate-700 dark:text-zinc-300">
                      {activeCount} active task{activeCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Role Title */}
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-2.5">
                    {role.name}
                  </h4>

                  {/* Assigned Officer Profile Info */}
                  <div className="flex items-center gap-2.5 rounded-lg bg-white dark:bg-[#1e1e24] p-2 border border-slate-100 dark:border-[#2a2a35]">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-[11px] font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {officerUser?.full_name?.[0] || assignedEmail?.[0] || "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        {officerUser?.full_name || assignedEmail?.split("@")[0] || "Unassigned"}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                        {assignedEmail || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Button */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-[#222227] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Default Assignee</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoleToEdit(role.key);
                      setIsDefaultOfficersModalOpen(true);
                    }}
                    className="inline-flex items-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FILTER & SEARCH BAR */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search employees by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white dark:bg-[#121215] border-slate-200 dark:border-[#26262d]"
          />
        </div>

        {/* Role Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "all"
                ? "bg-emerald-900 dark:bg-emerald-700 text-white"
                : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
            }`}
          >
            All Employees ({systemUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("lmis")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "lmis"
                ? "bg-emerald-900 dark:bg-emerald-700 text-white"
                : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
            }`}
          >
            LMIS Clearance
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("taeshir")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "taeshir"
                ? "bg-emerald-900 dark:bg-emerald-700 text-white"
                : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
            }`}
          >
            Taeshir / Injaz
          </button>
          <button
            type="button"
            onClick={() => setRoleFilter("embassy")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              roleFilter === "embassy"
                ? "bg-emerald-900 dark:bg-emerald-700 text-white"
                : "bg-slate-100 dark:bg-[#18181f] text-slate-600 dark:text-zinc-400 hover:bg-slate-200"
            }`}
          >
            Embassy
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SYSTEM USERS & EMPLOYEES DIRECTORY TABLE */}
      {/* ========================================================================= */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        {isUsersLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="ml-2 text-xs text-slate-500">Loading system accounts from Frappe...</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">User Profile</th>
                <th className="px-4 py-3.5">Email / Identifier</th>
                <th className="px-4 py-3.5">Default Role Designation</th>
                <th className="px-4 py-3.5">Assigned Roles</th>
                <th className="px-4 py-3.5">Active Workload</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227] text-slate-700 dark:text-zinc-300">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isEnabled = Boolean(u.enabled);
                  const designatedDefaultRoles = getDefaultRolesForUser(u.email);
                  const activeTasks = getOfficerTaskCount(u.email);

                  return (
                    <tr key={u.email || u.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {(u.full_name || u.first_name || u.email)
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                              {u.user_type || "System User"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">
                        {u.email}
                      </td>

                      {/* Default Role Designation Badges */}
                      <td className="px-4 py-3">
                        {designatedDefaultRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {designatedDefaultRoles.map((r) => (
                              <span
                                key={r.key}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                              >
                                <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                {r.name.replace(" Officer", "")}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* Frappe Assigned Roles */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(u.roles) && u.roles.length > 0 ? (
                            u.roles.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              >
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No roles</span>
                          )}
                        </div>
                      </td>

                      {/* Active Workload Counter */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          activeTasks > 0
                            ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                            : "bg-slate-100 dark:bg-[#1e1e24] text-slate-500"
                        }`}>
                          {activeTasks} candidate step{activeTasks === 1 ? "" : "s"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {isEnabled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserForRoles(u);
                              setAssignedRoles(u.roles || []);
                            }}
                            className="h-7 px-2 text-[11px] text-slate-600 hover:text-emerald-800 dark:text-zinc-300"
                            title="Edit Roles"
                          >
                            <Shield className="h-3 w-3 mr-1" /> Roles
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setNewPassword("");
                            }}
                            className="h-7 px-2 text-[11px] text-slate-600 hover:text-amber-800 dark:text-zinc-300"
                            title="Reset Password"
                          >
                            <KeyRound className="h-3 w-3 mr-1" /> Password
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatusMutation.mutate(u)}
                            className={`h-7 px-2 text-[11px] ${
                              isEnabled ? "text-rose-600 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={isEnabled ? "Deactivate User" : "Activate User"}
                          >
                            {isEnabled ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CONFIGURE DEFAULT ROLE OFFICERS MODAL */}
      {/* ========================================================================= */}
      {isDefaultOfficersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <UserCog className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Configure Default Role Officers
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Designate which operational staff member handles each corridor clearance step by default.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDefaultOfficersModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Role Assignment Selectors */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Corridor Sections */}
              {(["saudi", "kuwait", "general"] as const).map((category) => {
                const rolesInCategory = OPERATIONAL_ROLES.filter((r) => r.category === category);
                const categoryTitle =
                  category === "saudi"
                    ? "🇸🇦 Saudi Arabia Corridor Roles"
                    : category === "kuwait"
                    ? "🇰🇼 Kuwait Corridor Roles"
                    : "✈️ General Operations & Logistics";

                return (
                  <div key={category} className="space-y-3 rounded-xl border border-slate-100 dark:border-[#202028] bg-slate-50/50 dark:bg-[#16161c]/50 p-3.5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      {categoryTitle}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rolesInCategory.map((role) => {
                        const currentVal = defaultOfficersDraft[role.key] || defaultOfficers[role.key] || "";
                        const Icon = role.icon;

                        return (
                          <div key={role.key} className="space-y-1.5 bg-white dark:bg-[#121215] p-2.5 rounded-lg border border-slate-200/80 dark:border-[#26262d]">
                            <Label className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Icon className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              {role.name}
                            </Label>
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 line-clamp-1 mb-1">
                              {role.description}
                            </p>

                            <select
                              value={currentVal}
                              onChange={(e) =>
                                setDefaultOfficersDraft((prev) => ({
                                  ...prev,
                                  [role.key]: e.target.value,
                                }))
                              }
                              className="w-full h-8.5 rounded-lg border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] px-2.5 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-700 outline-none"
                            >
                              <option value="">Select Designated Officer...</option>
                              {systemUsers
                                .filter((u) => u.enabled)
                                .map((u) => (
                                  <option key={u.email || u.name} value={u.email || u.name}>
                                    {u.full_name || u.first_name} ({u.email})
                                  </option>
                                ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reassignment Scope Checkbox */}
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <input
                type="checkbox"
                id="apply_active"
                checked={applyToActivePending}
                onChange={(e) => setApplyToActivePending(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
              />
              <label htmlFor="apply_active" className="text-xs text-emerald-950 dark:text-emerald-200 cursor-pointer">
                <span className="font-bold">Apply immediately to all active pending candidates</span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                  If enabled, all candidates currently in clearance steps for these roles will be instantly reassigned to the new default staff member.
                </p>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#222227] pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDefaultOfficersModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => updateDefaultOfficersMutation.mutate(defaultOfficersDraft)}
                disabled={updateDefaultOfficersMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-xs"
              >
                {updateDefaultOfficersMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving Defaults...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Save Default Officers
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DIRECT CANDIDATE WORKLOAD REASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {isAssignEmployeeModalOpen && (
        <AssignEmployeeModal
          isOpen={isAssignEmployeeModalOpen}
          onClose={() => setIsAssignEmployeeModalOpen(false)}
          applicantIds={processingApplicants.map((a) => a.name)}
          applicantNames={processingApplicants.map((a) => a.full_name || a.name)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["clearance_steps_v2"] });
            queryClient.invalidateQueries({ queryKey: ["my_clearance_steps_v2"] });
            queryClient.invalidateQueries({ queryKey: ["all_clearance_steps_workload"] });
            refetch();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE USER MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Create System User
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Creates an authentic profile in Frappe with password and multiple roles.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    required
                    placeholder="e.g. Salim"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-[#16161b]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    placeholder="e.g. Kassim"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-[#16161b]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. salim@agency.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8.5 text-xs bg-slate-50 dark:bg-[#16161b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+251 91 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-[#16161b]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Initial Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-[#16161b]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Assign Roles *</Label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 border border-slate-200 dark:border-[#222227] rounded-lg bg-slate-50/50 dark:bg-[#16161b]/50">
                  {availableRoles.map((role: SystemRoleItem) => {
                    const isSelected = formData.roles.includes(role.role_name);
                    return (
                      <button
                        key={role.role_name}
                        type="button"
                        onClick={() => handleRoleToggle(role.role_name)}
                        className={`flex items-center gap-2 p-1.5 rounded-md text-left text-xs transition ${
                          isSelected
                            ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-semibold"
                            : "hover:bg-slate-100 dark:hover:bg-[#202026] text-slate-700 dark:text-zinc-300"
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-slate-300 dark:border-zinc-600"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <span className="truncate">{role.role_name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#222227] pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createUserMutation.isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create User"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT USER ROLES MODAL */}
      {/* ========================================================================= */}
      {selectedUserForRoles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Manage Roles: {selectedUserForRoles.full_name || selectedUserForRoles.email}
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForRoles(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Select which operational roles this user possesses in the system:
              </p>
              <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto p-1 border border-slate-200 dark:border-[#222227] rounded-lg">
                {availableRoles.map((role: SystemRoleItem) => {
                  const isSelected = assignedRoles.includes(role.role_name);
                  return (
                    <button
                      key={role.role_name}
                      type="button"
                      onClick={() => handleEditRoleToggle(role.role_name)}
                      className={`flex items-center justify-between p-2 rounded-md text-xs transition ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 font-semibold"
                          : "hover:bg-slate-50 dark:hover:bg-[#18181f] text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      <span>{role.role_name}</span>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 dark:border-zinc-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#222227] pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForRoles(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={assignRolesMutation.isPending}
                onClick={() =>
                  assignRolesMutation.mutate({
                    user: selectedUserForRoles.email || selectedUserForRoles.name,
                    roles: assignedRoles,
                  })
                }
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white"
              >
                {assignRolesMutation.isPending ? "Saving..." : "Save Roles"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Password: {selectedUserForPassword.full_name || selectedUserForPassword.email}
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-8.5 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#222227] pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForPassword(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!newPassword || setPasswordMutation.isPending}
                onClick={() =>
                  setPasswordMutation.mutate({
                    user: selectedUserForPassword.email || selectedUserForPassword.name,
                    new_password: newPassword,
                    logout_all_sessions: logoutSessions,
                  })
                }
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {setPasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
