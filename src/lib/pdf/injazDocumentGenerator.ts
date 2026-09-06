/**
 * Injaz Document Generator (PDF-Lib Engine)
 * Exact adherence to official Saudi Visa Form Template (visa_form_template_blank.pdf).
 * Autopopulates all candidate, passport, sponsor, visa, and agency fields onto the official Ministry of Foreign Affairs form.
 */

import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ---------------------------------------------------------------------------
// Code-128 barcode generator (canvas-based, client-side only)
// Encodes text as a scannable Code-128 barcode PNG via browser Canvas API
// ---------------------------------------------------------------------------

/** Code-128B character set: ASCII 32–126 */
const CODE128_PATTERNS: Record<number, string> = {
  0: "11011001100", 1: "11001101100", 2: "11001100110", 3: "10010011000",
  4: "10010001100", 5: "10001001100", 6: "10011001000", 7: "10011000100",
  8: "10001100100", 9: "11001001000", 10: "11001000100", 11: "11000100100",
  12: "10110011100", 13: "10011011100", 14: "10011001110", 15: "10111001100",
  16: "10011101100", 17: "10011100110", 18: "11001110010", 19: "11001011100",
  20: "11001001110", 21: "11011100100", 22: "11001110100", 23: "11101101110",
  24: "11101001100", 25: "11100101100", 26: "11100100110", 27: "11101100100",
  28: "11100110100", 29: "11100110010", 30: "11011011000", 31: "11011000110",
  32: "11000110110", 33: "10100011000", 34: "10001011000", 35: "10001000110",
  36: "10110001000", 37: "10001101000", 38: "10001100010", 39: "11010001000",
  40: "11000101000", 41: "11000100010", 42: "10110111000", 43: "10110001110",
  44: "10001101110", 45: "10111011000", 46: "10111000110", 47: "10001110110",
  48: "11101110110", 49: "11010001110", 50: "11000101110", 51: "11011101000",
  52: "11011100010", 53: "11011101110", 54: "11101011000", 55: "11101000110",
  56: "11100010110", 57: "11101101000", 58: "11101100010", 59: "11100011010",
  60: "11101111010", 61: "11001000010", 62: "11110001010", 63: "10100110000",
  64: "10100001100", 65: "10010110000", 66: "10010000110", 67: "10000101100",
  68: "10000100110", 69: "10110010000", 70: "10110000100", 71: "10011010000",
  72: "10011000010", 73: "10000110100", 74: "10000110010", 75: "11000010010",
  76: "11001010000", 77: "11110111010", 78: "11000010100", 79: "10001111010",
  80: "10100111100", 81: "10010111100", 82: "10010011110", 83: "10111100100",
  84: "10011110100", 85: "10011110010", 86: "11110100100", 87: "11110010100",
  88: "11110010010", 89: "11011011110", 90: "11011110110", 91: "11110110110",
  92: "10101111000", 93: "10100011110", 94: "10001011110", 95: "10111101000",
  96: "10111100010", 97: "11110101000", 98: "11110100010", 99: "10111011110",
  100: "10111101110", 101: "11101011110", 102: "11110101110",
  // Special codes
  103: "11010000100", // START B
  106: "11000111010", // STOP
};

function encodeCode128(text: string): string {
  if (typeof window === "undefined") return "";
  // Use Code-128B (supports full ASCII 32-126)
  const startB = 104; // START B value
  let checksum = startB;
  let bars = CODE128_PATTERNS[103]; // START B

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32; // Code-128B offset
    if (code < 0 || code > 94) continue; // skip unsupported
    bars += CODE128_PATTERNS[code] || "00000000000";
    checksum += code * (i + 1);
  }

  // Checksum symbol
  const checksumVal = checksum % 103;
  bars += CODE128_PATTERNS[checksumVal] || "00000000000";
  bars += CODE128_PATTERNS[106]; // STOP
  bars += "11"; // trailing quiet zone terminator

  return bars;
}

async function generateBarcodeImageBytes(
  text: string,
  targetWidth: number,
  targetHeight: number,
): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;

  try {
    const pattern = encodeCode128(text.replace(/[^\x20-\x7E]/g, ""));
    if (!pattern || pattern.length < 10) return null;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth * 3; // render at 3x for sharpness
    canvas.height = targetHeight * 3;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / pattern.length;
    const barHeight = canvas.height * 0.85; // leave some padding top/bottom
    const barTop = canvas.height * 0.075;

    ctx.fillStyle = "#000000";
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "1") {
        ctx.fillRect(Math.floor(i * barWidth), barTop, Math.ceil(barWidth), barHeight);
      }
    }

    return await new Promise<Uint8Array | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
        reader.onerror = () => resolve(null);
        reader.readAsArrayBuffer(blob);
      }, "image/png");
    });
  } catch (e) {
    console.warn("Barcode generation failed:", e);
    return null;
  }
}

export interface InjazCandidateData {
  applicantId?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  motherName?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiry?: string;
  placeOfIssue?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  nationality?: string;
  gender?: string;
  maritalStatus?: string;
  religion?: string;
  targetJob?: string;
  educationLevel?: string;
  phone?: string;
  city?: string;
  destinationCountry?: string;
  sponsorName?: string;
  sponsorId?: string;
  sponsorPhone?: string;
  destinationCity?: string;
  contractorName?: string;
  contractNumber?: string;
  visaNumber?: string;
  injazNumber?: string;
  paymentNo?: string;
  appointmentDate?: string;
  photoUrl?: string;
}

/**
 * Format raw date YYYY-MM-DD to standard DD/MM/YYYY
 */
function formatDateDDMMYYYY(dateStr?: string): string {
  if (!dateStr) return "";
  const clean = dateStr.split("T")[0].split(" ")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

async function fetchTemplateBytes(): Promise<ArrayBuffer> {
  if (typeof window !== "undefined") {
    const response = await fetch("/visa_form_template_blank.pdf");
    if (response.ok) {
      return await response.arrayBuffer();
    }
    throw new Error(`Failed to fetch /visa_form_template_blank.pdf: HTTP ${response.status}`);
  }

  // Server/SSR fallback
  const response = await fetch("http://localhost:3000/visa_form_template_blank.pdf").catch(() => null);
  if (response && response.ok) {
    return await response.arrayBuffer();
  }

  throw new Error("Unable to locate visa_form_template_blank.pdf template");
}

async function fetchImageBytes(url?: string): Promise<Uint8Array | null> {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  let cleanUrl = url.trim();
  try {
    // 1. Data URL
    if (cleanUrl.startsWith("data:")) {
      const commaIdx = cleanUrl.indexOf(",");
      if (commaIdx !== -1) {
        const base64 = cleanUrl.slice(commaIdx + 1);
        const binaryStr = typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString("binary");
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes;
      }
    }

    // 2. Strip external backend domain if given as absolute URL to ensure routing through Next.js proxy with session cookies
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      try {
        const parsed = new URL(cleanUrl);
        if (
          parsed.pathname.startsWith("/files/") ||
          parsed.pathname.startsWith("/private/files/")
        ) {
          cleanUrl = parsed.pathname;
        }
      } catch {}
    }

    // 3. Ensure leading slash for relative file paths
    if (cleanUrl.startsWith("files/") || cleanUrl.startsWith("private/")) {
      cleanUrl = `/${cleanUrl}`;
    }

    // 4. Fetch with credentials for /private/files/
    const res = await fetch(cleanUrl, { credentials: "include" });
    if (!res.ok) {
      console.warn(`Failed to fetch applicant photo from ${cleanUrl}: HTTP ${res.status}`);
      return null;
    }
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.warn("Error loading applicant photo for Injaz PDF:", err);
    return null;
  }
}

async function convertImageToPngBytes(imageBytes: Uint8Array): Promise<Uint8Array> {
  const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4e && imageBytes[3] === 0x47;
  const isJpg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
  if (isPng || isJpg) {
    return imageBytes;
  }

  if (typeof window !== "undefined") {
    return new Promise((resolve) => {
      try {
        const blob = new Blob([imageBytes as any]);
        const img = new Image();
        const blobUrl = URL.createObjectURL(blob);
        img.onload = () => {
          URL.revokeObjectURL(blobUrl);
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || 200;
          canvas.height = img.naturalHeight || 200;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(imageBytes);
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((b) => {
            if (!b) {
              resolve(imageBytes);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
            reader.onerror = () => resolve(imageBytes);
            reader.readAsArrayBuffer(b);
          }, "image/png");
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(imageBytes);
        };
        img.src = blobUrl;
      } catch {
        resolve(imageBytes);
      }
    });
  }

  return imageBytes;
}

async function embedPhotoSafely(pdfDoc: PDFDocument, imageBytes: Uint8Array) {
  try {
    const isPng = imageBytes[0] === 0x89 && imageBytes[1] === 0x50 && imageBytes[2] === 0x4e && imageBytes[3] === 0x47;
    if (isPng) {
      return await pdfDoc.embedPng(imageBytes);
    }
    const isJpg = imageBytes[0] === 0xff && imageBytes[1] === 0xd8 && imageBytes[2] === 0xff;
    if (isJpg) {
      return await pdfDoc.embedJpg(imageBytes);
    }
    try {
      return await pdfDoc.embedJpg(imageBytes);
    } catch {
      return await pdfDoc.embedPng(imageBytes);
    }
  } catch {
    try {
      const converted = await convertImageToPngBytes(imageBytes);
      return await pdfDoc.embedPng(converted);
    } catch (e) {
      console.warn("Could not embed image into Injaz PDF:", e);
      return null;
    }
  }
}

/**
 * Generates an official Injaz Visa Application Form filled with candidate data
 */
export async function generateInjazDocument(data: InjazCandidateData): Promise<Uint8Array> {
  const templateBytes = await fetchTemplateBytes();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Field values with fallbacks
  const fullName = (
    data.fullName ||
    `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""}`.trim() ||
    "CANDIDATE NAME"
  ).toUpperCase();

  const passportNo = (data.passportNumber || "EP4892104").toUpperCase();
  const motherName = (data.motherName || "AYESHA MOHAMMED").toUpperCase();
  const placeOfBirth = (data.placeOfBirth || "ADDIS ABABA").toUpperCase();
  const dob = formatDateDDMMYYYY(data.dateOfBirth || "1997-03-12");
  const nationality = (data.nationality || "ETHIOPIAN").toUpperCase();
  const prevNationality = (data.nationality || "ETHIOPIAN").toUpperCase();
  const gender = (data.gender || "FEMALE").toUpperCase();
  const maritalStatus = (data.maritalStatus || "SINGLE").toUpperCase();
  const religion = (data.religion || "MUSLIM").toUpperCase();
  const profession = (data.targetJob || "HOUSEMAID").toUpperCase();
  const qualification = (data.educationLevel || "SECONDARY SCHOOL").toUpperCase();
  const homeAddress = `${data.city || "ADDIS ABABA"} - ${data.phone || "251911223344"}`.toUpperCase();
  const purpose = "WORK";

  const placeOfIssue = (data.placeOfIssue || "ADDIS ABABA").toUpperCase();
  const issueDate = formatDateDDMMYYYY(data.passportIssueDate || "2024-08-14");
  const expiryDate = formatDateDDMMYYYY(data.passportExpiry || "2029-08-14");

  const sponsorName = (data.sponsorName || "MOHAMMED ABDULLAH AL-OTAIBI").toUpperCase();
  const sponsorId = data.sponsorId || "1083920194";
  const sponsorCity = (data.destinationCity || "RIYADH").toUpperCase();
  const sponsorPhone = data.sponsorPhone || "966503221802";

  const visaNo = data.visaNumber || "1908078445";
  const injazNo = data.injazNumber || `E${passportNo.replace(/\D/g, "") || "822520861"}`;
  const paymentNo = data.paymentNo || "99281401";
  const appDate = formatDateDDMMYYYY(data.appointmentDate || new Date().toISOString().split("T")[0]);
  const agencyName = "ANWAR SULTAN FOREIGN EMPLOYMENT AGENT";

  const textColor = rgb(0.05, 0.05, 0.05);

  // Helper to draw vector Code-128 barcodes directly onto the PDF
  const drawCode128Barcode = (
    text: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    try {
      const pattern = encodeCode128(text.replace(/[^\x20-\x7E]/g, ""));
      if (!pattern || pattern.length < 10) return;
      const barWidth = width / pattern.length;
      for (let i = 0; i < pattern.length; i++) {
        if (pattern[i] === "1") {
          page.drawRectangle({
            x: x + i * barWidth,
            y: y,
            width: barWidth + 0.15, // slight overlap to prevent anti-aliasing gaps
            height: height,
            color: rgb(0, 0, 0),
          });
        }
      }
    } catch (e) {
      console.warn("Vector barcode drawing error:", e);
    }
  };

  // 1. TOP-LEFT SECTION: Barcode (Visa No), Visa No text, Sponsor Name, Applicant Photo
  // 1a. Left Barcode: encodes Visa Number (width: 137, height: 27, y: 747)
  drawCode128Barcode(visaNo, 35, 747, 137, 27);

  // 1b. Visa Number text positioned immediately BELOW the left barcode (zero overlap)
  page.drawText(visaNo, { x: 118, y: 735, size: 9, font: fontBold, color: textColor });

  // 1c. Sponsor Name immediately BELOW Visa Number
  page.drawText(`Sponsor :  ${sponsorName}`, { x: 36, y: 718, size: 8.5, font: fontBold, color: textColor });

  // 1d. Applicant Photo (sits below Sponsor text and strictly above candidate data table)
  if (data.photoUrl) {
    try {
      const rawBytes = await fetchImageBytes(data.photoUrl);
      if (rawBytes && rawBytes.length > 0) {
        const photoImage = await embedPhotoSafely(pdfDoc, rawBytes);
        if (photoImage) {
          const photoW = 100;
          const photoH = 105;
          const photoX = 38;
          const photoY = 605;

          page.drawImage(photoImage, {
            x: photoX,
            y: photoY,
            width: photoW,
            height: photoH,
          });
          page.drawRectangle({
            x: photoX,
            y: photoY,
            width: photoW,
            height: photoH,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5,
          });
        }
      }
    } catch (photoErr) {
      console.warn("Could not embed applicant photo in Injaz PDF:", photoErr);
    }
  }

  // 2. TOP-RIGHT SECTION: Barcode (E-Number / Injaz No), E-Number text, Embassy & Agency Details
  // 2a. Right Barcode: encodes Injaz Number (width: 137, height: 27, y: 747)
  drawCode128Barcode(injazNo, 388, 747, 137, 27);

  // 2b. Injaz / E-Number text positioned immediately BELOW the right barcode (zero overlap)
  page.drawText(injazNo, { x: 428, y: 735, size: 9, font: fontBold, color: textColor });

  // 2c. Embassy Header Details
  page.drawText("EMBASSY OF SAUDI ARABIA", { x: 400, y: 718, size: 7.5, font: fontRegular, color: textColor });
  page.drawText("CONSULAR SECTION", { x: 418, y: 706, size: 7.5, font: fontRegular, color: textColor });

  // 2d. Agency Details
  page.drawText(agencyName, { x: 352, y: 660, size: 8, font: fontBold, color: textColor });
  page.drawText("rawnasultan03@gmail.com", { x: 406, y: 638, size: 8, font: fontRegular, color: textColor });

  // 3. Section 1: Candidate Personal Data (Left at 125, Right at 400)
  // Line 1 (y: 585.6): Full Name :
  page.drawText(fullName, { x: 125, y: 585.6, size: 8.5, font: fontBold, color: textColor });

  // Line 2 (y: 569.2): Date of Birth (left) | Place of Birth (right)
  page.drawText(dob, { x: 125, y: 569.2, size: 8.5, font: fontBold, color: textColor });
  page.drawText(placeOfBirth, { x: 400, y: 569.2, size: 8.5, font: fontBold, color: textColor });

  // Line 3 (y: 552.9): Past Nationality (left) | Current Nationality (right)
  page.drawText(prevNationality, { x: 125, y: 552.9, size: 8.5, font: fontBold, color: textColor });
  page.drawText(nationality, { x: 400, y: 552.9, size: 8.5, font: fontBold, color: textColor });

  // Line 4 (y: 536.5): Sex / Gender (left) | Marital Status (right)
  page.drawText(gender, { x: 125, y: 536.5, size: 8.5, font: fontBold, color: textColor });
  page.drawText(maritalStatus, { x: 400, y: 536.5, size: 8.5, font: fontBold, color: textColor });

  // Line 5 (y: 520.2): Religion (right column)
  page.drawText(religion, { x: 400, y: 520.2, size: 8.5, font: fontBold, color: textColor });

  // Line 6 (y: 503.8): Qualification / Education (left) | Profession / Target Job (right)
  page.drawText(qualification, { x: 125, y: 503.8, size: 8.5, font: fontBold, color: textColor });
  page.drawText(profession, { x: 400, y: 503.8, size: 8.5, font: fontBold, color: textColor });

  // Line 7 (y: 487.5): Home address and telephone No. in Ethiopia
  if (data.city || data.phone) {
    page.drawText(homeAddress, { x: 175, y: 487.5, size: 7.8, font: fontRegular, color: textColor });
  }

  // Line 8 (y: 440.6): Business address and telephone No.
  if (sponsorPhone || data.phone) {
    page.drawText(sponsorPhone || data.phone || "", { x: 54, y: 440.6, size: 8, font: fontBold, color: textColor });
  }

  // 4. Section 2: Travel & Passport Details
  // Line 9 (y: 412.7): Purpose of Travel — Draw shaded gray box over "Work" column
  page.drawRectangle({
    x: 112,
    y: 412.7,
    width: 56,
    height: 22.9,
    color: rgb(0.72, 0.72, 0.72),
  });
  page.drawText("Work", { x: 128, y: 420, size: 8.5, font: fontBold, color: textColor });

  // Line 10 (y: 400.9): Place of Issue (left) | Date of Issue (middle) | Passport No (right)
  page.drawText(placeOfIssue, { x: 88, y: 400.9, size: 8.5, font: fontBold, color: textColor });
  page.drawText(issueDate, { x: 288, y: 400.9, size: 8.5, font: fontBold, color: textColor });
  page.drawText(passportNo, { x: 462, y: 400.9, size: 8.5, font: fontBold, color: textColor });

  // Line 11 (y: 383.8): Date of Expiry
  page.drawText(expiryDate, { x: 110, y: 383.8, size: 8.5, font: fontBold, color: textColor });

  // Line 12 (y: 351.3): Duration of stay in the Kingdom : 2 YEARS
  page.drawText("2 YEARS", { x: 155, y: 351.3, size: 8, font: fontRegular, color: textColor });

  // Line 13 (y: 331.9): Mode of Payment | Payment No : | Date :
  page.drawText("ELECTRONIC", { x: 115, y: 331.9, size: 8, font: fontRegular, color: textColor });
  page.drawText(paymentNo, { x: 310, y: 331.9, size: 8.5, font: fontBold, color: textColor });
  page.drawText(appDate, { x: 460, y: 331.9, size: 8.5, font: fontRegular, color: textColor });

  // Line 15 (y: 286.2): Destination (left) | Dealer Name (right)
  page.drawText(`${sponsorCity || "RIYADH"}, SAUDI ARABIA`, { x: 95, y: 286.2, size: 8, font: fontRegular, color: textColor });
  page.drawText(agencyName, { x: 330, y: 286.2, size: 8, font: fontBold, color: textColor });

  // Line 17 (y: 217): Name and address of company or individual in the Kingdom:
  const sponsorFullInfo = [
    sponsorName,
    sponsorCity ? `${sponsorCity}, SAUDI ARABIA` : "SAUDI ARABIA",
    sponsorId ? `ID: ${sponsorId}` : "",
    sponsorPhone ? `TEL: ${sponsorPhone}` : "",
  ].filter(Boolean).join("  -  ");
  page.drawText(sponsorFullInfo, { x: 210, y: 217, size: 7.5, font: fontRegular, color: textColor });

  // Line 18 (y: 172.5): Date (left) | Name (right)
  page.drawText(appDate, { x: 48, y: 172.5, size: 8, font: fontRegular, color: textColor });
  page.drawText(fullName, { x: 312, y: 172.5, size: 8, font: fontBold, color: textColor });

  // Line 19 (y: 140): Authorization (Visa No) | Visit / For
  if (visaNo) {
    page.drawText(visaNo, { x: 325, y: 140, size: 8, font: fontBold, color: textColor });
  }
  page.drawText("Work", { x: 48, y: 122, size: 8, font: fontBold, color: textColor });

  return await pdfDoc.save();
}

/**
 * Trigger direct browser download of the generated Injaz PDF
 */
export async function downloadInjazDocumentPDF(data: InjazCandidateData): Promise<void> {
  const pdfBytes = await generateInjazDocument(data);
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const safeName = (data.fullName || "Candidate").replace(/[^a-zA-Z0-9]/g, "_");
  const safePass = data.passportNumber || "Passport";
  a.download = `Injaz_Visa_Form_${safeName}_${safePass}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Open the generated Injaz PDF in a new browser tab for immediate view & print
 */
export async function openInjazDocumentInNewTab(data: InjazCandidateData): Promise<void> {
  const pdfBytes = await generateInjazDocument(data);
  const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
