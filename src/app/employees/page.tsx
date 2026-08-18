"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, Loader2, UserPlus, X, Mail, Phone, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getEmployeesList, createEmployee, EmployeeRecord } from "@/lib/api/applicantApi";

const ROLE_OPTIONS = [
  { label: "LMS Documentation Specialist", type: "LMS" },
  { label: "Injaz & Biometrics Officer", type: "Injaz" },
  { label: "Wakala Payment Coordinator", type: "Wakala" },
  { label: "Embassy Visa Stamping Liaison", type: "Embassy" },
  { label: "Flight Ticketing Agent", type: "Ticketing" },
  { label: "Operations Manager", type: "Operations" },
  { label: "General Staff Officer", type: "General" },
];

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    employee_name: "",
    role: "LMS Documentation Specialist",
    role_type: "LMS",
    email: "",
    phone: "",
    status: "Active",
  });
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesList,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (newEmp) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setIsAddModalOpen(false);
      setFormData({
        employee_name: "",
        role: "LMS Documentation Specialist",
        role_type: "LMS",
        email: "",
        phone: "",
        status: "Active",
      });
      setSuccessMessage(`Staff member ${newEmp.employee_name} registered successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_name.trim()) return;
    addEmployeeMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Employee Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Operational team members assigned to LMS, Wakala, Injaz, and visa processing streams.
          </p>
        </div>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium text-xs shadow-sm"
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add Staff Member
        </Button>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Employees Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="ml-2 text-xs text-slate-500">Loading staff records...</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Employee ID</th>
                <th className="px-4 py-3.5">Staff Name</th>
                <th className="px-4 py-3.5">Role Designation</th>
                <th className="px-4 py-3.5">Email Contact</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227] text-slate-700 dark:text-zinc-300">
              {employees.length > 0 ? (
                employees.map((emp) => (
                  <tr key={emp.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-zinc-200">
                      {emp.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          {(emp.employee_name || "Staff")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {emp.employee_name || emp.name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-zinc-500">{emp.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
                        {emp.role_type || "Operations"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">{emp.email || "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">{emp.phone || "+251911000000"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No staff records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Staff Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Staff Member</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Register new operations employee</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="emp_name" className="text-xs font-semibold">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="emp_name"
                  required
                  placeholder="e.g., Sara Tefera"
                  value={formData.employee_name}
                  onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="emp_role" className="text-xs font-semibold">
                  Role Designation <span className="text-rose-500">*</span>
                </Label>
                <Select
                  id="emp_role"
                  value={formData.role}
                  onChange={(e) => {
                    const opt = ROLE_OPTIONS.find((r) => r.label === e.target.value);
                    setFormData({
                      ...formData,
                      role: e.target.value,
                      role_type: opt ? opt.type : "General",
                    });
                  }}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.label} value={r.label}>
                      {r.label} ({r.type})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emp_email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="emp_email"
                    type="email"
                    placeholder="sara@agency.et"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emp_phone" className="text-xs font-semibold">
                    Phone Number
                  </Label>
                  <Input
                    id="emp_phone"
                    placeholder="+251 91 100 0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#222227]">
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
                  disabled={addEmployeeMutation.isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium"
                >
                  {addEmployeeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Staff Member"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
