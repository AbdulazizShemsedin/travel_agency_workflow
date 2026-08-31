async function checkDocTypeMeta() {
  const base = "http://localhost:3000";
  const loginRes = await fetch(`${base}/api/method/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usr: "Administrator", pwd: "admin123" }),
  });
  const setCookie = loginRes.headers.get("set-cookie");
  const cookies = setCookie.split(",").map(c => c.split(";")[0].trim()).join("; ");

  // Fetch APP-00001
  const res = await fetch(`${base}/api/method/agency_tracking.applicant_api.get_applicant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": cookies },
    body: JSON.stringify({ applicant_name: "APP-00001" }),
  });
  const json = await res.json();
  console.log("APP-00001 Live Applicant Details:\n", JSON.stringify(json.message, null, 2));
}

checkDocTypeMeta();
