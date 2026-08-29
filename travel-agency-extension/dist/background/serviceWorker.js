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

// src/background/serviceWorker.ts
var MENU_ROOT_ID = "travel_agency_assistant_root";
var MENU_SHOW_ID = "travel_agency_show_applicant";
var MENU_CLEAR_ID = "travel_agency_clear_applicant";
function initContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ROOT_ID,
      title: "Travel Agency Assistant",
      contexts: ["all"]
    });
    chrome.contextMenus.create({
      id: MENU_SHOW_ID,
      parentId: MENU_ROOT_ID,
      title: "Show Selected Applicant",
      contexts: ["all"]
    });
    chrome.contextMenus.create({
      id: MENU_CLEAR_ID,
      parentId: MENU_ROOT_ID,
      title: "Clear Selected Applicant",
      contexts: ["all"]
    });
  });
}
chrome.runtime.onInstalled.addListener(() => {
  initContextMenus();
  getSelectedApplicant().then((applicant) => {
    if (applicant) {
      chrome.action.setBadgeText({ text: "1" });
      chrome.action.setBadgeBackgroundColor({ color: "#047857" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  }).catch(() => {
  });
});
chrome.runtime.onStartup.addListener(() => {
  initContextMenus();
});
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_SHOW_ID) {
    const applicant = await getSelectedApplicant();
    if (applicant) {
      chrome.action.setBadgeText({ text: "\u2713" });
      chrome.action.setBadgeBackgroundColor({ color: "#047857" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "1" });
      }, 2500);
      if (tab?.id) {
        chrome.scripting?.executeScript({
          target: { tabId: tab.id },
          func: (candName, candId, passNum) => {
            console.log(
              `%c[Travel Agency Assistant]%c Selected Candidate Active: ${candName} (${candId}) - Passport: ${passNum || "N/A"}`,
              "background: #047857; color: white; padding: 3px 6px; border-radius: 4px; font-weight: bold;",
              "color: #047857; font-weight: bold; margin-left: 6px;"
            );
          },
          args: [applicant.fullName, applicant.applicantId, applicant.passportNumber || ""]
        }).catch(() => {
        });
      }
    } else {
      chrome.action.setBadgeText({ text: "0" });
      chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "" });
      }, 2500);
    }
  } else if (info.menuItemId === MENU_CLEAR_ID) {
    await clearSelectedApplicant();
  }
});
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    handleMessage(message).then((res) => sendResponse(res)).catch(
      (err) => sendResponse({
        success: false,
        error: err instanceof Error ? err.message : "Unknown extension error."
      })
    );
    return true;
  }
);
chrome.runtime.onMessageExternal.addListener(
  (message, _sender, sendResponse) => {
    if (typeof message === "object" && message !== null && "type" in message) {
      handleMessage(message).then((res) => sendResponse(res)).catch(
        (err) => sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Unknown external message error."
        })
      );
      return true;
    }
    sendResponse({ success: false, error: "Invalid message format." });
    return false;
  }
);
async function handleMessage(message) {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return { success: false, error: "Malformed message object." };
  }
  switch (message.type) {
    case "SELECT_APPLICANT": {
      const validation = validateSelectedApplicant(message.applicant);
      if (!validation.valid || !validation.applicant) {
        return {
          success: false,
          error: validation.error || "Invalid applicant data payload."
        };
      }
      await setSelectedApplicant(validation.applicant);
      return {
        success: true,
        data: { applicantId: validation.applicant.applicantId },
        message: `Applicant ${validation.applicant.applicantId} saved successfully into extension storage.`
      };
    }
    case "GET_SELECTED_APPLICANT": {
      const applicant = await getSelectedApplicant();
      return {
        success: true,
        data: applicant
      };
    }
    case "CLEAR_SELECTED_APPLICANT": {
      await clearSelectedApplicant();
      return {
        success: true,
        data: null,
        message: "Selected applicant cleared from extension storage."
      };
    }
    case "PING": {
      return {
        success: true,
        data: { version: chrome.runtime.getManifest().version, ready: true }
      };
    }
    default:
      return {
        success: false,
        error: `Unrecognized message type: ${message.type}`
      };
  }
}
//# sourceMappingURL=serviceWorker.js.map
