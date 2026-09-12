/**
 * Error Formatter & Sanitizer
 * 
 * Automatically translates raw backend errors, Python exceptions, Frappe messages,
 * database errors, Zod validation failures, and technical terms into clean, simple, human-friendly English.
 * 
 * Strict Principle:
 * NO TECHNICAL ERROR, CODE, API, DATABASE, PROGRAMMING, OR SOFTWARE-ENGINEERING
 * LANGUAGE SHOULD APPEAR TO AN ORDINARY BUSINESS USER ANYWHERE IN THE FRONTEND.
 */

// Common snake_case fields to clean English mapping across all agency workflows
const FIELD_NAME_MAP: Record<string, string> = {
  // Identity & Personal
  first_name: "first name",
  middle_name: "father name (middle name)",
  last_name: "grandfather name (last name)",
  date_of_birth: "date of birth",
  marital_status: "marital status",
  children: "number of children",
  nationality: "nationality",
  destination_country: "destination country",
  phone_number: "phone number",
  alternate_phone: "alternate phone number",
  city: "city",
  country: "country",
  region: "region",
  sub_region: "sub-region",
  address_line_1: "address",
  applicant_name: "applicant name",
  applicant_type: "applicant category",
  entry_track: "processing track",
  target_job: "applied position",
  job_applied: "applied position",
  highest_education: "highest education level",
  highest_education_level: "highest education level",
  education: "education level",
  institution: "educational institution",
  graduation_year: "graduation year",
  years_of_experience: "years of experience",
  current_employer: "current employer",
  english_level: "English proficiency level",
  arabic_level: "Arabic proficiency level",
  monthly_salary: "monthly salary",
  salary_amount: "monthly salary amount",
  salary_currency: "salary currency",
  complexion: "complexion",
  height: "height",
  weight: "weight",
  place_of_birth: "place of birth",

  // Passport & Identification
  passport_number: "passport number",
  passport_scan: "passport scan document",
  passport_issue_date: "passport issue date",
  passport_expiry: "passport expiry date",
  passport_expiry_date: "passport expiry date",
  passport_issue_place: "passport issue place",
  place_of_issue: "passport issue place",
  photo_passport: "formal passport photograph",
  photo_full_body: "full-body photograph",
  photograph: "formal photograph",
  national_id: "national ID",
  labor_id: "labor ID",
  labour_id: "labor ID",

  // Contacts & Emergency
  emergency_contact: "emergency contact",
  emergency_contact_name: "emergency contact name",
  emergency_contact_phone: "emergency contact phone",
  contact_person_name: "emergency contact name",
  contact_person_phone: "emergency contact phone",
  emergency_relationship: "emergency relationship",

  // Medical & COC
  medical_status: "medical examination result",
  medical_selected_status: "initial medical result",
  medical_2_status: "pre-departure medical result",
  medical_issue_date: "medical issue date",
  medical_expiry_date: "medical expiry date",
  coc_status: "COC credential status",
  exam_date: "examination date",

  // Placement & Contracts
  contract_signed_date: "contract signed date",
  contract_number: "contract number",
  visa_number: "visa number",
  sponsor_id: "sponsor ID",
  sponsor_name: "sponsor name",
  contractor: "partner agency",
  contractor_name: "partner agency name",
  target_status: "target stage",
  placement_name: "placement record",

  // Clearance Steps & Fees
  clearance_step_name: "clearance step",
  reference_no: "reference number",
  wakala_reference_no: "Wakala reference number",
  wakala_status: "Wakala status",
  wakala_amount: "Wakala amount",
  wakala_paid_date: "Wakala payment date",
  paid_date: "payment date",
  amount: "payment amount",
  receipt_number: "receipt number",
  receipt_url: "receipt document",
  rejection_remark: "rejection reason",
  rejection_reason: "rejection reason",
  void_reason: "void reason",
  override_reason: "override justification",
  date_completed: "completion date",
  police_ashara_status: "Police Ashara status",
  police_ashara_amount: "Police Ashara amount",
  police_ashara_appointment_date: "Police Ashara appointment date",
  police_ashara_remark: "Police Ashara remark",
  police_ashara_reference_no: "Police Ashara reference number",
  injaz_application_id: "Injaz application number",
  injaz_status: "Injaz status",
  injaz_fee: "Injaz visa fee",
  payment_type: "payment type",
  payment_status: "payment status",
  payment_row_name: "payment line item",
  registration_fee_amount: "registration fee amount",
  fee_amount: "fee amount",

  // Ticketing & Flight
  ticket_number: "flight ticket number",
  ticket_cost: "ticket cost",
  ticket_date: "ticket issue date",
  flight_date: "departure flight date",
  flight_number: "flight number",
  airline: "airline",
  departure_date: "departure date",
  pnr: "booking reference (PNR)",
  transit_city: "transit city",
  transit_airport: "transit airport",
  destination_airport: "destination airport",
  destination_city: "destination city",

  // Financial Batches
  advance_amount: "advance amount",
  requested_advance_amount: "requested advance amount",
  balance_due_original: "remaining balance",
  total_amount_original: "total batch amount",
  total_amount_birr: "total amount in Birr",
  batch_mode: "batch processing mode",
  batch_threshold: "batch threshold",
  settlement_reference: "settlement reference",

  // Complaints & Users
  complaint_details: "complaint details",
  complaint_category: "complaint category",
  officer_email: "officer email",
  user_email: "employee email",
  userEmail: "employee email",
  new_password: "new password",
  target_user: "selected employee",
  new_role: "assigned role",
};

/**
 * Strips HTML tags and decodes common HTML entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formats a single Zod issue into a user-friendly business sentence.
 */
function formatZodIssue(issue: any): string {
  if (!issue || typeof issue !== "object") return "Please enter valid information.";
  const pathKey = Array.isArray(issue.path) && issue.path.length > 0 ? issue.path[issue.path.length - 1] : "";
  const rawField = typeof pathKey === "string" ? pathKey : "";
  const label = FIELD_NAME_MAP[rawField.toLowerCase()] || (rawField ? rawField.replace(/_/g, " ") : "This field");

  if (issue.code === "invalid_type") {
    if (issue.expected === "number") {
      if (rawField === "children") return "Please enter a valid number of children (e.g. 0, 1, 2).";
      if (rawField.includes("salary")) return "Please enter a valid monthly salary amount.";
      if (rawField.includes("fee") || rawField.includes("amount") || rawField.includes("cost") || rawField.includes("rate")) {
        return `Please enter a valid amount for ${label}.`;
      }
      return `Please enter a valid number for ${label}.`;
    }
    if (issue.expected === "string" && (issue.received === "undefined" || issue.received === "null")) {
      return `Please enter or select ${label}.`;
    }
    if (issue.expected === "date") {
      return `Please select or enter a valid date for ${label}.`;
    }
    if (issue.expected === "boolean") {
      return `Please select Yes or No for ${label}.`;
    }
    return `Please enter a valid value for ${label}.`;
  }

  if (issue.code === "invalid_enum_value") {
    return `Please select a valid option for ${label}.`;
  }

  if (issue.code === "too_small") {
    if (issue.type === "string" && issue.minimum === 1) {
      return `${label.charAt(0).toUpperCase() + label.slice(1)} cannot be left blank.`;
    }
    if (issue.type === "number") {
      return `${label.charAt(0).toUpperCase() + label.slice(1)} cannot be less than ${issue.minimum}.`;
    }
    return `Please enter at least ${issue.minimum} characters for ${label}.`;
  }

  if (issue.code === "too_big") {
    if (issue.type === "number") {
      return `${label.charAt(0).toUpperCase() + label.slice(1)} cannot exceed ${issue.maximum}.`;
    }
    return `${label.charAt(0).toUpperCase() + label.slice(1)} cannot exceed ${issue.maximum} characters.`;
  }

  if (issue.code === "invalid_string" && issue.validation === "email") {
    return "Please enter a valid email address.";
  }

  if (issue.message && typeof issue.message === "string") {
    // If message is technical, sanitize it
    if (/expected|nan|undefined|invalid type|zod/i.test(issue.message)) {
      return `Please enter a valid value for ${label}.`;
    }
    return issue.message;
  }

  return `Please review the ${label} field.`;
}

/**
 * Extracts and unpacks raw error message from any error object, Zod error, or Frappe response.
 */
function extractRawErrorMessage(error: unknown): string {
  if (!error) return "An unexpected issue occurred. Please try again.";

  // 1. ZodError object or array of issues
  if (typeof error === "object" && error !== null) {
    const maybeZod = error as any;
    if (Array.isArray(maybeZod.issues) && maybeZod.issues.length > 0) {
      return maybeZod.issues.map((iss: any) => formatZodIssue(iss)).join(". ");
    }
    if (Array.isArray(maybeZod.errors) && maybeZod.errors.length > 0) {
      return maybeZod.errors.map((iss: any) => formatZodIssue(iss)).join(". ");
    }
  }

  // 2. String representation or serialized JSON
  if (typeof error === "string") {
    const trimmed = error.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => extractRawErrorMessage(item))
            .filter(Boolean)
            .join(" • ");
        }
        if (parsed && typeof parsed === "object") {
          return (
            parsed.message ||
            parsed.error ||
            parsed.detail ||
            extractRawErrorMessage(parsed._server_messages) ||
            extractRawErrorMessage(parsed.issues) ||
            JSON.stringify(parsed)
          );
        }
      } catch {
        // Not JSON, continue with raw string
      }
    }
    return error;
  }

  // 3. Error instance (including ApiV2Error)
  if (error instanceof Error) {
    const apiErr = error as any;
    if (apiErr.serverMessages) {
      try {
        const parsed = JSON.parse(apiErr.serverMessages);
        if (Array.isArray(parsed)) {
          const innerMsgs = parsed.map((m: any) => {
            if (typeof m === "string") {
              try {
                return JSON.parse(m)?.message || m;
              } catch {
                return m;
              }
            }
            return m.message || JSON.stringify(m);
          });
          return innerMsgs.join(" • ");
        }
      } catch {
        // continue
      }
    }
    return error.message || "An unexpected issue occurred. Please try again.";
  }

  // 4. Generic object structure
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, any>;
    if (obj.message && typeof obj.message === "string") return obj.message;
    if (obj.error && typeof obj.error === "string") return obj.error;
    if (obj.detail && typeof obj.detail === "string") return obj.detail;
    if (obj._server_messages) return extractRawErrorMessage(obj._server_messages);
    return JSON.stringify(obj);
  }

  return String(error);
}

/**
 * Formats any error into simple, clean, friendly English without technical or code terms.
 */
export function formatCleanErrorMessage(rawError: unknown): string {
  let text = extractRawErrorMessage(rawError);

  // 1. Strip HTML tags and decode entities
  text = stripHtml(text);

  // 2. Missing RPC method / Unimplemented / Server Module attribute errors
  if (
    /Failed to get method for command|has no attribute|module '[^']+' has no attribute|cannot import name|No module named|ImportError|execute_cmd|get_attr|AttributeError/i.test(
      text
    )
  ) {
    return "This service is currently unavailable or undergoing an update. Please try again later or contact your administrator.";
  }

  // 3. Handle Python Traceback - strip out stack trace lines and file locations
  if (text.includes("Traceback (most recent call last):")) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";
    if (
      lastLine &&
      !lastLine.startsWith("File ") &&
      !lastLine.startsWith("Traceback") &&
      !/AttributeError|TypeError|KeyError|ImportError|SyntaxError|NameError/i.test(lastLine)
    ) {
      text = lastLine;
    } else {
      return "The system encountered an unexpected issue while completing this action. Please try again.";
    }
  }

  // 4. Strip Python / Database / Frappe Exception prefixes anywhere they appear
  text = text.replace(
    /(?:frappe\.)?(?:exceptions\.)?(?:pymysql\.err\.)?(?:ValidationError|DoesNotExistError|PermissionError|AuthenticationError|DuplicateEntryError|LinkValidationError|CharacterLengthExceededError|MandatoryError|IntegrityError|OperationalError|InternalServerError|AttributeError|KeyError|TypeError|ValueError|NameError|IndexError|JSONDecodeError|RuntimeError|SyntaxError):\s*/gi,
    ""
  );
  text = text.replace(/^Error:\s*/gi, "");
  text = text.replace(/^Exception in [a-zA-Z0-9_.]+:?\s*/gi, "");
  text = text.replace(/^\[Errno\s*\d+\]\s*/gi, "");
  text = text.replace(/\((?:pass|provide|use|specify)\s+[^)]+\)/gi, "");

  // 5. Intercept Zod and Validation Library Technical Messages
  if (/Expected number, received nan/i.test(text) || /Expected number, received string/i.test(text)) {
    return "Please enter a valid amount or number.";
  }
  if (/Expected string, received undefined/i.test(text) || /Expected string, received null/i.test(text)) {
    return "Please provide this required information.";
  }
  if (/Expected boolean/i.test(text)) {
    return "Please select Yes or No.";
  }
  if (/Expected date/i.test(text)) {
    return "Please select or enter a valid date.";
  }
  if (/Expected [a-z]+, received [a-z]+/i.test(text)) {
    return "Please enter valid information for this field.";
  }
  if (/Invalid enum value/i.test(text)) {
    return "Please select a valid option from the list.";
  }
  if (/String must contain at least 1 character/i.test(text)) {
    return "This field cannot be left blank.";
  }
  if (/Number must be greater than 0/i.test(text)) {
    return "The amount must be greater than zero.";
  }
  const minNumMatch = text.match(/Number must be greater than or equal to (\d+)/i);
  if (minNumMatch) {
    return `The value cannot be less than ${minNumMatch[1]}.`;
  }
  const maxNumMatch = text.match(/Number must be less than or equal to (\d+)/i);
  if (maxNumMatch) {
    return `The value cannot exceed ${maxNumMatch[1]}.`;
  }

  // 6. Specific High-Impact Business Rule Mappings
  // Medical Gates
  if (/medical_2_status must be FIT/i.test(text) || /Medical 2 FIT required/i.test(text)) {
    return "Departure cannot be confirmed until the final medical result is marked Fit.";
  }
  if (/medical_selected_status must be 'FIT'/i.test(text) || /Medical 1 FIT required/i.test(text)) {
    return "Candidate's Medical 1 examination must be recorded as FIT before advancing.";
  }

  // Wakala Payment Guard on Embassy Submission
  if (/Wakala must be Paid before Embassy documents can be Submitted/i.test(text)) {
    return "Wakala fee must be recorded as Paid before submitting documents to the Embassy (or require a Manager override).";
  }
  if (/wakala_amount|wakala_payment_status/i.test(text)) {
    return "Wakala payment details are required before proceeding.";
  }

  // Admin Account Lockout Protection
  if (/Refusing to remove your own Admin\/Manager\/System Manager access/i.test(text)) {
    return "You cannot remove your own administrative access.";
  }
  if (/is the last remaining staff-admin account/i.test(text)) {
    return "This account is the last remaining administrator and cannot be disabled or stripped of administrative permissions.";
  }

  // Clearance Step State Machine Rules
  if (/A '([^']+)' clearance step cannot be completed/i.test(text)) {
    const match = text.match(/A '([^']+)' clearance step cannot be completed/i);
    return `A clearance step in '${match ? match[1] : "this"}' status cannot be completed.`;
  }
  if (/already Departed\/Cancelled; its clearance steps can no longer be edited/i.test(text)) {
    return "This placement is already finalized (Departed or Cancelled) and its clearance steps can no longer be modified.";
  }
  if (/cannot reach Ticketed until '([^']+)' is completed/i.test(text)) {
    const match = text.match(/cannot reach Ticketed until '([^']+)' is completed/i);
    return `Ticket details cannot be recorded until '${match ? match[1] : "all required steps"}' is completed.`;
  }

  // Ticket & Departure validation
  if (/ticket_number is required/i.test(text)) {
    return "Please enter the flight ticket number before moving this applicant to Ticketed.";
  }

  // Police Ashara Kuwait LMIS Sub-Check
  if (/police_ashara_remark is required/i.test(text)) {
    return "Please enter a remark explaining why the Police Ashara check failed.";
  }

  // Commission & Advance Financial Rules
  if (/advance_amount must be greater than 0/i.test(text)) {
    return "Please enter an advance amount greater than zero.";
  }
  if (/advance_amount cannot exceed batch total/i.test(text)) {
    return "The advance payment cannot be greater than the total amount requested.";
  }

  // Partner Agency / Contractor requirement
  if (/A contractor must be specified|contractor must be specified|A Partner Agency must be specified|Partner Agency must be specified/i.test(text)) {
    return "Please select a Partner Agency to proceed.";
  }

  // Mandatory Reason for Reopening or Rejection
  if (/rejection_remark is required/i.test(text) || /reason is required/i.test(text)) {
    return "Please provide a written reason before confirming this action.";
  }

  // Language Levels
  if (/Value 'Fair' not in allowed values/i.test(text) || (/english_level/i.test(text) && /not in allowed values/i.test(text))) {
    return "English proficiency level must be one of: None, Basic, Good, or Fluent.";
  }
  if (/arabic_level/i.test(text) && /not in allowed values/i.test(text)) {
    return "Arabic proficiency level must be one of: None, Basic, Good, or Fluent.";
  }

  // General "not in allowed values"
  const notAllowedMatch = text.match(/Value '([^']+)' not in allowed values(?::?\s*(.*))?/i);
  if (notAllowedMatch) {
    const val = notAllowedMatch[1];
    const allowed = notAllowedMatch[2];
    if (allowed) {
      const cleanAllowed = allowed.split(",").map((s) => s.trim().replace(/['"]/g, "")).join(", ");
      return `'${val}' is not a valid selection. Allowed options are: ${cleanAllowed}.`;
    }
    return `'${val}' is not a valid option. Please select an option from the list.`;
  }

  // 7. Permission & Authorization Errors
  if (
    /Not permitted|Permission denied|Insufficient permissions|User does not have role|not authorized|403 Forbidden|Forbidden|PermissionError/i.test(
      text
    )
  ) {
    return "You do not have permission to perform this action. Please contact your agency administrator if you require access.";
  }

  // 8. Session Expiration & Authentication
  if (/CSRFTokenError|Invalid Request: CSRF|Session expired|401 Unauthorized|Unauthorized/i.test(text)) {
    return "Your session has expired. Please refresh the page and sign in again.";
  }

  // 9. Network & Server Errors
  if (
    /Failed to fetch|NetworkError|BackendConnectionError|ECONNREFUSED|ETIMEDOUT|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout|Unable to connect to backend/i.test(
      text
    )
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again in a few moments.";
  }
  if (/Unexpected token < in JSON|Server returned non-JSON response|Internal Server Error|500 Internal/i.test(text)) {
    return "The server encountered a temporary issue. Please refresh the page and try again.";
  }

  // 10. HTTP Status Code Fallbacks
  if (/HTTP 400|status code 400/i.test(text)) {
    return "Some information is missing or incorrect. Please review the highlighted fields and try again.";
  }
  if (/HTTP 404|status code 404/i.test(text)) {
    return "The requested record could not be found. It may have been removed or is no longer available.";
  }
  if (/HTTP 409|status code 409/i.test(text)) {
    return "This record has already been updated or selected by another user. Please refresh and try again.";
  }
  if (/HTTP 417|status code 417/i.test(text)) {
    return "The information provided does not meet the requirements. Please review the fields and try again.";
  }
  if (/HTTP 422|status code 422/i.test(text)) {
    return "The provided information could not be processed. Please check your entries and try again.";
  }
  if (/HTTP 429|status code 429/i.test(text)) {
    return "Too many requests. Please wait a moment before trying again.";
  }
  if (/HTTP 5\d\d|status code 5\d\d/i.test(text)) {
    return "Something went wrong on the server while completing this action. Please try again in a moment.";
  }

  // 11. Duplicate Entry
  if (/Duplicate entry/i.test(text) || /already exists/i.test(text)) {
    if (/passport/i.test(text)) {
      return "An applicant with this passport number is already registered in the system.";
    }
    const match = text.match(/Duplicate entry '([^']+)'/i);
    if (match && match[1]) {
      return `A record with identifier '${match[1]}' already exists in the system.`;
    }
    return "A record with this information already exists in the system.";
  }

  // 12. Link / Record Not Found
  if (/DoesNotExistError|does not exist|not found/i.test(text)) {
    if (/applicant/i.test(text)) return "The requested applicant could not be found.";
    if (/placement/i.test(text)) return "The requested placement could not be found.";
    if (/clearance/i.test(text)) return "The requested clearance task could not be found.";
    if (/contractor|foreign agency|partner/i.test(text)) return "The requested partner agency could not be found.";
    if (/ticket|departure/i.test(text)) return "The requested ticket or flight record could not be found.";
    if (/complaint/i.test(text)) return "The requested complaint could not be found.";
    return "The requested record could not be found.";
  }

  // 13. Required / Mandatory Fields
  if (/Mandatory fields required:\s*(.*)/i.test(text)) {
    const match = text.match(/Mandatory fields required:\s*(.*)/i);
    if (match && match[1]) {
      let fields = match[1];
      for (const [snake, clean] of Object.entries(FIELD_NAME_MAP)) {
        fields = fields.replace(new RegExp(`\\b${snake}\\b`, "gi"), clean);
      }
      fields = fields.replace(/\b([a-z]{2,})_([a-z]{2,})\b/g, "$1 $2");
      return `Please fill in all required fields: ${fields.trim()}.`;
    }
    return "Please fill in all required fields before proceeding.";
  }

  if (/Field '([^']+)' cannot be null|is a mandatory field/i.test(text)) {
    const match = text.match(/Field '([^']+)' cannot be null|([a-zA-Z0-9_]+) is a mandatory field/i);
    const rawFld = match ? (match[1] || match[2]) : "";
    const cleanFld = (rawFld && FIELD_NAME_MAP[rawFld.toLowerCase()]) || rawFld.replace(/_/g, " ");
    return cleanFld ? `Please provide the required ${cleanFld}.` : "Please fill in all required fields.";
  }

  // 14. Stage Transition Rules
  if (/status must be '([^']+)' to proceed/i.test(text)) {
    const match = text.match(/status must be '([^']+)' to proceed/i);
    return `Candidate must be in '${match ? match[1] : "the required"}' stage to proceed.`;
  }
  if (/cannot transition from '([^']+)' to '([^']+)'/i.test(text)) {
    const match = text.match(/cannot transition from '([^']+)' to '([^']+)'/i);
    return `Candidate cannot transition directly from ${match ? match[1] : "current stage"} to ${match ? match[2] : "next stage"}.`;
  }

  // 15. Text Length Exceeded
  if (/Value exceeds max_length of (\d+)/i.test(text)) {
    return "The entered text is too long. Please shorten your input.";
  }

  // 16. Replace Backend Internal Names with Human Business Terms
  text = text.replace(/DocType '([^']+)'/gi, "$1 record");
  text = text.replace(/DocType ([a-zA-Z0-9_]+)/gi, "$1 record");
  text = text.replace(/agency_tracking\.[a-zA-Z0-9_.]+/gi, "the system service");
  text = text.replace(/applicant_processing\.[a-zA-Z0-9_.]+/gi, "the system service");
  text = text.replace(/frappe\.client\.[a-zA-Z0-9_.]+/gi, "the system service");
  text = text.replace(/\/api\/method\/[a-zA-Z0-9_.]+/gi, "the requested service");
  text = text.replace(/Commission Batch Request/gi, "Commission Batch");
  text = text.replace(/Applicant Transaction/gi, "Transaction");
  text = text.replace(/Clearance Step/gi, "Clearance Task");
  text = text.replace(/\bContractor\b/gi, "Partner Agency");

  // 17. Replace Snake Case Fields with Clean Business Labels
  for (const [snake, clean] of Object.entries(FIELD_NAME_MAP)) {
    const regex = new RegExp(`\\b${snake}\\b`, "gi");
    text = text.replace(regex, clean);
  }

  // 18. General Snake Case Cleanup: Convert Remaining some_field to some field
  text = text.replace(/\b([a-z]{2,})_([a-z]{2,})\b/g, "$1 $2");

  // 19. Clean Up Technical Words, Symbols, and Jargon
  text = text.replace(/cannot be null/gi, "is required");
  text = text.replace(/is a mandatory field/gi, "is required");
  text = text.replace(/missing required argument/gi, "missing required information");
  text = text.replace(/Backend rejected [a-zA-Z0-9_ ]+ mutation\.?/gi, "The system could not save your changes. Please verify all details and try again.");
  text = text.replace(/Backend rejected [a-zA-Z0-9_ ]+ request\.?/gi, "The request could not be processed. Please check your inputs and try again.");
  text = text.replace(/Backend rejected [a-zA-Z0-9_ ]+\.?/gi, "The action could not be completed. Please try again.");
  text = text.replace(/Backend state rejected mutation\.?/gi, "The action could not be processed with the current record status.");
  text = text.replace(/Reassignment rejected by backend/gi, "Reassignment could not be completed.");
  text = text.replace(/per the backend contract/gi, "per system guidelines");
  text = text.replace(/\bFrappe\b/gi, "System");

  // Clean raw JavaScript primitives if visible
  text = text.replace(/\bNaN\b/g, "a valid number");
  text = text.replace(/\bundefined\b/g, "Not available");
  text = text.replace(/\bnull\b/g, "Not available");
  text = text.replace(/[{}[\]]/g, "");
  text = text.replace(/\s*:\s*\./g, ".");
  text = text.replace(/\s*•\s*/g, ". ");
  text = text.replace(/\s+/g, " ").trim();

  // 20. Fail-Safe Filter: Guard Against Any Residual Code Leaks
  if (
    !text ||
    text.length < 3 ||
    text.includes("Traceback") ||
    text.includes("SyntaxError") ||
    text.includes("TypeError") ||
    text.includes("KeyError") ||
    text.includes("AttributeError") ||
    text.includes("ImportError") ||
    text.includes("pymysql") ||
    text.includes("execute_cmd") ||
    text.includes("get_attr") ||
    /module\s*'|attribute\s*'/i.test(text)
  ) {
    return "The system encountered an unexpected issue while processing your request. Please review your input or try again.";
  }

  // Capitalize first character
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Ensure ends with punctuation
  if (!/[.!?]$/.test(text)) {
    text += ".";
  }

  return text;
}
