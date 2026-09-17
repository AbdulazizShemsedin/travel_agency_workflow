const LOCAL = "http://localhost:3000";

async function login(usr, pwd) {
  const res = await fetch(`${LOCAL}/api/method/login`, {
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
  console.log("Logged in via proxy, status:", adminLogin.status);

  // Test generate_cv on APP-00035 (which already has valid files) via local proxy
  console.log("Testing generate_cv on APP-00035 through localhost:3000 proxy...");
  const t0 = Date.now();
  const cvRes = await fetch(`${LOCAL}/api/method/agency_tracking.cv_api.generate_cv`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: "APP-00035" }),
  });
  const t1 = Date.now();
  console.log(`Proxy generate_cv status: ${cvRes.status} in ${((t1 - t0) / 1000).toFixed(2)}s`);
  const cvData = await cvRes.json().catch(() => null);
  console.log("Proxy generate_cv body:", cvData);
}

run().catch(console.error);
