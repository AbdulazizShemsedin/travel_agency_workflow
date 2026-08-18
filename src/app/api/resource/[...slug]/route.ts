import { NextRequest, NextResponse } from "next/server";

function getFrappeConfig() {
  const url = process.env.FRAPPE_BASE_URL || process.env.NEXT_PUBLIC_FRAPPE_URL || "https://applicantprocessing-production.up.railway.app";
  const key = process.env.FRAPPE_API_KEY || "a7b1bb5c2468fcf";
  const secret = process.env.FRAPPE_API_SECRET || "00337e0b45c9cda";
  return {
    url,
    key,
    secret,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `token ${key}:${secret}`,
    },
  };
}

const SKILL_KEYS = [
  "skill_cleaning",
  "skill_cooking",
  "skill_washing",
  "skill_ironing",
  "skill_baby_sitting",
  "skill_baby_care",
  "skill_children_care",
  "skill_arabic_cooking",
  "skill_sewing",
  "skill_elder_care",
  "skill_elderly_care",
  "skill_driving",
];

function sanitizeApplicantBody(body: any) {
  if (!body || typeof body !== "object") return;
  for (const key of SKILL_KEYS) {
    if (key in body) {
      const val = body[key];
      if (val === true || val === "True" || val === "true" || val === 1 || val === "1" || val === "YES" || val === "yes") {
        body[key] = "YES";
      } else if (val === false || val === "False" || val === "false" || val === 0 || val === "0" || val === "" || val === null) {
        body[key] = "";
      }
    }
  }
}

function sanitizeClearanceBody(body: any) {
  if (!body || typeof body !== "object") return;
  if (body.employee && typeof body.employee === "string") {
    const match = body.employee.match(/\(([^)]+@[^)]+)\)/);
    if (match) {
      body.employee = match[1].trim();
    } else {
      const emailMatch = body.employee.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        body.employee = emailMatch[0].trim();
      }
    }
  }
}

async function uploadBase64Field(
  config: ReturnType<typeof getFrappeConfig>,
  docname: string,
  fieldname: string,
  base64DataUrl: string
): Promise<string> {
  if (!base64DataUrl || !base64DataUrl.startsWith("data:image/")) {
    return base64DataUrl;
  }
  const match = base64DataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return "";
  try {
    const mimeType = match[1];
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
    const buffer = Buffer.from(match[2], "base64");
    const filename = `${docname || "applicant"}_${fieldname}_${Date.now()}.${ext}`;

    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("doctype", "Applicant");
    formData.append("docname", docname || "");
    formData.append("fieldname", fieldname);
    formData.append("is_private", "1");

    const res = await fetch(`${config.url}/api/method/upload_file`, {
      method: "POST",
      headers: { Authorization: `token ${config.key}:${config.secret}` },
      body: formData,
    });
    const data = await res.json();
    if (data.message?.file_url) {
      return data.message.file_url;
    }
  } catch (err) {
    console.error(`Failed to auto-upload base64 for ${fieldname}:`, err);
  }
  return "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : null;
  const config = getFrappeConfig();

  try {
    const search = req.nextUrl.search || `?fields=${encodeURIComponent('["*"]')}&limit_page_length=1000`;
    const url = docname
      ? `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`
      : `${config.url}/api/resource/${encodeURIComponent(doctype)}${search}`;

    const res = await fetch(url, {
      headers: config.headers,
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy GET Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const body = await req.json();
  const config = getFrappeConfig();

  try {
    // If applicant, sanitize skill fields from boolean to "YES"/""
    if (doctype === "Applicant") {
      sanitizeApplicantBody(body);
      if (body.photo_passport && body.photo_passport.startsWith("data:image/")) {
        body.photo_passport = await uploadBase64Field(config, "", "photo_passport", body.photo_passport);
      }
      if (body.photo_full_body && body.photo_full_body.startsWith("data:image/")) {
        body.photo_full_body = await uploadBase64Field(config, "", "photo_full_body", body.photo_full_body);
      }
      if (body.passport_scan && body.passport_scan.startsWith("data:image/")) {
        body.passport_scan = await uploadBase64Field(config, "", "passport_scan", body.passport_scan);
      }
      if (body.profile_photo_url && body.profile_photo_url.startsWith("data:image/")) {
        body.profile_photo_url = body.photo_passport || "";
      }
    }

    if (doctype.includes("Clearance")) {
      sanitizeClearanceBody(body);
    }

    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy POST Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
  const body = await req.json();
  const config = getFrappeConfig();

  try {
    // If applicant, sanitize skill fields and base64 images
    if (doctype === "Applicant" && docname) {
      sanitizeApplicantBody(body);
      if (body.photo_passport && body.photo_passport.startsWith("data:image/")) {
        body.photo_passport = await uploadBase64Field(config, docname, "photo_passport", body.photo_passport);
      }
      if (body.photo_full_body && body.photo_full_body.startsWith("data:image/")) {
        body.photo_full_body = await uploadBase64Field(config, docname, "photo_full_body", body.photo_full_body);
      }
      if (body.passport_scan && body.passport_scan.startsWith("data:image/")) {
        body.passport_scan = await uploadBase64Field(config, docname, "passport_scan", body.passport_scan);
      }
      if (body.profile_photo_url && body.profile_photo_url.startsWith("data:image/")) {
        body.profile_photo_url = body.photo_passport || "";
      }
    }

    if (doctype.includes("Clearance")) {
      sanitizeClearanceBody(body);
    }

    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: config.headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();

    // If updating an Applicant, automatically synchronize with linked CV Record in Frappe
    if (res.ok && doctype === "Applicant" && docname) {
      try {
        const cvCheckRes = await fetch(
          `${config.url}/api/resource/CV%20Record?filters=[["applicant","=","${encodeURIComponent(docname)}"]]&fields=["*"]`,
          { headers: config.headers }
        );
        const cvCheckData = await cvCheckRes.json();
        const existingCv = cvCheckData.data?.[0];

        if (existingCv) {
          const cvUpdatePayload: Record<string, any> = {};
          if (body.full_name || (body.first_name && body.last_name)) {
            cvUpdatePayload.full_name = body.full_name || `${body.first_name || ""} ${body.last_name || ""}`.trim();
          }
          if (body.first_name !== undefined) cvUpdatePayload.first_name = body.first_name;
          if (body.middle_name !== undefined) cvUpdatePayload.middle_name = body.middle_name;
          if (body.last_name !== undefined) cvUpdatePayload.last_name = body.last_name;
          if (body.nationality !== undefined) cvUpdatePayload.nationality = body.nationality;
          if (body.religion !== undefined) cvUpdatePayload.religion = body.religion;
          if (body.marital_status !== undefined) cvUpdatePayload.marital_status = body.marital_status;
          if (body.children !== undefined) cvUpdatePayload.children = body.children;
          if (body.age !== undefined) cvUpdatePayload.age = body.age;
          if (body.gender !== undefined) cvUpdatePayload.gender = body.gender;
          if (body.date_of_birth !== undefined) cvUpdatePayload.date_of_birth = body.date_of_birth;
          if (body.place_of_birth !== undefined) cvUpdatePayload.place_of_birth = body.place_of_birth;
          if (body.leaving_town !== undefined) cvUpdatePayload.leaving_town = body.leaving_town;
          if (body.height !== undefined) cvUpdatePayload.height = body.height;
          if (body.weight !== undefined) cvUpdatePayload.weight = body.weight;
          if (body.complexion !== undefined) cvUpdatePayload.complexion = body.complexion;
          if (body.passport_number !== undefined) cvUpdatePayload.passport_number = body.passport_number;
          if (body.passport_issue_date !== undefined) cvUpdatePayload.passport_issue_date = body.passport_issue_date;
          if (body.passport_expiry !== undefined) cvUpdatePayload.passport_expiry = body.passport_expiry;
          if (body.place_of_issue !== undefined) cvUpdatePayload.place_of_issue = body.place_of_issue;
          if (body.national_id !== undefined) cvUpdatePayload.national_id = body.national_id;
          if (body.labour_id !== undefined) cvUpdatePayload.labour_id = body.labour_id;
          if (body.job_applied !== undefined) cvUpdatePayload.job_applied = body.job_applied;
          if (body.monthly_salary !== undefined) cvUpdatePayload.monthly_salary = body.monthly_salary;
          if (body.highest_education !== undefined) cvUpdatePayload.highest_education = body.highest_education;
          if (body.english_level !== undefined) cvUpdatePayload.english_level = body.english_level;
          if (body.arabic_level !== undefined) cvUpdatePayload.arabic_level = body.arabic_level;
          if (body.experience_country !== undefined) cvUpdatePayload.experience_country = body.experience_country;
          if (body.experience_period !== undefined) cvUpdatePayload.experience_period = body.experience_period;
          if (body.photo_passport !== undefined) cvUpdatePayload.photo_passport = body.photo_passport;
          if (body.photo_full_body !== undefined) cvUpdatePayload.photo_full_body = body.photo_full_body;
          if (body.passport_scan !== undefined) cvUpdatePayload.passport_scan = body.passport_scan;
          if (body.profile_photo_url !== undefined && !cvUpdatePayload.photo_passport) {
            cvUpdatePayload.photo_passport = body.profile_photo_url;
          }
          if (body.phone_number !== undefined) cvUpdatePayload.phone_number = body.phone_number;
          if (body.email !== undefined) cvUpdatePayload.email = body.email;
          if (body.remarks !== undefined) cvUpdatePayload.remarks = body.remarks;

          // Skills
          for (const k of SKILL_KEYS) {
            if (body[k] !== undefined) {
              cvUpdatePayload[k] = body[k];
            }
          }

          if (Object.keys(cvUpdatePayload).length > 0) {
            await fetch(`${config.url}/api/resource/CV%20Record/${encodeURIComponent(existingCv.name)}`, {
              method: "PUT",
              headers: config.headers,
              body: JSON.stringify(cvUpdatePayload),
            });
          }
        }
      } catch (cvSyncErr) {
        console.error("Warning: Failed to auto-sync CV Record on Applicant update:", cvSyncErr);
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy PUT Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const doctype = decodeURIComponent(slug[0] || "");
  const docname = slug[1] ? decodeURIComponent(slug[1]) : "";
  const config = getFrappeConfig();

  try {
    const url = `${config.url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docname)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: config.headers,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy DELETE Failed: ${err.message}` },
      { status: 500 }
    );
  }
}
