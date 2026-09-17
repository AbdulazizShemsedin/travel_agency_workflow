const BASE = "http://localhost:3000";

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
  const agencyLogin = await login("audit-agency-alpha@example.com", "AuditAgency123!");
  const cookie = agencyLogin.cookie;
  console.log("Agency login status:", agencyLogin.status);

  const docRes = await fetch(`${BASE}/api/method/frappe.client.get?doctype=Chat+Thread&name=CHT-00009`, {
    headers: { "Cookie": cookie },
  });
  console.log("Agency docRes status:", docRes.status);
  const data = await docRes.json();
  console.log("Agency doc data:", data);
}

run().catch(console.error);
