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
  Key,
  Layers,
  Calendar,
  MoreVertical,
  X,
  UserCheck,
  UserX,
  Trash2,
  SlidersHorizontal,
  Save,
  AlertCircle,
  Check,
  Undo2,
  Copy,
  Pencil,
  ChevronLeft,
  ChevronRight,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  listEmployeesV2,
  createEmployeeV2,
  updateEmployeeRolesV2,
  updateEmployeeInfoV2,
  resetEmployeePasswordV2,
  toggleEmployeeStatusV2,
  deleteEmployeeV2,
  getUserPasswordV2,
  V2EmployeeRecord,
  CORRIDOR_ROLE_DEFINITIONS,
  RoleAssignmentConfig,
  getSavedDefaultRoleAssignments,
  saveDefaultRoleAssignments,
  resolveDefaultEmployeeForRole,
} from "@/lib/api/v2";
import { cn } from "@/lib/utils";
import { formatCleanErrorMessage } from "@/lib/utils/error-formatter";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";

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
    name: "Admin",
    category: "Core & Admin",
    description: "Executive agency administrator overseeing candidate pipelines, staff accounts, financial health, and cross-corridor status.",
    permissionsSummary: "Full read/write on Applicants, Placements, Clearance Steps, Reports, Staff Accounts, Approvals, and Finance.",
    accessSurface: ["Applicants", "Placements", "Reports", "Approvals", "Finance", "Staff Management"],
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
  {
    name: "CV",
    category: "Intake & Registry",
    description: "Specialist who prepares candidate CVs, updating key bio fields and generating printable CV records.",
    permissionsSummary: "Update applicant bio fields for CV preparation and generate candidate CV documents.",
    accessSurface: ["CV Preparation Workspace", "Applicant Records (CV Fields)"],
  },
  {
    name: "Medical Officer",
    category: "Clearance Pipeline",
    description: "Dedicated medical officer conducting medical evaluations and recording FIT/UNFIT determinations.",
    permissionsSummary: "Record selected and pre-departure medical examination results (FIT / UNFIT).",
    accessSurface: ["Medical Clearance Workspace", "Medical Results Recording"],
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

  // Tab navigation state: directory | defaults | guide
  const [activeTab, setActiveTab] = React.useState<"directory" | "defaults" | "guide">("directory");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [roleFilter, setRoleFilter] = React.useState<string>("All");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");
  const [showRoleDocs, setShowRoleDocs] = React.useState<boolean>(false);
  const [showAllSessionRoles, setShowAllSessionRoles] = React.useState<boolean>(false);
  const [expandedRoleEmpIds, setExpandedRoleEmpIds] = React.useState<Record<string, boolean>>({});

  // Default Role Assignments State
  const [defaultAssignments, setDefaultAssignments] = React.useState<Record<string, string>>({});
  const [hasDefaultRoleChanges, setHasDefaultRoleChanges] = React.useState<boolean>(false);
  const [defaultAssignmentGroup, setDefaultAssignmentGroup] = React.useState<string>("All");

  // Roles & Permissions Explorer state (Tab 3)
  const [selectedRoleCategory, setSelectedRoleCategory] = React.useState<string>("All");
  const [selectedRoleName, setSelectedRoleName] = React.useState<string>("Admin");
  const [roleListPage, setRoleListPage] = React.useState<number>(1);
  const [isSavingDefaults, setIsSavingDefaults] = React.useState<boolean>(false);

  React.useEffect(() => {
    setDefaultAssignments(getSavedDefaultRoleAssignments());
  }, []);

  const handleAssignmentChange = (roleName: string, employeeEmail: string) => {
    setDefaultAssignments((prev) => ({
      ...prev,
      [roleName]: employeeEmail,
    }));
    setHasDefaultRoleChanges(true);
  };

  const handleSaveDefaultAssignments = () => {
    setIsSavingDefaults(true);
    try {
      saveDefaultRoleAssignments(defaultAssignments);
      setHasDefaultRoleChanges(false);
      toast.success("Default role assignments saved successfully!", {
        description: "Selected staff members will now be assigned automatically when applicants reach these stages.",
      });
    } catch (err: any) {
      toast.error("Failed to save default role assignments", {
        description: err.message || "Please try again.",
      });
    } finally {
      setIsSavingDefaults(false);
    }
  };

  const handleResetDefaultAssignments = () => {
    setDefaultAssignments(getSavedDefaultRoleAssignments());
    setHasDefaultRoleChanges(false);
    toast.info("Reset changes to saved settings.");
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false);
  const [employeeToEdit, setEmployeeToEdit] = React.useState<V2EmployeeRecord | null>(null);
  const [editInfoForm, setEditInfoForm] = React.useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [selectedForRoles, setSelectedForRoles] = React.useState<V2EmployeeRecord | null>(null);
  const [editingRoles, setEditingRoles] = React.useState<string[]>([]);
  const [selectedForPassword, setSelectedForPassword] = React.useState<V2EmployeeRecord | null>(null);
  const [employeeToDeactivate, setEmployeeToDeactivate] = React.useState<V2EmployeeRecord | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<V2EmployeeRecord | null>(null);
  const [newPassword, setNewPassword] = React.useState<string>("");
  const [confirmNewPassword, setConfirmNewPassword] = React.useState<string>("");
  const [showNewPassword, setShowNewPassword] = React.useState<boolean>(true);
  const [currentStaffPassword, setCurrentStaffPassword] = React.useState<string | null>(null);
  const [isLoadingStaffPassword, setIsLoadingStaffPassword] = React.useState<boolean>(false);

  // Add Employee Form State
  const [addForm, setAddForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    roles: [] as string[],
    send_welcome_email: false,
  });
  const [showAddPassword, setShowAddPassword] = React.useState<boolean>(true);

  // Check admin privileges
  const isManagerOrAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator") return true;
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

  const isActualAdmin = React.useMemo<boolean>(() => {
    const emailOrName = (authUser?.email || authUser?.full_name || "").toLowerCase().trim();
    if (emailOrName === "administrator") return true;
    if (!Array.isArray(roles)) return false;
    return roles.some((r) => {
      const norm = String(r).trim().toLowerCase();
      return (
        norm === "system manager" ||
        norm === "administrator" ||
        norm === "admin" ||
        norm === "agency admin"
      );
    });
  }, [authUser, roles]);

  const isFirstAdminAccount = React.useCallback((emp: { email?: string; name?: string }) => {
    const email = (emp.email || "").toLowerCase().trim();
    const name = (emp.name || "").toLowerCase().trim();
    return email === "administrator" || name === "administrator";
  }, []);

  const assignableRoles = React.useMemo(() => {
    return isActualAdmin ? CANONICAL_V2_ROLES : CANONICAL_V2_ROLES.filter((r) => r.name !== "Admin");
  }, [isActualAdmin]);

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

  // Check if the email being entered in Add Employee already exists in the loaded directory
  const isDuplicateAddEmail = React.useMemo(() => {
    const trimmed = addForm.email.trim().toLowerCase();
    if (!trimmed) return false;
    return employees.some(
      (emp) => emp.email.toLowerCase() === trimmed || emp.name.toLowerCase() === trimmed
    );
  }, [addForm.email, employees]);

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

  // Desktop viewport-fitting pagination state for Staff Directory
  const [staffPage, setStaffPage] = React.useState<number>(1);
  const staffPageSize = 8;
  const totalStaffPages = Math.ceil(filteredEmployees.length / staffPageSize) || 1;

  React.useEffect(() => {
    setStaffPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const paginatedEmployees = React.useMemo(() => {
    const start = (staffPage - 1) * staffPageSize;
    return filteredEmployees.slice(start, start + staffPageSize);
  }, [filteredEmployees, staffPage, staffPageSize]);

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
        confirmPassword: "",
        roles: [],
        send_welcome_email: false,
      });
      toast.success("Employee account created successfully!", {
        description: `${newEmp.full_name} (${newEmp.email}) is now registered.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to create employee", {
        description: formatCleanErrorMessage(err) || err.message || "Please verify the information and try again.",
      });
    },
  });

  // Mutation 1.5: Update Employee Profile Info
  const updateInfoMutation = useMutation({
    mutationFn: (payload: { email: string; first_name: string; last_name?: string; phone?: string }) =>
      updateEmployeeInfoV2(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["v2_employees_directory"] });
      setEmployeeToEdit(null);
      toast.success("Employee profile updated successfully!", {
        description: `Updated profile details for ${variables.email}.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to update employee profile", {
        description: formatCleanErrorMessage(err) || err.message || "Please verify the information and try again.",
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
        description: formatCleanErrorMessage(err) || err.message || "Please try again.",
      });
    },
  });

  // Mutation 3: Reset Password
  const resetPasswordMutation = useMutation({
    mutationFn: (payload: { email: string; newPassword: string }) =>
      resetEmployeePasswordV2(payload.email, payload.newPassword),
    onSuccess: (_, variables) => {
      setCurrentStaffPassword(variables.newPassword);
      setSelectedForPassword(null);
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password reset successfully!", {
        description: `New credentials active for ${variables.email}.`,
      });
    },
    onError: (err: any) => {
      toast.error("Failed to reset password", {
        description: formatCleanErrorMessage(err) || err.message || "Please try again.",
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
        description: formatCleanErrorMessage(err) || err.message || "Please try again.",
      });
    },
  });

  // Mutation 5: Delete Employee (erases if no history, otherwise deactivates)
  const deleteMutation = useMutation({
    mutationFn: (email: string) => deleteEmployeeV2(email),
    onSuccess: (res: any, email) => {
      queryClient.invalidateQueries({ queryKey: ["v2_employees_directory"] });
      setEmployeeToDelete(null);
      if (res?.erased === 1) {
        toast.success("Employee account erased permanently", {
          description: `Account ${email} had no recorded workflow history and has been permanently removed.`,
        });
      } else {
        toast.info(res?.message || "Account disabled (has history)", {
          description: `Account ${email} has recorded workflow activity and cannot be erased. It has been deactivated instead.`,
        });
      }
    },
    onError: (err: any) => {
      toast.error("Failed to delete employee account", {
        description: formatCleanErrorMessage(err) || err.message || "Please try again.",
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

  const handleOpenEditEmployee = (emp: V2EmployeeRecord) => {
    setEmployeeToEdit(emp);
    setEditInfoForm({
      first_name: emp.first_name || "",
      last_name: emp.last_name || "",
      phone: emp.phone || emp.mobile_no || "",
    });
  };

  const handleOpenEditRoles = (emp: V2EmployeeRecord) => {
    setSelectedForRoles(emp);
    const normalized = emp.roles
      .map((r) => {
        const lower = r.trim().toLowerCase();
        if (lower === "administrator" || lower === "system manager" || lower === "manager") {
          return "Admin";
        }
        return r;
      })
      .filter((r) => r !== "Desk User");
    setEditingRoles(Array.from(new Set(normalized)));
  };

  const handleOpenResetPassword = async (emp: V2EmployeeRecord) => {
    setSelectedForPassword(emp);
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(true);
    setCurrentStaffPassword(null);

    if (emp.email) {
      setIsLoadingStaffPassword(true);
      try {
        const recorded = await getUserPasswordV2(emp.email);
        if (recorded) {
          setCurrentStaffPassword(recorded);
          setNewPassword(recorded);
          setConfirmNewPassword(recorded);
        }
      } catch (err) {
        console.warn("[handleOpenResetPassword] Could not fetch recorded password:", err);
      } finally {
        setIsLoadingStaffPassword(false);
      }
    }
  };

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAddForm((prev) => ({ ...prev, password: pwd, confirmPassword: pwd }));
    setShowAddPassword(true);
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col justify-start gap-2">
      {/* ------------------------------------------------------------- */}
      {/* Page Header                                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="shrink-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Employee & Staff Management
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            >
              STAFF DIRECTORY
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manage staff accounts and permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="text-xs h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefetching && "animate-spin text-emerald-600")} />
            Refresh
          </Button>

          {isManagerOrAdmin && (
            <Button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8 shadow-xs"
            >
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Current Active Session & Security Notice                      */}
      {/* ------------------------------------------------------------- */}
      <div className="shrink-0 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#121216] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-400 font-bold text-[10px] shrink-0">
              {(authUser?.full_name || "Staff")
                .split(/\s+/)
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                {authUser?.full_name || "Agency Staff"}
              </span>
              <Badge
                variant="outline"
                className="text-[9px] font-mono px-1.5 py-0 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
              >
                Active Session
              </Badge>
              <span className="text-[10.5px] font-mono text-slate-500 dark:text-zinc-400">
                ({authUser?.email || "Unknown"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:justify-end">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 mr-0.5">
              Roles:
            </span>
            {Array.isArray(roles) && roles.length > 0 ? (
              (showAllSessionRoles ? roles : roles.slice(0, 4)).map((role: string) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 font-medium bg-slate-100 dark:bg-[#181822] text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-[#282835]"
                >
                  <ShieldCheck className="h-2.5 w-2.5 mr-1 text-emerald-600" />
                  {role}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400">Standard Access</span>
            )}
            {Array.isArray(roles) && roles.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllSessionRoles((prev) => !prev)}
                className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 hover:underline cursor-pointer ml-1"
              >
                {showAllSessionRoles ? "Show less" : `+${roles.length - 4} more`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Top Navigation Tabs: Staff List, Default Assignments, Role Guide */}
      {/* ------------------------------------------------------------- */}
      <div className="shrink-0 flex items-center gap-1.5 border-b border-slate-200 dark:border-[#24242e] pb-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("directory")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0",
            activeTab === "directory"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-[#181822]"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Staff List</span>
          <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 font-mono">
            {employees.length}
          </Badge>
        </button>

        <button
          type="button"
          data-tour="employees-default-roles-tab"
          onClick={() => setActiveTab("defaults")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0",
            activeTab === "defaults"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-[#181822]"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Default Assignments</span>
          <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 font-mono">
            Saudi & Kuwait
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guide")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0",
            activeTab === "guide"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-[#181822]"
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>Roles & Permissions</span>
          <Badge variant="outline" className="text-[10px] ml-1 px-1.5 py-0 font-mono">
            {CANONICAL_V2_ROLES.length} Roles
          </Badge>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Tab 1: Staff Directory View                                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "directory" && (
        <div className="space-y-2">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              id="staff_search_query_no_autofill"
              name="staff_search_query_no_autofill"
              type="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-form-type="other"
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

        <div className="flex items-center justify-between md:justify-end gap-2.5 text-xs text-slate-500 dark:text-zinc-400">
          <span>
            Showing <strong>{filteredEmployees.length}</strong> of {employees.length} employees
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("guide")}
            className="text-xs h-7.5 text-slate-600 dark:text-zinc-300 hover:text-slate-900"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Role Guide
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Employees Directory Table                                     */}
      {/* ------------------------------------------------------------- */}
      <div data-tour="employees-roster-table" className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] overflow-hidden shadow-xs">
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
          <div className="overflow-x-auto overflow-y-auto lg:overflow-hidden">
            <table className="w-full text-left border-collapse text-xs min-w-[760px] lg:min-w-0 lg:table-fixed">
              <thead className="sticky top-0 z-20">
                <tr className="border-b border-slate-200 dark:border-[#1f1f27] bg-slate-50/95 dark:bg-[#17171e]/95 backdrop-blur-xs text-[10.5px] xl:text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider leading-snug">
                  <th className="py-2 px-3 lg:w-[23%] whitespace-normal break-words">Staff Member</th>
                  <th className="py-2 px-3 lg:w-[18%] whitespace-normal break-words">Contact</th>
                  <th className="py-2 px-3 lg:w-[24%] whitespace-normal break-words">Security Roles</th>
                  <th className="py-2 px-3 lg:w-[10%] whitespace-normal break-words">Status</th>
                  <th className="py-2 px-3 lg:w-[10%] whitespace-normal break-words">Created Date</th>
                  {isManagerOrAdmin && <th className="py-2 px-3 lg:w-[110px] text-right whitespace-nowrap">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a22]">
                {paginatedEmployees.map((emp) => {
                  const initials = (emp.full_name || emp.first_name || emp.email)
                    .split(/\s+/)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const displayRoles = Array.from(
                    new Set(
                      emp.roles
                        .map((r) => {
                          const lower = r.trim().toLowerCase();
                          if (lower === "administrator" || lower === "system manager" || lower === "manager") {
                            return "Admin";
                          }
                          return r;
                        })
                        .filter((r) => r !== "Desk User")
                    )
                  );

                  return (
                    <tr
                      key={emp.name}
                      className="hover:bg-slate-50/60 dark:hover:bg-[#16161d] transition-colors"
                    >
                      {/* Staff Member */}
                      <td className="py-2 px-3">
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
                      <td className="py-2 px-3 text-slate-600 dark:text-zinc-300">
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
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 flex-wrap max-w-md">
                          {displayRoles.length > 0 ? (
                            <>
                              {(expandedRoleEmpIds[emp.name] ? displayRoles : displayRoles.slice(0, 3)).map((role) => {
                                const isCore = role === "Admin";
                                const isPipeline = ["Clearance Officer", "Saudi LMIS", "Saudi Taeshir", "Saudi Embassy", "Kuwait LMIS", "Kuwait Telesign", "Kuwait Embassy"].includes(role);
                                const isFinance = ["Finance Manager", "Complaint Manager", "Communication Manager", "Ticketer"].includes(role);

                                return (
                                  <Badge
                                    key={role}
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] px-1.5 py-0 font-medium",
                                      isCore && "bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-400 border-teal-200 dark:border-teal-800",
                                      isPipeline && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                                      isFinance && "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                                      !isCore && !isPipeline && !isFinance && "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                    )}
                                  >
                                    {role}
                                  </Badge>
                                );
                              })}
                              {displayRoles.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedRoleEmpIds((prev) => ({
                                      ...prev,
                                      [emp.name]: !prev[emp.name],
                                    }))
                                  }
                                  className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-400 hover:text-emerald-950 dark:hover:text-emerald-300 hover:underline px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 transition-colors cursor-pointer"
                                >
                                  {expandedRoleEmpIds[emp.name] ? "Show less" : `+${displayRoles.length - 3} more`}
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">Standard Staff</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3">
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
                      <td className="py-2 px-3 text-slate-500 dark:text-zinc-400 text-[11px] font-mono">
                        {emp.creation ? emp.creation.split(" ")[0] : "—"}
                      </td>

                      {/* Actions */}
                      {isManagerOrAdmin && (() => {
                        const empIsFirstAdmin = isFirstAdminAccount(emp);
                        const empIsAdmin = empIsFirstAdmin || (emp.roles || []).some((r) => {
                          const norm = r.toLowerCase().trim();
                          return norm === "admin" || norm === "system manager" || norm === "administrator" || norm === "agency admin";
                        });
                        const isSelf = Boolean(
                          authUser?.email &&
                          (emp.email.toLowerCase().trim() === authUser.email.toLowerCase().trim() ||
                           emp.name.toLowerCase().trim() === authUser.email.toLowerCase().trim())
                        );
                        const currentIsFirstAdmin = (authUser?.email || authUser?.full_name || "").toLowerCase().trim() === "administrator";

                        // Manager cannot manage Admin rows
                        if (!isActualAdmin && empIsAdmin) {
                          return (
                            <td className="py-2 px-3 text-right">
                              <span className="text-[10px] text-slate-400 font-mono italic">
                                Protected Admin
                              </span>
                            </td>
                          );
                        }

                        // First Administrator protections
                        const canChangeRoles = isActualAdmin && !empIsFirstAdmin;
                        const canResetPassword = isActualAdmin && (!empIsFirstAdmin || currentIsFirstAdmin);
                        const canToggleStatus = isActualAdmin && !empIsFirstAdmin && !isSelf;
                        const canDelete = isActualAdmin && !empIsFirstAdmin && !isSelf;

                        return (
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditEmployee(emp)}
                                className="h-7 px-2 text-[11px] text-slate-700 dark:text-zinc-300 hover:text-blue-600 shrink-0 font-medium"
                                title="Edit Employee Profile"
                              >
                                <Pencil className="h-3 w-3 mr-1 text-blue-600" />
                                Edit
                              </Button>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-label="Staff actions"
                                    className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1f1f27] text-slate-600 dark:text-zinc-300 shrink-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="end"
                                  className="w-48 p-1.5 shadow-xl border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#121216] rounded-xl z-50"
                                >
                                  <div className="flex flex-col gap-0.5 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditEmployee(emp)}
                                      className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c24] transition-colors cursor-pointer"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                      <span>Edit Profile</span>
                                    </button>

                                    {canChangeRoles && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditRoles(emp)}
                                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                                      >
                                        <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        <span>Security Roles</span>
                                      </button>
                                    )}

                                    {canResetPassword && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenResetPassword(emp)}
                                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-zinc-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer"
                                      >
                                        <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                        <span>Reset Password</span>
                                      </button>
                                    )}

                                    {canToggleStatus && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (emp.enabled === 1) {
                                            setEmployeeToDeactivate(emp);
                                          } else {
                                            toggleStatusMutation.mutate({
                                              email: emp.email,
                                              enabled: true,
                                            });
                                          }
                                        }}
                                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#1c1c24] transition-colors cursor-pointer"
                                      >
                                        {emp.enabled === 1 ? (
                                          <>
                                            <UserX className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            <span>Deactivate</span>
                                          </>
                                        ) : (
                                          <>
                                            <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                            <span>Activate</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => setEmployeeToDelete(emp)}
                                        className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                        <span>Delete Employee</span>
                                      </button>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {totalStaffPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2 border-t border-slate-200 dark:border-[#24242e] bg-slate-50/50 dark:bg-[#14141a]">
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Showing <strong className="text-slate-900 dark:text-white">{(staffPage - 1) * staffPageSize + 1}</strong> to{" "}
                  <strong className="text-slate-900 dark:text-white">{Math.min(staffPage * staffPageSize, filteredEmployees.length)}</strong> of{" "}
                  <strong className="text-slate-900 dark:text-white">{filteredEmployees.length}</strong> employees
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={staffPage <= 1}
                    onClick={() => setStaffPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 text-xs rounded-lg border-slate-200 dark:border-[#2a2a35]"
                  >
                    <ChevronLeft className="h-3 w-3 mr-1" />
                    Previous
                  </Button>
                  <span className="text-xs text-slate-600 dark:text-zinc-400 px-2 font-mono">
                    {staffPage} / {totalStaffPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={staffPage >= totalStaffPages}
                    onClick={() => setStaffPage((p) => Math.min(totalStaffPages, p + 1))}
                    className="h-7 px-2.5 text-xs rounded-lg border-slate-200 dark:border-[#2a2a35]"
                  >
                    Next
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )}

      {/* ------------------------------------------------------------- */}
      {/* Tab 2: Default Role Assignments (Saudi & Kuwait & Ops)        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "defaults" && (
        <div className="flex-1 min-h-0 flex flex-col justify-start space-y-2.5">
          {/* Header & Corridor Switcher */}
          <div className="shrink-0 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Default Stage & Corridor Assignments
                </h2>
                <Badge
                  variant="outline"
                  className="text-[9.5px] uppercase font-bold border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 px-1.5 py-0"
                >
                  Corridor Engine
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 max-w-2xl leading-tight">
                Choose which employee is automatically assigned to candidates when they reach each stage.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Corridor Group Filter */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1a1a22] p-0.5 rounded-lg">
                {[
                  { id: "All", label: "All (9)" },
                  { id: "Saudi Corridor", label: "Saudi 🇸🇦 (3)" },
                  { id: "Kuwait Corridor", label: "Kuwait 🇰🇼 (3)" },
                  { id: "Operations & Registry", label: "Ops 📋 (3)" },
                ].map((grp) => (
                  <button
                    key={grp.id}
                    type="button"
                    onClick={() => setDefaultAssignmentGroup(grp.id)}
                    className={cn(
                      "px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors",
                      defaultAssignmentGroup === grp.id
                        ? "bg-white dark:bg-[#252530] text-slate-900 dark:text-white shadow-xs font-bold"
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {grp.label}
                  </button>
                ))}
              </div>

              {isManagerOrAdmin && (
                <>
                  {hasDefaultRoleChanges && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResetDefaultAssignments}
                      className="text-xs h-7 px-2 text-slate-600 dark:text-zinc-300"
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Reset
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveDefaultAssignments}
                    disabled={isSavingDefaults}
                    className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-semibold h-7 px-2.5 shadow-xs"
                  >
                    {isSavingDefaults ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Corridor Cards Groups - Compact Bounded Layout without Scrollbar */}
          <div className="flex-1 min-h-0 flex flex-col justify-start space-y-2 pr-0.5">
            {/* Group 1: Saudi Corridor Roles */}
            {(defaultAssignmentGroup === "All" || defaultAssignmentGroup === "Saudi Corridor") && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🇸🇦</span>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                    Saudi Arabia Corridor Specialists
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
                  {CORRIDOR_ROLE_DEFINITIONS.filter((r) => r.category === "Saudi Corridor").map((roleConfig) => {
                    const configuredEmail = defaultAssignments[roleConfig.roleName] || "";
                    const resolved = resolveDefaultEmployeeForRole(roleConfig.roleName, employees, defaultAssignments);
                    return (
                      <div
                        key={roleConfig.roleName}
                        className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] p-2 sm:p-2.5 flex flex-col justify-between gap-1 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{roleConfig.label}</span>
                            <Badge variant="outline" className="text-[9.5px] font-mono border-emerald-300 text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 shrink-0 px-1 py-0">
                              {roleConfig.roleName}
                            </Badge>
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 line-clamp-1">{roleConfig.description}</p>
                        </div>
                        <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-[#1e1e24]">
                          <select
                            aria-label={`Select default employee for ${roleConfig.roleName}`}
                            value={configuredEmail}
                            disabled={!isManagerOrAdmin}
                            onChange={(e) => handleAssignmentChange(roleConfig.roleName, e.target.value)}
                            className="w-full h-7 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200"
                          >
                            <option value="">-- Automatic (First with role) --</option>
                            {employees.map((emp) => {
                              const hasRole = (emp.roles || []).some((r) => r.toLowerCase().trim() === roleConfig.roleName.toLowerCase().trim());
                              const name = emp.full_name || emp.name;
                              return (
                                <option key={emp.name} value={emp.name}>
                                  {hasRole ? `⭐ ${name} - Has Role` : `${name}`}
                                </option>
                              );
                            })}
                          </select>
                          <div className="text-[10px] leading-tight">
                            {resolved ? (
                              <span className="text-emerald-800 dark:text-emerald-400 font-medium truncate block">
                                Will assign: <strong>{resolved.full_name || resolved.name}</strong>
                              </span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400 block">No staff has this role</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 2: Kuwait Corridor Roles */}
            {(defaultAssignmentGroup === "All" || defaultAssignmentGroup === "Kuwait Corridor") && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🇰🇼</span>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                    Kuwait Corridor Specialists
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
                  {CORRIDOR_ROLE_DEFINITIONS.filter((r) => r.category === "Kuwait Corridor").map((roleConfig) => {
                    const configuredEmail = defaultAssignments[roleConfig.roleName] || "";
                    const resolved = resolveDefaultEmployeeForRole(roleConfig.roleName, employees, defaultAssignments);
                    return (
                      <div
                        key={roleConfig.roleName}
                        className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] p-2 sm:p-2.5 flex flex-col justify-between gap-1 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{roleConfig.label}</span>
                            <Badge variant="outline" className="text-[9.5px] font-mono border-blue-300 text-blue-700 dark:border-blue-800 dark:text-blue-400 shrink-0 px-1 py-0">
                              {roleConfig.roleName}
                            </Badge>
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 line-clamp-1">{roleConfig.description}</p>
                        </div>
                        <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-[#1e1e24]">
                          <select
                            aria-label={`Select default employee for ${roleConfig.roleName}`}
                            value={configuredEmail}
                            disabled={!isManagerOrAdmin}
                            onChange={(e) => handleAssignmentChange(roleConfig.roleName, e.target.value)}
                            className="w-full h-7 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200"
                          >
                            <option value="">-- Automatic (First with role) --</option>
                            {employees.map((emp) => {
                              const hasRole = (emp.roles || []).some((r) => r.toLowerCase().trim() === roleConfig.roleName.toLowerCase().trim());
                              const name = emp.full_name || emp.name;
                              return (
                                <option key={emp.name} value={emp.name}>
                                  {hasRole ? `⭐ ${name} - Has Role` : `${name}`}
                                </option>
                              );
                            })}
                          </select>
                          <div className="text-[10px] leading-tight">
                            {resolved ? (
                              <span className="text-blue-700 dark:text-blue-400 font-medium truncate block">
                                Will assign: <strong>{resolved.full_name || resolved.name}</strong>
                              </span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400 block">No staff has this role</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Group 3: Operations & Registry */}
            {(defaultAssignmentGroup === "All" || defaultAssignmentGroup === "Operations & Registry") && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📋</span>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                    Operations & Registry Staff
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-2.5">
                  {CORRIDOR_ROLE_DEFINITIONS.filter((r) => r.category === "Operations & Registry").map((roleConfig) => {
                    const configuredEmail = defaultAssignments[roleConfig.roleName] || "";
                    const resolved = resolveDefaultEmployeeForRole(roleConfig.roleName, employees, defaultAssignments);
                    return (
                      <div
                        key={roleConfig.roleName}
                        className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] p-2 sm:p-2.5 flex flex-col justify-between gap-1 shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{roleConfig.label}</span>
                            <Badge variant="outline" className="text-[9.5px] font-mono border-slate-300 text-slate-700 dark:border-zinc-700 dark:text-zinc-300 shrink-0 px-1 py-0">
                              {roleConfig.roleName}
                            </Badge>
                          </div>
                          <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 line-clamp-1">{roleConfig.description}</p>
                        </div>
                        <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-[#1e1e24]">
                          <select
                            aria-label={`Select default employee for ${roleConfig.roleName}`}
                            value={configuredEmail}
                            disabled={!isManagerOrAdmin}
                            onChange={(e) => handleAssignmentChange(roleConfig.roleName, e.target.value)}
                            className="w-full h-7 px-2 text-[11px] rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#15151c] text-slate-800 dark:text-zinc-200"
                          >
                            <option value="">-- Automatic (First with role) --</option>
                            {employees.map((emp) => {
                              const hasRole = (emp.roles || []).some((r) => r.toLowerCase().trim() === roleConfig.roleName.toLowerCase().trim());
                              const name = emp.full_name || emp.name;
                              return (
                                <option key={emp.name} value={emp.name}>
                                  {hasRole ? `⭐ ${name} - Has Role` : `${name}`}
                                </option>
                              );
                            })}
                          </select>
                          <div className="text-[10px] leading-tight">
                            {resolved ? (
                              <span className="text-emerald-800 dark:text-emerald-400 font-medium truncate block">
                                Will assign: <strong>{resolved.full_name || resolved.name}</strong>
                              </span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-400 block">No staff has this role</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  Create staff account and assign roles.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const normalizedEmail = addForm.email.trim().toLowerCase();
              if (!normalizedEmail || !addForm.first_name.trim()) {
                toast.error("Please fill in full name and a valid email address.");
                return;
              }
              if (isDuplicateAddEmail) {
                toast.error("Employee already exists", {
                  description: `An employee account with email '${normalizedEmail}' is already registered in the directory.`,
                });
                return;
              }
              if (!addForm.password.trim()) {
                toast.error("Please provide an initial password.");
                return;
              }
              if (addForm.password !== addForm.confirmPassword) {
                toast.error("Passwords do not match", {
                  description: "Initial password and confirm password must match.",
                });
                return;
              }
              const { confirmPassword: _, ...empPayload } = addForm;
              createMutation.mutate({
                ...empPayload,
                email: normalizedEmail,
              });
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
                  className={cn(
                    "h-8.5 text-xs font-mono",
                    isDuplicateAddEmail && "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                  )}
                />
                {isDuplicateAddEmail && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    An employee with this email is already registered in the directory.
                  </p>
                )}
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

            {/* Initial Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="add_password" className="text-xs font-semibold">
                  Initial Password *
                </Label>
                <button
                  type="button"
                  onClick={handleGenerateRandomPassword}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Key className="h-3 w-3" />
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
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Initial Password */}
            <div className="space-y-1.5">
              <Label htmlFor="add_confirm_password" className="text-xs font-semibold">
                Confirm Password *
              </Label>
              <div className="relative">
                <Input
                  id="add_confirm_password"
                  type={showAddPassword ? "text" : "password"}
                  required
                  placeholder="Re-enter password to confirm"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                  className={cn(
                    "h-8.5 text-xs pr-8 font-mono",
                    addForm.password && addForm.confirmPassword && addForm.password !== addForm.confirmPassword && "border-rose-500 focus-visible:ring-rose-500"
                  )}
                />
              </div>
              {addForm.password && addForm.confirmPassword && addForm.password !== addForm.confirmPassword && (
                <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Passwords do not match
                </p>
              )}
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
                {assignableRoles.map((role) => {
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
                disabled={
                  createMutation.isPending ||
                  isDuplicateAddEmail ||
                  !addForm.password.trim() ||
                  !addForm.confirmPassword.trim() ||
                  addForm.password !== addForm.confirmPassword
                }
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
      {/* Modal 1.5: Edit Employee Profile                              */}
      {/* ------------------------------------------------------------- */}
      {employeeToEdit && (
        <Dialog open={Boolean(employeeToEdit)} onOpenChange={(open) => !open && setEmployeeToEdit(null)}>
          <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
            <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                    Edit Employee Profile
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                    Updating account details for <strong>{employeeToEdit.email}</strong>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editInfoForm.first_name.trim()) {
                  toast.error("First name is required");
                  return;
                }
                updateInfoMutation.mutate({
                  email: employeeToEdit.email,
                  first_name: editInfoForm.first_name,
                  last_name: editInfoForm.last_name,
                  phone: editInfoForm.phone,
                });
              }}
              className="space-y-4 py-3"
            >
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Email Address (System Identifier)
                </Label>
                <Input
                  type="email"
                  value={employeeToEdit.email}
                  disabled
                  className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-not-allowed text-xs h-9 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    First Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={editInfoForm.first_name}
                    onChange={(e) => setEditInfoForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    className="text-xs h-9"
                    placeholder="e.g. John"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Last Name
                  </Label>
                  <Input
                    type="text"
                    value={editInfoForm.last_name}
                    onChange={(e) => setEditInfoForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    className="text-xs h-9"
                    placeholder="e.g. Doe"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Phone Number / Mobile
                </Label>
                <Input
                  type="text"
                  value={editInfoForm.phone}
                  onChange={(e) => setEditInfoForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="text-xs h-9 font-mono"
                  placeholder="e.g. +251 911 234 567"
                />
              </div>

              <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEmployeeToEdit(null)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateInfoMutation.isPending || !editInfoForm.first_name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 shadow-xs"
                >
                  {updateInfoMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Edit Security Roles                                  */}
      {/* ------------------------------------------------------------- */}
      {selectedForRoles && (
        <Dialog open={Boolean(selectedForRoles)} onOpenChange={(open) => !open && setSelectedForRoles(null)}>
          <DialogContent className="sm:max-w-lg bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
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
                {assignableRoles.map((role) => {
                  const isSelected = editingRoles.includes(role.name);
                  const isSelf = Boolean(
                    authUser?.email &&
                    selectedForRoles &&
                    (selectedForRoles.email.toLowerCase().trim() === authUser.email.toLowerCase().trim() ||
                     selectedForRoles.name.toLowerCase().trim() === authUser.email.toLowerCase().trim())
                  );
                  const isSelfAdminProtected = isSelf && role.name === "Admin";
                  return (
                    <label
                      key={role.name}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg cursor-pointer transition border text-[11px]",
                        isSelected
                          ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 font-semibold"
                          : "bg-white dark:bg-[#1c1c24] border-slate-200 dark:border-[#282835] text-slate-700 dark:text-zinc-300 hover:border-slate-300",
                        isSelfAdminProtected && "opacity-75 cursor-not-allowed"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isSelfAdminProtected}
                        onChange={() => {
                          if (isSelfAdminProtected) return;
                          handleToggleEditRole(role.name);
                        }}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-0.5">
                        <div className="font-bold flex items-center gap-1">
                          {role.name}
                          {isSelfAdminProtected && (
                            <span className="text-[9px] font-normal text-amber-600 dark:text-amber-400">
                              (Required for your signed-in session)
                            </span>
                          )}
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
                className="bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold h-9 shadow-xs"
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
                    Set new password for {selectedForPassword.email}.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="rounded-lg border border-slate-200 dark:border-[#24242e] bg-slate-50/70 dark:bg-[#131317] p-3 space-y-1 font-mono">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Account Password</span>
              {isLoadingStaffPassword ? (
                <span className="text-xs text-slate-400 flex items-center gap-1 font-sans">
                  <Loader2 className="h-3 w-3 animate-spin" /> Fetching recorded password...
                </span>
              ) : currentStaffPassword ? (
                <div className="flex items-center justify-between">
                  <span className="text-amber-800 dark:text-amber-300 font-bold text-xs select-all">
                    {currentStaffPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentStaffPassword);
                      toast.success("Password copied to clipboard!");
                    }}
                    className="text-[10px] font-sans text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer flex items-center gap-0.5"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-slate-400 font-sans italic">
                  Not recorded yet — set a password below to store and view it
                </span>
              )}
            </div>

            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPassword.trim() || resetPasswordMutation.isPending) return;
                if (newPassword !== confirmNewPassword) {
                  toast.error("Passwords do not match", {
                    description: "New password and confirm password must match.",
                  });
                  return;
                }
                resetPasswordMutation.mutate({
                  email: selectedForPassword.email,
                  newPassword,
                });
              }}
              className="space-y-3 py-2 text-xs"
            >
              {/* Hidden dummy username input so browser autofill stays bounded inside this form */}
              <input
                type="text"
                name="username"
                value={selectedForPassword.email}
                readOnly
                className="hidden"
                autoComplete="username"
                tabIndex={-1}
              />
              <div className="space-y-1.5">
                <Label htmlFor="reset_new_pwd" className="text-xs font-semibold">
                  New Secure Password
                </Label>
                <div className="relative">
                  <Input
                    id="reset_new_pwd"
                    name="new_password_field"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-8.5 text-xs pr-8 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reset_confirm_pwd" className="text-xs font-semibold">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="reset_confirm_pwd"
                    name="confirm_password_field"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    data-lpignore="true"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={cn(
                      "h-8.5 text-xs pr-8 font-mono",
                      newPassword && confirmNewPassword && newPassword !== confirmNewPassword && "border-rose-500 focus-visible:ring-rose-500"
                    )}
                  />
                </div>
                {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Passwords do not match
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Password is visible above so you can easily review and share it with the staff member.
                </p>
              </div>
            </form>

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
                disabled={
                  !newPassword.trim() ||
                  !confirmNewPassword.trim() ||
                  newPassword !== confirmNewPassword ||
                  resetPasswordMutation.isPending
                }
                onClick={() => {
                  if (newPassword !== confirmNewPassword) {
                    toast.error("Passwords do not match", {
                      description: "New password and confirm password must match.",
                    });
                    return;
                  }
                  resetPasswordMutation.mutate({
                    email: selectedForPassword.email,
                    newPassword,
                  });
                }}
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

      {/* Confirmation Modal for Staff Deactivation */}
      <ConfirmationModal
        isOpen={!!employeeToDeactivate}
        onClose={() => setEmployeeToDeactivate(null)}
        onConfirm={async () => {
          if (!employeeToDeactivate) return;
          try {
            await toggleStatusMutation.mutateAsync({
              email: employeeToDeactivate.email,
              enabled: false,
            });
            setEmployeeToDeactivate(null);
          } catch {
            // Handled by mutation onError toast
          }
        }}
        title="Deactivate Staff Account?"
        description={
          employeeToDeactivate ? (
            <span>
              Are you sure you want to deactivate{" "}
              <strong>{employeeToDeactivate.full_name || employeeToDeactivate.email}</strong>?
              This staff member will immediately lose access to the system until reactivated.
            </span>
          ) : (
            ""
          )
        }
        confirmLabel="Deactivate Account"
        cancelLabel="Keep Active"
        variant="danger"
        icon={UserX}
        isLoading={toggleStatusMutation.isPending}
      />

      <ConfirmationModal
        isOpen={Boolean(employeeToDelete)}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={async () => {
          if (!employeeToDelete) return;
          try {
            await deleteMutation.mutateAsync(employeeToDelete.email);
          } catch {
            // Handled by mutation onError toast
          }
        }}
        title="Delete Staff Account?"
        description={
          employeeToDelete ? (
            <span>
              Are you sure you want to delete{" "}
              <strong>{employeeToDelete.full_name || employeeToDelete.email}</strong>?
              If this account has no historical workflow records, it will be <strong>permanently erased</strong>.
              If it has recorded operational history, it will be deactivated with an audit record retained.
            </span>
          ) : (
            ""
          )
        }
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        variant="danger"
        icon={Trash2}
        isLoading={deleteMutation.isPending}
      />

      {/* ------------------------------------------------------------- */}
      {/* Role Architecture Reference Guide                             */}
      {/* ------------------------------------------------------------- */}
      {/* Tab 3: Roles & Permissions Master-Detail Explorer             */}
      {/* ------------------------------------------------------------- */}
      {(activeTab === "guide" || showRoleDocs) && (() => {
        const filteredRoles = CANONICAL_V2_ROLES.filter(
          (r) => selectedRoleCategory === "All" || r.category === selectedRoleCategory
        );
        const rolesPerPage = 5;
        const totalRolePages = Math.max(1, Math.ceil(filteredRoles.length / rolesPerPage));
        const paginatedRoles = filteredRoles.slice((roleListPage - 1) * rolesPerPage, roleListPage * rolesPerPage);
        const currentRole =
          CANONICAL_V2_ROLES.find((r) => r.name === selectedRoleName) ||
          filteredRoles[0] ||
          CANONICAL_V2_ROLES[0];
        const staffWithRole = employees.filter((e) =>
          (e.roles || []).some((r) => r.toLowerCase().trim() === currentRole.name.toLowerCase().trim())
        );

        return (
          <div className="flex-1 min-h-0 flex flex-col justify-between space-y-3">
            {/* Header info bar */}
            <div className="shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  Role Permissions & Responsibilities Guide
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  16 authoritative security roles strictly enforced throughout the operational workflow.
                </p>
              </div>
            </div>

            {/* Master-Detail Split Pane */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
              {/* Left Pane: Category Filter + Compact Selectable Role List */}
              <div className="w-full lg:w-[35%] xl:w-[32%] shrink-0 flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-[#24242e] bg-white dark:bg-[#121216] p-3 shadow-xs">
                <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 shrink-0">
                    {["All", "Core & Admin", "Intake & Registry", "Clearance Pipeline", "Operations & Finance"].map((cat) => {
                      const count = cat === "All" ? CANONICAL_V2_ROLES.length : CANONICAL_V2_ROLES.filter((r) => r.category === cat).length;
                      const shortLabel =
                        cat === "Core & Admin"
                          ? "Admin"
                          : cat === "Intake & Registry"
                          ? "Intake"
                          : cat === "Clearance Pipeline"
                          ? "Pipeline"
                          : cat === "Operations & Finance"
                          ? "Finance"
                          : "All";
                      const isCatActive = selectedRoleCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedRoleCategory(cat);
                            setRoleListPage(1);
                            const matches = cat === "All" ? CANONICAL_V2_ROLES : CANONICAL_V2_ROLES.filter((r) => r.category === cat);
                            if (matches.length > 0 && !matches.some((m) => m.name === selectedRoleName)) {
                              setSelectedRoleName(matches[0].name);
                            }
                          }}
                          className={cn(
                            "px-2 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap",
                            isCatActive
                              ? "bg-emerald-900 text-white dark:bg-emerald-700 shadow-2xs font-bold"
                              : "bg-slate-100 dark:bg-[#1c1c24] text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-[#252530]"
                          )}
                        >
                          {shortLabel} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Role List Buttons */}
                  <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-0.5">
                    {paginatedRoles.map((role) => {
                      const isSelected = currentRole.name === role.name;
                      const staffCount = employees.filter((e) =>
                        (e.roles || []).some((r) => r.toLowerCase().trim() === role.name.toLowerCase().trim())
                      ).length;
                      return (
                        <button
                          key={role.name}
                          type="button"
                          onClick={() => setSelectedRoleName(role.name)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer",
                            isSelected
                              ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 shadow-xs"
                              : "border-slate-200/70 dark:border-[#22222b] bg-white dark:bg-[#15151b] hover:bg-slate-50 dark:hover:bg-[#1a1a22] text-slate-800 dark:text-zinc-200"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate leading-snug">{role.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{role.category}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded-md border",
                                staffCount > 0
                                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                  : "bg-slate-100 dark:bg-[#202028] text-slate-400 border-slate-200 dark:border-[#2a2a35]"
                              )}
                            >
                              {staffCount} staff
                            </span>
                            <ChevronRight
                              className={cn("h-3.5 w-3.5", isSelected ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Pagination Bar */}
                {totalRolePages > 1 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#1e1e24] flex items-center justify-between text-xs shrink-0">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                      Page {roleListPage} of {totalRolePages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={roleListPage <= 1}
                        onClick={() => setRoleListPage((p) => Math.max(1, p - 1))}
                        className="h-6.5 px-2 text-[11px] rounded-lg"
                      >
                        Prev
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={roleListPage >= totalRolePages}
                        onClick={() => setRoleListPage((p) => Math.min(totalRolePages, p + 1))}
                        className="h-6.5 px-2 text-[11px] rounded-lg"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Pane: Role Detail Inspector */}
              <div className="flex-1 min-h-0 flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-[#24242e] bg-white dark:bg-[#121216] p-4 xl:p-5 shadow-xs overflow-hidden">
                <div className="space-y-3.5">
                  {/* Role Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-[#1e1e24] pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                        <Shield className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {currentRole.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-medium",
                              currentRole.category === "Core & Admin" && "border-teal-300 text-teal-800 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20",
                              currentRole.category === "Intake & Registry" && "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
                              currentRole.category === "Clearance Pipeline" && "border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
                              currentRole.category === "Operations & Finance" && "border-amber-300 text-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                            )}
                          >
                            {currentRole.category}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Authoritative Canonical Security Role</p>
                      </div>
                    </div>
                  </div>

                  {/* Scope & Purpose */}
                  <div className="space-y-1">
                    <h4 className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">Role Purpose & Scope</h4>
                    <p className="text-xs xl:text-[13px] text-slate-700 dark:text-zinc-300 leading-relaxed">
                      {currentRole.description}
                    </p>
                  </div>

                  {/* Operational Authority */}
                  <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Enforced Operational Authority</span>
                    </div>
                    <p className="text-xs text-emerald-950/90 dark:text-emerald-200/90 leading-relaxed">
                      {currentRole.permissionsSummary}
                    </p>
                  </div>

                  {/* Access Surface Badges */}
                  <div className="space-y-1.5">
                    <h4 className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">Authorized Access Surface</h4>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {currentRole.accessSurface.map((surface) => (
                        <span
                          key={surface}
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-[#1a1a22] text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-[#272732]"
                        >
                          {surface}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Staff Assigned */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1e1e24]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">
                        Staff Assigned to this Role ({staffWithRole.length})
                      </h4>
                    </div>
                    {staffWithRole.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {staffWithRole.slice(0, 4).map((emp) => (
                          <div
                            key={emp.name}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-[#16161c] border border-slate-100 dark:border-[#202028]"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {emp.full_name || emp.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono truncate">{emp.email}</p>
                            </div>
                            <Badge variant={emp.enabled === 1 ? "success" : "neutral"} className="text-[9px] px-1.5 py-0 shrink-0">
                              {emp.enabled === 1 ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic bg-slate-50/70 dark:bg-[#141418] p-2.5 rounded-lg border border-slate-100 dark:border-[#1c1c22]">
                        No staff member currently holds this role. Assign it via the Staff Directory tab.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
