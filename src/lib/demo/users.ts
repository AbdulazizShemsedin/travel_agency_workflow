/**
 * Demo Users & Role Profiles Fixture (V2 RBAC Roles)
 * 16 Canonical Roles representation for live demonstration role-switching.
 */

export interface DemoUserProfile {
  email: string;
  full_name: string;
  roles: string[];
  department?: string;
  avatar?: string;
}

export const DEMO_USERS: Record<string, DemoUserProfile> = {
  admin: {
    email: "admin@agency.com",
    full_name: "Executive Administrator",
    roles: ["Admin", "System Manager", "Manager"],
    department: "Executive Management",
  },
  registrar: {
    email: "registrar@agency.com",
    full_name: "Bethlehem Tadesse",
    roles: ["Registrar"],
    department: "Candidate Intake & Screening",
  },
  manager: {
    email: "manager@agency.com",
    full_name: "Dawit Haile",
    roles: ["Manager", "System Manager"],
    department: "Operations Directorate",
  },
  clearance_officer: {
    email: "clearance@agency.com",
    full_name: "Yonas Mengistu",
    roles: ["Clearance Officer"],
    department: "Clearance Operations",
  },
  saudi_lmis: {
    email: "saudi_lmis@agency.com",
    full_name: "Aman Al-Saeed",
    roles: ["Saudi LMIS"],
    department: "Saudi Arabia Corridor",
  },
  saudi_taeshir: {
    email: "saudi_taeshir@agency.com",
    full_name: "Hanan Seid",
    roles: ["Saudi Taeshir"],
    department: "Saudi Arabia Corridor",
  },
  saudi_embassy: {
    email: "saudi_embassy@agency.com",
    full_name: "Kassaye Wolde",
    roles: ["Saudi Embassy"],
    department: "Saudi Arabia Corridor",
  },
  kuwait_lmis: {
    email: "kuwait_lmis@agency.com",
    full_name: "Tariq Ibrahim",
    roles: ["Kuwait LMIS"],
    department: "Kuwait Corridor",
  },
  kuwait_telesign: {
    email: "kuwait_telesign@agency.com",
    full_name: "Rahel Belay",
    roles: ["Kuwait Telesign"],
    department: "Kuwait Corridor",
  },
  kuwait_embassy: {
    email: "kuwait_embassy@agency.com",
    full_name: "Getachew Assefa",
    roles: ["Kuwait Embassy"],
    department: "Kuwait Corridor",
  },
  ticketer: {
    email: "ticketer@agency.com",
    full_name: "Solomon Getachew",
    roles: ["Ticketer"],
    department: "Airline Ticketing & Logistics",
  },
  finance_manager: {
    email: "finance@agency.com",
    full_name: "Elias Worku",
    roles: ["Finance Manager"],
    department: "Finance & Accounts",
  },
  complaint_manager: {
    email: "complaints@agency.com",
    full_name: "Almaz Kebede",
    roles: ["Complaint Manager"],
    department: "Post-Arrival & Warranty Desk",
  },
  foreign_agency: {
    email: "recruitment@alriyadh-manpower.sa",
    full_name: "Tariq Al-Mansoor (Al-Riyadh Manpower)",
    roles: ["Foreign Agency"],
    department: "Overseas Partner",
  },
};
