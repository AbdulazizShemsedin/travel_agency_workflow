import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { Applicant } from "@/types/applicant";

/**
 * Generates an official, publication-quality Bilateral Candidate CV in PDF binary format.
 */
export async function generateApplicantCvPdf(applicant: Record<string, any>): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 (points)
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Palette
  const primaryDark = rgb(0.06, 0.28, 0.22); // Deep emerald
  const goldAccent = rgb(0.78, 0.60, 0.20); // Agency gold
  const textDark = rgb(0.1, 0.12, 0.15);
  const textMuted = rgb(0.4, 0.45, 0.5);
  const borderGray = rgb(0.82, 0.85, 0.88);
  const fillLight = rgb(0.96, 0.98, 0.97);

  // 1. TOP HEADER BANNER
  page.drawRectangle({
    x: 20,
    y: height - 85,
    width: width - 40,
    height: 65,
    color: primaryDark,
  });

  // Agency Title (Left & Center)
  page.drawText("ANWAR SULTAN KEMAL", {
    x: 35,
    y: height - 45,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("ETHIOPIAN FOREIGN EMPLOYMENT RECRUITMENT AGENCY", {
    x: 35,
    y: height - 60,
    size: 8,
    font: fontBold,
    color: goldAccent,
  });

  page.drawText("SAUDI ARABIA BILATERAL MANPOWER DEPLOYMENT", {
    x: 35,
    y: height - 72,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.9, 0.95, 0.92),
  });

  // Right Header Label
  page.drawText("OFFICIAL BIODATA", {
    x: width - 170,
    y: height - 45,
    size: 13,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(applicant.ref_no || applicant.reference_number ? `REF: ${applicant.ref_no || applicant.reference_number}` : "", {
    x: width - 170,
    y: height - 60,
    size: 9,
    font: fontBold,
    color: goldAccent,
  });

  page.drawText(`DATE: ${new Date().toISOString().split("T")[0]}`, {
    x: width - 170,
    y: height - 72,
    size: 7.5,
    font: fontRegular,
    color: rgb(0.9, 0.95, 0.92),
  });

  let cursorY = height - 105;

  // 2. CANDIDATE PROFILE HIGHLIGHT BOX
  page.drawRectangle({
    x: 20,
    y: cursorY - 35,
    width: width - 40,
    height: 35,
    color: fillLight,
    borderColor: borderGray,
    borderWidth: 1,
  });

  const rawName = (applicant.full_name || `${applicant.first_name || ""} ${applicant.middle_name || ""} ${applicant.last_name || ""}`).trim();
  const candName = (rawName || applicant.name || "CANDIDATE").replace(/[^\x00-\x7F]/g, "").toUpperCase();
  
  page.drawText("FULL NAME:", { x: 30, y: cursorY - 18, size: 8, font: fontBold, color: textMuted });
  page.drawText(candName || "CANDIDATE", { x: 90, y: cursorY - 18, size: 10, font: fontBold, color: primaryDark });

  page.drawText("ROLE APPLIED:", { x: 340, y: cursorY - 18, size: 8, font: fontBold, color: textMuted });
  page.drawText((applicant.job_applied || applicant.target_job || "HOUSE MAID").replace(/[^\x00-\x7F]/g, "").toUpperCase(), { x: 420, y: cursorY - 18, size: 10, font: fontBold, color: textDark });

  cursorY -= 50;

  // Helper clean string
  const clean = (str?: string | number | null) => (str ? String(str).replace(/[^\x00-\x7F]/g, "") : "-");

  // 3. PASSPORT & IDENTIFICATION DETAILS SECTION
  page.drawRectangle({
    x: 20,
    y: cursorY - 18,
    width: width - 40,
    height: 18,
    color: primaryDark,
  });
  page.drawText("1. PASSPORT & IDENTIFICATION DETAILS", {
    x: 30,
    y: cursorY - 13,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY -= 20;

  const idRows = [
    [
      { label: "Passport Number", val: clean(applicant.passport_number) },
      { label: "Place of Issue", val: clean(applicant.place_of_issue) },
      { label: "Nationality", val: clean(applicant.nationality || "Ethiopia") },
    ],
    [
      { label: "Date of Issue", val: clean(applicant.passport_issue_date) },
      { label: "Passport Expiry", val: clean(applicant.passport_expiry) },
      { label: "National ID", val: clean(applicant.national_id) },
    ],
    [
      { label: "Date of Birth", val: clean(applicant.date_of_birth) },
      { label: "Age", val: applicant.age ? `${applicant.age} Years` : "-" },
      { label: "Ministry Labour ID", val: clean(applicant.labour_id) },
    ],
  ];

  for (const row of idRows) {
    page.drawRectangle({
      x: 20,
      y: cursorY - 22,
      width: width - 40,
      height: 22,
      color: rgb(1, 1, 1),
      borderColor: borderGray,
      borderWidth: 0.8,
    });

    let colX = 30;
    for (const cell of row) {
      page.drawText(`${cell.label}:`, { x: colX, y: cursorY - 14, size: 7.5, font: fontRegular, color: textMuted });
      page.drawText(String(cell.val), { x: colX + 85, y: cursorY - 14, size: 8.5, font: fontBold, color: textDark });
      colX += 180;
    }
    cursorY -= 22;
  }

  cursorY -= 12;

  // 4. PERSONAL & SOCIAL DETAILS SECTION
  page.drawRectangle({
    x: 20,
    y: cursorY - 18,
    width: width - 40,
    height: 18,
    color: primaryDark,
  });
  page.drawText("2. PERSONAL & DEMOGRAPHIC PARTICULARS", {
    x: 30,
    y: cursorY - 13,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY -= 20;

  const personalRows = [
    [
      { label: "Gender", val: clean(applicant.gender) },
      { label: "Religion", val: clean(applicant.religion) },
      { label: "Marital Status", val: clean(applicant.marital_status) },
    ],
    [
      { label: "Children Count", val: applicant.children !== undefined && applicant.children !== null ? String(applicant.children) : "-" },
      { label: "Primary Phone", val: clean(applicant.phone_number || applicant.phone) },
      { label: "City / Country", val: clean(applicant.city ? `${applicant.city}, Ethiopia` : applicant.leaving_town) },
    ],
    [
      { label: "Emergency Contact", val: clean(applicant.contact_person_name || applicant.emergency_contact_name) },
      { label: "Emergency Phone", val: clean(applicant.contact_person_phone || applicant.emergency_contact_phone) },
      { label: "Target Country", val: clean(applicant.destination_country) },
    ],
  ];

  for (const row of personalRows) {
    page.drawRectangle({
      x: 20,
      y: cursorY - 22,
      width: width - 40,
      height: 22,
      color: rgb(1, 1, 1),
      borderColor: borderGray,
      borderWidth: 0.8,
    });

    let colX = 30;
    for (const cell of row) {
      page.drawText(`${cell.label}:`, { x: colX, y: cursorY - 14, size: 7.5, font: fontRegular, color: textMuted });
      page.drawText(String(cell.val), { x: colX + 85, y: cursorY - 14, size: 8.5, font: fontBold, color: textDark });
      colX += 180;
    }
    cursorY -= 22;
  }

  cursorY -= 12;

  // 5. QUALIFICATIONS & SKILLS MATRIX
  page.drawRectangle({
    x: 20,
    y: cursorY - 18,
    width: width - 40,
    height: 18,
    color: primaryDark,
  });
  page.drawText("3. SKILLS MATRIX & LANGUAGE PROFICIENCY", {
    x: 30,
    y: cursorY - 13,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY -= 20;

  const evalSkill = (val: any) => {
    if (val === 1 || val === "1" || val === true || val === "true" || val === "YES") return "YES";
    if (val === 0 || val === "0" || val === false || val === "false" || val === "NO") return "NO";
    return "-";
  };

  const skills = [
    { name: "Cleaning & Housekeeping", rating: evalSkill(applicant.skill_cleaning) },
    { name: "Cooking & Kitchen Work", rating: evalSkill(applicant.skill_cooking) },
    { name: "Arabic Cooking", rating: evalSkill(applicant.skill_arabic_cooking) },
    { name: "Baby Sitting & Child Care", rating: evalSkill(applicant.skill_baby_sitting) },
    { name: "Washing & Laundry", rating: evalSkill(applicant.skill_washing) },
    { name: "Ironing & Garment Care", rating: evalSkill(applicant.skill_ironing) },
  ];

  for (let i = 0; i < skills.length; i += 2) {
    const s1 = skills[i];
    const s2 = skills[i + 1];

    page.drawRectangle({
      x: 20,
      y: cursorY - 22,
      width: width - 40,
      height: 22,
      color: rgb(1, 1, 1),
      borderColor: borderGray,
      borderWidth: 0.8,
    });

    page.drawText(s1.name, { x: 30, y: cursorY - 14, size: 8, font: fontRegular, color: textDark });
    page.drawText(`[ ${s1.rating} ]`, { x: 180, y: cursorY - 14, size: 8, font: fontBold, color: primaryDark });

    if (s2) {
      page.drawText(s2.name, { x: 310, y: cursorY - 14, size: 8, font: fontRegular, color: textDark });
      page.drawText(`[ ${s2.rating} ]`, { x: 460, y: cursorY - 14, size: 8, font: fontBold, color: primaryDark });
    }

    cursorY -= 22;
  }

  cursorY -= 12;

  // 6. MEDICAL & COMPLIANCE VERIFICATION
  page.drawRectangle({
    x: 20,
    y: cursorY - 18,
    width: width - 40,
    height: 18,
    color: primaryDark,
  });
  page.drawText("4. MEDICAL FITNESS & CLEARANCE COMPLIANCE", {
    x: 30,
    y: cursorY - 13,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  cursorY -= 20;

  page.drawRectangle({
    x: 20,
    y: cursorY - 45,
    width: width - 40,
    height: 45,
    color: fillLight,
    borderColor: borderGray,
    borderWidth: 0.8,
  });

  const medStatus = applicant.medical_status || "-";
  page.drawText("Medical Fitness Status:", { x: 30, y: cursorY - 18, size: 8, font: fontRegular, color: textMuted });
  page.drawText(medStatus === "FIT" ? "FIT / PASSED (Approved for Overseas Placement)" : medStatus === "UNFIT" ? "UNFIT / REJECTED" : clean(medStatus), {
    x: 140,
    y: cursorY - 18,
    size: 8.5,
    font: fontBold,
    color: medStatus === "FIT" ? primaryDark : textDark,
  });

  page.drawText("Medical Expiry:", { x: 30, y: cursorY - 34, size: 8, font: fontRegular, color: textMuted });
  page.drawText(clean(applicant.medical_expiry_date), {
    x: 140,
    y: cursorY - 34,
    size: 8.5,
    font: fontBold,
    color: textDark,
  });

  page.drawText("COC Certification:", { x: 340, y: cursorY - 18, size: 8, font: fontRegular, color: textMuted });
  page.drawText(clean(applicant.coc_status), { x: 440, y: cursorY - 18, size: 8.5, font: fontBold, color: primaryDark });

  page.drawText("Process Workflow Stage:", { x: 340, y: cursorY - 34, size: 8, font: fontRegular, color: textMuted });
  page.drawText(clean(applicant.applicant_state || applicant.status || "-"), { x: 440, y: cursorY - 34, size: 8.5, font: fontBold, color: goldAccent });

  // 7. FOOTER STAMP & ATTESTATION
  page.drawLine({
    start: { x: 20, y: 55 },
    end: { x: width - 20, y: 55 },
    thickness: 1,
    color: borderGray,
  });

  page.drawText("OFFICIALLY GENERATED BY ANWAR SULTAN KEMAL FOREIGN EMPLOYMENT AGENCY WORKFLOW SYSTEM", {
    x: 35,
    y: 40,
    size: 6.5,
    font: fontBold,
    color: textMuted,
  });

  page.drawText("CONFIDENTIAL RECRUITMENT DOCUMENT - STRICTLY FOR LICENSED OVERSEAS MANPOWER PARTNERS", {
    x: 35,
    y: 28,
    size: 6.5,
    font: fontRegular,
    color: textMuted,
  });

  return await pdfDoc.save();
}
