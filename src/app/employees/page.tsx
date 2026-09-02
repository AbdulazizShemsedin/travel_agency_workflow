"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lock,
  ExternalLink,
  ShieldCheck,
  User,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  FileCheck2,
  Coins,
  Plane,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/components/providers/AuthProvider";
import { getCurrentUserV2, V2CurrentUserResponse } from "@/lib/api/v2/auth";
import { cn } from "@/lib/utils";

// Authoritative 16 Canonical Roles per roles.py and ROLE-PERMISSIONS-MATRIX.md
interface CanonicalRoleDefinition {
  name: string;
  category: "Core & Admin" | "Intake & Registry" | "Clearance Pipeline" | "Operations & Finance";
  description: string;
  permissionsSummary: string;
  accessSurface: string[];
}

const CANONICAL_V2_ROLES: CanonicalRoleDefinition[] = [
  // 1. Core & Admin
  {
    name: "Administrator",
    category: "Core & Admin",
    description: "Frappe standard root administrator with complete write and override authority across all DocTypes.",
    permissionsSummary: "Full CRUD on all DocTypes; financial approval queue; country-ban override; clearance step reassignment.",
    accessSurface: ["All Modules", "Frappe Desk Core", "System Settings"],
  },
  {
    name: "System Manager",
    category: "Core & Admin",
    description: "Core administrative role managing agency operations, user role grants, and operational parameters.",
    permissionsSummary: "Complete operational management; user provisioning via Frappe Desk; role assignment; financial approvals.",
    accessSurface: ["All Modules", "User Management", "Audit Logs"],
  },
  {
    name: "Agency Admin",
    category: "Core & Admin",
    description: "Executive agency administrator overseeing candidate pipelines, financial health, and cross-corridor status.",
    permissionsSummary: "Full read/write on Applicants, Placements, Clearance Steps, Reports, and Approval Queues.",
    accessSurface: ["Applicants", "Placements", "Reports", "Approvals", "Finance"],
  },
  {
    name: "Manager",
    category: "Core & Admin",
    description: "Operational team lead managing day-to-day clearance execution, step assignments, and workflow overrides.",
    permissionsSummary: "Full read/write on Applicants & Placements; clearance step reassignment; country-ban override; daily work reports.",
    accessSurface: ["Applicants", "Placements", "Clearance Steps", "Daily Reports"],
  },

  // 2. Intake & Registry
  {
    name: "Registrar",
    category: "Intake & Registry",
    description: "Front-office intake officer responsible for candidate dossier registration and initial documentation.",
    permissionsSummary: "Create, edit, and register Applicants; set country bans. Strictly no write access to Placements or Finance.",
    accessSurface: ["Applicant Registration", "Intake Registry", "Country Bans (Create Only)"],
  },
  {
    name: "Recruiter",
    category: "Intake & Registry",
    description: "Field recruiter with prospective candidate intake and profile viewing grants.",
    permissionsSummary: "Read-only access to registered candidates; candidate intake drafting; applicant CV generation.",
    accessSurface: ["Candidate Directory", "CV Generation"],
  },
  {
    name: "Applicant Viewer",
    category: "Intake & Registry",
    description: "Read-only audit role for external consultants, inspectors, or intake reviewers.",
    permissionsSummary: "Read-only inspection of candidate registration profiles; no mutation or action grants.",
    accessSurface: ["Applicant Directory (Read-Only)"],
  },

  // 3. Clearance Pipeline
  {
    name: "Clearance Officer",
    category: "Clearance Pipeline",
    description: "Cross-corridor clearance specialist operating ToDo-assigned clearance tasks across destination countries.",
    permissionsSummary: "Operate assigned Clearance Steps (start/complete/submit); read-only on Applicants & Placements.",
    accessSurface: ["Assigned Clearance Steps", "Candidate Dossier (Read-Only)"],
  },
  {
    name: "Saudi LMIS",
    category: "Clearance Pipeline",
    description: "Specialized officer for Saudi Labor Market Information System (LMIS), COC exam, and labor ID clearance.",
    permissionsSummary: "Operate LMIS Clearance steps (start/complete); narrow candidate edit via update_applicant_for_lmis.",
    accessSurface: ["Saudi LMIS Steps", "COC / Labor ID Fields"],
  },
  {
    name: "Saudi Taeshir",
    category: "Clearance Pipeline",
    description: "Specialized officer managing Saudi visa service center (VFS / Taeshir) biometric coordination and fees.",
    permissionsSummary: "Operate Taeshir clearance steps (start/complete); reference and fee recording.",
    accessSurface: ["Saudi Taeshir Steps", "Biometric Reference Logging"],
  },
  {
    name: "Saudi Embassy",
    category: "Clearance Pipeline",
    description: "Consular liaison officer managing Monday dossier submission and Thursday visa stamping outcomes for Saudi Arabia.",
    permissionsSummary: "Submit dossier to embassy; stamp visa (reference recording); reject visa (mandatory remark).",
    accessSurface: ["Saudi Embassy Steps", "Consular Submissions", "Visa Stamping"],
  },
  {
    name: "Kuwait LMIS",
    category: "Clearance Pipeline",
    description: "Specialized clearance officer managing Kuwait ministry labor clearance and work permit approvals.",
    permissionsSummary: "Operate Kuwait LMIS clearance steps (start/complete); narrow candidate edit via update_applicant_for_lmis.",
    accessSurface: ["Kuwait LMIS Steps", "Labor Approval Logging"],
  },
  {
    name: "Kuwait Telesign",
    category: "Clearance Pipeline",
    description: "Specialized officer managing Kuwait Telesign authentication, biometric clearance, and COC certification.",
    permissionsSummary: "Operate Telesign clearance steps (start/complete); reference number and fee recording.",
    accessSurface: ["Kuwait Telesign Steps", "COC Certification"],
  },
  {
    name: "Kuwait Embassy",
    category: "Clearance Pipeline",
    description: "Consular liaison officer managing Monday dossier submission and Thursday visa stamping outcomes for Kuwait.",
    permissionsSummary: "Submit dossier to embassy; stamp visa (reference recording); reject visa (mandatory remark).",
    accessSurface: ["Kuwait Embassy Steps", "Consular Submissions", "Visa Stamping"],
  },

  // 4. Operations & Finance
  {
    name: "Ticket & Departure Officer",
    category: "Operations & Finance",
    description: "Travel coordinator managing flight itinerary booking, ticket upload, pre-departure fit medical, and departure dispatch.",
    permissionsSummary: "Record ticket details; log Medical 2 fit results; execute placement departure transition.",
    accessSurface: ["Tickets", "Medical 2 Gate", "Departure Execution"],
  },
  {
    name: "Finance Manager",
    category: "Operations & Finance",
    description: "Chief accountant managing transaction approvals, currency exchange rates, commission batching, and invoicing.",
    permissionsSummary: "Approve, reject, or void applicant transactions; batch commissions; generate PDF invoices; settle batches.",
    accessSurface: ["Financial Approvals", "Commission Batches", "Invoice PDF Exports", "FX Rates"],
  },
  {
    name: "Complaint Manager",
    category: "Operations & Finance",
    description: "Welfare officer managing applicant grievance intake, investigation aging, and dispute resolution.",
    permissionsSummary: "List, create, update, and resolve complaints; set country bans; view complaint aging metrics.",
    accessSurface: ["Complaints Queue", "Welfare Actions", "Country Bans"],
  },
  {
    name: "Communication Manager",
    category: "Operations & Finance",
    description: "Internal and agency messaging supervisor managing chat channels and external agency communication threads.",
    permissionsSummary: "Create internal/agency threads; post messages; attach documents; manage participant rosters.",
    accessSurface: ["Chat System", "Agency Channels"],
  },
];

export default function EmployeesPage() {
  const { authUser, roles } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("All");
  const [isDeskModalOpen, setIsDeskModalOpen] = React.useState<boolean>(false);

  const activeEmail = authUser?.email || "Unknown User";
  const activeFullName = authUser?.full_name || "Agency Staff";
  const activeRoles: string[] = Array.isArray(roles) ? roles.map((r) => String(r)) : [];

  // Filter canonical roles
  const filteredRoles = React.useMemo(() => {
    return CANONICAL_V2_ROLES.filter((r) => {
      if (selectedCategory !== "All" && r.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.permissionsSummary.toLowerCase().includes(q) ||
        r.accessSurface.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* Top Header & Honest Backend-Blocked Status Notice             */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Roles & Staff Governance
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
            >
              BACKEND-BLOCKED
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Authoritative RBAC role definitions and user administration governance for the V2 Travel Agency Workflow backend.
          </p>
        </div>

        <div>
          <Button
            type="button"
            onClick={() => setIsDeskModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold h-9 shadow-xs"
          >
            <Lock className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
            User Creation (Frappe Desk Only)
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Honest Architectural Status Banner                            */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-300 space-y-2 shadow-xs">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-950 dark:text-amber-200">
              User Creation & Credential Management is Handled via Frappe Desk
            </div>
            <p className="leading-relaxed text-amber-900/90 dark:text-amber-300/90">
              In accordance with strict security architecture and the V2 Frappe backend contract, internal user provisioning, account creation, password resets, and session revocations are <strong>intentionally not exposed</strong> through frontend RPC methods.
              To create new employee records or alter role grants, administrators must use the authoritative <strong>Frappe Desk User Management</strong> console.
            </p>
            <div className="pt-1.5 flex items-center gap-3">
              <a
                href="https://agencytracking-production.up.railway.app/app/user"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-amber-950 dark:text-amber-200 hover:underline"
              >
                Open Frappe Desk (/app/user)
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-amber-400">•</span>
              <span className="text-[11px] text-amber-800/80 dark:text-amber-400/80">
                Requires System Manager or Administrator privileges.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Current Active Session & Role Profile                         */}
      {/* ------------------------------------------------------------- */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-[#272730] bg-white dark:bg-[#121216] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-800 dark:text-emerald-400 font-bold text-sm">
              {activeFullName
                .split(/\s+/)
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "ME"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeFullName}
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400"
                >
                  Active Session
                </Badge>
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                User.name (Email): <strong>{activeEmail}</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              Assigned Security Roles:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeRoles.length > 0 ? (
                activeRoles.map((role: string) => (
                  <Badge
                    key={role}
                    variant="outline"
                    className="text-[10px] font-semibold bg-slate-100 dark:bg-[#181822] text-slate-800 dark:text-zinc-200 border-slate-200 dark:border-[#282835]"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" />
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-slate-400">No specific roles detected</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Canonical 16 Roles Architecture Explorer                      */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Canonical V2 RBAC Architecture (16 Sourced Roles)
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Role permissions strictly enforced in the backend state machine and API routers per <code className="font-mono text-[11px]">roles.py</code>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles or access..."
                className="h-8 pl-8 text-xs w-48 sm:w-60"
              />
            </div>

            <select
              aria-label="Filter roles by category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-[#2a2a35] bg-white dark:bg-[#14141a] text-slate-700 dark:text-zinc-300"
            >
              <option value="All">All Categories</option>
              <option value="Core & Admin">Core & Admin</option>
              <option value="Intake & Registry">Intake & Registry</option>
              <option value="Clearance Pipeline">Clearance Pipeline</option>
              <option value="Operations & Finance">Operations & Finance</option>
            </select>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredRoles.map((role) => (
            <div
              key={role.name}
              className="rounded-xl border border-slate-200 dark:border-[#24242e] bg-white dark:bg-[#121216] p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 dark:hover:border-[#323240] transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {role.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 font-medium",
                      role.category === "Core & Admin" && "border-purple-300 text-purple-700 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20",
                      role.category === "Intake & Registry" && "border-blue-300 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20",
                      role.category === "Clearance Pipeline" && "border-emerald-300 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20",
                      role.category === "Operations & Finance" && "border-amber-300 text-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20"
                    )}
                  >
                    {role.category}
                  </Badge>
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {role.description}
                </p>

                <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#181820] text-[11px] text-slate-700 dark:text-zinc-300">
                  <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">
                    Authority:
                  </span>
                  {role.permissionsSummary}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-[#1e1e24]">
                <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                  Access Surface:
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {role.accessSurface.map((surface) => (
                    <span
                      key={surface}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#1a1a22] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#272732]"
                    >
                      {surface}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Frappe Desk Guidance Dialog                                   */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isDeskModalOpen} onOpenChange={setIsDeskModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#121215] border-slate-200 dark:border-[#222227] text-slate-900 dark:text-white p-6">
          <DialogHeader className="border-b border-slate-100 dark:border-[#1e1e24] pb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-700 dark:text-amber-400">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  User Management is Backend-Blocked
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                  User creation and password management are handled exclusively in Frappe Desk.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
            <p>
              The V2 production backend does not expose any frontend RPC endpoint for creating internal employee accounts. Attempting to create accounts via obsolete endpoints will trigger permission or whitelisting errors.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#181820] border border-slate-200 dark:border-[#252530] space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white block">
                Official User Provisioning Workflow:
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600 dark:text-zinc-300">
                <li>Log in to Frappe Desk with Administrator credentials.</li>
                <li>Navigate to <strong>User</strong> list (<code className="font-mono text-[10px]">/app/user</code>).</li>
                <li>Click <strong>Add User</strong>, enter email and full name.</li>
                <li>Assign the appropriate canonical V2 roles (e.g. <em>Registrar</em>, <em>Saudi LMIS</em>, <em>Manager</em>).</li>
                <li>The user will immediately be able to authenticate into this frontend portal.</li>
              </ol>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-[#1e1e24] pt-3 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeskModalOpen(false)}
              className="text-xs h-9"
            >
              Close
            </Button>

            <a
              href="https://agencytracking-production.up.railway.app/app/user"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                type="button"
                className="bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-semibold h-9 shadow-xs"
              >
                Open Frappe Desk
                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
