import https from 'https';

const HOST = 'travelagency-production-b48d.up.railway.app';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
    const r = https.request({
      hostname: HOST,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...headers
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(d); } catch (e) { parsed = d; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    r.on('error', (err) => resolve({ error: err.message }));
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], {
    'Content-Type': 'application/json'
  });
  const cookies = loginRes.headers?.['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;

  console.log('Setting System Settings max_file_size to 1024 MB (1 GB)...');
  const setRes = await req('/api/method/frappe.client.set_value', 'POST', JSON.stringify({
    doctype: 'System Settings',
    name: 'System Settings',
    fieldname: 'max_file_size',
    value: 1024
  }), cookies, {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': csrf
  });
  console.log('Set status:', setRes.status, setRes.body);

  // Now test upload of 30 MB
  const sizeMB = 30;
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const targetBytes = sizeMB * 1024 * 1024;
  const chunk = Buffer.alloc(targetBytes, 'a');

  const headerPart = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_${sizeMB}mb.mp4"\r\nContent-Type: video/mp4\r\n\r\n`
  );
  const footerPart = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="is_private"\r\n\r\n1\r\n--${boundary}--\r\n`
  );

  const fullBody = Buffer.concat([headerPart, chunk, footerPart]);

  console.log(`\nTesting upload of ${sizeMB} MB (${fullBody.length} bytes) to test if 25MB limit was lifted...`);
  const startTime = Date.now();
  const res = await req('/api/method/upload_file', 'POST', fullBody, cookies, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': fullBody.length.toString(),
    'X-Frappe-CSRF-Token': csrf
  });
  const elapsed = Date.now() - startTime;
  console.log(`Status: ${res.status} (${elapsed}ms)`);
  if (typeof res.body === 'string') {
    console.log(`Body (first 300 chars): ${res.body.slice(0, 300)}`);
  } else {
    console.log(`Body:`, JSON.stringify(res.body)?.slice(0, 300));
  }
}

main().catch(console.error);
