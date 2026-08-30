const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const [k, v] = l.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const baseUrl = env.FRAPPE_BASE_URL || env.NEXT_PUBLIC_FRAPPE_BASE_URL || "https://applicantprocessing-production-e2e7.up.railway.app";
const apiKey = env.FRAPPE_API_KEY;
const apiSecret = env.FRAPPE_API_SECRET;

async function queryDoc(doctype, fields = ["*"], filters = []) {
  const url = `${baseUrl}/api/resource/${encodeURIComponent(doctype)}?fields=${encodeURIComponent(JSON.stringify(fields))}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=20`;
  const res = await fetch(url, {
    headers: { Authorization: `token ${apiKey}:${apiSecret}` }
  });
  if (!res.ok) {
    return { error: `HTTP ${res.status}: ${res.statusText}`, body: await res.text() };
  }
  return await res.json();
}

async function run() {
  console.log("=== Detailed Clearance Inspection ===");

  const lms = await queryDoc("LMS Clearance");
  console.log("LMS Clearances (count):", lms.data?.length);
  if (lms.data?.length) console.log("Sample LMS record:", lms.data[0]);

  const injaz = await queryDoc("Injaz Clearance");
  console.log("Injaz Clearances (count):", injaz.data?.length);
  if (injaz.data?.length) console.log("Sample Injaz record:", injaz.data[0]);

  const wakala = await queryDoc("Wakala Clearance");
  console.log("Wakala Clearances (count):", wakala.data?.length);
  if (wakala.data?.length) console.log("Sample Wakala record:", wakala.data[0]);

  const embassy = await queryDoc("Embassy Clearance");
  console.log("Embassy Clearances (count):", embassy.data?.length);
  if (embassy.data?.length) console.log("Sample Embassy record:", embassy.data[0]);

  const telesign = await queryDoc("Telesign Clearance");
  console.log("Telesign Clearances (count):", telesign.data?.length);
  if (telesign.data?.length) console.log("Sample Telesign record:", telesign.data[0]);

  const stamp = await queryDoc("DSR Stamp");
  console.log("DSR Stamp records (count):", stamp.data?.length);
  if (stamp.data?.length) console.log("Sample Stamp record:", stamp.data[0]);

  const ticket = await queryDoc("DSR Ticket");
  console.log("DSR Ticket records (count):", ticket.data?.length);
  if (ticket.data?.length) console.log("Sample Ticket record:", ticket.data[0]);

  const dep = await queryDoc("DSR Departure");
  console.log("DSR Departure records (count):", dep.data?.length);
  if (dep.data?.length) console.log("Sample Departure record:", dep.data[0]);

  const users = await queryDoc("User", ["name", "full_name", "email", "role_profile_name", "user_type"], [["enabled", "=", "1"]]);
  console.log("Live Users (count):", users.data?.length);
  console.log("Users list:", users.data?.map(u => ({ name: u.name, full_name: u.full_name, email: u.email })));
}

run().catch(console.error);
