const https = require('https');

const API_TOKEN = process.env.FRAPPE_API_TOKEN;
if (!API_TOKEN) {
  console.error("Missing FRAPPE_API_TOKEN environment variable.");
  process.exit(1);
}

function callApi(endpoint, body) {
  return new Promise((resolve) => {
    const req = https.request(`https://agencytracking-production.up.railway.app/api/method/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': API_TOKEN.startsWith('token ') ? API_TOKEN : `token ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
      });
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const plcMeta = await callApi('frappe.client.get', { doctype: 'DocType', name: 'Placement' });
  console.log("=== Placement Commission Fields ===");
  (plcMeta.message?.fields || []).filter(f => f.fieldname.includes('comm') || f.fieldname.includes('accru')).forEach(f => {
    console.log(` - ${f.fieldname} (${f.fieldtype}, label: ${f.label})`);
  });

  const txMeta = await callApi('frappe.client.get', { doctype: 'DocType', name: 'Applicant Transaction' });
  console.log("\n=== Applicant Transaction Fields ===");
  (txMeta.message?.fields || []).forEach(f => {
    console.log(` - ${f.fieldname} (${f.fieldtype}, options: ${f.options}, label: ${f.label})`);
  });
}

main().catch(console.error);
