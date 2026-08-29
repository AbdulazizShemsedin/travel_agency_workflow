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

// src/lib/storage.ts
var STORAGE_KEY_SELECTED_APPLICANT = "travel_agency_selected_applicant";
var STORAGE_KEY_LAST_UPDATED = "travel_agency_last_updated";
async function getSelectedApplicant() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY_SELECTED_APPLICANT], (result) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      const stored = result[STORAGE_KEY_SELECTED_APPLICANT];
      if (!stored) {
        return resolve(null);
      }
      const validation = validateSelectedApplicant(stored);
      if (validation.valid && validation.applicant) {
        resolve(validation.applicant);
      } else {
        chrome.storage.local.remove([STORAGE_KEY_SELECTED_APPLICANT]);
        resolve(null);
      }
    });
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
function onSelectedApplicantChange(callback) {
  const listener = (changes, areaName) => {
    if (areaName === "local" && STORAGE_KEY_SELECTED_APPLICANT in changes) {
      const newVal = changes[STORAGE_KEY_SELECTED_APPLICANT].newValue;
      if (!newVal) {
        callback(null);
      } else {
        const val = validateSelectedApplicant(newVal);
        callback(val.valid && val.applicant ? val.applicant : null);
      }
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}

// src/popup/popup.ts
var loadingState = document.getElementById("loading-state");
var emptyState = document.getElementById("empty-state");
var selectedState = document.getElementById("selected-state");
var applicantAvatar = document.getElementById("applicant-avatar");
var applicantFullName = document.getElementById("applicant-fullname");
var applicantId = document.getElementById("applicant-id");
var applicantPassport = document.getElementById("applicant-passport");
var applicantDestination = document.getElementById("applicant-destination");
var applicantJob = document.getElementById("applicant-job");
var applicantPob = document.getElementById("applicant-pob");
var applicantReligion = document.getElementById("applicant-religion");
var applicantState = document.getElementById("applicant-state");
var applicantTimestamp = document.getElementById("applicant-timestamp");
var btnClear = document.getElementById("btn-clear");
function getInitials(name) {
  if (!name) return "AA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Just now";
  }
}
function renderUI(applicant) {
  loadingState.style.display = "none";
  if (!applicant) {
    emptyState.style.display = "flex";
    selectedState.style.display = "none";
    return;
  }
  emptyState.style.display = "none";
  selectedState.style.display = "flex";
  applicantAvatar.textContent = getInitials(applicant.fullName);
  applicantFullName.textContent = applicant.fullName;
  applicantId.textContent = applicant.applicantId;
  applicantPassport.textContent = applicant.passportNumber || "\u2014";
  applicantDestination.textContent = applicant.destinationCountry || "Saudi Arabia";
  applicantJob.textContent = applicant.jobApplied || "Housemaid";
  applicantPob.textContent = applicant.placeOfBirth || "\u2014";
  applicantReligion.textContent = applicant.religion || "\u2014";
  applicantState.textContent = applicant.applicantState || "Active";
  applicantTimestamp.textContent = formatTime(applicant.selectedAt);
}
async function init() {
  try {
    const current = await getSelectedApplicant();
    renderUI(current);
  } catch (err) {
    console.error("Failed to load selected applicant:", err);
    renderUI(null);
  }
}
if (btnClear) {
  btnClear.addEventListener("click", async () => {
    btnClear.disabled = true;
    try {
      await clearSelectedApplicant();
      renderUI(null);
    } catch (err) {
      console.error("Failed to clear applicant:", err);
    } finally {
      btnClear.disabled = false;
    }
  });
}
onSelectedApplicantChange((updatedApplicant) => {
  renderUI(updatedApplicant);
});
document.addEventListener("DOMContentLoaded", init);
//# sourceMappingURL=popup.js.map
