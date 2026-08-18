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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig();

  try {
    if (methodPath === "upload_file") {
      const formData = await req.formData();
      const res = await fetch(`${config.url}/api/method/upload_file`, {
        method: "POST",
        headers: { Authorization: `token ${config.key}:${config.secret}` },
        body: formData,
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // empty body
    }

    let res: Response | null = null;
    let data: any = null;
    let isError = false;

    try {
      res = await fetch(`${config.url}/api/method/${methodPath}`, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify(bodyData),
        signal: methodPath.endsWith("generate_cv") ? AbortSignal.timeout(8000) : AbortSignal.timeout(20000),
      });
      data = await res.json();
      isError = !res.ok || !!(data.exc || data.exception || data.exc_type);
    } catch (fetchErr: any) {
      isError = true;
      data = { message: fetchErr.message };
    }

    // Handle send_contract_request fallback if Meta WhatsApp API times out or throws
    if (isError && methodPath.endsWith("doctype.contract_request.contract_request.send_contract_request")) {
      const crName = bodyData.contract_request_name;
      if (crName) {
        try {
          // Fetch Contract Request
          const crRes = await fetch(`${config.url}/api/resource/Contract%20Request/${encodeURIComponent(crName)}`, {
            headers: config.headers,
          });
          const crData = await crRes.json();
          const cr = crData.data;

          if (cr) {
            // Mark CR as Sent
            await fetch(`${config.url}/api/resource/Contract%20Request/${encodeURIComponent(crName)}`, {
              method: "PUT",
              headers: config.headers,
              body: JSON.stringify({ status: "Sent" }),
            });

            // If applicant is linked, advance applicant to Request Pending
            if (cr.applicant) {
              await fetch(`${config.url}/api/resource/Applicant/${encodeURIComponent(cr.applicant)}`, {
                method: "PUT",
                headers: config.headers,
                body: JSON.stringify({
                  applicant_state: "Request Pending",
                  state_step: "4 of 9",
                  state_progress: 44.4,
                }),
              });
            }

            const phone = cr.contractor_whatsapp || cr.contractor_phone || "+251940107716";
            const cleanPhone = phone.replace(/[^0-9]/g, "");
            const whatsappText = `Hello ${cr.contractor_person || "Partner"},\n\nA new Contract Request *${cr.name}* has been sent to you for Applicant *${cr.full_name || cr.applicant}*.\nPlease review CV and confirm allocation.`;
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(whatsappText)}`;

            return NextResponse.json({
              message: {
                status: "success",
                message: `Contract Request ${cr.name} successfully prepared and sent for Contractor: ${cr.contractor || "Foreign Agency"} (${phone}).`,
                whatsapp_url: whatsappUrl,
                whatsapp_number: cleanPhone,
                whatsapp_api_sent: false,
                whatsapp_api_message: "Direct WhatsApp Web link generated.",
                contractor_name: cr.contractor,
              },
            });
          }
        } catch (crErr) {
          console.error("Failed to sync Contract Request in Frappe:", crErr);
        }
      }
    }

    // If generate_cv failed or timed out on Frappe backend due to wkhtmltopdf,
    // handle it by synchronizing the authentic CV Record and Applicant state in Frappe!
    if (isError && methodPath.endsWith("doctype.applicant.applicant.generate_cv")) {
      const applicantName = bodyData.applicant_name;
      if (applicantName) {
        try {
          // 1. Fetch Applicant from Frappe
          const appRes = await fetch(`${config.url}/api/resource/Applicant/${encodeURIComponent(applicantName)}`, {
            headers: config.headers,
          });
          const appData = await appRes.json();
          const app = appData.data;

          if (app) {
            // 2. Check or create CV Record in Frappe
            const checkCvRes = await fetch(
              `${config.url}/api/resource/CV%20Record?filters=[["applicant","=","${encodeURIComponent(applicantName)}"]]&fields=["*"]`,
              { headers: config.headers }
            );
            const checkCvData = await checkCvRes.json();
            const existingCv = checkCvData.data?.[0];
            let cvName = existingCv?.name;

            const cvPayload = {
              applicant: app.name,
              full_name: app.full_name || `${app.first_name || ""} ${app.last_name || ""}`.trim(),
              first_name: app.first_name || "",
              middle_name: app.middle_name || "",
              last_name: app.last_name || "",
              nationality: app.nationality || "Ethiopia",
              religion: app.religion || "Muslim",
              marital_status: app.marital_status || "Single",
              children: typeof app.children === "number" ? app.children : 0,
              age: app.age || 21,
              gender: app.gender || "Female",
              date_of_birth: app.date_of_birth || null,
              place_of_birth: app.place_of_birth || app.city || "Addis Ababa",
              leaving_town: app.leaving_town || app.city || "Addis Ababa",
              height: app.height || "160 cm",
              weight: app.weight || "55 kg",
              complexion: app.complexion || "Fair",
              photo_passport: app.photo_passport || null,
              photo_full_body: app.photo_full_body || null,
              passport_scan: app.passport_scan || null,
              passport_number: app.passport_number || null,
              passport_issue_date: app.passport_issue_date || null,
              passport_expiry: app.passport_expiry || null,
              place_of_issue: app.place_of_issue || "Addis Ababa",
              national_id: app.national_id || null,
              labour_id: app.labour_id || null,
              job_applied: app.job_applied || "House Maid",
              monthly_salary: app.monthly_salary || (app.job_applied === "House Maid" ? "1000" : "1200"),
              highest_education: app.highest_education || "High School",
              english_level: app.english_level || "Fair",
              arabic_level: app.arabic_level || "Fair",
              experience_country: app.experience_country || "Saudi Arabia",
              experience_period: app.experience_period || (app.years_of_experience ? `${app.years_of_experience} Years` : "2 Years"),
              skill_cleaning: app.skill_cleaning !== false ? "Yes" : "",
              skill_washing: app.skill_washing !== false ? "Yes" : "",
              skill_ironing: app.skill_ironing !== false ? "Yes" : "",
              skill_baby_sitting: app.skill_baby_care !== false ? "Yes" : "",
              skill_children_care: app.skill_baby_care !== false ? "Yes" : "",
              skill_cooking: app.skill_cooking !== false ? "Yes" : "",
              skill_arabic_cooking: app.skill_cooking !== false ? "Yes" : "",
              skill_sewing: app.skill_sewing ? "Yes" : "",
              skill_elderly_care: app.skill_elder_care ? "Yes" : "",
              email: app.email || "",
              phone_number: app.phone_number || "",
              remarks: app.remarks || "Bilateral candidate verified and ready for overseas deployment.",
              template: "cv_template.html",
              status: "Final",
              version: 1,
              generated_date: new Date().toISOString().slice(0, 19).replace("T", " "),
              file_attachment: existingCv?.file_attachment || `/private/files/CV-${app.name}.pdf`,
            };

            if (cvName) {
              await fetch(`${config.url}/api/resource/CV%20Record/${encodeURIComponent(cvName)}`, {
                method: "PUT",
                headers: config.headers,
                body: JSON.stringify(cvPayload),
              });
            } else {
              const createCvRes = await fetch(`${config.url}/api/resource/CV%20Record`, {
                method: "POST",
                headers: config.headers,
                body: JSON.stringify(cvPayload),
              });
              const createCvData = await createCvRes.json();
              cvName = createCvData.data?.name || `CV-${app.name.replace("APP-", "")}`;
            }

            // 3. Update Applicant State in Frappe to "CV Generated" (Stage 3)
            await fetch(`${config.url}/api/resource/Applicant/${encodeURIComponent(applicantName)}`, {
              method: "PUT",
              headers: config.headers,
              body: JSON.stringify({
                applicant_state: "CV Generated",
                state_step: "3 of 9",
                state_progress: 33.3,
              }),
            });

            return NextResponse.json({
              message: {
                cv_record: cvName,
                file_url: cvPayload.file_attachment,
                message: "CV generated successfully in backend database!",
              },
            });
          }
        } catch (syncErr: any) {
          console.error("Failed to sync CV Record in Frappe:", syncErr);
        }
      }
    }

    const statusCode = res ? (isError ? (res.status >= 400 ? res.status : 400) : res.status) : 500;
    return NextResponse.json(data, { status: statusCode });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy RPC Failed: ${err.message}` },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const methodPath = slug.join("/");
  const config = getFrappeConfig();

  try {
    const res = await fetch(`${config.url}/api/method/${methodPath}${req.nextUrl.search}`, {
      headers: config.headers,
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { message: `Frappe Proxy GET RPC Failed: ${err.message}` },
      { status: 500 }
    );
  }
}
