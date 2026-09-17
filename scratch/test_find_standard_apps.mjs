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

  const appsRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.list_applicants`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: "{}",
  });
  const apps = (await appsRes.json()).message || [];
  console.log(`Total applicants: ${apps.length}`);
  for (const a of apps) {
    console.log(`${a.name} | track: ${a.entry_track} | status: ${a.status || a.applicant_state} | cv_record: ${a.cv_record}`);
  }
}

run().catch(console.error);
