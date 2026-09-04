const https = require('https');

function callApi(endpoint, body) {
  return new Promise((resolve) => {
    const req = https.request(`https://agencytracking-production.up.railway.app/api/method/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': 'token 4b650f0d4cc82df:b20da7f87521048',
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
