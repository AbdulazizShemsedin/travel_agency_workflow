const BASE = "https://travelagency-production-b48d.up.railway.app";

async function login(usr, pwd) {
  const res = await fetch(`${BASE}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });
  const cookie = res.headers.get("set-cookie") || "";
  return { status: res.status, cookie };
}

async function run() {
  const adminLogin = await login("Administrator", "admin123");
  const cookie = adminLogin.cookie;

  const appRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.get_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00036" }),
  });
  const appData = await appRes.json();
  console.log("APP-00036 status:", appData.message?.status, "cv_record:", appData.message?.cv_record);

  const cvListRes = await fetch(`${BASE}/api/method/frappe.client.get_list`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      doctype: "CV Record",
      filters: { applicant: "APP-00036" },
      fields: ["name", "applicant", "cv_pdf_url", "docstatus"],
    }),
  });
  console.log("CV Record for APP-00036:", await cvListRes.json());
}

run().catch(console.error);
