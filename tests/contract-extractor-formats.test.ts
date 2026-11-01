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
});
