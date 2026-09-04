"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { ApplicantRegistrationForm } from "@/components/applicant/ApplicantRegistrationForm";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";

export default function NewApplicantPage() {
  const router = useRouter();
  const { can, isLoading } = useAuth();
  const canRegister = can("registerApplicant");

  React.useEffect(() => {
    if (!isLoading && !canRegister) {
      router.replace("/applicants");
    }
  }, [isLoading, canRegister, router]);

  if (!isLoading && !canRegister) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Permission Denied</h2>
        <p className="text-xs text-slate-600 dark:text-zinc-400">
          Your assigned role does not authorize adding new applicants. Only Registrars and Administrators may register candidates.
        </p>
        <Link href="/applicants">
          <Button variant="outline" size="sm">
            Return to Applicants
          </Button>
        </Link>
      </div>
    );
  }

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
