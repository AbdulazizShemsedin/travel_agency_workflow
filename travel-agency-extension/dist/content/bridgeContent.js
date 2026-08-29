// src/lib/types.ts
var BRIDGE_EVENT_SELECT_APPLICANT = "TRAVEL_AGENCY_SELECT_APPLICANT";
var BRIDGE_EVENT_APPLICANT_SAVED = "TRAVEL_AGENCY_APPLICANT_SAVED";
var BRIDGE_EVENT_CLEAR_APPLICANT = "TRAVEL_AGENCY_CLEAR_APPLICANT";
var BRIDGE_EVENT_CHECK_INSTALLED = "TRAVEL_AGENCY_CHECK_EXTENSION_INSTALLED";
var BRIDGE_EVENT_EXTENSION_READY = "TRAVEL_AGENCY_EXTENSION_READY";

// src/lib/validator.ts
function validateSelectedApplicant(input) {
  if (!input || typeof input !== "object") {
    return { valid: false, error: "Invalid payload: applicant must be a non-null object." };
  }
  const obj = input;
  if (typeof obj.applicantId !== "string" || !obj.applicantId.trim()) {
    return { valid: false, error: "Missing or invalid required field 'applicantId'." };
  }
  if (typeof obj.fullName !== "string" || !obj.fullName.trim()) {
    return { valid: false, error: "Missing or invalid required field 'fullName'." };
  }
  const sanitized = {
    applicantId: obj.applicantId.trim(),
    fullName: obj.fullName.trim(),
    firstName: typeof obj.firstName === "string" ? obj.firstName.trim() : void 0,
    middleName: typeof obj.middleName === "string" ? obj.middleName.trim() : void 0,
    lastName: typeof obj.lastName === "string" ? obj.lastName.trim() : void 0,
    passportNumber: typeof obj.passportNumber === "string" ? obj.passportNumber.trim() : void 0,
    passportExpiry: typeof obj.passportExpiry === "string" ? obj.passportExpiry.trim() : void 0,
    passportIssueDate: typeof obj.passportIssueDate === "string" ? obj.passportIssueDate.trim() : void 0,
    destinationCountry: typeof obj.destinationCountry === "string" ? obj.destinationCountry.trim() : void 0,
    applicantState: typeof obj.applicantState === "string" ? obj.applicantState.trim() : void 0,
    applicantType: typeof obj.applicantType === "string" ? obj.applicantType.trim() : void 0,
    jobApplied: typeof obj.jobApplied === "string" ? obj.jobApplied.trim() : void 0,
    gender: typeof obj.gender === "string" ? obj.gender.trim() : void 0,
    dateOfBirth: typeof obj.dateOfBirth === "string" ? obj.dateOfBirth.trim() : void 0,
    age: typeof obj.age === "number" || typeof obj.age === "string" ? obj.age : void 0,
    religion: typeof obj.religion === "string" ? obj.religion.trim() : void 0,
    placeOfBirth: typeof obj.placeOfBirth === "string" ? obj.placeOfBirth.trim() : void 0,
    maritalStatus: typeof obj.maritalStatus === "string" ? obj.maritalStatus.trim() : void 0,
    phone: typeof obj.phone === "string" ? obj.phone.trim() : void 0,
    city: typeof obj.city === "string" ? obj.city.trim() : void 0,
    country: typeof obj.country === "string" ? obj.country.trim() : void 0,
    medicalStatus: typeof obj.medicalStatus === "string" ? obj.medicalStatus.trim() : void 0,
    photoUrl: typeof obj.photoUrl === "string" ? obj.photoUrl.trim() : void 0,
    selectedAt: typeof obj.selectedAt === "string" && obj.selectedAt.trim() ? obj.selectedAt.trim() : (/* @__PURE__ */ new Date()).toISOString()
  };
  return { valid: true, applicant: sanitized };
}

// src/content/bridgeContent.ts
function broadcastReady() {
  const version = chrome.runtime.getManifest()?.version || "1.0.0";
  window.postMessage(
    {
      type: BRIDGE_EVENT_EXTENSION_READY,
      version,
      ready: true
    },
    "*"
  );
}
broadcastReady();
window.addEventListener("message", async (event) => {
  if (event.source !== window || !event.data || typeof event.data !== "object") {
    return;
  }
  const data = event.data;
  if (data.type === BRIDGE_EVENT_CHECK_INSTALLED) {
    broadcastReady();
    return;
  }
  if (data.type === BRIDGE_EVENT_SELECT_APPLICANT) {
    const rawApplicant = data.applicant;
    const validation = validateSelectedApplicant(rawApplicant);
    if (!validation.valid || !validation.applicant) {
      window.postMessage(
        {
          type: BRIDGE_EVENT_APPLICANT_SAVED,
          success: false,
          applicantId: rawApplicant?.applicantId || "unknown",
          error: validation.error || "Invalid candidate payload structure."
        },
        "*"
      );
      return;
    }
    try {
      chrome.runtime.sendMessage(
        {
          type: "SELECT_APPLICANT",
          applicant: validation.applicant
        },
        (response) => {
          const success = response?.success ?? false;
          window.postMessage(
            {
              type: BRIDGE_EVENT_APPLICANT_SAVED,
              success,
              applicantId: validation.applicant.applicantId,
              error: response?.error
            },
            "*"
          );
        }
      );
    } catch (sendErr) {
      window.postMessage(
        {
          type: BRIDGE_EVENT_APPLICANT_SAVED,
          success: false,
          applicantId: validation.applicant.applicantId,
          error: sendErr instanceof Error ? sendErr.message : "Extension message channel closed."
        },
        "*"
      );
    }
  }
  if (data.type === BRIDGE_EVENT_CLEAR_APPLICANT) {
    try {
      chrome.runtime.sendMessage({ type: "CLEAR_SELECTED_APPLICANT" }, () => {
        window.postMessage(
          {
            type: "TRAVEL_AGENCY_APPLICANT_CLEARED",
            success: true
          },
          "*"
        );
      });
    } catch {
    }
  }
});
//# sourceMappingURL=bridgeContent.js.map
