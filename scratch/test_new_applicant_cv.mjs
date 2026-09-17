const BASE = "https://travelagency-production-b48d.up.railway.app";

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

  const randomNum = Math.floor(1000000 + Math.random() * 9000000);
  const passport = `EP${randomNum}`;
  const phone = `+25191${Math.floor(1000000 + Math.random() * 9000000)}`;

  console.log("Creating brand new test applicant with passport", passport);
  const createRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.create_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "TestCVPerf",
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
      photograph: "/files/sample_photo.jpg",
      passport_scan: "/files/sample_passport.pdf",
    }),
  });

  const createData = await createRes.json();
  console.log("Create result:", createRes.status, createData);
  const appName = createData.message?.name || createData.name;
  if (!appName) {
    console.error("Failed to get applicant name");
    return;
  }

  console.log(`Registering applicant ${appName}...`);
  const regRes = await fetch(`${BASE}/api/method/agency_tracking.applicant_api.register_applicant`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: appName }),
  });
  console.log("Register status:", regRes.status, await regRes.json());

  console.log(`Generating CV for ${appName}...`);
  const t0 = Date.now();
  const cvRes = await fetch(`${BASE}/api/method/agency_tracking.cv_api.generate_cv`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_name: appName }),
  });
  const t1 = Date.now();
  console.log(`generate_cv status: ${cvRes.status} in ${((t1 - t0) / 1000).toFixed(2)}s`);
  console.log("generate_cv response:", await cvRes.json());
}

run().catch(console.error);
