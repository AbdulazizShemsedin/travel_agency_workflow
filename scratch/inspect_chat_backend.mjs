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
  const adminLogin = await login("Administrator", "admin123");
  const cookie = adminLogin.cookie;

  // Let's get thread details via frappe.client.get on Chat Thread CHT-00009
  const docRes = await fetch(`${BASE}/api/method/frappe.client.get?doctype=Chat+Thread&name=CHT-00009`, {
    headers: { "Cookie": cookie },
  });
  const doc = (await docRes.json()).message;
  console.log("CHT-00009 doc participants:", doc?.participants);
}

run().catch(console.error);
