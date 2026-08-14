import Link from "next/link";
import { Plus, Eye, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockContractors = [
  {
    id: "CTR-8890",
    name: "Al-Khaleej International Manpower Co.",
    type: "Organization",
    country: "Saudi Arabia",
    activeDemands: 45,
    status: "Active",
  },
  {
    id: "CTR-8891",
    name: "Gulf Horizons Agency",
    type: "Organization",
    country: "UAE",
    activeDemands: 28,
    status: "Active",
  },
  {
    id: "CTR-8892",
    name: "Doha Star Manpower Solutions",
    type: "Organization",
    country: "Qatar",
    activeDemands: 12,
    status: "Pending Review",
  },
];

export default function ContractorsPage() {
  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Foreign Contractors & Agencies
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage certified foreign recruitment agencies, quota allocations, and contract demand letters.
          </p>
        </div>
        <Button className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Contractor Agency
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Contractor ID</th>
              <th className="px-4 py-3.5">Name / Agency</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Country of Operation</th>
              <th className="px-4 py-3.5">Active Demands</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {mockContractors.map((ctr) => (
              <tr key={ctr.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {ctr.id}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-800 dark:text-emerald-400" />
                  {ctr.name}
                </td>
                <td className="px-4 py-3">{ctr.type}</td>
                <td className="px-4 py-3">{ctr.country}</td>
                <td className="px-4 py-3 font-mono font-semibold">{ctr.activeDemands} Candidates</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={ctr.status === "Active" ? "success" : "warning"}
                    dotColor={ctr.status === "Active" ? "bg-emerald-600" : "bg-amber-600"}
                  >
                    {ctr.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                    <Eye className="h-3.5 w-3.5 mr-1" /> View Demands
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
