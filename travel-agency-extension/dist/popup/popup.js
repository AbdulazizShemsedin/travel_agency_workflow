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
    placeOfIssue: typeof obj.placeOfIssue === "string" ? obj.placeOfIssue.trim() : void 0,
    nationalId: typeof obj.nationalId === "string" ? obj.nationalId.trim() : void 0,
    labourId: typeof obj.labourId === "string" ? obj.labourId.trim() : void 0,
    destinationCountry: typeof obj.destinationCountry === "string" ? obj.destinationCountry.trim() : void 0,
    applicantState: typeof obj.applicantState === "string" ? obj.applicantState.trim() : void 0,
    applicantType: typeof obj.applicantType === "string" ? obj.applicantType.trim() : void 0,
    jobApplied: typeof obj.jobApplied === "string" ? obj.jobApplied.trim() : void 0,
    visaType: typeof obj.visaType === "string" ? obj.visaType.trim() : void 0,
    gender: typeof obj.gender === "string" ? obj.gender.trim() : void 0,
    dateOfBirth: typeof obj.dateOfBirth === "string" ? obj.dateOfBirth.trim() : void 0,
    age: typeof obj.age === "number" || typeof obj.age === "string" ? obj.age : void 0,
    religion: typeof obj.religion === "string" ? obj.religion.trim() : void 0,
    placeOfBirth: typeof obj.placeOfBirth === "string" ? obj.placeOfBirth.trim() : void 0,
    leavingTown: typeof obj.leavingTown === "string" ? obj.leavingTown.trim() : void 0,
    maritalStatus: typeof obj.maritalStatus === "string" ? obj.maritalStatus.trim() : void 0,
    nationality: typeof obj.nationality === "string" ? obj.nationality.trim() : void 0,
    email: typeof obj.email === "string" ? obj.email.trim() : void 0,
    phone: typeof obj.phone === "string" ? obj.phone.trim() : void 0,
    alternatePhone: typeof obj.alternatePhone === "string" ? obj.alternatePhone.trim() : void 0,
    city: typeof obj.city === "string" ? obj.city.trim() : void 0,
    country: typeof obj.country === "string" ? obj.country.trim() : void 0,
    addressLine1: typeof obj.addressLine1 === "string" ? obj.addressLine1.trim() : void 0,
    medicalStatus: typeof obj.medicalStatus === "string" ? obj.medicalStatus.trim() : void 0,
    photoUrl: typeof obj.photoUrl === "string" ? obj.photoUrl.trim() : void 0,
    monthlySalary: typeof obj.monthlySalary === "number" || typeof obj.monthlySalary === "string" ? obj.monthlySalary : void 0,
    salaryCurrency: typeof obj.salaryCurrency === "string" ? obj.salaryCurrency.trim() : void 0,
    contractPeriod: typeof obj.contractPeriod === "string" ? obj.contractPeriod.trim() : void 0,
    sponsorName: typeof obj.sponsorName === "string" ? obj.sponsorName.trim() : void 0,
    sponsorId: typeof obj.sponsorId === "string" ? obj.sponsorId.trim() : void 0,
    sponsorPhone: typeof obj.sponsorPhone === "string" ? obj.sponsorPhone.trim() : void 0,
    visaNumber: typeof obj.visaNumber === "string" ? obj.visaNumber.trim() : void 0,
    contractNumber: typeof obj.contractNumber === "string" ? obj.contractNumber.trim() : void 0,
    contractorName: typeof obj.contractorName === "string" ? obj.contractorName.trim() : void 0,
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

// src/lib/autofillEngine.ts
function executeAutofill(applicant) {
  if (!applicant) {
    return {
      success: false,
      filledCount: 0,
      fieldsFilled: [],
      message: "No candidate profile loaded in memory."
    };
  }
  const firstName = (applicant.firstName || (applicant.fullName ? applicant.fullName.split(" ")[0] : "")).trim();
  const middleName = (applicant.middleName || (applicant.fullName ? applicant.fullName.split(" ")[1] : "")).trim();
  const rawLastName = (applicant.lastName || (applicant.fullName ? applicant.fullName.split(" ").slice(1).join(" ") : "")).trim();
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
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, "") || "candidate";
  const cleanPass = passportNumber.toLowerCase().replace(/[^a-z0-9]/g, "") || "app";
  const email = applicant.email && applicant.email.includes("@") ? applicant.email.trim() : `${cleanFirst}.${cleanPass}@gmail.com`;
  const sponsorName = (applicant.sponsorName || applicant.contractorName || "").trim();
  const sponsorId = (applicant.sponsorId || "").trim();
  const sponsorPhone = (applicant.sponsorPhone || "").trim();
  const visaNumber = (applicant.visaNumber || "").trim();
  const contractNumber = (applicant.contractNumber || "").trim();
  const address = (applicant.addressLine1 || originCity || "Addis Ababa, Ethiopia").trim();
  function getElementDescriptor(el) {
    const directParts = [];
    const contextParts = [];
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
    if (el.id) {
      try {
        const labelEl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (labelEl && labelEl.textContent) directParts.push(labelEl.textContent);
      } catch {
      }
    }
    const parentLabel = el.closest("label");
    if (parentLabel && parentLabel.textContent) {
      directParts.push(parentLabel.textContent);
    }
    const prev = el.previousElementSibling;
    if (prev && ["LABEL", "SPAN", "P", "H4", "H5", "H6", "DIV"].includes(prev.tagName) && prev.textContent) {
      directParts.push(prev.textContent);
    }
    const colContainer = el.closest(
      ".form-group, .form-field, .col, [class*='col-'], .field, .input-group, .v-input, .el-form-item, td"
    );
    if (colContainer && colContainer !== document.body) {
      const heading = colContainer.querySelector("label, .label, span.title, h5, h6, .control-label, p.field-title");
      if (heading && heading !== el && !heading.contains(el) && heading.textContent) {
        contextParts.push(heading.textContent);
      }
    }
    const clean = (arr) => arr.join(" ").replace(/[\u2116\u2117]/g, "no").replace(/[^\w\s@.-]/gi, " ").toLowerCase().replace(/\s+/g, " ").trim();
    const direct = clean(directParts);
    const context = clean(contextParts);
    const all = `${direct} ${context}`.trim();
    return { direct, context, all };
  }
  const RULES = [
    // 1. Confirm Passport Number (Must have 'confirm' or 're-enter' + 'pass')
    {
      fieldName: "Confirm Passport \u2116",
      targetValue: passportNumber,
      calculateScore: (d) => {
        const hasConfirm = /confirm|re[_\s-]?enter|verify|repeat/i.test(d.all);
        const hasPass = /pass|doc/i.test(d.all);
        if (hasConfirm && hasPass) return 200;
        if (hasConfirm) return 120;
        return 0;
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
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
      }
    },
    // 14. Gender
    {
      fieldName: "Gender",
      targetValue: gender,
      isSelect: true,
      calculateScore: (d) => {
        if (/gender|^sex$/i.test(d.all)) return 170;
        return 0;
      }
    },
    // 15. Marital Status
    {
      fieldName: "Marital Status",
      targetValue: maritalStatus,
      isSelect: true,
      calculateScore: (d) => {
        if (/marital[_\s-]?status|marital|marriage|civil[_\s-]?status/i.test(d.all)) return 170;
        return 0;
      }
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
      }
    },
    // 17. Email Address
    {
      fieldName: "Email Address",
      targetValue: email,
      calculateScore: (d, el) => {
        if (el.type === "email") return 190;
        if (/email|e-mail|mail[_\s-]?address|your@mail/i.test(d.all)) return 170;
        return 0;
      }
    },
    // 18. Phone Number
    {
      fieldName: "Phone Number",
      targetValue: phone,
      calculateScore: (d, el) => {
        if (el.type === "tel") return 190;
        if (/phone[_\s-]?no|phone[_\s-]?number|mobile[_\s-]?no|mobile[_\s-]?number/i.test(d.all)) return 175;
        if (/phone|mobile|tel|cell|contact[_\s-]?no/i.test(d.all) && !/sponsor/i.test(d.all)) return 140;
        return 0;
      }
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
      }
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
      }
    },
    // 21. Religion
    {
      fieldName: "Religion",
      targetValue: religion,
      isSelect: true,
      calculateScore: (d) => {
        if (/religion|relig|faith|sect/i.test(d.all)) return 170;
        return 0;
      }
    },
    // 22. Sponsor Name
    {
      fieldName: "Sponsor Name",
      targetValue: sponsorName,
      calculateScore: (d) => {
        if (/sponsor[_\s-]?name|kafeel[_\s-]?name|employer[_\s-]?name/i.test(d.all)) return 175;
        return 0;
      }
    },
    // 23. Sponsor ID
    {
      fieldName: "Sponsor ID",
      targetValue: sponsorId,
      calculateScore: (d) => {
        if (/sponsor[_\s-]?id|kafeel[_\s-]?id|employer[_\s-]?id|sponsor[_\s-]?nid/i.test(d.all)) return 175;
        return 0;
      }
    },
    // 24. Visa Number
    {
      fieldName: "Visa Number",
      targetValue: visaNumber,
      calculateScore: (d) => {
        if (/visa[_\s-]?no|visa[_\s-]?number|entry[_\s-]?visa/i.test(d.all) && !/type/i.test(d.all)) return 175;
        return 0;
      }
    },
    // 25. Contract Number
    {
      fieldName: "Contract Number",
      targetValue: contractNumber,
      calculateScore: (d) => {
        if (/contract[_\s-]?no|contract[_\s-]?number|agreement[_\s-]?no/i.test(d.all)) return 175;
        return 0;
      }
    },
    // 26. Address
    {
      fieldName: "Address",
      targetValue: address,
      calculateScore: (d) => {
        if (/address[_\s-]?line|street[_\s-]?address|applicant[_\s-]?address|^address$/i.test(d.all)) return 150;
        return 0;
      }
    }
  ];
  function formatDate(rawDateStr, desc, placeholder) {
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
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return rawDateStr;
    }
  }
  function setTextInput(el, value) {
    if (!value) return;
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) {
      desc.set.call(el, value);
    } else {
      el.value = value;
    }
    try {
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue("");
    } catch {
    }
    try {
      if (el._flatpickr) {
        el._flatpickr.setDate(value, true);
      }
    } catch {
    }
    el.dispatchEvent(new Event("focus", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    el.style.transition = "all 0.3s ease";
    el.style.outline = "2px solid #10b981";
    el.style.backgroundColor = "rgba(16, 185, 129, 0.08)";
    setTimeout(() => {
      el.style.outline = "";
      el.style.backgroundColor = "";
    }, 2500);
  }
  function setSelectDropdown(select, targetValue) {
    if (!targetValue) return false;
    const targetLower = targetValue.toLowerCase().trim();
    const aliases = {
      ethiopia: ["ethiopia", "ethiopian", "eth", "et", "\u0625\u062B\u064A\u0648\u0628\u064A\u0627", "\u0627\u062B\u064A\u0648\u0628\u064A\u0627"],
      ethiopian: ["ethiopian", "ethiopia", "eth", "et", "\u0625\u062B\u064A\u0648\u0628\u064A", "\u0625\u062B\u064A\u0648\u0628\u064A\u0629"],
      "saudi arabia": ["saudi arabia", "saudi", "ksa", "kingdom of saudi arabia", "sa", "\u0627\u0644\u0633\u0639\u0648\u062F\u064A\u0629"],
      kuwait: ["kuwait", "kwt", "kw", "\u0627\u0644\u0643\u0648\u064A\u062A"],
      qatar: ["qatar", "qat", "qa", "\u0642\u0637\u0631"],
      uae: ["uae", "united arab emirates", "dubai", "emirates", "\u0627\u0644\u0625\u0645\u0627\u0631\u0627\u062A"],
      female: ["female", "f", "woman", "\u0623\u0646\u062B\u0649", "\u0627\u0646\u062B\u0649"],
      male: ["male", "m", "man", "\u0630\u0643\u0631"],
      single: ["unmarried", "single", "never married", "\u0623\u0639\u0632\u0628", "\u0639\u0632\u0628\u0627\u0621"],
      unmarried: ["unmarried", "single", "never married", "\u0623\u0639\u0632\u0628", "\u0639\u0632\u0628\u0627\u0621"],
      married: ["married", "\u0645\u062A\u0632\u0648\u062C", "\u0645\u062A\u0632\u0648\u062C\u0629"],
      divorced: ["divorced", "\u0645\u0637\u0644\u0642", "\u0645\u0637\u0644\u0642\u0629"],
      work: ["work visa", "work", "employment", "employment visa", "labor", "labour", "\u0639\u0645\u0644", "\u062A\u0623\u0634\u064A\u0631\u0629 \u0639\u0645\u0644"],
      housemaid: ["house maid", "housemaid", "domestic worker", "maid", "cleaner", "\u0639\u0627\u0645\u0644\u0629 \u0645\u0646\u0632\u0644\u064A\u0629", "\u062E\u0627\u062F\u0645\u0629"],
      driver: ["driver", "chauffeur", "\u0633\u0627\u0626\u0642"],
      muslim: ["muslim", "islam", "moslem", "\u0645\u0633\u0644\u0645"],
      christian: ["christian", "orthodox", "protestant", "catholic", "\u0645\u0633\u064A\u062D\u064A"]
    };
    const searchAliases = aliases[targetLower] || [targetLower];
    for (let i = 0; i < select.options.length; i++) {
      const opt = select.options[i];
      const optVal = opt.value.toLowerCase().trim();
      const optText = opt.text.toLowerCase().trim();
      for (const alias of searchAliases) {
        if (optVal === alias || optText === alias || optText.startsWith(alias) || optVal.startsWith(alias) || optText.includes(alias) || alias.includes(optText)) {
          select.selectedIndex = i;
          select.dispatchEvent(new Event("focus", { bubbles: true }));
          select.dispatchEvent(new Event("input", { bubbles: true }));
          select.dispatchEvent(new Event("change", { bubbles: true }));
          select.dispatchEvent(new Event("blur", { bubbles: true }));
          select.style.outline = "2px solid #10b981";
          setTimeout(() => select.style.outline = "", 2500);
          return true;
        }
      }
    }
    return false;
  }
  function setRadioGroup(radios, targetValue) {
    if (!targetValue) return false;
    const targetLower = targetValue.toLowerCase().trim();
    for (const radio of radios) {
      const val = (radio.value || "").toLowerCase().trim();
      const desc = getElementDescriptor(radio).all;
      if (val === targetLower || desc.includes(targetLower) || targetLower === "female" && (val === "f" || val === "female" || desc.includes("female") || desc.includes("\u0623\u0646\u062B\u0649")) || targetLower === "male" && (val === "m" || val === "male" || desc.includes("male") || desc.includes("\u0630\u0643\u0631")) || targetLower === "single" && (val.includes("unmarried") || val.includes("single") || desc.includes("unmarried") || desc.includes("single")) || targetLower === "married" && (val.includes("married") || desc.includes("married"))) {
        radio.checked = true;
        radio.dispatchEvent(new Event("input", { bubbles: true }));
        radio.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }
  let filledCount = 0;
  const fieldsFilled = [];
  const processedElements = /* @__PURE__ */ new Set();
  function processDocument(doc) {
    const inputs = Array.from(
      doc.querySelectorAll(
        "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset])"
      )
    );
    const textareas = Array.from(doc.querySelectorAll("textarea"));
    const selects = Array.from(doc.querySelectorAll("select"));
    const radioGroups = {};
    for (const input of inputs) {
      if (input.type === "radio" && input.name) {
        if (!radioGroups[input.name]) radioGroups[input.name] = [];
        radioGroups[input.name].push(input);
      }
    }
    for (const [groupName, radios] of Object.entries(radioGroups)) {
      const desc = getElementDescriptor(radios[0]);
      let bestRule = null;
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
    for (const select of selects) {
      if (processedElements.has(select)) continue;
      const desc = getElementDescriptor(select);
      let bestRule = null;
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
    const standardInputs = [...inputs.filter((i) => i.type !== "radio" && i.type !== "checkbox"), ...textareas];
    for (const el of standardInputs) {
      if (processedElements.has(el)) continue;
      const desc = getElementDescriptor(el);
      let bestRule = null;
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
        if (el.type === "date" || bestRule.isDate || desc.all.includes("date") || desc.all.includes("dob") || desc.all.includes("calendar")) {
          finalVal = formatDate(finalVal, desc.all, el.getAttribute("placeholder") || "");
        }
        setTextInput(el, finalVal);
        filledCount++;
        fieldsFilled.push(bestRule.fieldName);
        processedElements.add(el);
      }
    }
  }
  processDocument(document);
  try {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const frame of iframes) {
      try {
        if (frame.contentDocument) processDocument(frame.contentDocument);
      } catch {
      }
    }
  } catch {
  }
  return {
    success: filledCount > 0,
    filledCount,
    fieldsFilled,
    message: filledCount > 0 ? `\u2713 Accurately filled ${filledCount} field${filledCount > 1 ? "s" : ""} on page (${fieldsFilled.slice(0, 4).join(", ")}${fieldsFilled.length > 4 ? "..." : ""})` : "No matching form fields detected on this page."
  };
}

// src/popup/popup.ts
var loadingState = document.getElementById("loading-state");
var emptyState = document.getElementById("empty-state");
var selectedState = document.getElementById("selected-state");
var autofillBanner = document.getElementById("autofill-banner");
var autofillBannerText = document.getElementById("autofill-banner-text");
var applicantAvatar = document.getElementById("applicant-avatar");
var applicantFullName = document.getElementById("applicant-fullname");
var applicantId = document.getElementById("applicant-id");
var applicantPassport = document.getElementById("applicant-passport");
var applicantDestination = document.getElementById("applicant-destination");
var applicantJob = document.getElementById("applicant-job");
var applicantPob = document.getElementById("applicant-pob");
var applicantReligion = document.getElementById("applicant-religion");
var applicantDob = document.getElementById("applicant-dob");
var applicantTimestamp = document.getElementById("applicant-timestamp");
var btnAutofill = document.getElementById("btn-autofill");
var btnClear = document.getElementById("btn-clear");
var copyNameBtn = document.getElementById("copy-name");
var copyPassportBtn = document.getElementById("copy-passport");
var copyDobBtn = document.getElementById("copy-dob");
var currentApplicant = null;
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
async function copyToClipboard(text, btn) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = `<span style="color:#10b981; font-size:10px; font-weight:bold;">\u2713</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHTML;
      }, 1500);
    }
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }
}
function showBanner(message, isError = false) {
  if (!autofillBanner || !autofillBannerText) return;
  autofillBannerText.textContent = message;
  autofillBanner.style.display = "block";
  autofillBanner.style.backgroundColor = isError ? "rgba(225, 29, 72, 0.1)" : "var(--brand-emerald-light)";
  autofillBanner.style.color = isError ? "var(--danger-color)" : "var(--brand-emerald)";
  autofillBanner.style.borderColor = isError ? "rgba(225, 29, 72, 0.3)" : "var(--brand-emerald-border)";
  setTimeout(() => {
    autofillBanner.style.display = "none";
  }, 4e3);
}
function renderUI(applicant) {
  currentApplicant = applicant;
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
  applicantDob.textContent = applicant.dateOfBirth || "\u2014";
  applicantTimestamp.textContent = formatTime(applicant.selectedAt);
}
async function handleAutofillClick() {
  if (!currentApplicant) {
    showBanner("No candidate loaded in memory.", true);
    return;
  }
  btnAutofill.disabled = true;
  btnAutofill.style.opacity = "0.7";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      showBanner("No active browser tab found.", true);
      return;
    }
    if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
      showBanner("Cannot autofill on internal browser pages.", true);
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executeAutofill,
      args: [currentApplicant]
    });
    const result = results?.[0]?.result;
    if (result && result.success) {
      showBanner(`\u2713 Filled ${result.filledCount} field${result.filledCount > 1 ? "s" : ""} on page!`);
    } else {
      showBanner(result?.message || "No matching form fields found on this page.", true);
    }
  } catch (err) {
    console.error("Autofill execution error:", err);
    showBanner(err?.message || "Failed to access active page for autofill.", true);
  } finally {
    btnAutofill.disabled = false;
    btnAutofill.style.opacity = "1";
  }
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
onSelectedApplicantChange((updatedApplicant) => {
  renderUI(updatedApplicant);
});
document.addEventListener("DOMContentLoaded", init);
//# sourceMappingURL=popup.js.map
