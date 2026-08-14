import Link from "next/link";
import { Plus, Search, Filter, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockEmployees = [
  {
    id: "EMP-2024-001",
    name: "Abdella Ahmed",
    joined: "Joined Jan 2024",
    role: "LMS Officer",
    phone: "+1 (555) 019-2834",
    status: "Active",
  },
  {
    id: "EMP-2024-002",
    name: "Aisha Ali",
    joined: "Joined Feb 2024",
    role: "Wakala Admin",
    phone: "+1 (555) 012-9843",
    status: "Active",
  },
];

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Employee Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage and view all registered operational staff.
          </p>
        </div>
        <Button className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Employee
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Employee ID</th>
              <th className="px-4 py-3.5">Name</th>
              <th className="px-4 py-3.5">Role</th>
              <th className="px-4 py-3.5">Phone Number</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {mockEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                  {emp.id}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{emp.name}</div>
                  <div className="text-[11px] text-slate-400">{emp.joined}</div>
                </td>
                <td className="px-4 py-3">{emp.role}</td>
                <td className="px-4 py-3 font-mono">{emp.phone}</td>
                <td className="px-4 py-3">
                  <Badge variant="success" dotColor="bg-emerald-600">
                    {emp.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
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
