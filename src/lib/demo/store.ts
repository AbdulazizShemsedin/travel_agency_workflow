/**
 * Centralized Demo Reactive Store
 * 
 * Manages mutable in-memory demo data conforming to V2 backend schemas.
 * Allows client demonstrations to walk the complete Golden Path:
 * Registration -> Placement -> Corridor Clearances -> Embassy -> Ticketing -> Departure -> Commission -> Warranty
 */

import { V2ApplicantDetails } from "@/lib/api/v2/applicants";
import { V2PlacementRecord } from "@/lib/api/v2/placements";
import { V2ClearanceStep } from "@/lib/api/v2/clearance";
import { V2ContractorRecord } from "@/lib/api/v2/contractors";
import { V2ComplaintRecord } from "@/lib/api/v2/complaints";
import { V2OwedCommissionItem, V2CommissionBatch } from "@/lib/api/v2/finance";
import {
  V2FinancialOverviewReport,
  V2DailyWorkReport,
  V2StaffPerformanceItem,
  V2OperationsSummary,
  V2PlacementAgingReport,
} from "@/lib/api/v2/reports";

import { DEMO_APPLICANTS } from "./applicants";
import { DEMO_PLACEMENTS } from "./placements";
import { DEMO_CLEARANCE_STEPS } from "./clearances";
import { DEMO_CONTRACTORS } from "./contractors";
import { DEMO_COMPLAINTS } from "./complaints";
import {
  DEMO_FINANCIAL_OVERVIEW,
  DEMO_OWED_COMMISSIONS,
  DEMO_COMMISSION_BATCHES,
  DEMO_FX_RATES,
} from "./finance";
import {
  DEMO_DAILY_WORK_REPORT,
  DEMO_STAFF_PERFORMANCE,
  DEMO_OPERATIONS_SUMMARY,
  DEMO_PLACEMENT_AGING,
} from "./reports";
import { DEMO_USERS } from "./users";

export interface DemoSystemUserRecord {
  name: string;
  email: string;
  first_name: string;
  last_name?: string;
  full_name: string;
  phone?: string;
  enabled: number | boolean;
  user_type: string;
  roles: string[];
  contractor?: string | null;
  last_login?: string;
  creation?: string;
}

const INITIAL_DEMO_USERS: DemoSystemUserRecord[] = Object.entries(DEMO_USERS).map(([key, u]) => {
  const parts = u.full_name.split(" ");
  const firstName = parts[0] || u.full_name;
  const lastName = parts.slice(1).join(" ") || "";
  return {
    name: u.email,
    email: u.email,
    first_name: firstName,
    last_name: lastName,
    full_name: u.full_name,
    phone: "+251 91 123 4567",
    enabled: 1,
    user_type: "System User",
    roles: [...u.roles],
    creation: "2026-01-15 09:00:00",
  };
});

class DemoStore {
  private applicants: V2ApplicantDetails[] = [...DEMO_APPLICANTS];
  private placements: V2PlacementRecord[] = [...DEMO_PLACEMENTS];
  private clearanceSteps: V2ClearanceStep[] = [...DEMO_CLEARANCE_STEPS];
  private contractors: V2ContractorRecord[] = [...DEMO_CONTRACTORS];
  private complaints: V2ComplaintRecord[] = [...DEMO_COMPLAINTS];
  private owedCommissions: V2OwedCommissionItem[] = [...DEMO_OWED_COMMISSIONS];
  private commissionBatches: V2CommissionBatch[] = [...DEMO_COMMISSION_BATCHES];
  private users: DemoSystemUserRecord[] = [...INITIAL_DEMO_USERS];
  private isLoadedFromStorage = false;

  constructor() {
    this.loadStorage();
  }

  private loadStorage() {
    if (typeof window === "undefined") return;
    try {
      const storedApps = localStorage.getItem("V2_DEMO_APPLICANTS");
      if (storedApps) {
        const parsed = JSON.parse(storedApps);
        this.applicants = parsed.map((a: any) => ({
          contract_number: "2005450415",
          visa_number: "1908334046",
          sponsor_name: "ABDULLAH AMER MUGHABBIRI ALBARIQI",
          sponsor_id: "1130373143",
          sponsor_phone: "966503221802",
          destination_city: "Riyadh",
          contractor_name: "Tihamat Asir Recruitment company",
          contract_signed_date: "2026-08-13",
          appointment_date: "2026-08-25",
          ...a,
        }));
      }

      const storedPlc = localStorage.getItem("V2_DEMO_PLACEMENTS");
      if (storedPlc) {
        const parsedPlc = JSON.parse(storedPlc);
        this.placements = parsedPlc.map((p: any) => ({
          contract_number: "2005450415",
          visa_number: "1908334046",
          employer_name: "ABDULLAH AMER MUGHABBIRI ALBARIQI",
          employer_national_id: "1130373143",
          employer_phone: "966503221802",
          contractor_name: "Tihamat Asir Recruitment company",
          contract_signed_date: "2026-08-13",
          appointment_date: "2026-08-25",
          ...p,
        }));
      }

      const storedSteps = localStorage.getItem("V2_DEMO_STEPS");
      if (storedSteps) {
        const parsedSteps = JSON.parse(storedSteps);
        this.clearanceSteps = parsedSteps.map((s: any) => ({
          appointment_date: s.appointment_date || "2026-08-25",
          ...s,
        }));
      }

      const storedComps = localStorage.getItem("V2_DEMO_COMPLAINTS");
      if (storedComps) this.complaints = JSON.parse(storedComps);

      const storedCon = localStorage.getItem("V2_DEMO_CONTRACTORS");
      if (storedCon) this.contractors = JSON.parse(storedCon);

      const storedComm = localStorage.getItem("V2_DEMO_COMMISSIONS");
      if (storedComm) this.owedCommissions = JSON.parse(storedComm);

      const storedUsers = localStorage.getItem("V2_DEMO_USERS");
      if (storedUsers) this.users = JSON.parse(storedUsers);

      this.isLoadedFromStorage = true;
    } catch (e) {
      console.warn("DemoStore load storage warning:", e);
    }
  }

  private saveStorage() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("V2_DEMO_APPLICANTS", JSON.stringify(this.applicants));
      localStorage.setItem("V2_DEMO_PLACEMENTS", JSON.stringify(this.placements));
      localStorage.setItem("V2_DEMO_STEPS", JSON.stringify(this.clearanceSteps));
      localStorage.setItem("V2_DEMO_COMPLAINTS", JSON.stringify(this.complaints));
      localStorage.setItem("V2_DEMO_CONTRACTORS", JSON.stringify(this.contractors));
      localStorage.setItem("V2_DEMO_COMMISSIONS", JSON.stringify(this.owedCommissions));
      localStorage.setItem("V2_DEMO_USERS", JSON.stringify(this.users));
    } catch (e) {
      console.warn("DemoStore save storage warning:", e);
    }
  }

  public resetToDefaults() {
    this.applicants = [...DEMO_APPLICANTS];
    this.placements = [...DEMO_PLACEMENTS];
    this.clearanceSteps = [...DEMO_CLEARANCE_STEPS];
    this.contractors = [...DEMO_CONTRACTORS];
    this.users = [...INITIAL_DEMO_USERS];
    this.complaints = [...DEMO_COMPLAINTS];
    this.owedCommissions = [...DEMO_OWED_COMMISSIONS];
    this.commissionBatches = [...DEMO_COMMISSION_BATCHES];
    this.saveStorage();
  }

  // --- APPLICANTS ---
  public getApplicants(): V2ApplicantDetails[] {
    return [...this.applicants];
  }

  public getApplicant(nameOrId: string): V2ApplicantDetails | undefined {
    return this.applicants.find(
      (a) => a.name === nameOrId || a.passport_number === nameOrId
    );
  }

  public createApplicant(data: Partial<V2ApplicantDetails>): V2ApplicantDetails {
    const id = `APP-2026-${String(this.applicants.length + 101).padStart(5, "0")}`;
    const newApp: V2ApplicantDetails = {
      name: id,
      applicant_name: data.full_name || `${data.first_name || "Applicant"} ${data.last_name || ""}`.trim(),
      full_name: data.full_name || `${data.first_name || "Applicant"} ${data.last_name || ""}`.trim(),
      first_name: data.first_name || "Applicant",
      middle_name: data.middle_name || "",
      last_name: data.last_name || "",
      entry_track: (data.entry_track as any) || "Standard",
      status: "Draft",
      applicant_state: "Draft",
      passport_number: data.passport_number || `EP${Math.floor(1000000 + Math.random() * 9000000)}`,
      passport_expiry: data.passport_expiry || "2031-01-01",
      national_id: data.national_id || `ET-NID-${Math.floor(100000 + Math.random() * 900000)}`,
      phone: data.phone || "+251 90 000 0000",
      gender: data.gender || "Female",
      date_of_birth: data.date_of_birth || "1998-01-01",
      age: data.age || 28,
      marital_status: data.marital_status || "Single",
      religion: data.religion || "Muslim",
      nationality: data.nationality || "Ethiopian",
      destination_country: data.destination_country || "Saudi Arabia",
      target_job: data.target_job || "Housemaid",
      applicant_type: data.applicant_type || "Standard",
      medical_status: data.medical_status || "Pending",
      coc_status: data.coc_status || "Pending",
      experience_level: data.experience_level || "First Time",
      experience_years: data.experience_years || 0,
      registration_fee_status: "Pending",
      photo_url: data.photo_url || "/placeholder-user.jpg",
      creation: new Date().toISOString().replace("T", " ").substring(0, 19),
      modified: new Date().toISOString().replace("T", " ").substring(0, 19),
      income_expense_logs: [],
      ...data,
    };
    this.applicants.unshift(newApp);
    this.saveStorage();
    return newApp;
  }

  public updateApplicant(name: string, updates: Partial<V2ApplicantDetails>): V2ApplicantDetails {
    const idx = this.applicants.findIndex((a) => a.name === name);
    if (idx >= 0) {
      this.applicants[idx] = {
        ...this.applicants[idx],
        ...updates,
        modified: new Date().toISOString().replace("T", " ").substring(0, 19),
      };
      this.saveStorage();
      return this.applicants[idx];
    }
    throw new Error(`Applicant ${name} not found in demo state`);
  }

  public registerApplicant(name: string): V2ApplicantDetails {
    return this.updateApplicant(name, {
      applicant_state: "Registered",
      medical_status: "FIT",
      coc_status: "Passed",
      registration_fee_status: "Paid",
    });
  }

  public generateCv(name: string): V2ApplicantDetails {
    return this.updateApplicant(name, {
      applicant_state: "CV Generated",
      cv_url: `/applicants/${name}/cv`,
    });
  }

  public cancelApplicant(name: string, reason: string): V2ApplicantDetails {
    return this.updateApplicant(name, {
      applicant_state: "Cancelled",
      cancellation_reason: reason,
    });
  }

  // --- PLACEMENTS ---
  public getPlacements(): V2PlacementRecord[] {
    return [...this.placements];
  }

  public getPlacement(name: string): V2PlacementRecord | undefined {
    return this.placements.find((p) => p.name === name);
  }

  public selectCandidate(applicantName: string, contractorName: string): { placement: V2PlacementRecord; applicant: V2ApplicantDetails } {
    const app = this.getApplicant(applicantName);
    if (!app) throw new Error(`Applicant ${applicantName} not found`);

    const contractor = this.contractors.find((c) => c.name === contractorName || c.contractor_name === contractorName) || this.contractors[0];
    const plcId = `PLC-2026-${String(this.placements.length + 1).padStart(4, "0")}`;

    const newPlc: V2PlacementRecord = {
      name: plcId,
      applicant: app.name,
      full_name: app.full_name || app.first_name,
      applicant_name: app.full_name || app.first_name,
      passport_number: app.passport_number,
      contractor: contractor.name,
      contractor_name: contractor.contractor_name,
      destination_country: app.destination_country || contractor.country || "Saudi Arabia",
      target_job: app.target_job || "Housemaid",
      status: "Selected",
      corridor_state: "Initiated",
      medical_selected_status: app.medical_status === "FIT" ? "FIT" : "Pending",
      is_muayena: app.applicant_type === "Muayena" ? 1 : 0,
      creation: new Date().toISOString().replace("T", " ").substring(0, 19),
      modified: new Date().toISOString().replace("T", " ").substring(0, 19),
    };

    this.placements.unshift(newPlc);

    // Update Applicant
    const updatedApp = this.updateApplicant(app.name, {
      applicant_state: "Selected",
      active_placement: plcId,
      selected_by: contractor.name,
      locked_contractor: contractor.name,
    });

    // Create Corridor Clearance Steps
    const isSaudi = (newPlc.destination_country || "").toLowerCase().includes("saudi");
    if (isSaudi) {
      this.clearanceSteps.push(
        {
          name: `STEP-${Date.now()}-1`,
          placement: plcId,
          step_type: "LMIS Clearance",
          sequence_order: 1,
          is_mandatory: 1,
          status: "Pending",
          amount: 150,
          payment_status: "Unpaid",
          assigned_officer: "officer_saudi_lmis@agency.com",
        },
        {
          name: `STEP-${Date.now()}-2`,
          placement: plcId,
          step_type: "Taeshir",
          sequence_order: 2,
          is_mandatory: 1,
          status: "Pending",
          amount: 380,
          payment_status: "Unpaid",
          assigned_officer: "officer_taeshir@agency.com",
        },
        {
          name: `STEP-${Date.now()}-3`,
          placement: plcId,
          step_type: "Embassy",
          sequence_order: 3,
          is_mandatory: 1,
          status: "Pending",
          amount: 600,
          payment_status: "Unpaid",
          assigned_officer: "officer_saudi_embassy@agency.com",
        }
      );
    } else {
      this.clearanceSteps.push(
        {
          name: `STEP-${Date.now()}-1`,
          placement: plcId,
          step_type: "Kuwait LMIS",
          sequence_order: 1,
          is_mandatory: 1,
          status: "Pending",
          amount: 180,
          payment_status: "Unpaid",
          assigned_officer: "officer_kuwait_lmis@agency.com",
        },
        {
          name: `STEP-${Date.now()}-2`,
          placement: plcId,
          step_type: "Telesign",
          sequence_order: 2,
          is_mandatory: 1,
          status: "Pending",
          amount: 220,
          payment_status: "Unpaid",
          assigned_officer: "officer_telesign@agency.com",
        },
        {
          name: `STEP-${Date.now()}-3`,
          placement: plcId,
          step_type: "Kuwait Embassy",
          sequence_order: 3,
          is_mandatory: 1,
          status: "Pending",
          amount: 550,
          payment_status: "Unpaid",
          assigned_officer: "officer_kuwait_embassy@agency.com",
        }
      );
    }

    this.saveStorage();
    return { placement: newPlc, applicant: updatedApp };
  }

  public advancePlacementToProcessing(placementName: string): V2PlacementRecord {
    const plc = this.getPlacement(placementName);
    if (!plc) throw new Error(`Placement ${placementName} not found`);

    plc.status = "Processing";
    plc.corridor_state = "In Clearance";
    plc.modified = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (plc.applicant) {
      this.updateApplicant(plc.applicant, { applicant_state: "Processing" });
    }

    this.saveStorage();
    return plc;
  }

  public advancePlacementToStamped(placementName: string, visaNumber?: string): V2PlacementRecord {
    const plc = this.getPlacement(placementName);
    if (!plc) throw new Error(`Placement ${placementName} not found`);

    plc.status = "Stamped";
    plc.corridor_state = "Completed";
    plc.visa_number = visaNumber || `VISA-${Math.floor(10000000 + Math.random() * 90000000)}`;
    plc.visa_issue_date = new Date().toISOString().split("T")[0];
    plc.modified = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (plc.applicant) {
      this.updateApplicant(plc.applicant, { applicant_state: "Stamped" });
    }

    // Auto-create Commission Item
    const commId = `COMM-2026-${String(this.owedCommissions.length + 1).padStart(4, "0")}`;
    this.owedCommissions.push({
      name: commId,
      placement: plc.name,
      applicant: plc.applicant,
      full_name: plc.full_name || plc.applicant_name,
      contractor: plc.contractor,
      contractor_name: plc.contractor_name,
      destination_country: plc.destination_country,
      commission_amount: plc.destination_country?.includes("Kuwait") ? 350 : 3500,
      amount: plc.destination_country?.includes("Kuwait") ? 350 : 3500,
      currency: plc.destination_country?.includes("Kuwait") ? "KWD" : "SAR",
      status: "Approved",
      creation: new Date().toISOString().replace("T", " ").substring(0, 19),
    });

    this.saveStorage();
    return plc;
  }

  public recordTicket(placementName: string, ticketData: { ticket_number: string; flight_date: string; airline?: string; pnr_code?: string }): V2PlacementRecord {
    const plc = this.getPlacement(placementName);
    if (!plc) throw new Error(`Placement ${placementName} not found`);

    plc.status = "Ticketed";
    plc.ticket_number = ticketData.ticket_number;
    plc.flight_date = ticketData.flight_date;
    plc.airline = ticketData.airline || "Ethiopian Airlines";
    plc.pnr_code = ticketData.pnr_code || "PNR" + Math.floor(1000 + Math.random() * 9000);
    plc.modified = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (plc.applicant) {
      this.updateApplicant(plc.applicant, { applicant_state: "Ticketed" });
    }

    this.saveStorage();
    return plc;
  }

  public recordDeparture(placementName: string, departedOn?: string): V2PlacementRecord {
    const plc = this.getPlacement(placementName);
    if (!plc) throw new Error(`Placement ${placementName} not found`);

    plc.status = "Departed";
    plc.departed_on = departedOn || new Date().toISOString().split("T")[0];
    plc.arrival_confirmed = 1;
    plc.medical_2_status = "FIT";
    plc.medical_2_date = new Date().toISOString().split("T")[0];
    plc.modified = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (plc.applicant) {
      this.updateApplicant(plc.applicant, { applicant_state: "Departed" });
    }

    this.saveStorage();
    return plc;
  }

  // --- CLEARANCE STEPS ---
  public getClearanceSteps(placementName?: string): V2ClearanceStep[] {
    if (placementName) {
      return this.clearanceSteps.filter((s) => s.placement === placementName);
    }
    return [...this.clearanceSteps];
  }

  public updateClearanceStep(stepName: string, updates: Partial<V2ClearanceStep>): V2ClearanceStep {
    const idx = this.clearanceSteps.findIndex((s) => s.name === stepName);
    if (idx >= 0) {
      this.clearanceSteps[idx] = {
        ...this.clearanceSteps[idx],
        ...updates,
        modified: new Date().toISOString().replace("T", " ").substring(0, 19),
      };

      const updated = this.clearanceSteps[idx];
      const plc = updated.placement ? this.getPlacement(updated.placement) : undefined;

      // Check if all steps for this placement are completed/stamped
      const siblingSteps = updated.placement ? this.clearanceSteps.filter((s) => s.placement === updated.placement) : [];
      const allDone = siblingSteps.every((s) => s.status === "Completed" || s.status === "Stamped" || s.status === "Issued");

      if (allDone && plc && plc.status === "Processing") {
        this.advancePlacementToStamped(plc.name);
      }

      this.saveStorage();
      return updated;
    }
    throw new Error(`Clearance step ${stepName} not found`);
  }

  // --- CONTRACTORS ---
  public getContractors(): V2ContractorRecord[] {
    return [...this.contractors];
  }

  public createContractor(data: Partial<V2ContractorRecord>): V2ContractorRecord {
    const id = `CON-${String(this.contractors.length + 1).padStart(3, "0")}`;
    const newCon: V2ContractorRecord = {
      name: id,
      contractor_name: data.contractor_name || data.company_name || "New Foreign Agency",
      company_name: data.contractor_name || data.company_name || "New Foreign Agency",
      country: data.country || "Saudi Arabia",
      user_email: data.user_email || data.email || `agency_${Date.now()}@partner.com`,
      user_first_name: data.user_first_name || data.contact_person || "Agency Contact",
      contact_person: data.contact_person || "Agency Contact",
      phone: data.phone || "+966 50 000 0000",
      whatsapp: data.whatsapp || data.phone || "+966 50 000 0000",
      email: data.email || `agency_${Date.now()}@partner.com`,
      active_status: 1,
      creation: new Date().toISOString().replace("T", " ").substring(0, 19),
      modified: new Date().toISOString().replace("T", " ").substring(0, 19),
      ...data,
    };
    this.contractors.push(newCon);
    this.saveStorage();
    return newCon;
  }

  // --- COMPLAINTS ---
  public getComplaints(): V2ComplaintRecord[] {
    return [...this.complaints];
  }

  public createComplaint(placementName: string, description: string, workerStatus: string): V2ComplaintRecord {
    const plc = this.getPlacement(placementName);
    const id = `COMP-2026-${String(this.complaints.length + 1).padStart(4, "0")}`;
    const newComp: V2ComplaintRecord = {
      name: id,
      placement: placementName,
      applicant: plc?.applicant,
      full_name: plc?.full_name || plc?.applicant_name || "Candidate",
      contractor: plc?.contractor,
      contractor_name: plc?.contractor_name,
      status: "New",
      description,
      worker_status_at_complaint: workerStatus,
      days_unresolved: 0,
      creation: new Date().toISOString().replace("T", " ").substring(0, 19),
      modified: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    this.complaints.unshift(newComp);
    this.saveStorage();
    return newComp;
  }

  public resolveComplaint(name: string, resolutionStatus: string, notes?: string): V2ComplaintRecord {
    const idx = this.complaints.findIndex((c) => c.name === name);
    if (idx >= 0) {
      this.complaints[idx] = {
        ...this.complaints[idx],
        status: resolutionStatus,
        resolution_notes: notes || "Dispute resolved and logged in warranty registry.",
        modified: new Date().toISOString().replace("T", " ").substring(0, 19),
      };
      this.saveStorage();
      return this.complaints[idx];
    }
    throw new Error(`Complaint ${name} not found`);
  }

  // --- FINANCE & COMMISSIONS ---
  public getFinancialOverview(): V2FinancialOverviewReport {
    return { ...DEMO_FINANCIAL_OVERVIEW };
  }

  public getOwedCommissions(contractor?: string, destinationCountry?: string): V2OwedCommissionItem[] {
    return this.owedCommissions.filter((c) => {
      if (contractor && c.contractor !== contractor && c.contractor_name !== contractor) return false;
      if (destinationCountry && c.destination_country !== destinationCountry) return false;
      return true;
    });
  }

  public settleBatch(batchName: string, settlementRef: string): { message: string } {
    const batch = this.commissionBatches.find((b) => b.name === batchName);
    if (batch) {
      batch.status = "Settled";
      batch.settlement_reference = settlementRef;
    }
    this.owedCommissions.forEach((item) => {
      if (item.batch === batchName || !item.batch) {
        item.status = "Settled";
      }
    });
    this.saveStorage();
    return { message: `Batch ${batchName} settled successfully` };
  }

  // --- REPORTS ---
  public getOperationsSummary(): V2OperationsSummary {
    return { ...DEMO_OPERATIONS_SUMMARY };
  }

  public getDailyWorkReport(): V2DailyWorkReport {
    return { ...DEMO_DAILY_WORK_REPORT };
  }

  public getStaffPerformance(): V2StaffPerformanceItem[] {
    return [...DEMO_STAFF_PERFORMANCE];
  }

  // --- SYSTEM USERS & ROLES ---
  public getUsers(params?: { search?: string; role?: string; enabled?: number | boolean }): DemoSystemUserRecord[] {
    return this.users.filter((u) => {
      if (params?.search) {
        const q = params.search.toLowerCase();
        const matchName = (u.full_name || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (params?.role && params.role !== "All" && !u.roles.includes(params.role)) {
        return false;
      }
      if (params?.enabled !== undefined && u.enabled !== params.enabled && Number(u.enabled) !== Number(params.enabled)) {
        return false;
      }
      return true;
    });
  }

  public createUser(payload: {
    email: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    password?: string;
    roles: string[];
    contractor?: string | null;
    user_type?: string;
  }): DemoSystemUserRecord {
    const fullName = `${payload.first_name || ""} ${payload.last_name || ""}`.trim() || payload.first_name || "New User";
    const existing = this.users.find((u) => u.email.toLowerCase() === payload.email.toLowerCase());
    if (existing) {
      existing.first_name = payload.first_name || existing.first_name;
      existing.last_name = payload.last_name || existing.last_name;
      existing.full_name = fullName;
      existing.phone = payload.phone || existing.phone;
      existing.roles = payload.roles && payload.roles.length > 0 ? payload.roles : existing.roles;
      existing.contractor = payload.contractor !== undefined ? payload.contractor : existing.contractor;
      this.saveStorage();
      return existing;
    }

    const newUser: DemoSystemUserRecord = {
      name: payload.email,
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name || "",
      full_name: fullName,
      phone: payload.phone || "+251 91 000 0000",
      enabled: 1,
      user_type: payload.user_type || "System User",
      roles: payload.roles && payload.roles.length > 0 ? payload.roles : ["Registrar"],
      contractor: payload.contractor || null,
      creation: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    this.users.unshift(newUser);
    this.saveStorage();
    return newUser;
  }

  public updateUser(payload: {
    user: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    enabled?: number | boolean;
    roles?: string[];
    contractor?: string | null;
  }): DemoSystemUserRecord {
    const user = this.users.find((u) => u.email.toLowerCase() === payload.user.toLowerCase() || u.name.toLowerCase() === payload.user.toLowerCase());
    if (!user) throw new Error(`User ${payload.user} not found`);

    if (payload.first_name !== undefined) user.first_name = payload.first_name;
    if (payload.last_name !== undefined) user.last_name = payload.last_name;
    user.full_name = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.name;
    if (payload.phone !== undefined) user.phone = payload.phone;
    if (payload.enabled !== undefined) user.enabled = payload.enabled;
    if (payload.roles !== undefined) user.roles = payload.roles;
    if (payload.contractor !== undefined) user.contractor = payload.contractor;

    this.saveStorage();
    return user;
  }

  public setUserPassword(payload: { user: string; new_password: string }): { status: string; message: string } {
    return { status: "success", message: `Password updated successfully for ${payload.user}` };
  }

  public assignUserRoles(payload: { user: string; roles: string[]; replace?: boolean }): { status: string; roles: string[] } {
    const user = this.users.find((u) => u.email.toLowerCase() === payload.user.toLowerCase() || u.name.toLowerCase() === payload.user.toLowerCase());
    if (user) {
      user.roles = payload.replace ? payload.roles : Array.from(new Set([...user.roles, ...payload.roles]));
      this.saveStorage();
      return { status: "success", roles: user.roles };
    }
    return { status: "success", roles: payload.roles };
  }

  public getPlacementAging(): V2PlacementAgingReport {
    return { ...DEMO_PLACEMENT_AGING };
  }
}

export const demoStore = new DemoStore();
