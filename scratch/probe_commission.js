const https = require('https');

function callApi(endpoint, body) {
  return new Promise((resolve, reject) => {
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
  console.log("=== 1. Commission Batch Request DocType Fields ===");
  const cbrMeta = await callApi('frappe.client.get', { doctype: 'DocType', name: 'Commission Batch Request' });
  if (cbrMeta.message && cbrMeta.message.fields) {
    cbrMeta.message.fields.forEach(f => {
      console.log(` - ${f.fieldname} (${f.fieldtype}, options: ${f.options}, reqd: ${f.reqd}, label: ${f.label})`);
    });
  }

  console.log("\n=== 2. Commission Batch Item Child DocType Fields ===");
  const itemMeta = await callApi('frappe.client.get', { doctype: 'DocType', name: 'Commission Batch Item' });
  if (itemMeta.message && itemMeta.message.fields) {
    itemMeta.message.fields.forEach(f => {
      console.log(` - ${f.fieldname} (${f.fieldtype}, options: ${f.options}, reqd: ${f.reqd}, label: ${f.label})`);
    });
  }

  console.log("\n=== 3. Contractor Commission Rate Child DocType Fields ===");
  const rateMeta = await callApi('frappe.client.get', { doctype: 'DocType', name: 'Contractor Commission Rate' });
  if (rateMeta.message && rateMeta.message.fields) {
    rateMeta.message.fields.forEach(f => {
      console.log(` - ${f.fieldname} (${f.fieldtype}, options: ${f.options}, reqd: ${f.reqd}, label: ${f.label})`);
    });
  }

  console.log("\n=== 4. Existing Commission Batches ===");
  const batches = await callApi('frappe.client.get_list', {
    doctype: 'Commission Batch Request',
    fields: ['*'],
    limit_page_length: 50
  });
  console.log("Count:", batches.message?.length || 0);
  console.log(JSON.stringify(batches.message?.slice(0, 3), null, 2));

  console.log("\n=== 5. Test get_owed_commissions ===");
  const contractors = await callApi('agency_tracking.contractor_api.list_contractors', {});
  const firstContractor = contractors.message?.[0]?.name;
  console.log("Testing get_owed_commissions for contractor:", firstContractor);
  if (firstContractor) {
    const owed = await callApi('agency_tracking.finance_api.get_owed_commissions', {
      contractor: firstContractor
    });
    console.log("Owed commissions response:", JSON.stringify(owed, null, 2));
  }
}

main().catch(console.error);
