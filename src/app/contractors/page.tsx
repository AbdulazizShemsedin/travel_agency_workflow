import Link from "next/link";
import { Plus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const mockContractors = [
  {
    id: "CTR-8890",
    name: "Foreign Agency 1",
    type: "Organization",
    country: "Saudi Arabia",
    status: "Active",
  },
  {
    id: "CTR-8891",
    name: "Foreign Agency 2",
    type: "Individual",
    country: "UAE",
    status: "Active",
  },
  {
    id: "CTR-8892",
    name: "Foreign Agency 3",
    type: "Organization",
    country: "Qatar",
    status: "Pending Review",
  },
];

export default function ContractorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Contractor List
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage registered individual and organizational contractors.
          </p>
        </div>
        <Button className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Contractor
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Contractor ID</th>
              <th className="px-4 py-3.5">Name / Organization</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Country of Origin</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {mockContractors.map((ctr) => (
              <tr key={ctr.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-slate-800">
                  {ctr.id}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{ctr.name}</td>
                <td className="px-4 py-3">{ctr.type}</td>
                <td className="px-4 py-3">{ctr.country}</td>
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
