const BASE = "https://travelagency-production-b48d.up.railway.app";

async function login(usr, pwd) {
  const res = await fetch(`${BASE}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });
  const cookies = res.headers.getSetCookie();
  const sidCookie = cookies.find(c => c.startsWith("sid="))?.split(";")[0] || "";
  return { status: res.status, cookie: sidCookie };
}

async function run() {
  const adminLogin = await login("Administrator", "admin123");
  const cookie = adminLogin.cookie;

  const appRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.get_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00037" }),
  });
  const app = await appRes.json();
  console.log("APP-00037:", {
    status: app.message?.status,
    cv_record: app.message?.cv_record,
    modified: app.message?.modified,
  });

  const cvListRes = await fetch(`${BASE}/api/method/frappe.client.get_list`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      doctype: "CV Record",
      filters: { applicant: "APP-00037" },
      fields: ["name", "applicant", "cv_pdf_url", "docstatus", "creation", "modified"],
    }),
  });
  console.log("CV list for APP-00037:", await cvListRes.json());
}

run().catch(console.error);
