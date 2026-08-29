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
  SystemUserRecord,
  SystemRoleItem,
} from "@/lib/api/applicantApi";
import { useAuth } from "@/components/providers/AuthProvider";
import { toast } from "sonner";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();
  const isSystemManager = can("manageUsers");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = React.useState<SystemUserRecord | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [logoutSessions, setLogoutSessions] = React.useState(false);

  const [selectedUserForRoles, setSelectedUserForRoles] = React.useState<SystemUserRecord | null>(null);
  const [assignedRoles, setAssignedRoles] = React.useState<string[]>([]);

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

  // 4. Toggle Enabled / Disabled Status Mutation
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

  const filteredUsers = systemUsers.filter((u) => {
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User & Employee Directory
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs border-slate-200 dark:border-[#26262d]"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefetching ? "animate-spin text-emerald-600" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs shadow-xs"
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add System User
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-xs bg-white dark:bg-[#121215] border-slate-200 dark:border-[#26262d]"
        />
      </div>

      {/* System Users Table */}
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
                <th className="px-4 py-3.5">Assigned Roles</th>
                <th className="px-4 py-3.5">Phone Contact</th>
                <th className="px-4 py-3.5">Account Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227] text-slate-700 dark:text-zinc-300">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isEnabled = Boolean(u.enabled);
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
                            <span className="text-[10px] text-slate-400 italic">No roles assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">
                        {u.phone || "—"}
                      </td>

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
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 1. Add User Modal */}
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
                    placeholder="+251911..."
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
                    placeholder="••••••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-[#16161b]"
                  />
                </div>
              </div>

              {/* Multi-Role Selection Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#222227]">
                <Label className="font-semibold text-slate-800 dark:text-zinc-200">
                  Assign System Roles (Multi-Role Support) *
                </Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b]">
                  {isRolesLoading ? (
                    <div className="col-span-2 flex items-center justify-center gap-2 text-slate-500 dark:text-zinc-400 py-4 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                      Loading system roles...
                    </div>
                  ) : availableRoles.length > 0 ? (
                    availableRoles.map((role) => {
                      const roleKey = role.role_name || (role as any).role || "";
                      const isSelected = formData.roles.includes(roleKey);
                      return (
                        <label
                          key={roleKey}
                          className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition text-[11px] ${
                            isSelected
                              ? "bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                              : "hover:bg-slate-100 dark:hover:bg-[#1e1e24] text-slate-700 dark:text-zinc-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleRoleToggle(roleKey)}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div>{role.label || roleKey}</div>
                            {role.description && (
                              <div className="text-[9px] text-slate-400 font-normal leading-tight">
                                {role.description}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-center text-slate-400 py-2 text-xs">
                      No roles available
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-[#222227]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createUserMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating...
                    </>
                  ) : (
                    "Create User Profile"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reset Password Modal */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] pb-2.5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Reset Password
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Setting a new password for <strong className="text-slate-900 dark:text-white">{selectedUserForPassword.email}</strong>.
            </p>

            <div className="space-y-2 text-xs">
              <Label htmlFor="new_pass">New Secure Password</Label>
              <Input
                id="new_pass"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-8.5 text-xs"
              />

              <label className="flex items-center gap-2 pt-2 text-[11px] text-slate-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={logoutSessions}
                  onChange={(e) => setLogoutSessions(e.target.checked)}
                  className="rounded text-amber-600"
                />
                <span>Log out all active sessions on other devices</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#222227]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForPassword(null)}
                className="text-xs"
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
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
              >
                {setPasswordMutation.isPending ? "Updating..." : "Set Password"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Assign Roles Modal */}
      {selectedUserForRoles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#222227] bg-white dark:bg-[#121215] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#222227] pb-2.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Synchronize User Roles
                </h3>
              </div>
              <button
                onClick={() => setSelectedUserForRoles(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Modifying assigned roles for <strong className="text-slate-900 dark:text-white">{selectedUserForRoles.email}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-lg border border-slate-200 dark:border-[#26262d] bg-slate-50/50 dark:bg-[#16161b] text-xs">
              {isRolesLoading ? (
                <div className="col-span-2 flex items-center justify-center gap-2 text-slate-500 dark:text-zinc-400 py-4 text-xs">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                  Loading system roles...
                </div>
              ) : availableRoles.length > 0 ? (
                availableRoles.map((role) => {
                  const roleKey = role.role_name || (role as any).role || "";
                  const isSelected = assignedRoles.includes(roleKey);
                  return (
                    <label
                      key={roleKey}
                      className={`flex items-start gap-2 p-2 rounded-md cursor-pointer transition text-[11px] ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-semibold"
                          : "hover:bg-slate-100 dark:hover:bg-[#1e1e24] text-slate-700 dark:text-zinc-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleEditRoleToggle(roleKey)}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{role.label || roleKey}</span>
                    </label>
                  );
                })
              ) : (
                <div className="col-span-2 text-center text-slate-400 py-2 text-xs">
                  No roles available
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#222227]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserForRoles(null)}
                className="text-xs"
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
                    replace: true,
                  })
                }
                className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 text-white text-xs"
              >
                {assignRolesMutation.isPending ? "Saving..." : "Save Roles"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
