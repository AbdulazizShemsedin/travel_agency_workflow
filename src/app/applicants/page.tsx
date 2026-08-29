import Link from "next/link";
import { Plus } from "lucide-react";
import { ApplicantTable } from "@/components/applicant/ApplicantTable";
import { Button } from "@/components/ui/button";

export default function ApplicantsPage() {
  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Applicants
          </h2>
        </div>
        <Link href="/applicants/new">
          <Button className="bg-emerald-900 hover:bg-emerald-950 text-white shadow-sm font-medium">
            <Plus className="mr-1.5 h-4 w-4" />
            New Applicant
          </Button>
        </Link>
      </div>

      {/* Directory Table */}
      <ApplicantTable />
    </div>
  );
}
