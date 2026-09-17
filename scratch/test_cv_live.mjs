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

  // Find a Draft Standard applicant
  const appsRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.list_applicants`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: "{}",
  });
  const apps = (await appsRes.json()).message || [];
  const draftStandard = apps.find(a => (a.status || a.applicant_state) === "Draft" && a.entry_track === "Standard");
  console.log("Draft Standard applicant:", draftStandard?.name);

  if (!draftStandard) {
    console.log("No Draft Standard applicant found.");
    return;
  }

  // Check detail of draftStandard
  const detailRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.get_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: draftStandard.name }),
  });
  const detail = (await detailRes.json()).message;
  console.log("Detail KYC:", {
    name: detail.name,
    status: detail.status,
    first_name: detail.first_name,
    passport_number: detail.passport_number,
    destination_country: detail.destination_country,
  });

  // Call register_applicant
  console.log(`Calling register_applicant for ${draftStandard.name}...`);
  const regRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.register_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: draftStandard.name }),
  });
  console.log("register_applicant status:", regRes.status);
  const regData = await regRes.json().catch(() => null);
  console.log("register_applicant body:", regData);

  if (regRes.ok || regData?.message?.status === "Registered") {
    // Now test generate_cv with timing!
    console.log(`Calling generate_cv for ${draftStandard.name}...`);
    const t0 = Date.now();
    const cvRes = await fetch(`${BASE}/api/method/agency_tracking.cv_api.generate_cv`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ applicant_name: draftStandard.name }),
    });
    const t1 = Date.now();
    console.log(`generate_cv status: ${cvRes.status} in ${((t1 - t0) / 1000).toFixed(2)}s`);
    const cvData = await cvRes.json().catch(() => null);
    console.log("generate_cv body:", cvData);
  }
}

run().catch(console.error);
