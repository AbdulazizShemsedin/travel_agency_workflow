import {
  ExtensionMessage,
  ExtensionResponse,
  SelectedApplicant,
} from "../lib/types";
import {
  setSelectedApplicant,
  getSelectedApplicant,
  clearSelectedApplicant,
} from "../lib/storage";
import { validateSelectedApplicant } from "../lib/validator";

const MENU_ROOT_ID = "travel_agency_assistant_root";
const MENU_SHOW_ID = "travel_agency_show_applicant";
const MENU_CLEAR_ID = "travel_agency_clear_applicant";

/**
 * Initializes Context Menus on Extension Install or Update
 */
function initContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ROOT_ID,
      title: "Travel Agency Assistant",
      contexts: ["all"],
    });

    chrome.contextMenus.create({
      id: MENU_SHOW_ID,
      parentId: MENU_ROOT_ID,
      title: "Show Selected Applicant",
      contexts: ["all"],
    });

    chrome.contextMenus.create({
      id: MENU_CLEAR_ID,
      parentId: MENU_ROOT_ID,
      title: "Clear Selected Applicant",
      contexts: ["all"],
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  initContextMenus();
  // Restore badge state if an applicant was previously stored
  getSelectedApplicant().then((applicant) => {
    if (applicant) {
      chrome.action.setBadgeText({ text: "1" });
      chrome.action.setBadgeBackgroundColor({ color: "#047857" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  }).catch(() => {
    // Ignore initial storage read errors
  });
});

chrome.runtime.onStartup.addListener(() => {
  initContextMenus();
});

/**
 * Context Menu Click Handler
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_SHOW_ID) {
    const applicant = await getSelectedApplicant();
    if (applicant) {
      // Visible confirmation via temporary action badge text
      chrome.action.setBadgeText({ text: "✓" });
      chrome.action.setBadgeBackgroundColor({ color: "#047857" });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: "1" });
      }, 2500);

      // Also log confirmation in active tab console if scriptable
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
          args: [applicant.fullName, applicant.applicantId, applicant.passportNumber || ""],
        }).catch(() => {
          // Scripting optional if permission not available on current tab
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

/**
 * Internal & Content-Script Runtime Message Router
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    handleMessage(message)
      .then((res) => sendResponse(res))
      .catch((err) =>
        sendResponse({
          success: false,
          error: err instanceof Error ? err.message : "Unknown extension error.",
        })
      );
    return true; // Keep message channel open for async response
  }
);

/**
 * Direct Web Page Message Listener (if externally_connectable is used)
 */
chrome.runtime.onMessageExternal.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ) => {
    if (typeof message === "object" && message !== null && "type" in message) {
      handleMessage(message as ExtensionMessage)
        .then((res) => sendResponse(res))
        .catch((err) =>
          sendResponse({
            success: false,
            error: err instanceof Error ? err.message : "Unknown external message error.",
          })
        );
      return true;
    }
    sendResponse({ success: false, error: "Invalid message format." });
    return false;
  }
);

async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return { success: false, error: "Malformed message object." };
  }

  switch (message.type) {
    case "SELECT_APPLICANT": {
      const validation = validateSelectedApplicant(message.applicant);
      if (!validation.valid || !validation.applicant) {
        return {
          success: false,
          error: validation.error || "Invalid applicant data payload.",
        };
      }
      await setSelectedApplicant(validation.applicant);
      return {
        success: true,
        data: { applicantId: validation.applicant.applicantId },
        message: `Applicant ${validation.applicant.applicantId} saved successfully into extension storage.`,
      };
    }

    case "GET_SELECTED_APPLICANT": {
      const applicant = await getSelectedApplicant();
      return {
        success: true,
        data: applicant,
      };
    }

    case "CLEAR_SELECTED_APPLICANT": {
      await clearSelectedApplicant();
      return {
        success: true,
        data: null,
        message: "Selected applicant cleared from extension storage.",
      };
    }

    case "PING": {
      return {
        success: true,
        data: { version: chrome.runtime.getManifest().version, ready: true },
      };
    }

    default:
      return {
        success: false,
        error: `Unrecognized message type: ${(message as any).type}`,
      };
  }
}
