// System-wide registry of registered applicants, complaints, and contractor allocations
export interface SystemApplicantRecord {
  name: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name: string;
  gender: "Female" | "Male";
  age: number;
  date_of_birth: string;
  nationality: string;
  destination_country: string;
  job_applied: string;
  monthly_salary: number;
  photo_passport: string;
  photo_full_body: string;
  passport_number: string;
  passport_issue_date?: string;
  passport_expiry?: string;
  place_of_issue?: string;
  marital_status?: string;
  children?: number;
  education?: string;
  religion: string;
  experience_country: string;
  experience_period: string;
  skill_cleaning: number;
  skill_cooking: number;
  skill_arabic_cooking: number;
  skill_baby_sitting: number;
  skill_washing: number;
  skill_ironing: number;
  skill_elderly_care: number;
  applicant_state: string;
  state_step?: string;
  state_progress?: number;
  cv_file_url?: string;
  selected_by?: string | null;
  locked_contractor?: string | null;
  selected_at?: string;
  dossier_name?: string;
  sponsor_name?: string;
  visa_number?: string;
  contract_date?: string;
  contract_duration?: string;
  airline?: string;
  flight_number?: string;
  flight_date?: string;
  route?: string;
  departure_time?: string;
  departure_status?: string;
}

export const INITIAL_SYSTEM_APPLICANTS: SystemApplicantRecord[] = [
  {
    name: "APP-00001",
    first_name: "Sara",
    middle_name: "Dawit",
    last_name: "Mengistu",
    full_name: "Sara Dawit Mengistu",
    gender: "Female",
    age: 26,
    date_of_birth: "1999-04-12",
    nationality: "Ethiopia",
    destination_country: "Saudi Arabia",
    job_applied: "Housemaid",
    monthly_salary: 1200,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP9928172",
    passport_issue_date: "2023-01-15",
    passport_expiry: "2028-01-14",
    place_of_issue: "Addis Ababa",
    marital_status: "Single",
    children: 0,
    education: "High School",
    religion: "Muslim",
    experience_country: "Kuwait",
    experience_period: "2 Years",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 1,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 0,
    applicant_state: "Registered",
    state_step: "2 of 9",
    state_progress: 22.2,
    cv_file_url: "/private/files/CV-APP-00001.pdf",
    selected_by: null,
    locked_contractor: null,
  },
  {
    name: "APP-00002",
    first_name: "Fatima",
    middle_name: "Zahra",
    last_name: "Ali",
    full_name: "Fatima Zahra Ali",
    gender: "Female",
    age: 24,
    date_of_birth: "2001-08-20",
    nationality: "Ethiopia",
    destination_country: "Saudi Arabia",
    job_applied: "Housemaid",
    monthly_salary: 1200,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP1234567",
    passport_issue_date: "2022-06-10",
    passport_expiry: "2027-06-09",
    place_of_issue: "Addis Ababa",
    marital_status: "Single",
    children: 0,
    education: "Secondary School",
    religion: "Muslim",
    experience_country: "Saudi Arabia",
    experience_period: "3 Years",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 1,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 0,
    applicant_state: "Registered",
    state_step: "2 of 9",
    state_progress: 22.2,
    cv_file_url: "/private/files/CV-APP-00002.pdf",
    selected_by: null,
    locked_contractor: null,
  },
  {
    name: "APP-00003",
    first_name: "Marta",
    middle_name: "Bekele",
    last_name: "Tadesse",
    full_name: "Marta Bekele Tadesse",
    gender: "Female",
    age: 27,
    date_of_birth: "1998-11-05",
    nationality: "Ethiopia",
    destination_country: "Kuwait",
    job_applied: "Nanny / Childcare",
    monthly_salary: 1400,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP3456789",
    passport_issue_date: "2023-03-22",
    passport_expiry: "2028-03-21",
    place_of_issue: "Addis Ababa",
    marital_status: "Single",
    children: 0,
    education: "Diploma in Child Care",
    religion: "Orthodox",
    experience_country: "UAE",
    experience_period: "2.5 Years",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 0,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 1,
    applicant_state: "CV Generated",
    state_step: "3 of 9",
    state_progress: 33.3,
    cv_file_url: "/private/files/CV-APP-00003.pdf",
    selected_by: null,
    locked_contractor: null,
  },
  {
    name: "APP-00004",
    first_name: "Amina",
    middle_name: "Yusuf",
    last_name: "Ibrahim",
    full_name: "Amina Yusuf Ibrahim",
    gender: "Female",
    age: 29,
    date_of_birth: "1996-03-14",
    nationality: "Ethiopia",
    destination_country: "Saudi Arabia",
    job_applied: "Cook / Arabic Cuisine",
    monthly_salary: 1500,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP4567890",
    passport_issue_date: "2021-09-18",
    passport_expiry: "2026-09-17",
    place_of_issue: "Addis Ababa",
    marital_status: "Married",
    children: 1,
    education: "Culinary Certificate",
    religion: "Muslim",
    experience_country: "Jordan",
    experience_period: "4 Years",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 1,
    skill_baby_sitting: 0,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 0,
    applicant_state: "Registered",
    state_step: "2 of 9",
    state_progress: 22.2,
    cv_file_url: "/private/files/CV-APP-00004.pdf",
    selected_by: null,
    locked_contractor: null,
  },
  {
    name: "APP-00005",
    first_name: "Yordanos",
    middle_name: "Hailu",
    last_name: "Wolde",
    full_name: "Yordanos Hailu Wolde",
    gender: "Female",
    age: 23,
    date_of_birth: "2002-09-18",
    nationality: "Ethiopia",
    destination_country: "Kuwait",
    job_applied: "Housemaid",
    monthly_salary: 1100,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP5678901",
    passport_issue_date: "2023-08-11",
    passport_expiry: "2028-08-10",
    place_of_issue: "Addis Ababa",
    marital_status: "Single",
    children: 0,
    education: "High School",
    religion: "Protestant",
    experience_country: "First Time",
    experience_period: "First Time",
    skill_cleaning: 1,
    skill_cooking: 0,
    skill_arabic_cooking: 0,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 0,
    applicant_state: "Registered",
    state_step: "2 of 9",
    state_progress: 22.2,
    cv_file_url: "/private/files/CV-APP-00005.pdf",
    selected_by: null,
    locked_contractor: null,
  },
  {
    name: "APP-00006",
    first_name: "Ahmed",
    middle_name: "Kemal",
    last_name: "Hassan",
    full_name: "Ahmed Kemal Hassan",
    gender: "Male",
    age: 31,
    date_of_birth: "1994-06-25",
    nationality: "Ethiopia",
    destination_country: "Saudi Arabia",
    job_applied: "Private Driver",
    monthly_salary: 1800,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP6789012",
    passport_issue_date: "2020-04-05",
    passport_expiry: "2025-04-04",
    place_of_issue: "Addis Ababa",
    marital_status: "Married",
    children: 2,
    education: "High School + GCC Driving License",
    religion: "Muslim",
    experience_country: "Saudi Arabia",
    experience_period: "5 Years",
    skill_cleaning: 0,
    skill_cooking: 0,
    skill_arabic_cooking: 0,
    skill_baby_sitting: 0,
    skill_washing: 0,
    skill_ironing: 0,
    skill_elderly_care: 0,
    applicant_state: "CV Generated",
    state_step: "3 of 9",
    state_progress: 33.3,
    cv_file_url: "/private/files/CV-APP-00006.pdf",
    selected_by: null,
    locked_contractor: null,
  },
  {
    name: "APP-00007",
    first_name: "Genet",
    middle_name: "Assefa",
    last_name: "Wolde",
    full_name: "Genet Assefa Wolde",
    gender: "Female",
    age: 28,
    date_of_birth: "1997-02-14",
    nationality: "Ethiopia",
    destination_country: "Saudi Arabia",
    job_applied: "Housemaid",
    monthly_salary: 1200,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP7890123",
    passport_issue_date: "2022-11-09",
    passport_expiry: "2027-11-08",
    place_of_issue: "Addis Ababa",
    marital_status: "Single",
    children: 0,
    education: "Secondary School",
    religion: "Orthodox",
    experience_country: "Bahrain",
    experience_period: "3 Years",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 1,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 1,
    applicant_state: "Selected",
    state_step: "4 of 9",
    state_progress: 44.4,
    cv_file_url: "/private/files/CV-APP-00007.pdf",
    selected_by: "Al-Amal Recruitment Riyadh",
    locked_contractor: "Al-Amal Recruitment Riyadh",
    selected_at: "2026-08-01",
  },
  {
    name: "APP-00008",
    first_name: "Hanan",
    middle_name: "Mohammed",
    last_name: "Kebede",
    full_name: "Hanan Mohammed Kebede",
    gender: "Female",
    age: 25,
    date_of_birth: "2000-12-01",
    nationality: "Ethiopia",
    destination_country: "Saudi Arabia",
    job_applied: "Housemaid",
    monthly_salary: 1300,
    photo_passport: "",
    photo_full_body: "",
    passport_number: "EP8901234",
    passport_issue_date: "2023-05-19",
    passport_expiry: "2028-05-18",
    place_of_issue: "Addis Ababa",
    marital_status: "Single",
    children: 0,
    education: "High School",
    religion: "Muslim",
    experience_country: "Saudi Arabia",
    experience_period: "2 Years",
    skill_cleaning: 1,
    skill_cooking: 1,
    skill_arabic_cooking: 1,
    skill_baby_sitting: 1,
    skill_washing: 1,
    skill_ironing: 1,
    skill_elderly_care: 0,
    applicant_state: "Departed",
    state_step: "9 of 9",
    state_progress: 100,
    cv_file_url: "/private/files/CV-APP-00008.pdf",
    selected_by: "Al-Amal Recruitment Riyadh",
    locked_contractor: "Al-Amal Recruitment Riyadh",
    dossier_name: "DOS-00008",
    sponsor_name: "Abdullah Al-Mansoor",
    visa_number: "1309876543",
    contract_date: "2026-07-20",
    contract_duration: "2 Years",
    airline: "Saudia",
    flight_number: "SV421",
    flight_date: "2026-08-15",
    route: "ADD -> RUH",
    departure_time: "2026-08-15 08:30:00",
    departure_status: "Departed",
  },
];

class SystemApplicantsRegistry {
  private applicants: Map<string, SystemApplicantRecord> = new Map();

  constructor() {
    for (const app of INITIAL_SYSTEM_APPLICANTS) {
      this.applicants.set(app.name, { ...app });
    }
  }

  public getAll(): SystemApplicantRecord[] {
    return Array.from(this.applicants.values());
  }

  public getById(id: string): SystemApplicantRecord | undefined {
    return this.applicants.get(id);
  }

  public save(applicant: Partial<SystemApplicantRecord> & { name: string }): SystemApplicantRecord {
    const existing = this.applicants.get(applicant.name);
    const updated = {
      ...(existing || INITIAL_SYSTEM_APPLICANTS[0]),
      ...applicant,
      name: applicant.name,
      full_name:
        applicant.full_name ||
        `${applicant.first_name || ""} ${applicant.middle_name || ""} ${applicant.last_name || ""}`.trim() ||
        applicant.name,
    } as SystemApplicantRecord;
    this.applicants.set(applicant.name, updated);
    return updated;
  }

  public update(id: string, partial: Partial<SystemApplicantRecord>): SystemApplicantRecord | undefined {
    const existing = this.applicants.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...partial };
    this.applicants.set(id, updated);
    return updated;
  }
}

// Global singleton registry instance
export const globalApplicantsRegistry = new SystemApplicantsRegistry();
