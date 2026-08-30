import { SelectedApplicant } from "../lib/types";
import {
  getSelectedApplicant,
  clearSelectedApplicant,
  onSelectedApplicantChange,
} from "../lib/storage";
import { executeAutofill } from "../lib/autofillEngine";

// DOM Elements
const loadingState = document.getElementById("loading-state") as HTMLDivElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const selectedState = document.getElementById("selected-state") as HTMLDivElement;
const autofillBanner = document.getElementById("autofill-banner") as HTMLDivElement;
const autofillBannerText = document.getElementById("autofill-banner-text") as HTMLSpanElement;

const applicantAvatar = document.getElementById("applicant-avatar") as HTMLDivElement;
const applicantFullName = document.getElementById("applicant-fullname") as HTMLHeadingElement;
const applicantId = document.getElementById("applicant-id") as HTMLSpanElement;
const applicantPassport = document.getElementById("applicant-passport") as HTMLSpanElement;
const applicantDestination = document.getElementById("applicant-destination") as HTMLSpanElement;
const applicantJob = document.getElementById("applicant-job") as HTMLSpanElement;
const applicantPob = document.getElementById("applicant-pob") as HTMLSpanElement;
const applicantReligion = document.getElementById("applicant-religion") as HTMLSpanElement;
const applicantDob = document.getElementById("applicant-dob") as HTMLSpanElement;
const applicantTimestamp = document.getElementById("applicant-timestamp") as HTMLSpanElement;

const btnAutofill = document.getElementById("btn-autofill") as HTMLButtonElement;
const btnClear = document.getElementById("btn-clear") as HTMLButtonElement;

// Copy buttons
const copyNameBtn = document.getElementById("copy-name") as HTMLButtonElement;
const copyPassportBtn = document.getElementById("copy-passport") as HTMLButtonElement;
const copyDobBtn = document.getElementById("copy-dob") as HTMLButtonElement;

let currentApplicant: SelectedApplicant | null = null;

/**
 * Derives two-letter initials from full name
 */
function getInitials(name: string): string {
  if (!name) return "AA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Formats ISO timestamp to human readable string
 */
function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Just now";
  }
}

/**
 * Copies text to clipboard and flashes button feedback
 */
async function copyToClipboard(text: string, btn?: HTMLElement) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span style="color:#10b981; font-size:10px; font-weight:bold;">✓</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 1500);
    }
  } catch {
    // Fallback if clipboard API restricted
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }
}

/**
 * Shows temporary feedback banner in popup
 */
function showBanner(message: string, isError: boolean = false) {
  if (!autofillBanner || !autofillBannerText) return;
  autofillBannerText.textContent = message;
  autofillBanner.style.display = "block";
  autofillBanner.style.backgroundColor = isError ? "rgba(225, 29, 72, 0.1)" : "var(--brand-emerald-light)";
  autofillBanner.style.color = isError ? "var(--danger-color)" : "var(--brand-emerald)";
  autofillBanner.style.borderColor = isError ? "rgba(225, 29, 72, 0.3)" : "var(--brand-emerald-border)";

  setTimeout(() => {
    autofillBanner.style.display = "none";
  }, 4000);
}

/**
 * Renders the UI according to stored state
 */
function renderUI(applicant: SelectedApplicant | null) {
  currentApplicant = applicant;
  loadingState.style.display = "none";

  if (!applicant) {
    emptyState.style.display = "flex";
    selectedState.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  selectedState.style.display = "flex";

  // Populate candidate data
  applicantAvatar.textContent = getInitials(applicant.fullName);
  applicantFullName.textContent = applicant.fullName;
  applicantId.textContent = applicant.applicantId;
  applicantPassport.textContent = applicant.passportNumber || "—";
  applicantDestination.textContent = applicant.destinationCountry || "Saudi Arabia";
  applicantJob.textContent = applicant.jobApplied || "Housemaid";
  applicantPob.textContent = applicant.placeOfBirth || "—";
  applicantReligion.textContent = applicant.religion || "—";
  applicantDob.textContent = applicant.dateOfBirth || "—";
  applicantTimestamp.textContent = formatTime(applicant.selectedAt);
}

/**
 * Executes autofill on the active browser tab
 */
async function handleAutofillClick() {
  if (!currentApplicant) {
    showBanner("No candidate loaded in memory.", true);
    return;
  }

  btnAutofill.disabled = true;
  btnAutofill.style.opacity = "0.7";

  try {
    // 1. Query the currently active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      showBanner("No active browser tab found.", true);
      return;
    }

    // Check if the tab is a restricted browser internal page
    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
      showBanner("Cannot autofill on internal browser pages.", true);
      return;
    }

    // 2. Execute autofill engine on active tab DOM
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executeAutofill,
      args: [currentApplicant],
    });

    const result = results?.[0]?.result;
    if (result && result.success) {
      showBanner(`✓ Filled ${result.filledCount} field${result.filledCount > 1 ? "s" : ""} on page!`);
    } else {
      showBanner(result?.message || "No matching form fields found on this page.", true);
    }
  } catch (err: any) {
    console.error("Autofill execution error:", err);
    showBanner(err?.message || "Failed to access active page for autofill.", true);
  } finally {
    btnAutofill.disabled = false;
    btnAutofill.style.opacity = "1";
  }
}

// Initial State Load
async function init() {
  try {
    const current = await getSelectedApplicant();
    renderUI(current);
  } catch (err) {
    console.error("Failed to load selected applicant:", err);
    renderUI(null);
  }
}

// Event Listeners
if (btnAutofill) {
  btnAutofill.addEventListener("click", handleAutofillClick);
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

// Copy button listeners
if (copyNameBtn) {
  copyNameBtn.addEventListener("click", () => {
    if (currentApplicant?.fullName) copyToClipboard(currentApplicant.fullName, copyNameBtn);
  });
}

if (copyPassportBtn) {
  copyPassportBtn.addEventListener("click", () => {
    if (currentApplicant?.passportNumber) copyToClipboard(currentApplicant.passportNumber, copyPassportBtn);
  });
}

if (copyDobBtn) {
  copyDobBtn.addEventListener("click", () => {
    if (currentApplicant?.dateOfBirth) copyToClipboard(currentApplicant.dateOfBirth, copyDobBtn);
  });
}

// Reactive Storage Subscription
onSelectedApplicantChange((updatedApplicant) => {
  renderUI(updatedApplicant);
});

// Run
document.addEventListener("DOMContentLoaded", init);
