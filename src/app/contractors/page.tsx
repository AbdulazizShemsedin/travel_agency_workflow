"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, Loader2, X, CheckCircle2, Globe, Phone, Mail, User } from "lucide-react";
import { getContractorsList, createContractor } from "@/lib/api/applicantApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Contractor } from "@/types/applicant";

export default function ContractorsPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    company_name: "",
    country: "Saudi Arabia",
    contact_person: "",
    phone: "",
    whatsapp: "",
    email: "",
    notes: "",
  });
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["contractors"],
    queryFn: getContractorsList,
  });

  const addContractorMutation = useMutation({
    mutationFn: (data: Partial<Contractor>) => createContractor(data),
    onSuccess: (newCon) => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      setIsAddModalOpen(false);
      setFormData({
        company_name: "",
        country: "Saudi Arabia",
        contact_person: "",
        phone: "",
        whatsapp: "",
        email: "",
        notes: "",
      });
      setSuccessMessage(`Contractor ${newCon.company_name || newCon.name} registered successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company_name.trim()) return;
    addContractorMutation.mutate({
      company_name: formData.company_name,
      country: formData.country,
      contact_person: formData.contact_person,
      phone: formData.phone,
      whatsapp: formData.whatsapp || formData.phone,
      email: formData.email,
      active_status: 1,
      notes: formData.notes,
    });
  };

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
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-900 hover:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Contractor Agency
        </Button>
      </div>

      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/60 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Contractors Table */}
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
                        {c.company_name || c.name}
                      </div>
                      {c.email && <span className="text-[10px] text-slate-400 dark:text-zinc-500">{c.email}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{c.country || "Saudi Arabia"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{c.contact_person || "Operations Manager"}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-zinc-300">{c.whatsapp || c.whatsapp_phone || c.phone || "N/A"}</td>
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

      {/* Add Contractor Agency Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Contractor Agency</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Register certified foreign partner agency</p>
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
                <Label htmlFor="company_name" className="text-xs font-semibold">
                  Agency / Company Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="company_name"
                  required
                  placeholder="e.g., Al-Qureshi Recruitment Agency"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="con_country" className="text-xs font-semibold">
                    Country <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="con_country"
                    required
                    placeholder="e.g., Saudi Arabia, UAE, Qatar"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="con_person" className="text-xs font-semibold">
                    Contact Person
                  </Label>
                  <Input
                    id="con_person"
                    placeholder="e.g., Hamza Adil"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="con_phone" className="text-xs font-semibold">
                    Phone / Office
                  </Label>
                  <Input
                    id="con_phone"
                    placeholder="0940107716"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="con_whatsapp" className="text-xs font-semibold">
                    WhatsApp Number
                  </Label>
                  <Input
                    id="con_whatsapp"
                    placeholder="+251 940 107 716"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="con_email" className="text-xs font-semibold">
                  Email Address
                </Label>
                <Input
                  id="con_email"
                  type="email"
                  placeholder="contact@agency.sa"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
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
                  disabled={addContractorMutation.isPending}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-medium"
                >
                  {addContractorMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Contractor Agency"
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
