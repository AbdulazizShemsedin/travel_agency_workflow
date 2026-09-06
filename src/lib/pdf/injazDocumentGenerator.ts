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

  const visaNo = data.visaNumber || "1908334046";
  const injazNo = data.injazNumber || `E${passportNo.replace(/\D/g, "") || "4982104"}`;
  const paymentNo = data.paymentNo || "99281401";
  const appDate = formatDateDDMMYYYY(data.appointmentDate || new Date().toISOString().split("T")[0]);
  const agencyName = "ANWAR SULTAN FOREIGN EMPLOYMENT AGENT (3226)";

  const textColor = rgb(0.05, 0.05, 0.05);

  // 0. Applicant Photograph (Top Left Official Placement)
  // Placement: x:36, y:618, w:75, h:96 (standard 3:4 aspect ratio)
  // Strictly sits below Injaz reference text (y:726) and left of barcode (x:115), never overlapping either.
  if (data.photoUrl) {
    try {
      const rawBytes = await fetchImageBytes(data.photoUrl);
      if (rawBytes && rawBytes.length > 0) {
        const photoImage = await embedPhotoSafely(pdfDoc, rawBytes);
        if (photoImage) {
          const photoW = 75;
          const photoH = 96;
          const photoX = 36;
          const photoY = 618;

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
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
          });
        }
      }
    } catch (photoErr) {
      console.warn("Could not embed applicant photo in Injaz PDF:", photoErr);
    }
  }

  // 1. Barcodes — draw actual Code-128 barcode images at exact template positions
  // Template white-box positions (from page content stream analysis):
  //   Left barcode box:  re [115.07, 736.01, 58.97, 16.14]  → payment number barcode
  //   Right barcode box: re [426.78, 736.01, 60.80, 16.14]  → date barcode
  //   Below-left box:    re [74.67, 724.49, 91.98, 14.75]   → injaz/e-number text
  try {
    // Left barcode: encode the payment number (matches original template top-left)
    const leftBarcodeBytes = await generateBarcodeImageBytes(paymentNo, 59, 16);
    if (leftBarcodeBytes) {
      const leftBarcodeImg = await pdfDoc.embedPng(leftBarcodeBytes);
      page.drawImage(leftBarcodeImg, { x: 115, y: 736, width: 59, height: 16 });
    }

    // Right barcode: encode the appointment date (matches original template top-right)
    const rightBarcodeBytes = await generateBarcodeImageBytes(appDate, 61, 16);
    if (rightBarcodeBytes) {
      const rightBarcodeImg = await pdfDoc.embedPng(rightBarcodeBytes);
      page.drawImage(rightBarcodeImg, { x: 426, y: 736, width: 61, height: 16 });
    }
  } catch (bcErr) {
    console.warn("Could not embed barcodes in Injaz PDF:", bcErr);
  }

  // 2. Payment No text (in left barcode area, top-left)
  page.drawText(paymentNo, { x: 118, y: 739, size: 8.5, font: fontBold, color: textColor });

  // 3. Injaz / E-Number text (below-left barcode area)
  page.drawText(injazNo, { x: 75, y: 726, size: 9, font: fontBold, color: textColor });

  // 4. Application / Appointment Date (top right header)
  page.drawText(appDate, { x: 429, y: 739, size: 8.5, font: fontBold, color: textColor });

  // 5. Agency / Dealer Name
  page.drawText(agencyName, { x: 352, y: 659, size: 8, font: fontBold, color: textColor });

  // 5. Full Name (Applicant Name Header & Line 14)
  page.drawText(fullName, { x: 407, y: 635, size: 9, font: fontBold, color: textColor });
  page.drawText(fullName, { x: 125, y: 584, size: 8.5, font: fontBold, color: textColor });

  // 7. Place of Birth
  page.drawText(placeOfBirth, { x: 125, y: 568, size: 8.5, font: fontRegular, color: textColor });

  // 8. Date of Birth
  page.drawText(dob, { x: 399, y: 568, size: 8.5, font: fontRegular, color: textColor });

  // 9. Current Nationality
  page.drawText(nationality, { x: 125, y: 551, size: 8.5, font: fontRegular, color: textColor });

  // 10. Previous Nationality
  page.drawText(prevNationality, { x: 399, y: 551, size: 8.5, font: fontRegular, color: textColor });

  // 11. Sex / Gender
  page.drawText(gender, { x: 125, y: 535, size: 8.5, font: fontRegular, color: textColor });

  // 12. Marital Status
  page.drawText(maritalStatus, { x: 399, y: 535, size: 8.5, font: fontRegular, color: textColor });

  // 13. Religion
  page.drawText(religion, { x: 399, y: 518, size: 8.5, font: fontRegular, color: textColor });

  // 14. Profession / Target Job
  page.drawText(profession, { x: 125, y: 502, size: 8.5, font: fontBold, color: textColor });

  // 15. Qualification / Education
  page.drawText(qualification, { x: 399, y: 502, size: 8.5, font: fontRegular, color: textColor });

  // 16. Home Address & Phone in Ethiopia
  page.drawText(homeAddress, { x: 55, y: 439, size: 7.8, font: fontRegular, color: textColor });

  // 17. Purpose of Travel
  page.drawText(purpose, { x: 126, y: 419, size: 8.5, font: fontBold, color: textColor });

  // 18. Passport Number
  page.drawText(passportNo, { x: 85, y: 399, size: 8.5, font: fontBold, color: textColor });

  // 19. Place of Issue
  page.drawText(placeOfIssue, { x: 288, y: 399, size: 8.5, font: fontRegular, color: textColor });

  // 20. Date of Issue
  page.drawText(issueDate, { x: 463, y: 399, size: 8.5, font: fontRegular, color: textColor });

  // 21. Date of Expiry
  page.drawText(expiryDate, { x: 110, y: 382, size: 8.5, font: fontRegular, color: textColor });

  // Visa Number & Sponsor ID Context
  page.drawText(`VISA: ${visaNo}`, { x: 463, y: 382, size: 8, font: fontBold, color: textColor });

  // 22. Sponsor Name (Kafeel)
  page.drawText(sponsorName, { x: 312, y: 171, size: 7.8, font: fontBold, color: textColor });

  // 23. Sponsor Address / City
  page.drawText(`${sponsorCity}, SAUDI ARABIA`, { x: 48, y: 171, size: 7.8, font: fontRegular, color: textColor });

  // 24. Sponsor Phone
  page.drawText(sponsorPhone, { x: 46, y: 121, size: 8, font: fontRegular, color: textColor });

  // 25. Sponsor ID
  page.drawText(`ID: ${sponsorId}`, { x: 312, y: 153, size: 7.8, font: fontBold, color: textColor });

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
