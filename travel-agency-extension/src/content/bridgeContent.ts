import {
  BRIDGE_EVENT_SELECT_APPLICANT,
  BRIDGE_EVENT_APPLICANT_SAVED,
  BRIDGE_EVENT_CLEAR_APPLICANT,
  BRIDGE_EVENT_CHECK_INSTALLED,
  BRIDGE_EVENT_EXTENSION_READY,
  BridgeSelectApplicantEventData,
} from "../lib/types";
import { setSelectedApplicant, clearSelectedApplicant } from "../lib/storage";
import { validateSelectedApplicant } from "../lib/validator";

/**
 * Travel Agency Web App ↔ Browser Extension Communication Bridge
 * Runs as a content script isolated on the Travel Agency web application domain.
 */

// 1. Mark DOM immediately so web app can detect extension presence synchronously
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
        ready: true,
      },
      "*"
    );
    // Also dispatch custom DOM event
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_EXTENSION_READY, {
        detail: { version, ready: true },
      })
    );
  } catch (err) {
    console.warn("[Travel Agency Extension Bridge] Error marking ready:", err);
  }
}

// Initial announcement
markExtensionReady();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", markExtensionReady);
}

// Handler for applicant selection
async function handleSelectApplicant(rawApplicant: any) {
  const validation = validateSelectedApplicant(rawApplicant);

  if (!validation.valid || !validation.applicant) {
    const errorMsg = validation.error || "Invalid candidate payload structure.";
    window.postMessage(
      {
        type: BRIDGE_EVENT_APPLICANT_SAVED,
        success: false,
        applicantId: rawApplicant?.applicantId || "unknown",
        error: errorMsg,
      },
      "*"
    );
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_APPLICANT_SAVED, {
        detail: { success: false, applicantId: rawApplicant?.applicantId, error: errorMsg },
      })
    );
    return;
  }

  try {
    // 1. Authoritative direct write into chrome.storage.local
    await setSelectedApplicant(validation.applicant);

    // 2. Notify background worker for badge / context menu sync (non-blocking)
    try {
      chrome.runtime?.sendMessage?.({
        type: "SELECT_APPLICANT",
        applicant: validation.applicant,
      });
    } catch {
      // Non-blocking
    }

    // 3. Dispatch success postMessage to web app
    window.postMessage(
      {
        type: BRIDGE_EVENT_APPLICANT_SAVED,
        success: true,
        applicantId: validation.applicant.applicantId,
      },
      "*"
    );

    // 4. Also dispatch DOM CustomEvent
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_APPLICANT_SAVED, {
        detail: { success: true, applicantId: validation.applicant.applicantId },
      })
    );
  } catch (saveErr: any) {
    const errorMsg = saveErr?.message || "Failed to save applicant into extension storage.";
    window.postMessage(
      {
        type: BRIDGE_EVENT_APPLICANT_SAVED,
        success: false,
        applicantId: validation.applicant.applicantId,
        error: errorMsg,
      },
      "*"
    );
    document.dispatchEvent(
      new CustomEvent(BRIDGE_EVENT_APPLICANT_SAVED, {
        detail: { success: false, applicantId: validation.applicant.applicantId, error: errorMsg },
      })
    );
  }
}

// Handler for applicant clear
async function handleClearApplicant() {
  try {
    await clearSelectedApplicant();
    try {
      chrome.runtime?.sendMessage?.({ type: "CLEAR_SELECTED_APPLICANT" });
    } catch {}
    window.postMessage({ type: "TRAVEL_AGENCY_APPLICANT_CLEARED", success: true }, "*");
    document.dispatchEvent(new CustomEvent("TRAVEL_AGENCY_APPLICANT_CLEARED", { detail: { success: true } }));
  } catch {
    // Ignore
  }
}

// Listen for window postMessages dispatched by the Next.js frontend
window.addEventListener("message", async (event: MessageEvent) => {
  if (event.source !== window || !event.data || typeof event.data !== "object") {
    return;
  }

  const data = event.data;

  // 1. Health check / Extension presence detection
  if (data.type === BRIDGE_EVENT_CHECK_INSTALLED) {
    markExtensionReady();
    return;
  }

  // 2. Select Applicant from Web App
  if (data.type === BRIDGE_EVENT_SELECT_APPLICANT) {
    await handleSelectApplicant((data as BridgeSelectApplicantEventData).applicant);
  }

  // 3. Clear Applicant from Web App
  if (data.type === BRIDGE_EVENT_CLEAR_APPLICANT) {
    await handleClearApplicant();
  }
});

// Also listen for CustomEvents dispatched directly on document
document.addEventListener(BRIDGE_EVENT_CHECK_INSTALLED, () => markExtensionReady());
document.addEventListener(BRIDGE_EVENT_SELECT_APPLICANT, (e: any) => {
  if (e.detail?.applicant) handleSelectApplicant(e.detail.applicant);
});
document.addEventListener(BRIDGE_EVENT_CLEAR_APPLICANT, () => handleClearApplicant());

