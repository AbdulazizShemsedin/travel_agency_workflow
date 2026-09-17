const BASE = "https://travelagency-production-b48d.up.railway.app";

async function login(usr, pwd) {
  const res = await fetch(`${BASE}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });
  const cookie = res.headers.get("set-cookie") || "";
  const json = await res.json();
  return { status: res.status, cookie, body: json };
}

async function run() {
  const adminLogin = await login("Administrator", "admin123");
  const cookie = adminLogin.cookie;

  const appRes = await fetch(`${BASE}/api/method/frappe.client.get`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ doctype: "Applicant", name: "APP-00033" }),
  });
  const app = (await appRes.json()).message;
  console.log("APP-00033 photos:", {
    photograph: app.photograph,
    passport_scan: app.passport_scan,
    photo_full_body: app.photo_full_body,
  });

  const cvRes = await fetch(`${BASE}/api/method/frappe.client.get`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ doctype: "CV Record", name: "CV-00019" }),
  });
  const cv = (await cvRes.json()).message;
  console.log("CV-00019:", {
    creation: cv.creation,
    modified: cv.modified,
    cv_pdf_url: cv.cv_pdf_url,
  });
}

run().catch(console.error);
