import https from 'https';

const HOST = 'agencytracking-production.up.railway.app';

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
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], {
    'Content-Type': 'application/json'
  });
  const cookies = loginRes.headers['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;

  // Build multipart form-data
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = 'sample content for passport or test';
  
  let body = '';
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n`;
  body += `Content-Type: text/plain\r\n\r\n`;
  body += `${fileContent}\r\n`;
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="is_private"\r\n\r\n`;
  body += `1\r\n`;
  body += `--${boundary}--\r\n`;

  console.log('Testing upload_file with is_private=1 only...');
  const res1 = await req('/api/method/upload_file', 'POST', Buffer.from(body), cookies, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'X-Frappe-CSRF-Token': csrf
  });
  console.log('Upload result 1:', res1.status, JSON.stringify(res1.body, null, 2));

  // Test with attached_to_doctype without attached_to_name
  let body2 = '';
  body2 += `--${boundary}\r\n`;
  body2 += `Content-Disposition: form-data; name="file"; filename="test2.txt"\r\n`;
  body2 += `Content-Type: text/plain\r\n\r\n`;
  body2 += `${fileContent}\r\n`;
  body2 += `--${boundary}\r\n`;
  body2 += `Content-Disposition: form-data; name="is_private"\r\n\r\n`;
  body2 += `1\r\n`;
  body2 += `--${boundary}\r\n`;
  body2 += `Content-Disposition: form-data; name="doctype"\r\n\r\n`;
  body2 += `Agency Complaint\r\n`;
  body2 += `--${boundary}--\r\n`;

  console.log('\nTesting upload_file with doctype=Agency Complaint and no docname...');
  const res2 = await req('/api/method/upload_file', 'POST', Buffer.from(body2), cookies, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'X-Frappe-CSRF-Token': csrf
  });
  console.log('Upload result 2:', res2.status, JSON.stringify(res2.body, null, 2));
}

main().catch(console.error);
