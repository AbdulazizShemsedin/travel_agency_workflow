/**
 * Real Client-Side Optical MRZ & Passport Scanner using Tesseract.js & ICAO 9303 Parser
 */

export interface ParsedPassportMRZ {
  passport_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  nationality: string;
  date_of_birth: string;
  gender: "Male" | "Female" | string;
  passport_expiry: string;
  passport_issue_date?: string;
  place_of_issue?: string;
  raw_mrz?: string;
}

/**
 * Parses standard ICAO Doc 9303 Machine Readable Zone (MRZ) 2-line format (TD3)
 */
export function parseMRZText(rawText: string): ParsedPassportMRZ | null {
  if (!rawText) return null;

  // Clean lines: keep alphanumeric and '<'
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/[^A-Z0-9<]/gi, "").toUpperCase())
    .filter((l) => l.length >= 25);

  let line1 = "";
  let line2 = "";

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("P<") || l.startsWith("P") || l.includes("<<")) {
      line1 = l;
      if (lines[i + 1] && lines[i + 1].length >= 25) {
        line2 = lines[i + 1];
      }
      break;
    }
  }

  // If not found by prefix, find the two longest lines containing '<'
  if (!line1 || !line2) {
    const candidateLines = lines.filter((l) => l.includes("<") && l.length >= 30);
    if (candidateLines.length >= 2) {
      line1 = candidateLines[0];
      line2 = candidateLines[1];
    }
  }

  if (!line1 && !line2) return null;

  let country = "Ethiopia";
  let lastName = "";
  let firstName = "";
  let middleName = "";
  let passportNo = "";
  let dob = "";
  let gender: "Male" | "Female" = "Female";
  let expiry = "";

  // Parse Line 1: P<ETHSURNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<
  if (line1) {
    let nameString = line1;
    if (nameString.startsWith("P<")) {
      const cCode = nameString.substring(2, 5);
      if (cCode === "ETH") country = "Ethiopia";
      nameString = nameString.substring(5);
    } else if (nameString.startsWith("P")) {
      nameString = nameString.substring(1);
    }

    const nameParts = nameString.split("<<");
    lastName = nameParts[0]?.replace(/<+/g, " ").trim() || "";
    
    if (nameParts[1]) {
      const givenParts = nameParts[1].split("<").filter(Boolean);
      firstName = givenParts[0] || "";
      middleName = givenParts[1] || "";
    }
  }

  // Parse Line 2: EP12345678ETH9501014M3001012<<<<<<<<<<<<<<02
  if (line2) {
    passportNo = line2.substring(0, 9).replace(/<+/g, "").trim();
    
    // Check nationality code in line 2
    const natCode = line2.substring(10, 13);
    if (natCode === "ETH") country = "Ethiopia";

    // Date of Birth: YYMMDD at pos 13..19
    const dobRaw = line2.substring(13, 19).replace(/[^0-9]/g, "");
    if (dobRaw.length === 6) {
      const yy = parseInt(dobRaw.substring(0, 2), 10);
      const mm = dobRaw.substring(2, 4);
      const dd = dobRaw.substring(4, 6);
      const fullYear = yy > 45 ? `19${yy}` : `20${yy.toString().padStart(2, "0")}`;
      dob = `${fullYear}-${mm}-${dd}`;
    }

    // Gender: pos 20 (M/F)
    const sexChar = line2.charAt(20);
    if (sexChar === "M") gender = "Male";
    if (sexChar === "F") gender = "Female";

    // Expiry Date: YYMMDD at pos 21..27
    const expRaw = line2.substring(21, 27).replace(/[^0-9]/g, "");
    if (expRaw.length === 6) {
      const yy = parseInt(expRaw.substring(0, 2), 10);
      const mm = expRaw.substring(2, 4);
      const dd = expRaw.substring(4, 6);
      const fullYear = yy < 50 ? `20${yy.toString().padStart(2, "0")}` : `19${yy}`;
      expiry = `${fullYear}-${mm}-${dd}`;
    }
  }

  // Calculate passport issue date by subtracting 5 years from expiry date
  let issueDate = "";
  if (expiry) {
    const parts = expiry.split("-");
    if (parts.length === 3) {
      const expYear = parseInt(parts[0], 10);
      const issueYear = expYear - 5;
      issueDate = `${issueYear}-${parts[1]}-${parts[2]}`;
    }
  }

  return {
    passport_number: passportNo || "",
    first_name: firstName || lastName,
    middle_name: middleName || "",
    last_name: lastName || firstName,
    nationality: country,
    date_of_birth: dob || "",
    gender: gender,
    passport_expiry: expiry || "",
    passport_issue_date: issueDate,
    place_of_issue: country === "Ethiopia" ? "Addis Ababa" : "",
    raw_mrz: `${line1}\n${line2}`,
  };
}

/**
 * Runs genuine optical character recognition (OCR) on an image file using Tesseract.js
 */
export async function performOpticalPassportOCR(
  imageSource: File | Blob | string
): Promise<ParsedPassportMRZ | null> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    
    // Recognize text from image
    const ret = await worker.recognize(imageSource);
    await worker.terminate();

    const fullText = ret.data.text;
    const parsed = parseMRZText(fullText);

    if (parsed && (parsed.passport_number || parsed.first_name)) {
      return parsed;
    }

    // If MRZ lines were slightly noisy, try extracting passport numbers and names from general lines
    const textLines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);
    let extractedPass = "";
    let extractedDob = "";
    let extractedExpiry = "";

    for (const line of textLines) {
      const passMatch = line.match(/\b(EP\d{7}|\b[A-Z]\d{8})\b/i);
      if (passMatch && !extractedPass) extractedPass = passMatch[1].toUpperCase();

      const dateMatch = line.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
      if (dateMatch) {
        const formatted = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        if (!extractedDob) extractedDob = formatted;
        else if (!extractedExpiry) extractedExpiry = formatted;
      }
    }

    if (extractedPass) {
      return {
        passport_number: extractedPass,
        first_name: parsed?.first_name || "",
        last_name: parsed?.last_name || "",
        nationality: "Ethiopia",
        date_of_birth: extractedDob || parsed?.date_of_birth || "",
        gender: parsed?.gender || "Female",
        passport_expiry: extractedExpiry || parsed?.passport_expiry || "",
        raw_mrz: fullText,
      };
    }

    return parsed;
  } catch (err) {
    console.warn("Tesseract OCR execution error:", err);
    return null;
  }
}
