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

  // Let's find an applicant who is in Registered status or any applicant
  const appsRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.list_applicants`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: "{}",
  });
  const apps = (await appsRes.json()).message || [];
  console.log(`Found ${apps.length} applicants.`);
  const regApp = apps.find(a => (a.status || a.applicant_state) === "Registered") || apps[0];
  console.log("Target applicant:", regApp?.name, regApp?.status || regApp?.applicant_state);

  if (regApp) {
    console.log(`Calling generate_cv for ${regApp.name}...`);
    const start = Date.now();
    try {
      const cvRes = await fetch(`${BASE}/api/method/agency_tracking.cv_api.generate_cv`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ applicant_name: regApp.name }),
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`Response status: ${cvRes.status} in ${elapsed}s`);
      const cvData = await cvRes.json().catch(() => null);
      console.log("Response body:", cvData);
    } catch (err) {
      console.error("Call failed:", err);
    }
  }
}

run().catch(console.error);
