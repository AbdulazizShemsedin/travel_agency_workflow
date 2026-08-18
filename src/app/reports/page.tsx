"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getApplicantsList } from "@/lib/api/applicantApi";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";

export default function ReportsPage() {
  const { data: applicants = [], isLoading } = useQuery({
    queryKey: ["applicants"],
    queryFn: getApplicantsList,
  });

  const total = applicants.length;
  const registered = applicants.filter((a) => a.applicant_state === "Registered").length;
  const cvGenerated = applicants.filter((a) => a.applicant_state === "CV Generated").length;
  const processing = applicants.filter((a) => a.applicant_state === "Processing").length;
  const stamped = applicants.filter((a) => a.applicant_state === "Stamped").length;
  const ticketed = applicants.filter((a) => a.applicant_state === "Ticketed").length;
  const departed = applicants.filter((a) => a.applicant_state === "Departed").length;

  const statItems = [
    { title: "Total Applicants", value: total.toString(), desc: "Total registered candidates" },
    { title: "CVs Generated", value: cvGenerated.toString(), desc: "Ready for overseas agencies" },
    { title: "In Processing", value: processing.toString(), desc: "LMS, Injaz, and Wakala" },
    { title: "Departed", value: departed.toString(), desc: "Completed overseas placements" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Reports & Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Applicant processing metrics and workflow stage summaries across all candidates.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
          <span className="ml-2 text-xs text-slate-500">Loading reports data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((stat) => (
            <Card key={stat.title} className="border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215]">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {stat.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stat.value}</div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">{stat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
