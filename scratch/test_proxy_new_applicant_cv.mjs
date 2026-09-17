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

  const randomNum = Math.floor(1000000 + Math.random() * 9000000);
  const passport = `EP${randomNum}`;
  const phone = `+25191${Math.floor(1000000 + Math.random() * 9000000)}`;

  console.log("Creating new applicant via proxy with passport", passport);
  const createRes = await fetch(`${LOCAL}/api/method/agency_tracking.applicant_api.create_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "TestProxyPerf",
      middle_name: "Fast",
      last_name: "Worker",
      gender: "Female",
      date_of_birth: "1998-05-12",
      passport_number: passport,
      phone: phone,
      destination_country: "Saudi Arabia",
      entry_track: "Standard",
      target_job: "Housemaid",
      education: "High School",
      salary_amount: 1200,
      salary_currency: "SAR",
      religion: "Muslim",
      marital_status: "Single",
      passport_issue_date: "2023-01-01",
      passport_expiry_date: "2028-01-01",
      passport_issue_place: "Addis Ababa",
      photograph: "/private/files/Screenshot 2026-08-20 120024.png",
      passport_scan: "/private/files/Screenshot 2026-08-18 122042.png",
    }),
  });
  const createData = await createRes.json();
  const appName = createData.message?.name;
  console.log("Created applicant:", appName);

  console.log(`Registering applicant ${appName} via proxy...`);
  await fetch(`${LOCAL}/api/method/agency_tracking.applicant_api.register_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: appName }),
  });

  console.log(`Generating CV for ${appName} via proxy...`);
  const t0 = Date.now();
  const cvRes = await fetch(`${LOCAL}/api/method/agency_tracking.cv_api.generate_cv`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: appName }),
  });
  const t1 = Date.now();
  console.log(`generate_cv status via proxy: ${cvRes.status} in ${((t1 - t0) / 1000).toFixed(2)}s`);
  console.log("Response:", await cvRes.json());
}

run().catch(console.error);
