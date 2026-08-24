const BASE_URL = "https://applicantprocessing-production.up.railway.app";

async function testPhase1() {
  console.log("=== PHASE 1 INTEGRATION & SECURITY VERIFICATION ===");

  // 1. Test unauthenticated request to backend
  console.log("\n1. Testing unauthenticated request to /api/resource/Applicant...");
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/resource/Applicant`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    console.log(`   Status: ${unauthRes.status} (${unauthRes.statusText})`);
    if (unauthRes.status === 401 || unauthRes.status === 403) {
      console.log("   [PASS] Unauthenticated access is properly rejected with 401/403!");
    } else {
      console.log(`   [WARN] Unexpected status code for unauthenticated access: ${unauthRes.status}`);
    }
  } catch (err) {
    console.error("   [ERROR] Failed to make request:", err.message);
  }

  // 2. Test get_available_roles with backend credentials
  console.log("\n2. Testing get_available_roles endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/method/applicant_processing.applicant_processing.api.get_available_roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "token a7b1bb5c2468fcf:abe2dc090ca1d39",
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    const roles = data.message?.roles || data.roles || data.message || [];
    console.log(`   Available roles retrieved: ${Array.isArray(roles) ? roles.length : 0}`);
    if (Array.isArray(roles) && roles.length > 0) {
      console.log("   [PASS] Roles:", roles.map((r) => r.role_name || r.name || r).join(", "));
    }
  } catch (err) {
    console.error("   [ERROR] Failed to fetch available roles:", err.message);
  }

  // 3. Test get_system_users endpoint
  console.log("\n3. Testing get_system_users endpoint...");
  try {
    const res = await fetch(`${BASE_URL}/api/method/applicant_processing.applicant_processing.api.get_system_users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "token a7b1bb5c2468fcf:abe2dc090ca1d39",
      },
      body: JSON.stringify({ limit: 10 }),
    });
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    const users = data.message?.users || data.users || [];
    console.log(`   System users found: ${Array.isArray(users) ? users.length : 0}`);
    if (Array.isArray(users) && users.length > 0) {
      console.log("   [PASS] Sample user:", users[0].email, "Roles:", users[0].roles);
    }
  } catch (err) {
    console.error("   [ERROR] Failed to fetch system users:", err.message);
  }

  console.log("\n=== VERIFICATION RUN COMPLETE ===");
}

testPhase1();
