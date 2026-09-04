/**
 * Error Formatter & Sanitizer
 * 
 * Automatically translates raw backend errors, Python exceptions, Frappe messages,
 * database errors, and technical terms into clean, simple, human-friendly English.
 */

// Common snake_case fields to clean English mapping
const FIELD_NAME_MAP: Record<string, string> = {
  medical_expiry_date: "medical expiry date",
  passport_number: "passport number",
  passport_scan: "passport scan document",
  photo_passport: "formal passport photograph",
  photo_full_body: "full-body photograph",
  destination_country: "destination country",
  contract_signed_date: "contract signed date",
  contract_number: "contract number",
  visa_number: "visa number",
  sponsor_id: "sponsor ID",
  sponsor_name: "sponsor name",
  labor_id: "labor ID",
  clearance_step_name: "clearance step",
  applicant_name: "applicant name",
  applicant_type: "applicant category",
  entry_track: "entry track",
  highest_education: "highest education level",
  highest_education_level: "highest education level",
  phone_number: "phone number",
  emergency_contact: "emergency contact",
  monthly_salary: "monthly salary",
  english_level: "English proficiency level",
  arabic_level: "Arabic proficiency level",
  first_name: "first name",
  last_name: "last name",
  date_of_birth: "date of birth",
  marital_status: "marital status",
  bank_statement: "bank statement",
  settlement_reference: "settlement reference",
  advance_amount: "advance amount",
  rejection_reason: "rejection reason",
  void_reason: "void reason",
  complaint_details: "complaint details",
  complaint_category: "complaint category",
  officer_email: "officer email",
  user_email: "user email",
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
 * Extracts and unpacks raw error message from any error object or structure.
 */
function extractRawErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  if (typeof error === "string") {
    // Try to parse stringified JSON arrays/objects from Frappe
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
            JSON.stringify(parsed)
          );
        }
      } catch {
        // Not JSON, continue with string
      }
    }
    return error;
  }

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
    return error.message || "An unexpected error occurred. Please try again.";
  }

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

  // 2. Handle Python Traceback - strip out stack trace lines
  if (text.includes("Traceback (most recent call last):")) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const lastLine = lines[lines.length - 1] || "";
    if (lastLine && !lastLine.startsWith("File ") && !lastLine.startsWith("Traceback")) {
      text = lastLine;
    } else {
      return "The system encountered an unexpected issue. Please try again or refresh the page.";
    }
  }

  // 3. Strip Python / Database / Frappe Exception names anywhere they appear
  text = text.replace(
    /(?:frappe\.)?(?:exceptions\.)?(?:pymysql\.err\.)?(?:ValidationError|DoesNotExistError|PermissionError|AuthenticationError|DuplicateEntryError|LinkValidationError|CharacterLengthExceededError|MandatoryError|IntegrityError|OperationalError|InternalServerError|AttributeError|KeyError|TypeError|ValueError|NameError|IndexError|JSONDecodeError):\s*/gi,
    ""
  );
  text = text.replace(/^(?:HTTP\s*\d+\s*(?:\([^)]*\))?:?\s*)/gi, "");
  text = text.replace(/^\[Errno\s*\d+\]\s*/gi, "");
  text = text.replace(/^Error:\s*/gi, "");
  text = text.replace(/Exception in [a-zA-Z0-9_.]+:?\s*/gi, "");

  // 4. Known Specific High-Impact Error Mappings
  // English Level mismatch
  if (/Value 'Fair' not in allowed values/i.test(text) || (/english_level/i.test(text) && /not in allowed values/i.test(text))) {
    return "English proficiency level must be one of: None, Basic, Good, or Fluent.";
  }

  // Arabic Level mismatch
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

  // Permission / Authorization errors
  if (
    /Not permitted|Permission denied|Insufficient permissions|User does not have role|not authorized|403 Forbidden|Forbidden/i.test(
      text
    )
  ) {
    return "You do not have permission to perform this action. Please contact an administrator if you require access.";
  }

  // Network / Server down / Connection errors
  if (
    /Failed to fetch|NetworkError|BackendConnectionError|ECONNREFUSED|ETIMEDOUT|502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout|Unable to connect to backend/i.test(
      text
    )
  ) {
    return "Unable to connect to the server. Please check your internet connection and try again in a few moments.";
  }

  // Non-JSON response / Server crash
  if (/Unexpected token < in JSON|Server returned non-JSON response|Internal Server Error|500 Internal/i.test(text)) {
    return "The server encountered a temporary issue. Please refresh the page and try again.";
  }

  // CSRF Session Expiry
  if (/CSRFTokenError|Invalid Request: CSRF|Session expired|Unauthorized/i.test(text)) {
    return "Your security session has expired. Please refresh the page and log in again.";
  }

  // Duplicate entry (MySQL / Frappe)
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

  // Link validation (Row / DocType not found)
  if (/Could not find Row #\d+:?\s*([^:]+):\s*([^\n\r.]+)/i.test(text)) {
    const match = text.match(/Could not find Row #\d+:?\s*([^:]+):\s*([^\n\r.]+)/i);
    if (match) {
      return `The selected ${match[1].trim().toLowerCase()} '${match[2].trim()}' could not be found.`;
    }
  }

  // Does not exist / Not found
  if (/DoesNotExistError|does not exist|not found|404 Not Found/i.test(text)) {
    if (/applicant/i.test(text)) return "The requested applicant could not be found.";
    if (/placement/i.test(text)) return "The requested placement could not be found.";
    if (/clearance/i.test(text)) return "The requested clearance task could not be found.";
    if (/contractor|foreign agency|partner/i.test(text)) return "The requested partner agency could not be found.";
    if (/ticket|departure/i.test(text)) return "The requested ticket or flight record could not be found.";
    if (/complaint/i.test(text)) return "The requested complaint could not be found.";
    return "The requested record could not be found.";
  }

  // Mandatory / Required fields
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

  // Medical status requirements
  if (/medical_selected_status must be 'FIT'|Medical 1 FIT required/i.test(text)) {
    return "Candidate's Medical 1 examination must be recorded as FIT before advancing.";
  }
  if (/Medical 2 FIT required|pre-departure medical/i.test(text)) {
    return "Pre-departure medical clearance (FIT) is required before departure.";
  }

  // Wakala payment requirements
  if (/wakala_amount|Wakala must be Paid|wakala_payment_status/i.test(text)) {
    return "Wakala fee payment is required before embassy document submission.";
  }

  // Candidate stage transition rules
  if (/status must be '([^']+)' to proceed/i.test(text)) {
    const match = text.match(/status must be '([^']+)' to proceed/i);
    return `Candidate must be in '${match ? match[1] : "the required"}' stage to proceed.`;
  }
  if (/cannot transition from '([^']+)' to '([^']+)'/i.test(text)) {
    const match = text.match(/cannot transition from '([^']+)' to '([^']+)'/i);
    return `Candidate cannot transition directly from ${match ? match[1] : "current stage"} to ${match ? match[2] : "next stage"}.`;
  }

  // Text length exceeded
  if (/Value exceeds max_length of (\d+)/i.test(text)) {
    return "The entered text is too long. Please shorten your input.";
  }

  // 5. Replace backend DocType names and method names with clean human terms
  text = text.replace(/DocType '([^']+)'/gi, "$1 record");
  text = text.replace(/DocType ([a-zA-Z0-9_]+)/gi, "$1 record");
  text = text.replace(/agency_tracking\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+/gi, "the system service");
  text = text.replace(/agency_tracking\.[a-zA-Z0-9_]+/gi, "the system service");
  text = text.replace(/applicant_processing\.[a-zA-Z0-9_]+/gi, "the system service");
  text = text.replace(/frappe\.client\.[a-zA-Z0-9_]+/gi, "the system service");
  text = text.replace(/\/api\/method\/[a-zA-Z0-9_.]+/gi, "the requested service");
  text = text.replace(/Commission Batch Request/gi, "Commission Batch");
  text = text.replace(/Applicant Transaction/gi, "Transaction");
  text = text.replace(/Clearance Step/gi, "Clearance Task");
  text = text.replace(/\bContractor\b/gi, "Partner Agency");

  // 6. Replace snake_case fields with clean human names
  for (const [snake, clean] of Object.entries(FIELD_NAME_MAP)) {
    const regex = new RegExp(`\\b${snake}\\b`, "gi");
    text = text.replace(regex, clean);
  }

  // 7. General snake_case cleanup: replace any remaining single snake_case words (e.g. some_field_name)
  text = text.replace(/\b([a-z]{2,})_([a-z]{2,})\b/g, "$1 $2");

  // 8. Clean up technical phrases and artifacts
  text = text.replace(/cannot be null/gi, "is required");
  text = text.replace(/is a mandatory field/gi, "is required");
  text = text.replace(/missing required argument/gi, "missing required information");
  text = text.replace(/Backend rejected [a-zA-Z0-9_ ]+ mutation\.?/gi, "The system could not save your changes. Please verify all details and try again.");
  text = text.replace(/Backend rejected [a-zA-Z0-9_ ]+ request\.?/gi, "The request could not be processed. Please check your inputs and try again.");
  text = text.replace(/Backend rejected [a-zA-Z0-9_ ]+\.?/gi, "The action could not be completed. Please try again.");
  text = text.replace(/Backend state rejected mutation\.?/gi, "The action could not be processed with the current record status.");
  text = text.replace(/Reassignment rejected by backend/gi, "Reassignment could not be completed.");
  text = text.replace(/per the backend contract/gi, "per system guidelines");
  text = text.replace(/Frappe/gi, "System");

  // 9. Clean up leftover code syntax or punctuation artifacts
  text = text.replace(/[{}[\]]/g, "");
  text = text.replace(/\s*:\s*\./g, ".");
  text = text.replace(/\s*•\s*/g, ". ");
  text = text.replace(/\s+/g, " ").trim();

  // If text became empty or still looks like raw code
  if (
    !text ||
    text.length < 3 ||
    text.includes("Traceback") ||
    text.includes("SyntaxError") ||
    text.includes("TypeError") ||
    text.includes("KeyError") ||
    text.includes("pymysql")
  ) {
    return "An unexpected error occurred while processing your request. Please try again.";
  }

  // Capitalize first character
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Ensure ends with punctuation
  if (!/[.!?]$/.test(text)) {
    text += ".";
  }

  return text;
}
