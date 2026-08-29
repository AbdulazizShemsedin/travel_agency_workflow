import {
  BRIDGE_EVENT_SELECT_APPLICANT,
  BRIDGE_EVENT_APPLICANT_SAVED,
  BRIDGE_EVENT_CLEAR_APPLICANT,
  BRIDGE_EVENT_CHECK_INSTALLED,
  BRIDGE_EVENT_EXTENSION_READY,
  BridgeSelectApplicantEventData,
} from "../lib/types";
import { validateSelectedApplicant } from "../lib/validator";

/**
 * Travel Agency Web App ↔ Browser Extension Communication Bridge
 * Runs as a content script isolated on the Travel Agency web application domain.
 */

// Notify the web application that the extension is ready and listening
function broadcastReady() {
  const version = chrome.runtime.getManifest()?.version || "1.0.0";
  window.postMessage(
    {
      type: BRIDGE_EVENT_EXTENSION_READY,
      version,
      ready: true,
    },
    "*"
  );
}

// Initial announcement
broadcastReady();

// Listen for window postMessages dispatched by the Next.js frontend
window.addEventListener("message", async (event: MessageEvent) => {
  // Only accept messages from same origin/trusted window
  if (event.source !== window || !event.data || typeof event.data !== "object") {
    return;
  }

  const data = event.data;

  // 1. Health check / Extension presence detection
  if (data.type === BRIDGE_EVENT_CHECK_INSTALLED) {
    broadcastReady();
    return;
  }

  // 2. Select Applicant from Web App
  if (data.type === BRIDGE_EVENT_SELECT_APPLICANT) {
    const rawApplicant = (data as BridgeSelectApplicantEventData).applicant;
    const validation = validateSelectedApplicant(rawApplicant);

    if (!validation.valid || !validation.applicant) {
      window.postMessage(
        {
          type: BRIDGE_EVENT_APPLICANT_SAVED,
          success: false,
          applicantId: (rawApplicant as any)?.applicantId || "unknown",
          error: validation.error || "Invalid candidate payload structure.",
        },
        "*"
      );
      return;
    }

    try {
      // Forward to background service worker
      chrome.runtime.sendMessage(
        {
          type: "SELECT_APPLICANT",
          applicant: validation.applicant,
        },
        (response) => {
          const success = response?.success ?? false;
          window.postMessage(
            {
              type: BRIDGE_EVENT_APPLICANT_SAVED,
              success,
              applicantId: validation.applicant!.applicantId,
              error: response?.error,
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
          error: sendErr instanceof Error ? sendErr.message : "Extension message channel closed.",
        },
        "*"
      );
    }
  }

  // 3. Clear Applicant from Web App
  if (data.type === BRIDGE_EVENT_CLEAR_APPLICANT) {
    try {
      chrome.runtime.sendMessage({ type: "CLEAR_SELECTED_APPLICANT" }, () => {
        window.postMessage(
          {
            type: "TRAVEL_AGENCY_APPLICANT_CLEARED",
            success: true,
          },
          "*"
        );
      });
    } catch {
      // Ignore
    }
  }
});
