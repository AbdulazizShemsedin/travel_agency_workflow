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
  assert.strictEqual(adminLogin.status, 200);
  const cookie = adminLogin.cookie;

  console.log("\n=== 2. Call get_thread_messages via Proxy ===");
  const msgRes = await fetch(`${BASE}/api/method/agency_tracking.chat_api.get_thread_messages`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ thread_name: "CHT-00010" }),
  });
  assert.strictEqual(msgRes.status, 200);
  const data = await msgRes.json();
  console.log("Enriched get_thread_messages response keys:", Object.keys(data));
  assert(Array.isArray(data.message), "message must be an array");
  assert(Array.isArray(data.participants), "participants must be an array attached to response");
  console.log(`Fetched ${data.message.length} messages and ${data.participants.length} participants:`);
  data.participants.forEach((p) => {
    console.log(`  - ${p.user}: last_read_at=${p.last_read_at}`);
  });

  console.log("\n=== 3. Verify Read Receipts (Single Tick vs Double Tick) ===");
  const currentEmail = "administrator";
  const counterparties = data.participants.filter(p => p.user.toLowerCase() !== currentEmail);
  console.log(`Counterparties in CHT-00010: ${counterparties.map(c => c.user).join(", ")}`);

  data.message.forEach((msg) => {
    const isOutgoing = msg.sender?.toLowerCase() === currentEmail;
    if (isOutgoing) {
      const msgCreationTime = new Date(msg.creation.replace(" ", "T")).getTime();
      const isSeen = counterparties.some(p => {
        if (!p.last_read_at) return false;
        const readTime = new Date(p.last_read_at.replace(" ", "T")).getTime();
        return readTime >= msgCreationTime;
      });
      console.log(`Msg ${msg.name} ("${msg.message}") at ${msg.creation}:`);
      console.log(`  Seen by counterparty: ${isSeen} -> Icon: ${isSeen ? "DOUBLE-TICK (Blue ✓✓)" : "SINGLE-TICK (Grey ✓)"}`);
    }
  });

  console.log("\n=== 4. Verify Active Presence Detection ===");
  const now = Date.now();
  const isCounterpartyActiveInChat = counterparties.some(p => {
    if (!p.last_read_at) return false;
    const readTime = new Date(p.last_read_at.replace(" ", "T")).getTime();
    return now - readTime >= 0 && now - readTime < 60000;
  });
  console.log(`Is counterparty active in chat right now? ${isCounterpartyActiveInChat}`);
  console.log(`Header badge: ${isCounterpartyActiveInChat ? "GLOWING GREEN DOT (Active now)" : "MUTED GREY DOT (Offline)"}`);
  assert.strictEqual(isCounterpartyActiveInChat, false, "Counterparty who is not currently in chat must NOT show as Active");

  console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
