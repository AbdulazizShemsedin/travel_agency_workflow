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
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log("=== Applicant Transaction DocType Fields ===");
  const txMeta = await callApi('frappe.client.get', { doctype: 'DocType', name: 'Applicant Transaction' });
  if (txMeta.message && txMeta.message.fields) {
    txMeta.message.fields.forEach(f => {
      console.log(` - ${f.fieldname} (${f.fieldtype}, options: ${f.options}, reqd: ${f.reqd}, label: ${f.label})`);
    });
  }

  console.log("\n=== Existing Applicant Transactions ===");
  const txs = await callApi('frappe.client.get_list', {
    doctype: 'Applicant Transaction',
    fields: ['*'],
    limit_page_length: 50
  });
  console.log("Total Count:", txs.message?.length || 0);
  const commissionTxs = (txs.message || []).filter(t => t.category === 'Commission' || t.transaction_type === 'Income');
  console.log("Commission/Income Count:", commissionTxs.length);
  console.log(JSON.stringify(commissionTxs.slice(0, 3), null, 2));

  console.log("\n=== Placements in Departed or with Accrual ===");
  const placements = await callApi('frappe.client.get_list', {
    doctype: 'Placement',
    fields: ['name', 'applicant', 'contractor', 'destination_country', 'status', 'commission_status', 'commission_accrued_on'],
    limit_page_length: 20
  });
  console.log(JSON.stringify(placements.message?.slice(0, 5), null, 2));
}

main().catch(console.error);
