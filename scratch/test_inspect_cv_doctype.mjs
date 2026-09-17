const BASE = "https://travelagency-production-b48d.up.railway.app";

async function login(usr, pwd) {
  const res = await fetch(`${BASE}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr, pwd }),
  });
  const cookie = res.headers.get("set-cookie") || "";
  return { status: res.status, cookie };
}

async function run() {
  const adminLogin = await login("Administrator", "admin123");
  const cookie = adminLogin.cookie;

  // Let's check what doctypes or methods exist
  const res = await fetch(`${BASE}/api/method/frappe.client.get`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ doctype: "DocType", name: "CV Record" }),
  });
  const doc = await res.json();
  console.log("CV Record fields:", doc.message?.fields?.map(f => f.fieldname));
}

run().catch(console.error);
