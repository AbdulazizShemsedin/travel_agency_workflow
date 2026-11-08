import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Contract Document Extractor - Multi-Format Support (.docx, .doc, .pdf, images)", () => {
  // Helper mimicking the extension extractor in contractor-doc/page.tsx
  const getFileExtension = (nameOrUrl: string, fallback = "pdf") => {
    if (!nameOrUrl) return fallback;
    const clean = nameOrUrl.split("?")[0].split("#")[0];
    const lastDot = clean.lastIndexOf(".");
    if (lastDot !== -1 && lastDot < clean.length - 1) {
      const ext = clean.substring(lastDot + 1).toLowerCase();
      if (ext.length <= 5) return ext;
    }
    return fallback;
  };

  // Helper mimicking isDocxOrWord detection in PremiumDropzone and contractor-doc
  const checkIsWordContract = (fileName: string, mimeType = "") => {
    const cleanName = fileName.split("?")[0].split("#")[0].toLowerCase();
    const type = mimeType.toLowerCase();
    return (
      cleanName.endsWith(".docx") ||
      cleanName.endsWith(".doc") ||
      cleanName.endsWith(".odt") ||
      cleanName.endsWith(".rtf") ||
      cleanName.endsWith(".txt") ||
      type.includes("wordprocessingml") ||
      type.includes("msword") ||
      type.includes("opendocument.text") ||
      type.includes("rtf") ||
      type.includes("text/plain")
    );
  };

  test("1. DOCX files are recognized as Word contracts and not treated as images", () => {
    const fileName = "Employment_Agreement_2026.docx";
    const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    assert.equal(checkIsWordContract(fileName, mimeType), true);

    const ext = getFileExtension(fileName);
    assert.equal(ext, "docx");

    const downloadName = `Contract_APP-2026-001.${ext}`;
    assert.equal(downloadName, "Contract_APP-2026-001.docx");
  });

  test("2. Legacy .doc files are recognized as Word contracts", () => {
    const fileName = "Standard_Contract_Kuwait.doc";
    const mimeType = "application/msword";

    assert.equal(checkIsWordContract(fileName, mimeType), true);

    const ext = getFileExtension(fileName);
    assert.equal(ext, "doc");

    const downloadName = `Contract_APP-2026-002.${ext}`;
    assert.equal(downloadName, "Contract_APP-2026-002.doc");
  });

  test("3. PDF contracts are preserved as PDF downloads", () => {
    const fileName = "Musaned_Contract_Signed.pdf";
    const mimeType = "application/pdf";

    assert.equal(checkIsWordContract(fileName, mimeType), false);

    const ext = getFileExtension(fileName);
    assert.equal(ext, "pdf");

    const downloadName = `Contract_APP-2026-003.${ext}`;
    assert.equal(downloadName, "Contract_APP-2026-003.pdf");
  });

  test("4. Image contracts (.png, .jpg) are preserved with their respective extensions", () => {
    const pngName = "scanned_page_1.png";
    const jpgName = "contract_photo.jpeg";

    assert.equal(checkIsWordContract(pngName, "image/png"), false);
    assert.equal(checkIsWordContract(jpgName, "image/jpeg"), false);

    assert.equal(getFileExtension(pngName), "png");
    assert.equal(getFileExtension(jpgName), "jpeg");
  });

  test("5. Remote server file URLs with docx preserve extension even with query strings", () => {
    const remoteUrl = "https://agencytracking-production-de71.up.railway.app/files/musaned_draft.docx?token=xyz123";
    const ext = getFileExtension(remoteUrl);
    assert.equal(ext, "docx");
    assert.equal(checkIsWordContract(remoteUrl), true);
  });

  test("6. Dropzone accept patterns cover all supported Word and document MIME types", () => {
    const acceptPatterns = [
      ".pdf",
      ".docx",
      ".doc",
      ".odt",
      ".rtf",
      ".txt",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    const fileTypesToVerify = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    fileTypesToVerify.forEach((mime) => {
      assert.ok(
        acceptPatterns.some((p) => p === mime),
        `Accept pattern must include MIME type: ${mime}`
      );
    });
  });

  test("7. Blob URLs resolve to docx when fileName has .docx", () => {
    const blobUrl = "blob:http://localhost:3000/a395bcf1-c277-440f";
    const fileName = "Signed_Kuwait_Contract.docx";

    const isWord = checkIsWordContract(fileName);
    assert.equal(isWord, true);

    const ext = getFileExtension(fileName, isWord ? "docx" : "pdf");
    assert.equal(ext, "docx");
    assert.equal(`Contract_APP-009.${ext}`, "Contract_APP-009.docx");
  });

  test("8. Selected applicant with active_placement correctly resolves placement and permits contract extraction", () => {
    const applicant = {
      name: "APP-2026-00042",
      full_name: "Fatima Al-Zahra",
      status: "Selected",
      active_placement: "PLM-00042",
      destination_country: "Saudi Arabia",
    };

    const placementRecord: { name: string; applicant: string; status: string; destination_country: string } = {
      name: "PLM-00042",
      applicant: "APP-2026-00042",
      status: "Selected",
      destination_country: "Saudi Arabia",
    };

    // Resolver logic matching contractor-doc/page.tsx
    const resolvePlacement = (app: typeof applicant, placementsList: typeof placementRecord[]) => {
      const linkedName = typeof app.active_placement === "string" ? app.active_placement.trim() : "";
      if (linkedName) {
        const found = placementsList.find((p) => p.name === linkedName);
        if (found) return found;
      }
      return placementsList.find((p) => p.status !== "Cancelled") || null;
    };

    const resolved = resolvePlacement(applicant, [placementRecord]);
    assert.ok(resolved, "Target placement must be resolved from active_placement");
    assert.equal(resolved?.name, "PLM-00042");
    assert.equal(resolved?.status, "Selected");

    // Eligibility check
    const status = (resolved?.status as string) || "";
    const isEligible = Boolean(resolved) && status !== "Requested" && status !== "Cancelled";
    assert.equal(isEligible, true, "Selected candidate with active placement must be eligible for contract extraction");
  });

  test("9. Case-insensitive applicant ID matching prevents false 'No Active Placement' error", () => {
    const paramId = "app-2026-00088"; // Lowercase from route / URL
    const placementRecord = {
      name: "PLM-00088",
      applicant: "APP-2026-00088", // Uppercase in database
      status: "Selected",
      destination_country: "Kuwait",
    };

    const cleanParamId = paramId.trim().toLowerCase();
    const matched = [placementRecord].filter(
      (p) =>
        (p.applicant && p.applicant.toLowerCase().trim() === cleanParamId) ||
        (p.name && p.name.toLowerCase().trim() === cleanParamId)
    );

    assert.equal(matched.length, 1);
    assert.equal(matched[0].name, "PLM-00088");
  });

  test("10. Processing stage candidate remains eligible for contract upload / extraction", () => {
    const processingPlacement = {
      name: "PLM-00099",
      applicant: "APP-2026-00099",
      status: "Processing", // Advanced after medical check
      destination_country: "Saudi Arabia",
    };

    // Requested is blocked (awaiting review), Cancelled is blocked, Selected and Processing are permitted
    const isBlocked =
      processingPlacement.status === "Requested" ||
      processingPlacement.status === "Cancelled";

    assert.equal(isBlocked, false, "Processing stage candidate must not be blocked from contract extraction");
  });

  test("11. extractValidContractFields strips metadata, nulls, and zeroes without losing valid values", () => {
    const rawPlacementResponse = {
      name: "PLM-00006",
      doctype: "Placement",
      status: "Selected",
      owner: "agency@example.com",
      contract_file: "/files/contract_sample.pdf",
      contract_number: null,
      contract_signed_date: null,
      employer_name: null,
      employer_national_id: "",
      salary_amount: 0,
      saudi_agency_name: undefined,
    };

    const extractValidContractFields = (source: any): Record<string, any> => {
      if (!source || typeof source !== "object") return {};
      const cleaned: Record<string, any> = {};
      const ignoredKeys = new Set([
        "name", "doctype", "owner", "creation", "modified", "modified_by",
        "idx", "docstatus", "_user_tags", "_comments", "_assign", "_liked_by",
        "status", "message", "success"
      ]);

      for (const [key, value] of Object.entries(source)) {
        if (ignoredKeys.has(key)) continue;
        if (value !== null && value !== undefined && value !== "" && value !== 0 && value !== "0") {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };

    const cleaned = extractValidContractFields(rawPlacementResponse);
    assert.deepEqual(cleaned, {
      contract_file: "/files/contract_sample.pdf",
    });
    assert.equal("contract_number" in cleaned, false);
    assert.equal("employer_name" in cleaned, false);
    assert.equal("status" in cleaned, false);
    assert.equal("name" in cleaned, false);
  });

  test("12. Extracted contract fields are NOT clobbered by unapproved null placement fields", () => {
    const rawPlacementFromUpload = {
      name: "PLM-00006",
      doctype: "Placement",
      status: "Selected",
      contract_file: "/files/musaned_contract.pdf",
      contract_signed_date: null,
      contract_number: null,
      employer_name: null,
      employer_national_id: null,
      saudi_agency_name: null,
      salary_amount: null,
    };

    const parsedOCRResult = {
      contract_signed_date: "2025-04-12",
      contract_number: "CONT-998811",
      employer_name: "Ahmed Al-Mansoor",
      employer_national_id: "1098765432",
      saudi_agency_name: "Al-Baraka Recruitment Office",
      salary_amount: 1500,
      salary_currency: "SAR",
    };

    const extractValidContractFields = (source: any): Record<string, any> => {
      if (!source || typeof source !== "object") return {};
      const cleaned: Record<string, any> = {};
      const ignoredKeys = new Set([
        "name", "doctype", "owner", "creation", "modified", "modified_by",
        "idx", "docstatus", "_user_tags", "_comments", "_assign", "_liked_by",
        "status", "message", "success"
      ]);

      for (const [key, value] of Object.entries(source)) {
        if (ignoredKeys.has(key)) continue;
        if (value !== null && value !== undefined && value !== "" && value !== 0 && value !== "0") {
          cleaned[key] = value;
        }
      }
      return cleaned;
    };

    const validPlacement = extractValidContractFields(rawPlacementFromUpload);
    const validParsed = extractValidContractFields(parsedOCRResult);

    const merged = {
      ...validPlacement,
      ...validParsed,
    };

    // Verify all parsed fields survive intact
    assert.equal(merged.contract_signed_date, "2025-04-12");
    assert.equal(merged.contract_number, "CONT-998811");
    assert.equal(merged.employer_name, "Ahmed Al-Mansoor");
    assert.equal(merged.employer_national_id, "1098765432");
    assert.equal(merged.saudi_agency_name, "Al-Baraka Recruitment Office");
    assert.equal(merged.salary_amount, 1500);
    assert.equal(merged.salary_currency, "SAR");
    assert.equal(merged.contract_file, "/files/musaned_contract.pdf");
  });

  test("13. Outcome A: Attachment + Extraction successful triggers honest success notification", () => {
    const countExtractedContractFields = (parsed: Record<string, any>): number => {
      if (!parsed || typeof parsed !== "object") return 0;
      let count = 0;
      if (parsed.contract_signed_date || parsed.contract_date) count++;
      if (parsed.contract_number) count++;
      if (parsed.employer_name || parsed.sponsor_name) count++;
      if (parsed.employer_national_id || parsed.sponsor_id) count++;
      if (parsed.salary_amount || parsed.contract_salary_amount || parsed.salary) count++;
      if (parsed.saudi_agency_name || parsed.kuwait_agency_name || parsed.contractor_name) count++;
      if (parsed.visa_number) count++;
      if (parsed.employment_site || parsed.work_site) count++;
      if (parsed.contract_duration || parsed.duration || parsed.contract_period) count++;
      return count;
    };

    const determineContractNotification = (placementName: string, parsed: Record<string, any>, parseError: any) => {
      const extractedCount = countExtractedContractFields(parsed);
      if (!parseError && extractedCount >= 4) {
        return {
          type: "success",
          title: "Contract Attached & Info Extracted",
          description: `Contract attached to ${placementName}. Review extracted info below and approve to save.`,
        };
      } else if (!parseError && extractedCount > 0) {
        return {
          type: "info",
          title: "Contract Attached — Partial Info Extracted",
          description: `Contract attached to ${placementName}. Some terms were extracted. Review and complete the remaining fields below.`,
        };
      } else {
        return {
          type: "warning",
          title: "Contract Attached — Extraction Incomplete",
          description: "Contract attached successfully, but information could not be extracted. Please retry extraction or review the contract manually.",
        };
      }
    };

    const fullExtraction = {
      contract_signed_date: "2025-03-01",
      contract_number: "SA-99001",
      employer_name: "Bandar Trading",
      employer_national_id: "1029384756",
      salary_amount: 1400,
    };

    const notif = determineContractNotification("PLM-00006", fullExtraction, null);
    assert.equal(notif.type, "success");
    assert.equal(notif.title, "Contract Attached & Info Extracted");
    assert.equal(notif.description.includes("PLM-00006"), true);
  });

  test("14. Outcome E: Partial extraction produces clear informative toast without false full success", () => {
    const countExtractedContractFields = (parsed: Record<string, any>): number => {
      if (!parsed || typeof parsed !== "object") return 0;
      let count = 0;
      if (parsed.contract_signed_date || parsed.contract_date) count++;
      if (parsed.contract_number) count++;
      if (parsed.employer_name || parsed.sponsor_name) count++;
      if (parsed.employer_national_id || parsed.sponsor_id) count++;
      if (parsed.salary_amount || parsed.contract_salary_amount || parsed.salary) count++;
      if (parsed.saudi_agency_name || parsed.kuwait_agency_name || parsed.contractor_name) count++;
      if (parsed.visa_number) count++;
      if (parsed.employment_site || parsed.work_site) count++;
      if (parsed.contract_duration || parsed.duration || parsed.contract_period) count++;
      return count;
    };

    const determineContractNotification = (placementName: string, parsed: Record<string, any>, parseError: any) => {
      const extractedCount = countExtractedContractFields(parsed);
      if (!parseError && extractedCount >= 4) {
        return {
          type: "success",
          title: "Contract Attached & Info Extracted",
          description: `Contract attached to ${placementName}. Review extracted info below and approve to save.`,
        };
      } else if (!parseError && extractedCount > 0) {
        return {
          type: "info",
          title: "Contract Attached — Partial Info Extracted",
          description: `Contract attached to ${placementName}. Some terms were extracted. Review and complete the remaining fields below.`,
        };
      } else {
        return {
          type: "warning",
          title: "Contract Attached — Extraction Incomplete",
          description: "Contract attached successfully, but information could not be extracted. Please retry extraction or review the contract manually.",
        };
      }
    };

    const partialExtraction = {
      contract_signed_date: "2025-03-01",
      employer_name: "Bandar Trading",
    };

    const notif = determineContractNotification("PLM-00006", partialExtraction, null);
    assert.equal(notif.type, "info");
    assert.equal(notif.title, "Contract Attached — Partial Info Extracted");
    assert.equal(notif.description.includes("Some terms were extracted"), true);
  });

  test("15. Outcome B: Attachment successful but extraction failed/empty informs user truthfully to retry or review manually", () => {
    const countExtractedContractFields = (parsed: Record<string, any>): number => {
      if (!parsed || typeof parsed !== "object") return 0;
      let count = 0;
      if (parsed.contract_signed_date || parsed.contract_date) count++;
      if (parsed.contract_number) count++;
      if (parsed.employer_name || parsed.sponsor_name) count++;
      if (parsed.employer_national_id || parsed.sponsor_id) count++;
      if (parsed.salary_amount || parsed.contract_salary_amount || parsed.salary) count++;
      if (parsed.saudi_agency_name || parsed.kuwait_agency_name || parsed.contractor_name) count++;
      if (parsed.visa_number) count++;
      if (parsed.employment_site || parsed.work_site) count++;
      if (parsed.contract_duration || parsed.duration || parsed.contract_period) count++;
      return count;
    };

    const determineContractNotification = (placementName: string, parsed: Record<string, any>, parseError: any) => {
      const extractedCount = countExtractedContractFields(parsed);
      if (!parseError && extractedCount >= 4) {
        return {
          type: "success",
          title: "Contract Attached & Info Extracted",
          description: `Contract attached to ${placementName}. Review extracted info below and approve to save.`,
        };
      } else if (!parseError && extractedCount > 0) {
        return {
          type: "info",
          title: "Contract Attached — Partial Info Extracted",
          description: `Contract attached to ${placementName}. Some terms were extracted. Review and complete the remaining fields below.`,
        };
      } else {
        return {
          type: "warning",
          title: "Contract Attached — Extraction Incomplete",
          description: "Contract attached successfully, but information could not be extracted. Please retry extraction or review the contract manually.",
        };
      }
    };

    // Case 1: Empty extraction result
    const emptyExtraction = {};
    const notif1 = determineContractNotification("PLM-00006", emptyExtraction, null);
    assert.equal(notif1.type, "warning");
    assert.equal(notif1.title, "Contract Attached — Extraction Incomplete");
    assert.equal(
      notif1.description,
      "Contract attached successfully, but information could not be extracted. Please retry extraction or review the contract manually."
    );

    // Case 2: Extraction threw an exception
    const notif2 = determineContractNotification("PLM-00006", {}, new Error("OCR timeout"));
    assert.equal(notif2.type, "warning");
    assert.equal(notif2.title, "Contract Attached — Extraction Incomplete");
    assert.equal(
      notif2.description,
      "Contract attached successfully, but information could not be extracted. Please retry extraction or review the contract manually."
    );
  });

  test("16. Contract response normalizer extracts nested payloads and harmonizes field aliases", () => {
    const normalizeParsedContract = (result: any) => {
      let data: Record<string, any> = {};
      if (result && typeof result === "object") {
        if (result.data && typeof result.data === "object") {
          data = result.data;
        } else if (result.parsed_data && typeof result.parsed_data === "object") {
          data = result.parsed_data;
        } else if (result.parsed_contract && typeof result.parsed_contract === "object") {
          data = result.parsed_contract;
        } else if (result.message && typeof result.message === "object") {
          data = result.message;
        } else {
          data = result;
        }
      }

      const contractSignedDate = data.contract_signed_date || data.contract_date || data.signed_date || data.date || "";
      const contractNumber = data.contract_number || data.contract_no || "";
      const visaNumber = data.visa_number || data.visa_no || "";
      const employerName = data.employer_name || data.sponsor_name || data.employer || "";
      const employerId = data.employer_national_id || data.sponsor_id || data.employer_id || data.national_id || "";
      const employerAddress = data.employer_address || data.sponsor_address || data.address || "";
      const saudiAgencyName = data.saudi_agency_name || data.agency_name || data.contractor_name || data.saudi_agency || "";
      const salary = data.salary_amount ?? data.contract_salary_amount ?? data.salary ?? "";
      const workSite = data.employment_site || data.work_site || data.site || "";
      const duration = data.contract_duration || data.duration || data.contract_period || "";

      return {
        status: "success",
        ...data,
        contract_signed_date: contractSignedDate,
        contract_date: contractSignedDate,
        contract_number: contractNumber,
        visa_number: visaNumber,
        employer_name: employerName,
        sponsor_name: employerName,
        employer_national_id: employerId,
        sponsor_id: employerId,
        employer_address: employerAddress,
        saudi_agency_name: saudiAgencyName,
        salary_amount: salary,
        contract_salary_amount: salary,
        employment_site: workSite,
        work_site: workSite,
        contract_duration: duration,
        duration: duration,
      };
    };

    // Test with nested { message: { sponsor_name, contract_date, ... } }
    const backendPayload = {
      message: {
        sponsor_name: "Fatima Al-Sabah",
        sponsor_id: "299010112345",
        contract_date: "2025-06-20",
        contract_no: "KWT-445566",
        salary: 120,
        work_site: "Hawalli",
        duration: "2 Years",
      },
    };

    const normalized = normalizeParsedContract(backendPayload);
    assert.equal(normalized.employer_name, "Fatima Al-Sabah");
    assert.equal(normalized.sponsor_name, "Fatima Al-Sabah");
    assert.equal(normalized.employer_national_id, "299010112345");
    assert.equal(normalized.contract_signed_date, "2025-06-20");
    assert.equal(normalized.contract_number, "KWT-445566");
    assert.equal(normalized.salary_amount, 120);
    assert.equal(normalized.employment_site, "Hawalli");
    assert.equal(normalized.contract_duration, "2 Years");
  });

  test("17. Visa response normalizer extracts nested payloads and harmonizes visa aliases", () => {
    const normalizeParsedVisa = (result: any) => {
      let data: Record<string, any> = {};
      if (result && typeof result === "object") {
        if (result.data && typeof result.data === "object") {
          data = result.data;
        } else if (result.parsed_data && typeof result.parsed_data === "object") {
          data = result.parsed_data;
        } else if (result.parsed_visa && typeof result.parsed_visa === "object") {
          data = result.parsed_visa;
        } else if (result.message && typeof result.message === "object") {
          data = result.message;
        } else {
          data = result;
        }
      }

      const visaNumber = data.visa_number || data.visa_no || "";
      const visaType = data.visa_type || data.type || "";
      const issueDate = data.visa_issue_date || data.issue_date || data.dates?.issue || "";
      const expiryDate = data.visa_expiry_date || data.expiry_date || data.dates?.expiry || "";
      const sponsorName = data.sponsor_name || data.employer_name || data.sponsor || "";
      const sponsorId = data.sponsor_id || data.civil_id || data.employer_national_id || data.national_id || "";
      const reference = data.reference || data.reference_number || data.ref || "";

      return {
        status: "success",
        ...data,
        visa_number: visaNumber,
        visa_type: visaType,
        visa_issue_date: issueDate,
        issue_date: issueDate,
        visa_expiry_date: expiryDate,
        expiry_date: expiryDate,
        sponsor_name: sponsorName,
        employer_name: sponsorName,
        sponsor_id: sponsorId,
        civil_id: sponsorId,
        employer_national_id: sponsorId,
        reference: reference,
        reference_number: reference,
      };
    };

    const visaPayload = {
      data: {
        visa_no: "V-99881122",
        type: "Work",
        dates: { issue: "2025-07-01", expiry: "2026-07-01" },
        sponsor: "Kuwait Logistics Co",
        civil_id: "288112233445",
        ref: "REF-776655",
      },
    };

    const normVisa = normalizeParsedVisa(visaPayload);
    assert.equal(normVisa.visa_number, "V-99881122");
    assert.equal(normVisa.visa_type, "Work");
    assert.equal(normVisa.visa_issue_date, "2025-07-01");
    assert.equal(normVisa.issue_date, "2025-07-01");
    assert.equal(normVisa.visa_expiry_date, "2026-07-01");
    assert.equal(normVisa.expiry_date, "2026-07-01");
    assert.equal(normVisa.sponsor_name, "Kuwait Logistics Co");
    assert.equal(normVisa.employer_name, "Kuwait Logistics Co");
    assert.equal(normVisa.sponsor_id, "288112233445");
    assert.equal(normVisa.civil_id, "288112233445");
    assert.equal(normVisa.reference, "REF-776655");
  });
});
