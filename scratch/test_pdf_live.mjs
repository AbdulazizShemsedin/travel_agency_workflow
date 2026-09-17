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

  console.log("Testing render_cv_pdf for APP-00033...");
  const t0 = Date.now();
  const pdfRes = await fetch(`${BASE}/api/method/agency_tracking.cv_api.render_cv_pdf`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00033" }),
  });
  const t1 = Date.now();
  console.log(`render_cv_pdf status: ${pdfRes.status}, content-type: ${pdfRes.headers.get("content-type")}, size: ${pdfRes.headers.get("content-length")} in ${((t1 - t0) / 1000).toFixed(2)}s`);
}

run().catch(console.error);
