import assert from "node:assert";

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
  console.log("=== 1. Login as Administrator ===");
  const adminLogin = await login("Administrator", "admin123");
  assert.strictEqual(adminLogin.status, 200, "Administrator login must succeed");
  const adminCookie = adminLogin.cookie;
  console.log("Admin logged in successfully:", adminLogin.body.full_name);

  console.log("\n=== 2. Verify Contractors List Endpoint via Proxy ===");
  const contractorsRes = await fetch(`${BASE}/api/method/agency_tracking.contractor_api.list_contractors`, {
    method: "POST",
    headers: { "Cookie": adminCookie, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.strictEqual(contractorsRes.status, 200, "list_contractors must return 200");
  const contractorsData = await contractorsRes.json();
  const contractorsList = contractorsData.message || contractorsData.contractors || contractorsData;
  console.log(`Found ${contractorsList.length} registered contractors/agencies:`);
  contractorsList.forEach((c) => {
    console.log(`  - ${c.name} (${c.country || "N/A"}): user=${c.user || "none"}`);
  });
  assert(contractorsList.length >= 5, "Should have registered foreign contractors");

  console.log("\n=== 3. Verify Organization Oversight (list_all_threads) for Administrator ===");
  const oversightRes = await fetch(`${BASE}/api/method/agency_tracking.chat_api.list_all_threads`, {
    method: "POST",
    headers: { "Cookie": adminCookie, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.strictEqual(oversightRes.status, 200, "list_all_threads must succeed for Administrator");
  const oversightData = await oversightRes.json();
  const threads = oversightData.message || [];
  console.log(`Successfully fetched ${threads.length} organization-wide threads for oversight:`);
  threads.forEach((t) => {
    console.log(`  - [${t.thread_type}] ${t.name} (Contractor: ${t.contractor || "N/A"})`);
    console.log(`    Initiator: ${t.owner}`);
    console.log(`    Participants: [${(t.participants || []).join(", ")}]`);
  });
  assert(threads.length > 0, "Organization should have chat threads");

  console.log("\n=== 4. Verify Admin Can Inspect Thread Messages Outside Participant List ===");
  // CHT-00002 is an internal staff thread where Administrator is NOT in participants
  const thread2Res = await fetch(`${BASE}/api/method/agency_tracking.chat_api.get_thread_messages`, {
    method: "POST",
    headers: { "Cookie": adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ thread_name: "CHT-00002" }),
  });
  assert.strictEqual(thread2Res.status, 200, "Admin must be able to inspect thread messages during oversight");
  const thread2Messages = (await thread2Res.json()).message || [];
  console.log(`Admin retrieved ${thread2Messages.length} messages from CHT-00002 for audit.`);

  console.log("\n=== 5. Verify Privacy & Isolation for Foreign Agency ===");
  const agencyLogin = await login("audit-agency-alpha@example.com", "AuditAgency123!");
  assert.strictEqual(agencyLogin.status, 200, "Foreign agency login must succeed");
  const agencyCookie = agencyLogin.cookie;
  console.log("Foreign Agency logged in:", agencyLogin.body.full_name);

  // Agency calling list_all_threads MUST be forbidden (403)
  const agencyOversightRes = await fetch(`${BASE}/api/method/agency_tracking.chat_api.list_all_threads`, {
    method: "POST",
    headers: { "Cookie": agencyCookie, "Content-Type": "application/json" },
    body: "{}",
  });
  console.log(`Foreign agency list_all_threads response status: ${agencyOversightRes.status}`);
  assert.strictEqual(agencyOversightRes.status, 403, "Foreign agency must be forbidden from calling list_all_threads");

  // Agency calling get_thread_messages on internal thread CHT-00002 MUST be forbidden (403)
  const agencyMessageInspectRes = await fetch(`${BASE}/api/method/agency_tracking.chat_api.get_thread_messages`, {
    method: "POST",
    headers: { "Cookie": agencyCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ thread_name: "CHT-00002" }),
  });
  console.log(`Foreign agency get_thread_messages on CHT-00002 status: ${agencyMessageInspectRes.status}`);
  assert.strictEqual(agencyMessageInspectRes.status, 403, "Foreign agency must NOT access internal staff discussions");

  console.log("\n ALL TESTS PASSED SUCCESSFULLY! Privacy, foreign agency selection, and executive oversight verified!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
