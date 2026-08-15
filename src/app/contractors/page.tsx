"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Eye, Building2, Phone, Mail, Globe, Loader2 } from "lucide-react";
import { getContractorsList } from "@/lib/api/applicantApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ContractorsPage() {
  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["contractors"],
    queryFn: getContractorsList,
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Foreign Contractors & Agencies
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Manage certified foreign recruitment agencies, quota allocations, and contract demand letters.
          </p>
        </div>
        <Button className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Contractor Agency
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="ml-2 text-xs text-slate-500">Loading contractors...</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3.5">Contractor ID</th>
                <th className="px-4 py-3.5">Name / Agency</th>
                <th className="px-4 py-3.5">Country</th>
                <th className="px-4 py-3.5">Contact Person</th>
                <th className="px-4 py-3.5">WhatsApp / Phone</th>
                <th className="px-4 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
              {contractors.length > 0 ? (
                contractors.map((c) => (
                  <tr key={c.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-zinc-200">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-400" />
                        {c.company_name}
                      </div>
                      {c.email && <span className="text-[10px] text-slate-400 dark:text-zinc-500">{c.email}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{c.country || "Saudi Arabia"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{c.contact_person || "Operations Manager"}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">{c.whatsapp_phone || c.phone || "N/A"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No contractors registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
