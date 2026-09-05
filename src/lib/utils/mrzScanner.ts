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
  dob?: string;
  birth_date?: string;
  gender: "Male" | "Female" | string;
  passport_expiry: string;
  passport_expiry_date?: string;
  passport_issue_date?: string;
  place_of_issue?: string;
  raw_mrz?: string;
  [key: string]: any;
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
    // Check for standard or OCR-noisy prefixes like P<ETH, PQETH, POETH, P0ETH, P<, P
    const mrzPrefixMatch = nameString.match(/^P[<A-Z0-9]?([A-Z]{3})/i);
    if (mrzPrefixMatch) {
      const cCode = mrzPrefixMatch[1].toUpperCase();
      if (cCode === "ETH") country = "Ethiopia";
      nameString = nameString.substring(mrzPrefixMatch[0].length);
    } else if (nameString.startsWith("P<")) {
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
    // 1. Try robust landmark regex (matches 3-letter country code + 6 digits/O DOB + check + Sex + 6 digits/O Expiry)
    // Note: OCR-B fonts often have '0' read as 'O', so we allow 'O' and normalize to '0'.
    const landmarkMatch = line2.match(/([A-Z]{3})\s*([0-9O]{6})\s*[0-9O]?\s*([MFXE<])\s*([0-9O]{6})/i);
    if (landmarkMatch) {
      const cCode = landmarkMatch[1].toUpperCase();
      if (cCode === "ETH") country = "Ethiopia";

      const dobRaw = landmarkMatch[2].replace(/O/gi, "0");
      const yy = parseInt(dobRaw.substring(0, 2), 10);
      const mm = dobRaw.substring(2, 4);
      const dd = dobRaw.substring(4, 6);
      const fullYear = yy > 45 ? `19${yy}` : `20${yy.toString().padStart(2, "0")}`;
      dob = `${fullYear}-${mm}-${dd}`;

      const sexChar = landmarkMatch[3].toUpperCase();
      if (sexChar === "M") gender = "Male";
      else if (sexChar === "F" || sexChar === "E" || sexChar === "P") gender = "Female";

      const expRaw = landmarkMatch[4].replace(/O/gi, "0");
      const expYy = parseInt(expRaw.substring(0, 2), 10);
      const expMm = expRaw.substring(2, 4);
      const expDd = expRaw.substring(4, 6);
      const fullExpYear = expYy < 50 ? `20${expYy.toString().padStart(2, "0")}` : `19${expYy}`;
      expiry = `${fullExpYear}-${expMm}-${expDd}`;

      // Passport number is before the landmark match
      const beforeCountry = line2.substring(0, line2.indexOf(landmarkMatch[0])).replace(/<+/g, "").trim();
      if (beforeCountry) {
        passportNo = beforeCountry.length === 10 ? beforeCountry.substring(0, 9) : beforeCountry;
      }
    }

    if (!passportNo) {
      passportNo = line2.substring(0, 9).replace(/<+/g, "").trim();
    }
    
    // Check nationality code in line 2 if not set
    if (!country || country === "Ethiopia") {
      const natCode = line2.substring(10, 13);
      if (natCode === "ETH") country = "Ethiopia";
    }

    // Fallback index-based Date of Birth: YYMMDD at pos 13..19 (allow 'O' -> '0')
    if (!dob) {
      const dobRaw = line2.substring(13, 19).replace(/O/gi, "0").replace(/[^0-9]/g, "");
      if (dobRaw.length === 6) {
        const yy = parseInt(dobRaw.substring(0, 2), 10);
        const mm = dobRaw.substring(2, 4);
        const dd = dobRaw.substring(4, 6);
        const fullYear = yy > 45 ? `19${yy}` : `20${yy.toString().padStart(2, "0")}`;
        dob = `${fullYear}-${mm}-${dd}`;
      }
    }

    // Fallback Gender: pos 20 (M/F)
    if (!gender || gender === "Female") {
      const sexChar = line2.charAt(20).toUpperCase();
      if (sexChar === "M") gender = "Male";
      if (sexChar === "F" || sexChar === "E" || sexChar === "P") gender = "Female";
    }

    // Fallback Expiry Date: YYMMDD at pos 21..27 (allow 'O' -> '0')
    if (!expiry) {
      const expRaw = line2.substring(21, 27).replace(/O/gi, "0").replace(/[^0-9]/g, "");
      if (expRaw.length === 6) {
        const yy = parseInt(expRaw.substring(0, 2), 10);
        const mm = expRaw.substring(2, 4);
        const dd = expRaw.substring(4, 6);
        const fullYear = yy < 50 ? `20${yy.toString().padStart(2, "0")}` : `19${yy}`;
        expiry = `${fullYear}-${mm}-${dd}`;
      }
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
    dob: dob || "",
    gender: gender,
    passport_expiry: expiry || "",
    passport_expiry_date: expiry || "",
    passport_issue_date: issueDate,
    place_of_issue: country === "Ethiopia" ? "Addis Ababa" : "",
    raw_mrz: `${line1}\n${line2}`,
  };
}

const MONTH_NAME_MAP: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  OEC: "12", BEC: "12", BEE: "12",
  "1AN": "01", IAN: "01",
  NAY: "05",
};

/**
 * Parses dates written in formats like '02 DEC 00', '12 MAY 2030', '13/05/2025'
 */
function extractDateFromLine(text: string): string | null {
  // 1. Match 'DD MMM YY' or 'DD MMM YYYY' (e.g. 02 DEC 00 or 12 MAY 30)
  const monthMatch = text.match(/(\d{1,2})\s*[-/ .]?\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|OEC|BEC|BEE|1AN|IAN|NAY)\s*[-/ .]?\s*(\d{2,4})/i);
  if (monthMatch) {
    const dd = monthMatch[1].padStart(2, "0");
    const mKey = monthMatch[2].toUpperCase();
    const mm = MONTH_NAME_MAP[mKey] || "01";
    let yr = monthMatch[3];
    if (yr.length === 2) {
      const yNum = parseInt(yr, 10);
      yr = yNum > 45 ? `19${yr}` : `20${yr}`;
    }
    return `${yr}-${mm}-${dd}`;
  }

  // 2. Match numeric 'YYYY-MM-DD' or 'DD.MM.YYYY' or 'DD/MM/YYYY' or 'DD-MM-YYYY'
  const isoMatch = text.match(/\b(19\d{2}|20\d{2})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const numMatch = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    let yr = numMatch[3];
    if (yr.length === 2) {
      const yNum = parseInt(yr, 10);
      yr = yNum > 45 ? `19${yr}` : `20${yr}`;
    }
    const dd = String(p1).padStart(2, "0");
    const mm = String(p2).padStart(2, "0");
    return `${yr}-${mm}-${dd}`;
  }

  return null;
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
    const parsed = parseMRZText(fullText) || ({} as any);

    let extractedPass = parsed.passport_number || "";
    let extractedDob = parsed.date_of_birth || "";
    let extractedExpiry = parsed.passport_expiry || "";
    let extractedIssue = parsed.passport_issue_date || "";

    // Scan lines for visual text labels and dates from passport face
    const textLines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const currentYear = new Date().getFullYear();

    for (const line of textLines) {
      // 1. Passport Number matcher (e.g. EQ2576096 or EP1234567)
      if (!extractedPass) {
        const passMatch = line.match(/\b(E[A-Z0-9]\d{7}|[A-Z]{1,2}\d{7,8})\b/i);
        if (passMatch) extractedPass = passMatch[1].toUpperCase();
      }

      // 2. Date extraction from visual lines
      const dateFound = extractDateFromLine(line);
      if (dateFound) {
        const upperLine = line.toUpperCase();
        const year = parseInt(dateFound.split("-")[0], 10);

        if (upperLine.includes("BIRTH") || upperLine.includes("DOB") || (!extractedDob && year <= currentYear - 15)) {
          if (!extractedDob) extractedDob = dateFound;
        } else if (upperLine.includes("EXPIR") || (!extractedExpiry && year >= currentYear)) {
          if (!extractedExpiry) extractedExpiry = dateFound;
        } else if (upperLine.includes("ISSUE") || !extractedIssue) {
          extractedIssue = dateFound;
        }
      }
    }

    // If issue date still missing but expiry known, estimate issue date (expiry - 5 years)
    if (extractedExpiry && !extractedIssue) {
      const parts = extractedExpiry.split("-");
      if (parts.length === 3) {
        const expYear = parseInt(parts[0], 10);
        extractedIssue = `${expYear - 5}-${parts[1]}-${parts[2]}`;
      }
    }

    if (extractedPass || parsed.first_name || extractedDob) {
      return {
        passport_number: extractedPass || parsed.passport_number || "",
        first_name: parsed.first_name || "",
        middle_name: parsed.middle_name || "",
        last_name: parsed.last_name || "",
        nationality: parsed.nationality || "Ethiopia",
        date_of_birth: extractedDob || parsed.date_of_birth || "",
        gender: parsed.gender || "Female",
        passport_expiry: extractedExpiry || parsed.passport_expiry || "",
        passport_issue_date: extractedIssue || parsed.passport_issue_date || "",
        place_of_issue: parsed.place_of_issue || "Addis Ababa",
        raw_mrz: parsed.raw_mrz || fullText,
      };
    }

    return parsed.passport_number ? parsed : null;
  } catch (err) {
    console.warn("Tesseract OCR execution error:", err);
    return null;
  }
}
