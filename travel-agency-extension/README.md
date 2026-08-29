# Travel Agency Assistant — Browser Extension (Manifest V3)

> Modern enterprise browser extension for Google Chrome, Microsoft Edge Chromium, and Safari Web Extensions. Built with TypeScript and Manifest V3.

---

## 1. Overview & Phase 1 Scope

The **Travel Agency Assistant** extension acts as an active candidate companion for recruitment and travel operations staff. In **Phase 1**, it establishes the core extension foundation:

- **Manifest V3 Architecture**: Secure service worker, minimal scoped permissions (`contextMenus`, `storage`), and zero broad host permissions.
- **Active Candidate Storage**: Strongly-typed `chrome.storage.local` persistence with reactive UI synchronization.
- **Context Menus**: Right-click `"Travel Agency Assistant"` menu with `"Show Selected Applicant"` and `"Clear Selected Applicant"`.
- **Minimal Popup UI**: Displays the live loaded candidate profile (Full Name, Applicant ID, Passport #, Destination, Position, Place of Birth, Religion, State) or an honest empty state (`"No applicant selected"`).
- **Web App Bridge**: Decoupled `window.postMessage` content-script bridge allowing the Next.js Travel Agency web application to safely send live candidate records to the extension without hardcoding extension IDs.
- **Zero Mock / Zero Synthetic Data**: No hardcoded demo profiles, synthetic records, or fake API responses.

---

## 2. Installation Guide

### Google Chrome
1. Open Google Chrome and navigate to `chrome://extensions`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click the **Load unpacked** button.
4. Select the directory:
   ```
   travel-agency-workflow/travel-agency-extension/dist
   ```
5. The extension **"Travel Agency Assistant"** will now appear in your toolbar. Pin it for quick access.

### Microsoft Edge Chromium
1. Open Microsoft Edge and navigate to `edge://extensions`.
2. Turn on the **Developer mode** toggle switch in the left sidebar.
3. Click **Load unpacked**.
4. Select the `dist` folder:
   ```
   travel-agency-workflow/travel-agency-extension/dist
   ```

### Apple Safari (Safari Web Extension)
The extension code is written using standard WebExtension APIs (`chrome.*` / `browser.*`). To convert into a native Safari extension app bundle:
```bash
xcrun safari-web-extension-converter travel-agency-extension/dist --project-location ./safari-extension
```

---

## 3. Building the Extension

### Prerequisites
- Node.js (v18+)
- npm

### Commands
```bash
# Navigate to the extension folder
cd travel-agency-extension

# Install dependencies
npm install

# Type-check TypeScript sources
npm run typecheck

# Build production bundle into dist/
npm run build

# Watch mode for active development
npm run watch
```

The output directory `dist/` contains:
- `manifest.json`: Manifest V3 specification
- `background/serviceWorker.js`: Background event and lifecycle router
- `popup/popup.html`, `popup.css`, `popup.js`: Extension popup UI
- `content/bridgeContent.js`: Content script bridge for Travel Agency web app
- `icons/`: High-resolution extension icons (16x16, 48x48, 128x128)

---

## 4. Next.js Web App Integration

The Next.js application communicates with the extension through the isolated `bridgeContent.js` content script using `window.postMessage`.

### Sending an Applicant to Extension
```typescript
import { sendApplicantToExtension } from "@/lib/extensionBridge";

// Inside any Next.js component / Applicant detail page:
const success = await sendApplicantToExtension({
  applicantId: applicant.name,
  fullName: applicant.full_name,
  passportNumber: applicant.passport_number,
  destinationCountry: applicant.destination_country,
  jobApplied: applicant.job_applied,
  placeOfBirth: applicant.place_of_birth,
  religion: applicant.religion,
  maritalStatus: applicant.marital_status,
  applicantState: applicant.applicant_state,
});
```

### Checking Extension Presence
```typescript
import { isExtensionInstalled } from "@/lib/extensionBridge";

const installed = await isExtensionInstalled();
console.log("Travel Agency Extension installed:", installed);
```

---

## 5. Security Model

1. **Zero Backend Secrets**: No API keys (`FRAPPE_API_KEY`, `FRAPPE_API_SECRET`) or privileged tokens are ever stored or exposed in extension JavaScript.
2. **Minimal Scoped Permissions**:
   - `"storage"`: Local browser storage only (`chrome.storage.local`).
   - `"contextMenus"`: Native right-click menu commands.
3. **No `<all_urls>`**: The content script only runs on trusted Travel Agency domains (`http://localhost:*/*`, `http://127.0.0.1:*/*`).
4. **Runtime Schema Validation**: All incoming payloads from postMessages or storage are strictly validated and sanitized through `validateSelectedApplicant()`.

---

## 6. Phase 2 Roadmap

The following capabilities are scheduled for Phase 2:
- Website-specific form autofill adapters (e.g. Wafid medical portal, Musaned contract registration).
- Context-menu action: `"Fill Form from Selected Applicant"`.
- Real-time field matching and custom adapter rules.
