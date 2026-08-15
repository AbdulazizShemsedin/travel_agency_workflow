import Link from "next/link";
import { Plus, Search, Filter, Download, Eye, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AGENCY_EMPLOYEES = [
  { id: "EMP-001", name: "Sara Tefera", role: "LMS Documentation Specialist", roleType: "LMS", email: "sara@agency.et", status: "Active" },
  { id: "EMP-002", name: "Dawit Haile", role: "Injaz & Biometrics Officer", roleType: "Injaz", email: "dawit@agency.et", status: "Active" },
  { id: "EMP-003", name: "Tigist Bekele", role: "Wakala Payment Coordinator", roleType: "Wakala", email: "tigist@agency.et", status: "Active" },
  { id: "EMP-004", name: "Abebe Kebede", role: "Embassy Visa Stamping Liaison", roleType: "Embassy", email: "abebe@agency.et", status: "Active" },
  { id: "EMP-005", name: "Helen Wolde", role: "Flight Ticketing Agent", roleType: "Ticketing", email: "helen@agency.et", status: "Active" },
];

export default function EmployeesPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Employee Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational team members assigned to LMS, Wakala, and Injaz processing streams.
          </p>
        </div>
        <Button className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Staff Member
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Employee ID</th>
              <th className="px-4 py-3.5">Name</th>
              <th className="px-4 py-3.5">Role Type Designation</th>
              <th className="px-4 py-3.5">Email Contact</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {AGENCY_EMPLOYEES.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {emp.id}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      {emp.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[11px] text-slate-400">{emp.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-emerald-900 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
                    {emp.roleType}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{emp.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="success" dotColor="bg-emerald-600">
                    Active
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Assignments
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
