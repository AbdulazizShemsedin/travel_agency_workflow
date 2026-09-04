"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Building2,
  Loader2,
  X,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  User,
  Edit2,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import {
  listContractorsV2,
  createContractorV2,
  updateContractorV2,
  resetEmployeePasswordV2,
  V2ContractorItem,
} from "@/lib/api/v2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ContractorsPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingContractor, setEditingContractor] = React.useState<V2ContractorItem | null>(null);
  const [credentialsContractor, setCredentialsContractor] = React.useState<V2ContractorItem | null>(null);

  // Add Form State
  const [formData, setFormData] = React.useState({
    company_name: "",
    country: "Saudi Arabia",
    contact_person: "",
    phone: "",
    whatsapp: "",
    email: "",
    notes: "",
  });

  // Edit Form State
  const [editFormData, setEditFormData] = React.useState({
    contractor_name: "",
    country: "Saudi Arabia",
    contact_person: "",
    phone: "",
    whatsapp: "",
    email: "",
    communication_manager: "",
    notes: "",
  });

  // Credentials / Password State
  const [agentNewPassword, setAgentNewPassword] = React.useState("");
  const [showAgentPassword, setShowAgentPassword] = React.useState(false);
  const [copiedCredentials, setCopiedCredentials] = React.useState(false);

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const { data: contractors = [], isLoading } = useQuery({
    queryKey: ["contractors_v2_page"],
    queryFn: () => listContractorsV2(),
  });

  // Country & Search Filter State
  const [selectedCountry, setSelectedCountry] = React.useState<string>("All");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Unique Countries from dataset
  const availableCountries = React.useMemo(() => {
    const set = new Set<string>();
    contractors.forEach((c) => {
      if (c.country && typeof c.country === "string" && c.country.trim()) {
        set.add(c.country.trim());
      }
    });
    return ["All", ...Array.from(set).sort()];
  }, [contractors]);

  // Filtered Contractors
  const filteredContractors = React.useMemo(() => {
    return contractors.filter((c) => {
      if (selectedCountry !== "All") {
        const cCountry = (c.country || "Saudi Arabia").toLowerCase().trim();
        if (cCountry !== selectedCountry.toLowerCase().trim()) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (c.contractor_name || c.company_name || c.name || "").toLowerCase();
        const contact = (c.contact_person || "").toLowerCase();
        const email = (c.email || c.user_email || c.user || "").toLowerCase();
        const phone = (c.phone || c.whatsapp || c.whatsapp_phone || "").toLowerCase();
        const country = (c.country || "").toLowerCase();
        if (
          !name.includes(query) &&
          !contact.includes(query) &&
          !email.includes(query) &&
          !phone.includes(query) &&
          !country.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [contractors, selectedCountry, searchQuery]);

  // Mutation 1: Add Contractor
  const addContractorMutation = useMutation({
    mutationFn: (data: any) =>
      createContractorV2({
        contractor_name: data.company_name,
        company_name: data.company_name,
        country: data.country,
        contact_person: data.contact_person,
        phone: data.phone,
        whatsapp: data.whatsapp,
        user_email: data.email,
        email: data.email,
        notes: data.notes,
      }),
    onSuccess: (newCon: any) => {
      queryClient.invalidateQueries({ queryKey: ["contractors_v2_page"] });
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
      setSuccessMessage(`Contractor ${newCon?.contractor_name || newCon?.company_name || newCon?.name || "Agency"} registered successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      toast.error("Failed to add contractor: " + (err?.message || "Unknown error"));
    },
  });

  // Mutation 2: Edit Contractor
  const updateContractorMutation = useMutation({
    mutationFn: (payload: { name: string; values: any }) =>
      updateContractorV2(payload.name, payload.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors_v2_page"] });
      setEditingContractor(null);
      toast.success("Contractor agency details updated successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to update contractor: " + (err?.message || "Unknown error"));
    },
  });

  // Mutation 3: Set / Reset Agent Portal Password
  const resetAgentPasswordMutation = useMutation({
    mutationFn: (payload: { userEmail: string; newPassword: string }) =>
      resetEmployeePasswordV2(payload.userEmail, payload.newPassword),
    onSuccess: () => {
      toast.success("Agent portal password updated successfully!");
    },
    onError: (err: any) => {
      toast.error("Failed to update agent password: " + (err?.message || "Unknown error"));
    },
  });

  const handleOpenEdit = (c: V2ContractorItem) => {
    setEditingContractor(c);
    setEditFormData({
      contractor_name: c.contractor_name || c.company_name || c.name || "",
      country: c.country || "Saudi Arabia",
      contact_person: c.contact_person || "",
      phone: c.phone || "",
      whatsapp: c.whatsapp || c.whatsapp_phone || "",
      email: c.email || c.user_email || "",
      communication_manager: c.communication_manager || "",
      notes: c.notes || "",
    });
  };

  const handleOpenCredentials = (c: V2ContractorItem) => {
    setCredentialsContractor(c);
    setAgentNewPassword("");
    setShowAgentPassword(false);
    setCopiedCredentials(false);
  };

  const handleGenerateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pwd = "";
    for (let i = 0; i < 12; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAgentNewPassword(pwd);
    setShowAgentPassword(true);
  };

  const handleCopyCredentials = () => {
    if (!credentialsContractor) return;
    const loginUser = credentialsContractor.user || credentialsContractor.user_email || credentialsContractor.email || "";
    const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "Portal Login";
    const text = `Foreign Agent Portal Credentials:\nAgency: ${credentialsContractor.contractor_name || credentialsContractor.name}\nURL: ${portalUrl}\nUsername: ${loginUser}\nPassword: ${agentNewPassword || "(Unchanged)"}`;
    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    toast.success("Credentials copied to clipboard!");
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
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

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContractor) return;
    updateContractorMutation.mutate({
      name: editingContractor.name,
      values: {
        contractor_name: editFormData.contractor_name,
        country: editFormData.country,
        contact_person: editFormData.contact_person,
        phone: editFormData.phone,
        whatsapp: editFormData.whatsapp,
        email: editFormData.email,
        communication_manager: editFormData.communication_manager,
        notes: editFormData.notes,
      },
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
            Manage partner foreign agencies, configure communication managers, and manage portal login credentials.
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
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search contractor, contact, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white dark:bg-[#141418] border-slate-200 dark:border-[#26262d]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Country:</span>
          </div>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#141418] text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            aria-label="Filter Contractors by Country"
          >
            {availableCountries.map((country) => {
              const count =
                country === "All"
                  ? contractors.length
                  : contractors.filter((c) => (c.country || "Saudi Arabia").toLowerCase().trim() === country.toLowerCase().trim()).length;
              return (
                <option key={country} value={country}>
                  {country === "All" ? `All Countries (${count})` : `${country} (${count})`}
                </option>
              );
            })}
          </select>
          {selectedCountry !== "All" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCountry("All")}
              className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Contractors Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#222227] bg-white dark:bg-[#121215] shadow-xs">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-800 dark:text-emerald-400" />
            <span className="ml-2 text-xs text-slate-500">Loading contractors...</span>
          </div>
        ) : (
          <div className="w-full max-w-full min-w-0 overflow-x-auto touch-pan-x">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead className="border-b border-slate-100 dark:border-[#222227] bg-slate-50/70 dark:bg-[#16161b] text-slate-500 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3.5">Contractor ID</th>
                  <th className="px-4 py-3.5">Name / Agency</th>
                  <th className="px-4 py-3.5">Country</th>
                  <th className="px-4 py-3.5">Portal User Account</th>
                  <th className="px-4 py-3.5">Contact & Phone</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#222227]">
                {filteredContractors.length > 0 ? (
                  filteredContractors.map((c) => {
                  const portalUser = c.user || c.user_email || c.email;
                  return (
                    <tr key={c.name} className="hover:bg-slate-50/80 dark:hover:bg-[#16161c]/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-zinc-200">{c.name}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {c.contractor_name || c.company_name || c.name}
                        </div>
                        {c.communication_manager && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Mgr: {c.communication_manager}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">{c.country || "Saudi Arabia"}</td>
                      <td className="px-4 py-3 font-mono">
                        {portalUser ? (
                          <span className="text-slate-800 dark:text-zinc-300">{portalUser}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 italic">No User Linked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300">
                        <div>{c.contact_person || "Operations Desk"}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {c.whatsapp || c.whatsapp_phone || c.phone || "No Phone"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(c)}
                            className="h-7 px-2.5 text-xs border-slate-200 dark:border-[#2a2a35] text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1a1a22]"
                            title="Edit Contractor Info"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCredentials(c)}
                            className="h-7 px-2.5 text-xs border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="View / Reset Agent Credentials"
                          >
                            <KeyRound className="h-3 w-3 mr-1" />
                            Credentials
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    {searchQuery || selectedCountry !== "All"
                      ? "No contractors match the selected filter criteria."
                      : "No contractors registered."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>

      {/* ------------------------------------------------------------- */}
      {/* Modal 1: Add Contractor Agency Modal                           */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Contractor Agency</h3>
                <p className="text-xs text-slate-400">Creates foreign agency record & linked portal user account.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
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
                    placeholder="e.g., Saudi Arabia, Kuwait, UAE"
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
                    placeholder="+966 50 123 4567"
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
                    placeholder="+966 50 123 4567"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="con_email" className="text-xs font-semibold">
                  Portal Login Email / Account <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="con_email"
                  type="email"
                  required
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

      {/* ------------------------------------------------------------- */}
      {/* Modal 2: Edit Contractor Agency Modal                          */}
      {/* ------------------------------------------------------------- */}
      {editingContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Edit Contractor Agency</h3>
                <p className="text-xs text-slate-400">Update agency details for {editingContractor.name}.</p>
              </div>
              <button
                onClick={() => setEditingContractor(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <Label htmlFor="edit_contractor_name" className="text-xs font-semibold">
                  Agency Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit_contractor_name"
                  required
                  value={editFormData.contractor_name}
                  onChange={(e) => setEditFormData({ ...editFormData, contractor_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit_country" className="text-xs font-semibold">
                    Country <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="edit_country"
                    required
                    value={editFormData.country}
                    onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_person" className="text-xs font-semibold">
                    Contact Person
                  </Label>
                  <Input
                    id="edit_person"
                    value={editFormData.contact_person}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit_phone" className="text-xs font-semibold">
                    Phone / Office
                  </Label>
                  <Input
                    id="edit_phone"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit_whatsapp" className="text-xs font-semibold">
                    WhatsApp
                  </Label>
                  <Input
                    id="edit_whatsapp"
                    value={editFormData.whatsapp}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit_comm_mgr" className="text-xs font-semibold">
                  Communication Manager
                </Label>
                <Input
                  id="edit_comm_mgr"
                  placeholder="Manager email / name"
                  value={editFormData.communication_manager}
                  onChange={(e) => setEditFormData({ ...editFormData, communication_manager: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#222227]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingContractor(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateContractorMutation.isPending}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium"
                >
                  {updateContractorMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Modal 3: Credentials & Password Management Modal               */}
      {/* ------------------------------------------------------------- */}
      {credentialsContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-[#26262d] bg-white dark:bg-[#16161b] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#222227]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Agent Portal Credentials
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {credentialsContractor.contractor_name || credentialsContractor.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCredentialsContractor(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-[#24242e] bg-slate-50/70 dark:bg-[#131317] p-3 space-y-2 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Login Portal URL</span>
                  <span className="text-slate-800 dark:text-zinc-200 text-xs break-all">
                    {typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Username / Account</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    {credentialsContractor.user || credentialsContractor.user_email || credentialsContractor.email || "No Linked User"}
                  </span>
                </div>
              </div>

              <form
                autoComplete="off"
                onSubmit={(e) => {
                  e.preventDefault();
                  const targetUser = credentialsContractor.user || credentialsContractor.user_email || credentialsContractor.email;
                  if (!targetUser || !agentNewPassword.trim() || resetAgentPasswordMutation.isPending) return;
                  resetAgentPasswordMutation.mutate({
                    userEmail: targetUser,
                    newPassword: agentNewPassword,
                  });
                }}
                className="space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <Label htmlFor="agent_new_pwd" className="text-xs font-semibold">
                    Set Portal Login Password
                  </Label>
                  <button
                    type="button"
                    onClick={handleGenerateRandomPassword}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Generate Random
                  </button>
                </div>

                <div className="relative">
                  <Input
                    id="agent_new_pwd"
                    name="agent_portal_new_pwd"
                    type={showAgentPassword ? "text" : "password"}
                    autoComplete="new-password"
                    data-lpignore="true"
                    placeholder="Enter or generate password"
                    value={agentNewPassword}
                    onChange={(e) => setAgentNewPassword(e.target.value)}
                    className="pr-8 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAgentPassword(!showAgentPassword)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showAgentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Save the password below so the foreign agent can log into their dedicated agency portal.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      !agentNewPassword.trim() ||
                      !(credentialsContractor.user || credentialsContractor.user_email || credentialsContractor.email) ||
                      resetAgentPasswordMutation.isPending
                    }
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                  >
                    {resetAgentPasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Updating Password...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCredentials}
                    className="text-xs border-slate-300 dark:border-[#2a2a32]"
                  >
                    {copiedCredentials ? (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        Copy Credentials
                      </>
                    )}
                  </Button>
                </div>
              </form>

              <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-[#222227]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCredentialsContractor(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
