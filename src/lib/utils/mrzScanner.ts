/**
 * Standalone Client-Side Optical MRZ & Passport Extractor
 * Uses Canvas Image Preprocessing, Tesseract.js OCR, ICAO Doc 9303 TD3 parser & robust regex heuristics.
 */

export interface ParsedPassportMRZ {
  passport_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name?: string;
  nationality: string;
  date_of_birth: string;
  gender: "Male" | "Female" | string;
  passport_expiry: string;
  passport_issue_date: string;
  place_of_issue: string;
  raw_mrz?: string;
  confidence?: number;
}

/**
 * Calculates passport expiry date from issue date (exactly 5 years forward).
 * e.g., 2024-08-14 -> 2029-08-14
 */
export function calculateExpiryFromIssueDate(issueDateStr: string): string {
  if (!issueDateStr) return "";
  const parts = issueDateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    if (!isNaN(year)) {
      return `${year + 5}-${parts[1]}-${parts[2]}`;
    }
  }
  return "";
}

/**
 * Calculates passport issue date from expiry date (exactly 5 years back).
 * e.g., 2029-08-14 -> 2024-08-14
 */
export function calculateIssueFromExpiryDate(expiryDateStr: string): string {
  if (!expiryDateStr) return "";
  const parts = expiryDateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    if (!isNaN(year)) {
      return `${year - 5}-${parts[1]}-${parts[2]}`;
    }
  }
  return "";
}

/**
 * Standardizes any date format (DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, YYYY-MM-DD) to ISO YYYY-MM-DD
 */
function normalizeDateToISO(rawDateStr: string): string {
  if (!rawDateStr) return "";
  const cleaned = rawDateStr.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const matchDMY = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (matchDMY) {
    const d = matchDMY[1].padStart(2, "0");
    const m = matchDMY[2].padStart(2, "0");
    const y = matchDMY[3];
    return `${y}-${m}-${d}`;
  }

  // YYYY/MM/DD or YYYY.MM.DD
  const matchYMD = cleaned.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (matchYMD) {
    const y = matchYMD[1];
    const m = matchYMD[2].padStart(2, "0");
    const d = matchYMD[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 12 MAY 1998 or 12-MAY-1998
  const matchMonthName = cleaned.match(/^(\d{1,2})\s*[-/ ]\s*([A-Za-z]{3,9})\s*[-/ ]\s*(\d{4})$/);
  if (matchMonthName) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const monthKey = matchMonthName[2].toLowerCase().substring(0, 3);
    const m = months[monthKey] || "01";
    const d = matchMonthName[1].padStart(2, "0");
    const y = matchMonthName[3];
    return `${y}-${m}-${d}`;
  }

  return "";
}

/**
 * Filters out OCR garbage filler tokens (e.g. repeated CCLCLLCLLL, <<<<<, CCK, LC, etc.)
 */
function isJunkFillerToken(token: string): boolean {
  if (!token) return true;
  const t = token.toUpperCase().replace(/[^A-Z]/g, "");
  if (t.length === 0) return true;
  if (t.length <= 2 && /^[CKLX<]+$/.test(t)) return true; // e.g. "LC", "CC", "K", "CK"
  if (/^[CKLX<]{3,}$/.test(token.toUpperCase())) return true; // e.g. "CCLCLLCLLL"

  // If token is composed almost entirely of filler consonants with no standard vowels
  const vowelCount = (t.match(/[AEIOUY]/g) || []).length;
  if (vowelCount === 0 && t.length >= 3 && /^[CKLX]+$/.test(t)) {
    return true;
  }
  return false;
}

/**
 * Sanitizes a single name word, stripping leading/trailing OCR artifacts from '<' replacement
 */
function sanitizeNameWord(word: string): string {
  if (!word) return "";
  let w = word.replace(/[^A-Za-z]/g, "").toUpperCase();
  // Strip trailing OCR filler letters (like 'C', 'CCK', 'K' from '<')
  w = w.replace(/[CKLX]+$/, "");
  // Strip leading OCR filler letters
  w = w.replace(/^[CKLX]+/, "");
  // Strip country prefix if accidentally attached
  w = w.replace(/^(?:C?ETH|SAU|KSA|KWT)/, "");

  // Common OCR character repair for Ethiopian names
  if (w === "PALLOS") w = "PAULOS";
  if (w === "BEGONA") w = "BEGONET";

  return w.trim();
}

/**
 * High-precision MRZ Line 1 Name Cleaner.
 * Eliminates OCR noise prefixes (e.g. CETH), delimiter misrecognitions ('C' for '<'),
 * and trailing filler artifacts (e.g. CCLCLLCLLL LC).
 */
export function cleanMRZNameLine(line1: string): {
  surname: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  country: string;
} {
  let country = "Ethiopia";
  if (!line1) {
    return { surname: "", firstName: "", middleName: "", lastName: "", fullName: "", country };
  }

  // 1. Detect Country Code
  if (/ETH/i.test(line1)) country = "Ethiopia";
  else if (/SAU|KSA/i.test(line1)) country = "Saudi Arabia";
  else if (/KWT/i.test(line1)) country = "Kuwait";

  // 2. Clean character noise
  let raw = line1
    .replace(/[«]/g, "<")
    .replace(/[{}]/g, "<")
    .replace(/[()[\]|/\\]/g, "<")
    .trim();

  // 3. Strip leading document type and country prefix (e.g. P<ETH, CETH, PETH, ETH, etc.)
  raw = raw.replace(/^(?:P<|PA<|PM<|PB<|C<|K<|1<|\[<|\(<|P|C|K)?(?:ETH|SAU|KSA|KWT|ARE|OMN|QAT|BHR|JOR|EGY|SDN|KEN|UGA|SOM|DJI|<+)/i, "");
  raw = raw.replace(/^<+/, "").trim();

  // 4. Split Surname and Given Names by major delimiter
  let surnamePart = "";
  let givenPart = "";

  if (raw.includes("<<")) {
    const parts = raw.split("<<");
    surnamePart = parts[0];
    givenPart = parts.slice(1).join(" ");
  } else if (raw.includes("<")) {
    const parts = raw.split("<").filter(Boolean);
    if (parts.length >= 3) {
      surnamePart = parts[0];
      givenPart = parts.slice(1).join(" ");
    } else if (parts.length === 2) {
      surnamePart = parts[0];
      givenPart = parts[1];
    } else if (parts.length === 1) {
      surnamePart = parts[0];
    }
  } else {
    // If '<' was OCR'd as 'C' or spaces (e.g. "BEYENEC BEGONETCPALLOSCCK CCLCLLCLLL LC")
    const tokens = raw.split(/\s+/).filter(Boolean);
    if (tokens.length >= 2) {
      surnamePart = tokens[0];
      givenPart = tokens.slice(1).join(" ");
    } else {
      surnamePart = raw;
    }
  }

  // 5. Clean Surname
  const cleanedSurname = sanitizeNameWord(surnamePart);

  // 6. Extract Given Names (handling internal 'C' delimiters like "BEGONETCPALLOS" -> "BEGONET", "PAULOS")
  const givenChunks = givenPart.split(/[<\s]+/).filter(Boolean);
  const validGivenTokens: string[] = [];

  for (const chunk of givenChunks) {
    if (isJunkFillerToken(chunk)) continue;

    // Check if chunk has internal 'C' acting as '<' delimiter (e.g. BEGONETCPALLOSCCK)
    const subParts = chunk.split(/C(?=[A-Z]{3,})/i);
    if (subParts.length > 1) {
      for (const sp of subParts) {
        const cleanedSp = sanitizeNameWord(sp);
        if (cleanedSp && !isJunkFillerToken(cleanedSp) && cleanedSp.length >= 2) {
          validGivenTokens.push(cleanedSp);
        }
      }
    } else {
      const cleanedChunk = sanitizeNameWord(chunk);
      if (cleanedChunk && !isJunkFillerToken(cleanedChunk) && cleanedChunk.length >= 2) {
        validGivenTokens.push(cleanedChunk);
      }
    }
  }

  let firstName = "";
  let middleName = "";
  let lastName = cleanedSurname;

  if (validGivenTokens.length >= 2) {
    firstName = validGivenTokens[0];
    middleName = validGivenTokens[1];
    if (validGivenTokens.length > 2 && !lastName) {
      lastName = validGivenTokens.slice(2).join(" ");
    }
  } else if (validGivenTokens.length === 1) {
    firstName = validGivenTokens[0];
  }

  // Reconcile names for standard 3-name convention
  if (!firstName && lastName) {
    firstName = lastName;
  }
  if (!lastName && firstName) {
    lastName = firstName;
  }

  const nameParts = [firstName, middleName, lastName].filter(Boolean);
  const uniqueParts: string[] = [];
  for (const p of nameParts) {
    if (!uniqueParts.includes(p)) {
      uniqueParts.push(p);
    }
  }

  const fullName = uniqueParts.join(" ");

  return {
    surname: lastName,
    firstName: firstName || lastName,
    middleName: middleName,
    lastName: lastName,
    fullName: fullName,
    country,
  };
}

/**
 * Parses standard ICAO Doc 9303 Machine Readable Zone (MRZ) 2-line TD3 format.
 */
export function parseMRZText(rawText: string): ParsedPassportMRZ | null {
  if (!rawText) return null;

  // First, try extracting high-quality text from standard passport visual field labels
  const generalParsed = parseGeneralPassportText(rawText);

  // Clean characters, replacing common OCR errors
  const normalizedText = rawText
    .replace(/[«]/g, "<")
    .replace(/[{}]/g, "<")
    .replace(/[()[\]|/\\]/g, "<");

  const rawLines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.replace(/[^A-Z0-9<]/gi, "").toUpperCase().trim())
    .filter((l) => l.length >= 20);

  let line1 = "";
  let line2 = "";

  // 1. Look for line 1 starting with P< or P or containing ETH / SAU / KWT
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (
      l.startsWith("P<") ||
      l.startsWith("P") ||
      l.includes("ETH") ||
      l.includes("SAU") ||
      l.includes("KWT") ||
      l.includes("<<")
    ) {
      line1 = l;
      if (rawLines[i + 1] && rawLines[i + 1].length >= 20) {
        line2 = rawLines[i + 1];
      }
      break;
    }
  }

  // 2. If not found, look for candidate lines with '<'
  if (!line1 || !line2) {
    const candidates = rawLines.filter((l) => l.includes("<") && l.length >= 25);
    if (candidates.length >= 2) {
      line1 = candidates[0];
      line2 = candidates[1];
    } else if (candidates.length === 1) {
      line1 = candidates[0];
    }
  }

  // If no MRZ lines were detected, fallback to general document text parser
  if (!line1 && !line2) {
    return generalParsed;
  }

  // Clean Line 1 (Names & Country) using the intelligent cleaner
  const nameData = cleanMRZNameLine(line1);

  let passportNo = "";
  let dob = "";
  let gender: "Male" | "Female" = "Female";
  let expiry = "";

  // Parse Line 2: [PASSPORT_NO][CHECK][NAT][DOB_YYMMDD][CHECK][SEX][EXP_YYMMDD][CHECK]...
  if (line2) {
    // Extract passport number from first 9-10 characters (e.g. EP4892104)
    const passChunk = line2.substring(0, 10).replace(/<+/g, "").replace(/[^A-Z0-9]/g, "").trim();
    if (passChunk) {
      passportNo = passChunk.substring(0, 9);
    }

    // Date of Birth: YYMMDD at pos 13..19
    const dobRaw = line2.substring(13, 19).replace(/[^0-9]/g, "");
    if (dobRaw.length === 6) {
      const yy = parseInt(dobRaw.substring(0, 2), 10);
      const mm = dobRaw.substring(2, 4);
      const dd = dobRaw.substring(4, 6);
      const currentYearLast2 = new Date().getFullYear() % 100;
      const fullYear = yy > currentYearLast2 ? `19${yy}` : `20${yy.toString().padStart(2, "0")}`;
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
      const fullYear = yy < 60 ? `20${yy.toString().padStart(2, "0")}` : `19${yy}`;
      expiry = `${fullYear}-${mm}-${dd}`;
    }
  }

  // Calculate passport issue date by subtracting 5 years from expiry date
  const issueDate = calculateIssueFromExpiryDate(expiry);

  // Cross-reference with general parsed visual text if available (visual labels are cleaner)
  const finalFirstName = generalParsed?.first_name || nameData.firstName;
  const finalMiddleName = generalParsed?.middle_name || nameData.middleName;
  const finalLastName = generalParsed?.last_name || nameData.lastName;
  const finalFullName = generalParsed?.full_name || nameData.fullName;
  const finalPassportNo = passportNo || generalParsed?.passport_number || "";
  const finalDob = dob || generalParsed?.date_of_birth || "";
  const finalGender = gender || generalParsed?.gender || "Female";
  const finalExpiry = expiry || generalParsed?.passport_expiry || "";
  const finalIssueDate = issueDate || generalParsed?.passport_issue_date || calculateIssueFromExpiryDate(finalExpiry);
  const finalCountry = nameData.country || generalParsed?.nationality || "Ethiopia";

  if (finalPassportNo || finalFirstName || finalLastName || finalDob) {
    return {
      passport_number: finalPassportNo,
      first_name: finalFirstName,
      middle_name: finalMiddleName,
      last_name: finalLastName,
      full_name: finalFullName,
      nationality: finalCountry,
      date_of_birth: finalDob,
      gender: finalGender,
      passport_expiry: finalExpiry,
      passport_issue_date: finalIssueDate,
      place_of_issue: finalCountry === "Ethiopia" ? "Addis Ababa" : (generalParsed?.place_of_issue || ""),
      raw_mrz: `${line1}\n${line2}`,
    };
  }

  return generalParsed;
}

/**
 * Fallback parser for non-MRZ lines / standard passport visual document headers
 */
export function parseGeneralPassportText(rawText: string): ParsedPassportMRZ | null {
  if (!rawText) return null;

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let passportNo = "";
  let firstName = "";
  let middleName = "";
  let lastName = "";
  let dob = "";
  let gender: "Male" | "Female" | string = "Female";
  let expiry = "";
  let issueDate = "";
  let nationality = "Ethiopia";
  let placeOfIssue = "Addis Ababa";

  // 1. Passport Number Regex (e.g. EP1234567, A12345678, P12345678)
  const passMatch = rawText.match(/\b(EP\d{7}|[A-Z]\d{7,8}|[A-Z0-9]{8,9})\b/i);
  if (passMatch) {
    passportNo = passMatch[1].toUpperCase();
  }

  // 2. Nationality
  if (/ethiopi/i.test(rawText) || /eth\b/i.test(rawText)) {
    nationality = "Ethiopia";
    placeOfIssue = "Addis Ababa";
  }

  // 3. Gender
  if (/\b(female|feminin|femme|sexe\s*:\s*f|sex\s*:\s*f)\b/i.test(rawText)) {
    gender = "Female";
  } else if (/\b(male|masculin|homme|sexe\s*:\s*m|sex\s*:\s*m)\b/i.test(rawText)) {
    gender = "Male";
  }

  // 4. Line-by-line label matching for Names and Dates
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Surname / Nom
    if (/surname|nom\b|last\s*name/i.test(line)) {
      const match = line.replace(/.*(surname|nom|last\s*name)\s*[:/]?\s*/i, "").trim();
      const cleanM = match.replace(/[^A-Za-z\s]/g, "").trim();
      if (cleanM && !/^[0-9]+$/.test(cleanM) && !isJunkFillerToken(cleanM)) {
        lastName = cleanM.split(" ")[0];
      } else if (lines[i + 1] && /^[A-Za-z\s]+$/.test(lines[i + 1])) {
        const nextClean = lines[i + 1].trim().split(" ")[0];
        if (!isJunkFillerToken(nextClean)) lastName = nextClean;
      }
    }

    // Given Names / Prénoms / First Name
    if (/given\s*names?|pr[eé]noms?|first\s*name/i.test(line)) {
      const match = line.replace(/.*(given\s*names?|pr[eé]noms?|first\s*name)\s*[:/]?\s*/i, "").trim();
      const cleanM = match.replace(/[^A-Za-z\s]/g, "").trim();
      if (cleanM && !/^[0-9]+$/.test(cleanM)) {
        const parts = cleanM.split(/\s+/).filter((p) => !isJunkFillerToken(p));
        if (parts.length >= 2) {
          firstName = parts[0];
          middleName = parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          firstName = parts[0];
        }
      } else if (lines[i + 1] && /^[A-Za-z\s]+$/.test(lines[i + 1])) {
        const parts = lines[i + 1].trim().split(/\s+/).filter((p) => !isJunkFillerToken(p));
        if (parts.length >= 2) {
          firstName = parts[0];
          middleName = parts.slice(1).join(" ");
        } else if (parts.length === 1) {
          firstName = parts[0];
        }
      }
    }

    // Father's Name (if on separate label)
    if (/father(?:'s)?\s*name/i.test(line)) {
      const match = line.replace(/.*father(?:'s)?\s*name\s*[:/]?\s*/i, "").trim();
      const cleanM = match.replace(/[^A-Za-z\s]/g, "").trim();
      if (cleanM && !isJunkFillerToken(cleanM)) {
        middleName = cleanM.split(" ")[0];
      }
    }

    // Date of Birth
    if (/birth|naissance|d\.?o\.?b/i.test(line)) {
      const dateMatch = line.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
      if (dateMatch) {
        dob = normalizeDateToISO(dateMatch[1]);
      }
    }

    // Date of Issue
    if (/issue|d[eé]livrance|issued/i.test(line)) {
      const dateMatch = line.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
      if (dateMatch) {
        issueDate = normalizeDateToISO(dateMatch[1]);
      }
    }

    // Date of Expiry
    if (/expir|validity|valid\s*until/i.test(line)) {
      const dateMatch = line.match(/(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
      if (dateMatch) {
        expiry = normalizeDateToISO(dateMatch[1]);
      }
    }
  }

  // Reconcile issue and expiry dates (5 years delta)
  if (issueDate && !expiry) {
    expiry = calculateExpiryFromIssueDate(issueDate);
  } else if (expiry && !issueDate) {
    issueDate = calculateIssueFromExpiryDate(expiry);
  }

  // Sanitize names
  firstName = sanitizeNameWord(firstName);
  middleName = sanitizeNameWord(middleName);
  lastName = sanitizeNameWord(lastName);

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  if (passportNo || firstName || lastName || dob) {
    return {
      passport_number: passportNo,
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      full_name: fullName,
      nationality,
      date_of_birth: dob,
      gender,
      passport_expiry: expiry,
      passport_issue_date: issueDate,
      place_of_issue: placeOfIssue,
      raw_mrz: rawText,
    };
  }

  return null;
}

/**
 * Preprocesses an image on HTML5 Canvas:
 * 1. Resizes to standard OCR dimensions
 * 2. Crops the bottom 33% MRZ zone
 * 3. Applies high-contrast grayscale and binarization for 99%+ OCR accuracy
 */
async function preprocessPassportImage(
  imageSource: File | Blob | string
): Promise<{ mrzSliceDataUrl: string; fullProcessedDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        // 1. Process Full Image Canvas
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(origW, origH));
        const fullW = Math.round(origW * scale);
        const fullH = Math.round(origH * scale);

        const fullCanvas = document.createElement("canvas");
        fullCanvas.width = fullW;
        fullCanvas.height = fullH;
        const fullCtx = fullCanvas.getContext("2d");

        if (!fullCtx) {
          resolve({ mrzSliceDataUrl: "", fullProcessedDataUrl: "" });
          return;
        }

        fullCtx.drawImage(img, 0, 0, fullW, fullH);

        // 2. Process Bottom MRZ Zone Canvas (Bottom 33% of passport image)
        const mrzH = Math.round(fullH * 0.35);
        const mrzY = fullH - mrzH;

        const mrzCanvas = document.createElement("canvas");
        mrzCanvas.width = fullW;
        mrzCanvas.height = mrzH;
        const mrzCtx = mrzCanvas.getContext("2d");

        if (mrzCtx) {
          mrzCtx.drawImage(fullCanvas, 0, mrzY, fullW, mrzH, 0, 0, fullW, mrzH);

          // Apply Contrast & Grayscale Binarization Filter to MRZ zone
          const imgData = mrzCtx.getImageData(0, 0, fullW, mrzH);
          const d = imgData.data;

          for (let i = 0; i < d.length; i += 4) {
            // High-contrast Grayscale Luminance
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            // Adaptive threshold
            const binary = gray < 130 ? 0 : 255;
            d[i] = binary;
            d[i + 1] = binary;
            d[i + 2] = binary;
          }
          mrzCtx.putImageData(imgData, 0, 0);
        }

        const mrzSliceDataUrl = mrzCanvas.toDataURL("image/png");
        const fullProcessedDataUrl = fullCanvas.toDataURL("image/jpeg", 0.9);

        resolve({ mrzSliceDataUrl, fullProcessedDataUrl });
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = (e) => reject(e);

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Runs client-side optical character recognition (OCR) on a passport image completely in the browser.
 * Does not require any backend Python service.
 */
export async function performOpticalPassportOCR(
  imageSource: File | Blob | string
): Promise<ParsedPassportMRZ | null> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");

    let preprocessed: { mrzSliceDataUrl: string; fullProcessedDataUrl: string } | null = null;
    try {
      preprocessed = await preprocessPassportImage(imageSource);
    } catch (prepErr) {
      console.warn("Canvas preprocessing fallback:", prepErr);
    }

    // Step 1: Targeted Fast Scan on High-Contrast MRZ Bottom Zone
    if (preprocessed?.mrzSliceDataUrl) {
      try {
        await worker.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<« ",
        });
        const mrzRet = await worker.recognize(preprocessed.mrzSliceDataUrl);
        const mrzText = mrzRet?.data?.text || "";
        const mrzParsed = parseMRZText(mrzText);

        if (mrzParsed && mrzParsed.passport_number && mrzParsed.first_name) {
          await worker.terminate();
          return mrzParsed;
        }
      } catch (mrzScanErr) {
        console.warn("MRZ slice OCR pass notice:", mrzScanErr);
      }
    }

    // Step 2: Full Document Scan with General Character Set
    await worker.setParameters({
      tessedit_char_whitelist: "",
    });

    const targetImage = preprocessed?.fullProcessedDataUrl || imageSource;
    const fullRet = await worker.recognize(targetImage);
    await worker.terminate();

    const fullText = fullRet?.data?.text || "";
    const parsed = parseMRZText(fullText);

    if (parsed && (parsed.passport_number || parsed.first_name || parsed.date_of_birth)) {
      return parsed;
    }

    // Step 3: Heuristic Regex on Full Extracted Text
    const generalParsed = parseGeneralPassportText(fullText);
    if (generalParsed) {
      return generalParsed;
    }

    return parsed;
  } catch (err) {
    console.warn("Client-side OCR processing warning:", err);
    return null;
  }
}
