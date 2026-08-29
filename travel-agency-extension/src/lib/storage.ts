import { SelectedApplicant } from "./types";
import { validateSelectedApplicant } from "./validator";

const STORAGE_KEY_SELECTED_APPLICANT = "travel_agency_selected_applicant";
const STORAGE_KEY_LAST_UPDATED = "travel_agency_last_updated";

/**
 * Stores the validated selected applicant in chrome.storage.local.
 * Updates the extension icon badge text to indicate an active candidate is loaded.
 */
export async function setSelectedApplicant(applicant: SelectedApplicant): Promise<void> {
  const validation = validateSelectedApplicant(applicant);
  if (!validation.valid || !validation.applicant) {
    throw new Error(validation.error || "Failed to validate applicant before saving.");
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      {
        [STORAGE_KEY_SELECTED_APPLICANT]: validation.applicant,
        [STORAGE_KEY_LAST_UPDATED]: new Date().toISOString(),
      },
      () => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }

        // Set action badge (e.g. "1" or check mark to indicate applicant loaded)
        try {
          if (chrome.action) {
            chrome.action.setBadgeText({ text: "1" });
            chrome.action.setBadgeBackgroundColor({ color: "#047857" }); // Emerald-800
          }
        } catch {
          // Action badge optional if running outside action context
        }

        resolve();
      }
    );
  });
}

/**
 * Retrieves the currently selected applicant from chrome.storage.local.
 * Returns null if no applicant is currently stored.
 */
export async function getSelectedApplicant(): Promise<SelectedApplicant | null> {
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
        // Clear corrupted/unrecognized data
        chrome.storage.local.remove([STORAGE_KEY_SELECTED_APPLICANT]);
        resolve(null);
      }
    });
  });
}

/**
 * Clears the selected applicant from chrome.storage.local.
 * Clears the extension action badge.
 */
export async function clearSelectedApplicant(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([STORAGE_KEY_SELECTED_APPLICANT, STORAGE_KEY_LAST_UPDATED], () => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      // Clear action badge
      try {
        if (chrome.action) {
          chrome.action.setBadgeText({ text: "" });
        }
      } catch {
        // Action badge optional
      }

      resolve();
    });
  });
}

/**
 * Subscribes to storage changes for reactive popup/UI updates.
 */
export function onSelectedApplicantChange(
  callback: (applicant: SelectedApplicant | null) => void
): () => void {
  const listener = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
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
