import { SelectedApplicant } from "../lib/types";
import {
  getSelectedApplicant,
  clearSelectedApplicant,
  onSelectedApplicantChange,
} from "../lib/storage";

// DOM Elements
const loadingState = document.getElementById("loading-state") as HTMLDivElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const selectedState = document.getElementById("selected-state") as HTMLDivElement;

const applicantAvatar = document.getElementById("applicant-avatar") as HTMLDivElement;
const applicantFullName = document.getElementById("applicant-fullname") as HTMLHeadingElement;
const applicantId = document.getElementById("applicant-id") as HTMLSpanElement;
const applicantPassport = document.getElementById("applicant-passport") as HTMLSpanElement;
const applicantDestination = document.getElementById("applicant-destination") as HTMLSpanElement;
const applicantJob = document.getElementById("applicant-job") as HTMLSpanElement;
const applicantPob = document.getElementById("applicant-pob") as HTMLSpanElement;
const applicantReligion = document.getElementById("applicant-religion") as HTMLSpanElement;
const applicantState = document.getElementById("applicant-state") as HTMLSpanElement;
const applicantTimestamp = document.getElementById("applicant-timestamp") as HTMLSpanElement;

const btnClear = document.getElementById("btn-clear") as HTMLButtonElement;

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
 * Renders the UI according to stored state
 */
function renderUI(applicant: SelectedApplicant | null) {
  loadingState.style.display = "none";

  if (!applicant) {
    emptyState.style.display = "flex";
    selectedState.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  selectedState.style.display = "flex";

  // Populate actual data
  applicantAvatar.textContent = getInitials(applicant.fullName);
  applicantFullName.textContent = applicant.fullName;
  applicantId.textContent = applicant.applicantId;
  applicantPassport.textContent = applicant.passportNumber || "—";
  applicantDestination.textContent = applicant.destinationCountry || "Saudi Arabia";
  applicantJob.textContent = applicant.jobApplied || "Housemaid";
  applicantPob.textContent = applicant.placeOfBirth || "—";
  applicantReligion.textContent = applicant.religion || "—";
  applicantState.textContent = applicant.applicantState || "Active";
  applicantTimestamp.textContent = formatTime(applicant.selectedAt);
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

// Reactive Storage Subscription
onSelectedApplicantChange((updatedApplicant) => {
  renderUI(updatedApplicant);
});

// Run
document.addEventListener("DOMContentLoaded", init);
