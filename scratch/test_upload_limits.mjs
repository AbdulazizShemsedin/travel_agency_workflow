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

async function testUploadOfSize(sizeMB, cookies, csrf) {
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

  console.log(`\nTesting upload of ${sizeMB} MB (${fullBody.length} bytes)...`);
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
  return res.status;
}

async function main() {
  console.log('Logging in to live backend...');
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], {
    'Content-Type': 'application/json'
  });
  const cookies = loginRes.headers?.['set-cookie'] || [];

  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;
  console.log('CSRF:', csrf ? 'Obtained' : 'Failed');

  // Test various sizes
  for (const size of [1, 5, 10, 15, 20, 25, 50]) {
    const status = await testUploadOfSize(size, cookies, csrf);
    if (status === 413) {
      console.log(`\n>>> 413 LIMIT HIT AT ${size} MB <<<`);
      break;
    }
  }
}

main().catch(console.error);
