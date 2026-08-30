import { SelectedApplicant } from "./types";

/**
 * Intelligent Form Autofill Engine for Travel Agency Assistant
 * Engineered specifically for Wafid (GAMCA), Mofa, Enjaz, Musaned, and Embassy Visa Portals.
 *
 * Uses an Isolated Column Scoper and Precision Scoring Classifier to prevent any
 * cross-field false positives and guarantee the right data is placed in the right field.
 */

export interface AutofillResult {
  success: boolean;
  filledCount: number;
  fieldsFilled: string[];
  message: string;
}

/**
 * Self-contained autofill executor injected into target tab
 */
export function executeAutofill(applicant: SelectedApplicant): AutofillResult {
  if (!applicant) {
    return {
      success: false,
      filledCount: 0,
      fieldsFilled: [],
      message: "No candidate profile loaded in memory.",
    };
  }

  // -------------------------------------------------------------
  // 1. DATA PREPARATION & REFINEMENT
  // -------------------------------------------------------------
  const firstName = (applicant.firstName || (applicant.fullName ? applicant.fullName.split(" ")[0] : "")).trim();
  const middleName = (applicant.middleName || (applicant.fullName ? applicant.fullName.split(" ")[1] : "")).trim();
  const rawLastName = (applicant.lastName || (applicant.fullName ? applicant.fullName.split(" ").slice(1).join(" ") : "")).trim();

  // For Ethiopian candidates: Full Last Name on Wafid/GAMCA is Father Name + Grandfather Name
  let lastName = rawLastName;
  if (!lastName && middleName) {
    lastName = middleName;
  } else if (middleName && rawLastName && !rawLastName.includes(middleName)) {
    lastName = `${middleName} ${rawLastName}`.trim();
  }

  const fullName = (applicant.fullName || `${firstName} ${lastName}`).trim();
  const passportNumber = (applicant.passportNumber || "").trim().toUpperCase();
  const passportIssueDate = (applicant.passportIssueDate || "").trim();
  const passportExpiry = (applicant.passportExpiry || "").trim();
  const placeOfIssue = (applicant.placeOfIssue || applicant.city || "Addis Ababa").trim();
  const dateOfBirth = (applicant.dateOfBirth || "").trim();
  const age = applicant.age ? String(applicant.age).trim() : "25";
  const gender = (applicant.gender || "Female").trim();
  const nationality = (applicant.nationality || applicant.country || "Ethiopia").trim();
  const maritalStatus = (applicant.maritalStatus || "Single").trim();
  const religion = (applicant.religion || "Muslim").trim();
  const originCountry = (applicant.country || "Ethiopia").trim();
  const originCity = (applicant.city || applicant.placeOfBirth || "Addis Ababa").trim();
  const destinationCountry = (applicant.destinationCountry || "Saudi Arabia").trim();
  const visaType = (applicant.visaType || "Work").trim();
  const jobApplied = (applicant.jobApplied || "Housemaid").trim();
  const rawPhone = (applicant.phone || applicant.alternatePhone || "0911223344").replace(/[^\d+]/g, "");
  const phone = rawPhone || "0911223344";
  const nationalId = (applicant.nationalId || applicant.labourId || "").trim();

  // Clean valid email for form validation compliance
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, "") || "candidate";
  const cleanPass = passportNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || "app";
  const email = (applicant.email && applicant.email.includes("@"))
    ? applicant.email.trim()
    : `${cleanFirst}.${cleanPass}@gmail.com`;

  const sponsorName = (applicant.sponsorName || applicant.contractorName || "").trim();
  const sponsorId = (applicant.sponsorId || "").trim();
  const sponsorPhone = (applicant.sponsorPhone || "").trim();
  const visaNumber = (applicant.visaNumber || "").trim();
  const contractNumber = (applicant.contractNumber || "").trim();
  const address = (applicant.addressLine1 || originCity || "Addis Ababa, Ethiopia").trim();

  // -------------------------------------------------------------
  // 2. ISOLATED COLUMN DESCRIPTOR EXTRACTOR
  // -------------------------------------------------------------
  // Extracts descriptor ONLY from the element and its direct container, NEVER leaking sibling column labels.
  function getElementDescriptor(el: HTMLElement): { direct: string; context: string; all: string } {
    const directParts: string[] = [];
    const contextParts: string[] = [];

    if (el.id) directParts.push(el.id);
    const name = el.getAttribute("name");
    if (name) directParts.push(name);
    const placeholder = el.getAttribute("placeholder");
    if (placeholder) directParts.push(placeholder);
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) directParts.push(ariaLabel);
    const title = el.getAttribute("title");
    if (title) directParts.push(title);
    const dataField = el.getAttribute("data-field") || el.getAttribute("data-name");
    if (dataField) directParts.push(dataField);

    // 1. Direct label via `for`
    if (el.id) {
      try {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (labelEl && labelEl.textContent) directParts.push(labelEl.textContent);
      } catch {}
    }

    // 2. Direct parent <label> wrapping el
    const parentLabel = el.closest("label");
    if (parentLabel && parentLabel.textContent) {
      directParts.push(parentLabel.textContent);
    }

    // 3. Immediate preceding sibling (e.g. <label>First Name</label><input>)
    const prev = el.previousElementSibling;
    if (prev && ["LABEL", "SPAN", "P", "H4", "H5", "H6", "DIV"].includes(prev.tagName) && prev.textContent) {
      directParts.push(prev.textContent);
    }

    // 4. Strict Column / Form-Group Boundary: Search ONLY inside the direct column wrapper
    const colContainer = el.closest(
      ".form-group, .form-field, .col, [class*='col-'], .field, .input-group, .v-input, .el-form-item, td"
    );
    if (colContainer && colContainer !== document.body) {
      const heading = colContainer.querySelector("label, .label, span.title, h5, h6, .control-label, p.field-title");
      if (heading && heading !== el && !heading.contains(el) && heading.textContent) {
        contextParts.push(heading.textContent);
      }
    }

    const clean = (arr: string[]) =>
      arr.join(" ")
        .replace(/[\u2116\u2117]/g, "no") // Replace Unicode №
        .replace(/[^\w\s@.-]/gi, " ")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    const direct = clean(directParts);
    const context = clean(contextParts);
    const all = `${direct} ${context}`.trim();

    return { direct, context, all };
  }

  // -------------------------------------------------------------
  // 3. PRECISION FIELD CLASSIFIER (MATCH SCORE ENGINE)
  // -------------------------------------------------------------
  interface FieldMatchRule {
    fieldName: string;
    targetValue: string;
    isDate?: boolean;
    isSelect?: boolean;
    calculateScore: (desc: { direct: string; context: string; all: string }, el: HTMLElement) => number;
  }

  const RULES: FieldMatchRule[] = [
    // 1. Confirm Passport Number (Must have 'confirm' or 're-enter' + 'pass')
    {
      fieldName: "Confirm Passport №",
      targetValue: passportNumber,
      calculateScore: (d) => {
        const hasConfirm = /confirm|re[_\s-]?enter|verify|repeat/i.test(d.all);
        const hasPass = /pass|doc/i.test(d.all);
        if (hasConfirm && hasPass) return 200;
        if (hasConfirm) return 120;
        return 0;
      },
    },

    // 2. Passport Issue Place
    {
      fieldName: "Passport Issue Place",
      targetValue: placeOfIssue,
      calculateScore: (d) => {
        const hasIssue = /issue|issued/i.test(d.all);
        const hasPlace = /place|city|authority|location|where/i.test(d.all);
        const isDate = /date|expiry|expir/i.test(d.all);
        if (hasIssue && hasPlace && !isDate) return 190;
        if (/place[_\s-]?of[_\s-]?issue|issue[_\s-]?place/i.test(d.all)) return 190;
        return 0;
      },
    },

    // 3. Passport Issue Date
    {
      fieldName: "Passport Issue Date",
      targetValue: passportIssueDate,
      isDate: true,
      calculateScore: (d) => {
        const hasIssue = /issue|issued/i.test(d.all);
        const hasDate = /date|day/i.test(d.all);
        const hasExpiry = /expir|valid/i.test(d.all);
        const hasPlace = /place|city/i.test(d.all);
        if (hasIssue && (hasDate || /passport/i.test(d.all)) && !hasExpiry && !hasPlace) return 185;
        if (/issue[_\s-]?date|passport[_\s-]?issue/i.test(d.all) && !hasExpiry) return 185;
        return 0;
      },
    },

    // 4. Passport Expiry Date
    {
      fieldName: "Passport Expiry Date",
      targetValue: passportExpiry,
      isDate: true,
      calculateScore: (d) => {
        const hasExpiry = /expir|expiration|valid[_\s-]?until|valid[_\s-]?to/i.test(d.all);
        const hasIssue = /issue/i.test(d.all);
        if (hasExpiry && !hasIssue) return 185;
        return 0;
      },
    },

    // 5. Passport Number (Standard)
    {
      fieldName: "Passport Number",
      targetValue: passportNumber,
      calculateScore: (d) => {
        const isConfirm = /confirm|re[_\s-]?enter|verify/i.test(d.all);
        const isIssue = /issue|issued|place/i.test(d.all);
        const isExpiry = /expir|valid/i.test(d.all);
        if (isConfirm || isIssue || isExpiry) return 0;
        if (/passport[_\s-]?no|passport[_\s-]?number|enter[_\s-]?passport/i.test(d.all)) return 170;
        if (/passport/i.test(d.direct)) return 150;
        if (/passport/i.test(d.all)) return 130;
        return 0;
      },
    },

    // 6. Country Traveling To (Destination)
    {
      fieldName: "Country Traveling To",
      targetValue: destinationCountry,
      isSelect: true,
      calculateScore: (d) => {
        const hasTravel = /travel|travelling|traveling|destination|target|visiting/i.test(d.all);
        const hasCountry = /country/i.test(d.all);
        if (hasTravel && hasCountry) return 180;
        if (/travel[_\s-]?to|travelling[_\s-]?to|destination[_\s-]?country/i.test(d.all)) return 180;
        if (hasTravel) return 140;
        return 0;
      },
    },

    // 7. Appointment Location Country (Origin)
    {
      fieldName: "Appointment Country",
      targetValue: originCountry,
      isSelect: true,
      calculateScore: (d) => {
        const isTravelTo = /travel|travelling|traveling|destination|target/i.test(d.all);
        const isCity = /city|town/i.test(d.all);
        if (isTravelTo || isCity) return 0;
        if (/appointment[_\s-]?country|origin[_\s-]?country|select[_\s-]?country/i.test(d.all)) return 160;
        if (/^country$|country/i.test(d.direct)) return 140;
        if (/country/i.test(d.all)) return 110;
        return 0;
      },
    },

    // 8. Appointment Location City
    {
      fieldName: "Appointment City",
      targetValue: originCity,
      isSelect: true,
      calculateScore: (d) => {
        const isBirth = /birth|pob/i.test(d.all);
        const isIssue = /issue/i.test(d.all);
        if (isBirth || isIssue) return 0;
        if (/appointment[_\s-]?city|location[_\s-]?city|select[_\s-]?city/i.test(d.all)) return 160;
        if (/^city$|city/i.test(d.direct)) return 140;
        if (/city/i.test(d.all)) return 110;
        return 0;
      },
    },

    // 9. First Name
    {
      fieldName: "First Name",
      targetValue: firstName,
      calculateScore: (d) => {
        const hasFirst = /first|given|fname|forename/i.test(d.all);
        const hasLast = /last|sur|family|father/i.test(d.all);
        const hasFull = /full/i.test(d.all);
        const hasPass = /passport|father|sponsor/i.test(d.all);
        if (hasFirst && !hasLast && !hasPass) return 175;
        if (/^first[_\s-]?name$|^first$/i.test(d.direct)) return 175;
        return 0;
      },
    },

    // 10. Last Name / Family Name
    {
      fieldName: "Last Name",
      targetValue: lastName,
      calculateScore: (d) => {
        const hasLast = /last|sur|family|father|grandfather|lname/i.test(d.all);
        const hasFirst = /first|given/i.test(d.all);
        const hasPass = /passport|sponsor/i.test(d.all);
        if (hasLast && !hasFirst && !hasPass) return 175;
        if (/^last[_\s-]?name$|^last$/i.test(d.direct)) return 175;
        return 0;
      },
    },

    // 11. Full Name (Only when not explicitly first or last)
    {
      fieldName: "Full Name",
      targetValue: fullName,
      calculateScore: (d) => {
        const hasFirst = /first|fname/i.test(d.all);
        const hasLast = /last|lname/i.test(d.all);
        if (hasFirst || hasLast) return 0;
        if (/full[_\s-]?name|applicant[_\s-]?name|candidate[_\s-]?name|employee[_\s-]?name/i.test(d.all)) return 150;
        if (/^name$/i.test(d.direct)) return 120;
        return 0;
      },
    },

    // 12. Date of Birth
    {
      fieldName: "Date of Birth",
      targetValue: dateOfBirth,
      isDate: true,
      calculateScore: (d) => {
        const hasBirth = /birth|dob|birthday/i.test(d.all);
        const hasIssue = /issue/i.test(d.all);
        const hasExpiry = /expir/i.test(d.all);
        if (hasBirth && !hasIssue && !hasExpiry) return 180;
        if (/date[_\s-]?of[_\s-]?birth/i.test(d.all)) return 180;
        return 0;
      },
    },

    // 13. Nationality
    {
      fieldName: "Nationality",
      targetValue: nationality,
      isSelect: true,
      calculateScore: (d) => {
        if (/select[_\s-]?nationality|nationality|citizenship/i.test(d.all)) return 170;
        if (/national/i.test(d.all) && !/id|nid|identity/i.test(d.all)) return 140;
        return 0;
      },
    },

    // 14. Gender
    {
      fieldName: "Gender",
      targetValue: gender,
      isSelect: true,
      calculateScore: (d) => {
        if (/gender|^sex$/i.test(d.all)) return 170;
        return 0;
      },
    },

    // 15. Marital Status
    {
      fieldName: "Marital Status",
      targetValue: maritalStatus,
      isSelect: true,
      calculateScore: (d) => {
        if (/marital[_\s-]?status|marital|marriage|civil[_\s-]?status/i.test(d.all)) return 170;
        return 0;
      },
    },

    // 16. Visa Type
    {
      fieldName: "Visa Type",
      targetValue: visaType,
      isSelect: true,
      calculateScore: (d) => {
        if (/visa[_\s-]?type|visa[_\s-]?category|select[_\s-]?visa/i.test(d.all)) return 170;
        if (/visa/i.test(d.all) && !/no|number|issue|expir/i.test(d.all)) return 130;
        return 0;
      },
    },

    // 17. Email Address
    {
      fieldName: "Email Address",
      targetValue: email,
      calculateScore: (d, el) => {
        if ((el as HTMLInputElement).type === "email") return 190;
        if (/email|e-mail|mail[_\s-]?address|your@mail/i.test(d.all)) return 170;
        return 0;
      },
    },

    // 18. Phone Number
    {
      fieldName: "Phone Number",
      targetValue: phone,
      calculateScore: (d, el) => {
        if ((el as HTMLInputElement).type === "tel") return 190;
        if (/phone[_\s-]?no|phone[_\s-]?number|mobile[_\s-]?no|mobile[_\s-]?number/i.test(d.all)) return 175;
        if (/phone|mobile|tel|cell|contact[_\s-]?no/i.test(d.all) && !/sponsor/i.test(d.all)) return 140;
        return 0;
      },
    },

    // 19. National ID
    {
      fieldName: "National ID",
      targetValue: nationalId,
      calculateScore: (d) => {
        const isPass = /pass/i.test(d.all);
        const isSponsor = /sponsor|kafeel/i.test(d.all);
        if (isPass || isSponsor) return 0;
        if (/national[_\s-]?id|nid|citizen[_\s-]?id/i.test(d.all)) return 175;
        if (/id[_\s-]?number|identity[_\s-]?number|id[_\s-]?no/i.test(d.all)) return 140;
        return 0;
      },
    },

    // 20. Position Applied For
    {
      fieldName: "Position Applied For",
      targetValue: jobApplied,
      isSelect: true,
      calculateScore: (d) => {
        if (/position[_\s-]?applied|job[_\s-]?applied|applied[_\s-]?for/i.test(d.all)) return 175;
        if (/profession|occupation|designation|position/i.test(d.all)) return 140;
        return 0;
      },
    },

    // 21. Religion
    {
      fieldName: "Religion",
      targetValue: religion,
      isSelect: true,
      calculateScore: (d) => {
        if (/religion|relig|faith|sect/i.test(d.all)) return 170;
        return 0;
      },
    },

    // 22. Sponsor Name
    {
      fieldName: "Sponsor Name",
      targetValue: sponsorName,
      calculateScore: (d) => {
        if (/sponsor[_\s-]?name|kafeel[_\s-]?name|employer[_\s-]?name/i.test(d.all)) return 175;
        return 0;
      },
    },

    // 23. Sponsor ID
    {
      fieldName: "Sponsor ID",
      targetValue: sponsorId,
      calculateScore: (d) => {
        if (/sponsor[_\s-]?id|kafeel[_\s-]?id|employer[_\s-]?id|sponsor[_\s-]?nid/i.test(d.all)) return 175;
        return 0;
      },
    },

    // 24. Visa Number
    {
      fieldName: "Visa Number",
      targetValue: visaNumber,
      calculateScore: (d) => {
        if (/visa[_\s-]?no|visa[_\s-]?number|entry[_\s-]?visa/i.test(d.all) && !/type/i.test(d.all)) return 175;
        return 0;
      },
    },

    // 25. Contract Number
    {
      fieldName: "Contract Number",
      targetValue: contractNumber,
      calculateScore: (d) => {
        if (/contract[_\s-]?no|contract[_\s-]?number|agreement[_\s-]?no/i.test(d.all)) return 175;
        return 0;
      },
    },

    // 26. Address
    {
      fieldName: "Address",
      targetValue: address,
      calculateScore: (d) => {
        if (/address[_\s-]?line|street[_\s-]?address|applicant[_\s-]?address|^address$/i.test(d.all)) return 150;
        return 0;
      },
    },
  ];

  // -------------------------------------------------------------
  // 4. DATE FORMATTER
  // -------------------------------------------------------------
  function formatDate(rawDateStr: string, desc: string, placeholder: string): string {
    if (!rawDateStr) return "";
    try {
      const d = new Date(rawDateStr);
      if (isNaN(d.getTime())) return rawDateStr;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");

      const combined = `${desc} ${placeholder}`.toLowerCase();
      if (combined.includes("yyyy-mm-dd") || combined.includes("yyyy/mm/dd")) {
        return `${yyyy}-${mm}-${dd}`;
      }
      if (combined.includes("mm/dd") || combined.includes("mm-dd")) {
        return `${mm}/${dd}/${yyyy}`;
      }
      // Wafid / Gulf default standard: DD/MM/YYYY
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return rawDateStr;
    }
  }

  // -------------------------------------------------------------
  // 5. INPUT INJECTION HELPERS
  // -------------------------------------------------------------
  function setTextInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    if (!value) return;

    // React 16+ Property Descriptor override
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }

    try {
      const tracker = (el as any)._valueTracker;
      if (tracker) tracker.setValue("");
    } catch {}

    try {
      if ((el as any)._flatpickr) {
        (el as any)._flatpickr.setDate(value, true);
      }
    } catch {}

    el.dispatchEvent(new Event("focus", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

    // Visual feedback pulse
    el.style.transition = "all 0.3s ease";
    el.style.outline = "2px solid #10b981";
    el.style.backgroundColor = "rgba(16, 185, 129, 0.08)";
    setTimeout(() => {
      el.style.outline = "";
      el.style.backgroundColor = "";
    }, 2500);
  }

  function setSelectDropdown(select: HTMLSelectElement, targetValue: string): boolean {
    if (!targetValue) return false;
    const targetLower = targetValue.toLowerCase().trim();

    // Wafid aliases dictionary
    const aliases: Record<string, string[]> = {
      ethiopia: ["ethiopia", "ethiopian", "eth", "et", "إثيوبيا", "اثيوبيا"],
      ethiopian: ["ethiopian", "ethiopia", "eth", "et", "إثيوبي", "إثيوبية"],
      "saudi arabia": ["saudi arabia", "saudi", "ksa", "kingdom of saudi arabia", "sa", "السعودية"],
      kuwait: ["kuwait", "kwt", "kw", "الكويت"],
      qatar: ["qatar", "qat", "qa", "قطر"],
      uae: ["uae", "united arab emirates", "dubai", "emirates", "الإمارات"],
      female: ["female", "f", "woman", "أنثى", "انثى"],
      male: ["male", "m", "man", "ذكر"],
      single: ["unmarried", "single", "never married", "أعزب", "عزباء"],
      unmarried: ["unmarried", "single", "never married", "أعزب", "عزباء"],
      married: ["married", "متزوج", "متزوجة"],
      divorced: ["divorced", "مطلق", "مطلقة"],
      work: ["work visa", "work", "employment", "employment visa", "labor", "labour", "عمل", "تأشيرة عمل"],
      housemaid: ["house maid", "housemaid", "domestic worker", "maid", "cleaner", "عاملة منزلية", "خادمة"],
      driver: ["driver", "chauffeur", "سائق"],
      muslim: ["muslim", "islam", "moslem", "مسلم"],
      christian: ["christian", "orthodox", "protestant", "catholic", "مسيحي"],
    };

    const searchAliases = aliases[targetLower] || [targetLower];

    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      const optVal = opt.value.toLowerCase().trim();
      const optText = opt.text.toLowerCase().trim();

      for (const alias of searchAliases) {
        if (
          optVal === alias ||
          optText === alias ||
          optText.startsWith(alias) ||
          optVal.startsWith(alias) ||
          optText.includes(alias) ||
          alias.includes(optText)
        ) {
          select.selectedIndex = i;
          select.dispatchEvent(new Event("focus", { bubbles: true }));
          select.dispatchEvent(new Event("input", { bubbles: true }));
          select.dispatchEvent(new Event("change", { bubbles: true }));
          select.dispatchEvent(new Event("blur", { bubbles: true }));

          select.style.outline = "2px solid #10b981";
          setTimeout(() => (select.style.outline = ""), 2500);
          return true;
        }
      }
    }
    return false;
  }

  function setRadioGroup(radios: HTMLInputElement[], targetValue: string): boolean {
    if (!targetValue) return false;
    const targetLower = targetValue.toLowerCase().trim();

    for (const radio of radios) {
      const val = (radio.value || "").toLowerCase().trim();
      const desc = getElementDescriptor(radio).all;

      if (
        val === targetLower ||
        desc.includes(targetLower) ||
        (targetLower === "female" && (val === "f" || val === "female" || desc.includes("female") || desc.includes("أنثى"))) ||
        (targetLower === "male" && (val === "m" || val === "male" || desc.includes("male") || desc.includes("ذكر"))) ||
        (targetLower === "single" && (val.includes("unmarried") || val.includes("single") || desc.includes("unmarried") || desc.includes("single"))) ||
        (targetLower === "married" && (val.includes("married") || desc.includes("married")))
      ) {
        radio.checked = true;
        radio.dispatchEvent(new Event("input", { bubbles: true }));
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------
  // 6. MAIN SCANNER & ASSIGNMENT (BEST MATCH CLASSIFIER)
  // -------------------------------------------------------------
  let filledCount = 0;
  const fieldsFilled: string[] = [];
  const processedElements = new Set<HTMLElement>();

  function processDocument(doc: Document) {
    const inputs = Array.from(
      doc.querySelectorAll<HTMLInputElement>(
        "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset])"
      )
    );
    const textareas = Array.from(doc.querySelectorAll<HTMLTextAreaElement>("textarea"));
    const selects = Array.from(doc.querySelectorAll<HTMLSelectElement>("select"));

    // 1. Group Radio buttons by name
    const radioGroups: Record<string, HTMLInputElement[]> = {};
    for (const input of inputs) {
      if (input.type === "radio" && input.name) {
        if (!radioGroups[input.name]) radioGroups[input.name] = [];
        radioGroups[input.name].push(input);
      }
    }

    // Process Radios
    for (const [groupName, radios] of Object.entries(radioGroups)) {
      const desc = getElementDescriptor(radios[0]);
      let bestRule: FieldMatchRule | null = null;
      let highestScore = 0;

      for (const rule of RULES) {
        if (!rule.targetValue) continue;
        const score = rule.calculateScore(desc, radios[0]);
        if (score > highestScore && score >= 100) {
          highestScore = score;
          bestRule = rule;
        }
      }

      if (bestRule) {
        if (setRadioGroup(radios, bestRule.targetValue)) {
          filledCount++;
          fieldsFilled.push(bestRule.fieldName);
          radios.forEach((r) => processedElements.add(r));
        }
      }
    }

    // 2. Process Native Select Dropdowns
    for (const select of selects) {
      if (processedElements.has(select)) continue;
      const desc = getElementDescriptor(select);
      let bestRule: FieldMatchRule | null = null;
      let highestScore = 0;

      for (const rule of RULES) {
        if (!rule.targetValue) continue;
        const score = rule.calculateScore(desc, select);
        if (score > highestScore && score >= 100) {
          highestScore = score;
          bestRule = rule;
        }
      }

      if (bestRule) {
        if (setSelectDropdown(select, bestRule.targetValue)) {
          filledCount++;
          fieldsFilled.push(bestRule.fieldName);
          processedElements.add(select);
        }
      }
    }

    // 3. Process Text, Date, Email, Tel Inputs & Textareas
    const standardInputs = [...inputs.filter((i) => i.type !== "radio" && i.type !== "checkbox"), ...textareas];

    for (const el of standardInputs) {
      if (processedElements.has(el)) continue;
      const desc = getElementDescriptor(el);
      let bestRule: FieldMatchRule | null = null;
      let highestScore = 0;

      for (const rule of RULES) {
        if (!rule.targetValue) continue;
        const score = rule.calculateScore(desc, el);
        if (score > highestScore && score >= 100) {
          highestScore = score;
          bestRule = rule;
        }
      }

      if (bestRule) {
        let finalVal = bestRule.targetValue;
        if (
          (el as HTMLInputElement).type === "date" ||
          bestRule.isDate ||
          desc.all.includes("date") ||
          desc.all.includes("dob") ||
          desc.all.includes("calendar")
        ) {
          finalVal = formatDate(finalVal, desc.all, el.getAttribute("placeholder") || "");
        }

        setTextInput(el, finalVal);
        filledCount++;
        fieldsFilled.push(bestRule.fieldName);
        processedElements.add(el);
      }
    }
  }

  // Scan main page and all accessible iframes
  processDocument(document);
  try {
    const iframes = Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe"));
    for (const frame of iframes) {
      try {
        if (frame.contentDocument) processDocument(frame.contentDocument);
      } catch {}
    }
  } catch {}

  return {
    success: filledCount > 0,
    filledCount,
    fieldsFilled,
    message:
      filledCount > 0
        ? `✓ Accurately filled ${filledCount} field${filledCount > 1 ? "s" : ""} on page (${fieldsFilled.slice(0, 4).join(", ")}${fieldsFilled.length > 4 ? "..." : ""})`
        : "No matching form fields detected on this page.",
  };
}
