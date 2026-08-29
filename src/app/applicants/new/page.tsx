import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ApplicantRegistrationForm } from "@/components/applicant/ApplicantRegistrationForm";

export default function NewApplicantPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Header matching Figma Page 4 */}
      <div className="space-y-1">
        <nav className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Link href="/applicants" className="hover:text-emerald-800 transition">
            Applicants
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <span className="text-emerald-900">Add New</span>
        </nav>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              New Applicant
            </h2>
          </div>
          <Link
            href="/applicants"
            className="text-xs text-slate-600 hover:text-slate-900 font-medium py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 w-fit"
          >
            Cancel & Return to List
          </Link>
        </div>
      </div>

      {/* Multi-step Registration Workflow Form */}
      <ApplicantRegistrationForm />
    </div>
  );
}
