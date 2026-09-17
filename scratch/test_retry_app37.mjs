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

  console.log("Calling generate_cv for APP-00037 now...");
  const t0 = Date.now();
  const cvRes = await fetch(`${BASE}/api/method/agency_tracking.cv_api.generate_cv`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00037" }),
  });
  const t1 = Date.now();
  console.log(`Status: ${cvRes.status} in ${((t1 - t0) / 1000).toFixed(2)}s`);
  console.log("Body:", await cvRes.json());
}

run().catch(console.error);
