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
    placeOfIssue: typeof obj.placeOfIssue === "string" ? obj.placeOfIssue.trim() : void 0,
    nationalId: typeof obj.nationalId === "string" ? obj.nationalId.trim() : void 0,
    labourId: typeof obj.labourId === "string" ? obj.labourId.trim() : void 0,
    destinationCountry: typeof obj.destinationCountry === "string" ? obj.destinationCountry.trim() : void 0,
    applicantState: typeof obj.applicantState === "string" ? obj.applicantState.trim() : void 0,
    applicantType: typeof obj.applicantType === "string" ? obj.applicantType.trim() : void 0,
    jobApplied: typeof obj.jobApplied === "string" ? obj.jobApplied.trim() : void 0,
    visaType: typeof obj.visaType === "string" ? obj.visaType.trim() : void 0,
    gender: typeof obj.gender === "string" ? obj.gender.trim() : void 0,
    dateOfBirth: typeof obj.dateOfBirth === "string" ? obj.dateOfBirth.trim() : void 0,
    age: typeof obj.age === "number" || typeof obj.age === "string" ? obj.age : void 0,
    religion: typeof obj.religion === "string" ? obj.religion.trim() : void 0,
    placeOfBirth: typeof obj.placeOfBirth === "string" ? obj.placeOfBirth.trim() : void 0,
    leavingTown: typeof obj.leavingTown === "string" ? obj.leavingTown.trim() : void 0,
    maritalStatus: typeof obj.maritalStatus === "string" ? obj.maritalStatus.trim() : void 0,
    nationality: typeof obj.nationality === "string" ? obj.nationality.trim() : void 0,
    email: typeof obj.email === "string" ? obj.email.trim() : void 0,
    phone: typeof obj.phone === "string" ? obj.phone.trim() : void 0,
    alternatePhone: typeof obj.alternatePhone === "string" ? obj.alternatePhone.trim() : void 0,
    city: typeof obj.city === "string" ? obj.city.trim() : void 0,
    country: typeof obj.country === "string" ? obj.country.trim() : void 0,
    addressLine1: typeof obj.addressLine1 === "string" ? obj.addressLine1.trim() : void 0,
    medicalStatus: typeof obj.medicalStatus === "string" ? obj.medicalStatus.trim() : void 0,
    photoUrl: typeof obj.photoUrl === "string" ? obj.photoUrl.trim() : void 0,
    monthlySalary: typeof obj.monthlySalary === "number" || typeof obj.monthlySalary === "string" ? obj.monthlySalary : void 0,
    salaryCurrency: typeof obj.salaryCurrency === "string" ? obj.salaryCurrency.trim() : void 0,
    contractPeriod: typeof obj.contractPeriod === "string" ? obj.contractPeriod.trim() : void 0,
    sponsorName: typeof obj.sponsorName === "string" ? obj.sponsorName.trim() : void 0,
    sponsorId: typeof obj.sponsorId === "string" ? obj.sponsorId.trim() : void 0,
    sponsorPhone: typeof obj.sponsorPhone === "string" ? obj.sponsorPhone.trim() : void 0,
    visaNumber: typeof obj.visaNumber === "string" ? obj.visaNumber.trim() : void 0,
    contractNumber: typeof obj.contractNumber === "string" ? obj.contractNumber.trim() : void 0,
    contractorName: typeof obj.contractorName === "string" ? obj.contractorName.trim() : void 0,
    selectedAt: typeof obj.selectedAt === "string" && obj.selectedAt.trim() ? obj.selectedAt.trim() : (/* @__PURE__ */ new Date()).toISOString()
  };
  return { valid: true, applicant: sanitized };
}

// src/lib/storage.ts
var STORAGE_KEY_SELECTED_APPLICANT = "travel_agency_selected_applicant";
var STORAGE_KEY_LAST_UPDATED = "travel_agency_last_updated";
async function setSelectedApplicant(applicant) {
  const validation = validateSelectedApplicant(applicant);
  if (!validation.valid || !validation.applicant) {
    throw new Error(validation.error || "Failed to validate applicant before saving.");
  }
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      {
        [STORAGE_KEY_SELECTED_APPLICANT]: validation.applicant,
        [STORAGE_KEY_LAST_UPDATED]: (/* @__PURE__ */ new Date()).toISOString()
      },
      () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        try {
          if (chrome.action) {
            chrome.action.setBadgeText({ text: "1" });
            chrome.action.setBadgeBackgroundColor({ color: "#047857" });
          }
        } catch {
        }
        resolve();
      }
    );
  });
}
async function clearSelectedApplicant() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([STORAGE_KEY_SELECTED_APPLICANT, STORAGE_KEY_LAST_UPDATED], () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      try {
        if (chrome.action) {
          chrome.action.setBadgeText({ text: "" });
        }
      } catch {
      }
      resolve();
    });
  });
}

// src/content/bridgeContent.ts
function markExtensionReady() {
  try {
    const version = chrome?.runtime?.getManifest?.()?.version || "1.0.0";
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-travel-agency-extension-ready", "true");
      document.documentElement.setAttribute("data-travel-agency-extension-version", version);
    }
    window.postMessage(
      {
        type: BRIDGE_EVENT_EXTENSION_READY,
        version,
        ready: true
      },
      "*"
    );
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_EXTENSION_READY, {
        detail: { version, ready: true }
      })
    );
  } catch (err) {
    console.warn("[Travel Agency Extension Bridge] Error marking ready:", err);
  }
}
markExtensionReady();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", markExtensionReady);
}
async function handleSelectApplicant(rawApplicant) {
  const validation = validateSelectedApplicant(rawApplicant);
  if (!validation.valid || !validation.applicant) {
    const errorMsg = validation.error || "Invalid candidate payload structure.";
    window.postMessage(
      {
        type: BRIDGE_EVENT_APPLICANT_SAVED,
        success: false,
        applicantId: rawApplicant?.applicantId || "unknown",
        error: errorMsg
      },
      "*"
    );
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_APPLICANT_SAVED, {
        detail: { success: false, applicantId: rawApplicant?.applicantId, error: errorMsg }
      })
    );
    return;
  }
  try {
    await setSelectedApplicant(validation.applicant);
    try {
      chrome.runtime?.sendMessage?.({
        type: "SELECT_APPLICANT",
        applicant: validation.applicant
      });
    } catch {
    }
    window.postMessage(
      {
        type: BRIDGE_EVENT_APPLICANT_SAVED,
        success: true,
        applicantId: validation.applicant.applicantId
      },
      "*"
    );
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_APPLICANT_SAVED, {
        detail: { success: true, applicantId: validation.applicant.applicantId }
      })
    );
  } catch (saveErr) {
    const errorMsg = saveErr?.message || "Failed to save applicant into extension storage.";
    window.postMessage(
      {
        type: BRIDGE_EVENT_APPLICANT_SAVED,
        success: false,
        applicantId: validation.applicant.applicantId,
        error: errorMsg
      },
      "*"
    );
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_APPLICANT_SAVED, {
        detail: { success: false, applicantId: validation.applicant.applicantId, error: errorMsg }
      })
    );
  }
}
async function handleClearApplicant() {
  try {
    await clearSelectedApplicant();
    try {
      chrome.runtime?.sendMessage?.({ type: "CLEAR_SELECTED_APPLICANT" });
    } catch {
    }
    window.postMessage({ type: "TRAVEL_AGENCY_APPLICANT_CLEARED", success: true }, "*");
    document.dispatchEvent(new CustomEvent("TRAVEL_AGENCY_APPLICANT_CLEARED", { detail: { success: true } }));
  } catch {
  }
}
window.addEventListener("message", async (event) => {
  if (event.source !== window || !event.data || typeof event.data !== "object") {
    return;
  }
  const data = event.data;
  if (data.type === BRIDGE_EVENT_CHECK_INSTALLED) {
    markExtensionReady();
    return;
  }
  if (data.type === BRIDGE_EVENT_SELECT_APPLICANT) {
    await handleSelectApplicant(data.applicant);
  }
  if (data.type === BRIDGE_EVENT_CLEAR_APPLICANT) {
    await handleClearApplicant();
  }
});
document.addEventListener(BRIDGE_EVENT_CHECK_INSTALLED, () => markExtensionReady());
document.addEventListener(BRIDGE_EVENT_SELECT_APPLICANT, (e) => {
  if (e.detail?.applicant) handleSelectApplicant(e.detail.applicant);
});
document.addEventListener(BRIDGE_EVENT_CLEAR_APPLICANT, () => handleClearApplicant());
//# sourceMappingURL=bridgeContent.js.map
