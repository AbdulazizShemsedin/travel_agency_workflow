const BASE = "https://travelagency-production-b48d.up.railway.app";

async function run() {
  const res1 = await fetch(`${BASE}/files/sample_photo.jpg`);
  console.log("/files/sample_photo.jpg status:", res1.status);

  const res2 = await fetch(`${BASE}/private/files/Screenshot 2026-08-20 120024.png`);
  console.log("Screenshot status:", res2.status);
}

run().catch(console.error);
