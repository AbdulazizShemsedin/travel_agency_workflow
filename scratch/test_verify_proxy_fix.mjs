import http from 'http';

function req(path, method = 'GET', body = null, headers = {}) {
  return new Promise(resolve => {
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: headers
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

async function testUploadOfSize(sizeMB) {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const targetBytes = sizeMB * 1024 * 1024;
  const chunk = Buffer.alloc(targetBytes, 'a');

  const headerPart = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_verify_${sizeMB}mb.mp4"\r\nContent-Type: video/mp4\r\n\r\n`
  );
  const footerPart = Buffer.from(
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="is_private"\r\n\r\n1\r\n--${boundary}--\r\n`
  );

  const fullBody = Buffer.concat([headerPart, chunk, footerPart]);

  console.log(`\n[Test Proxy] Uploading ${sizeMB} MB through http://localhost:3000/api/method/upload_file...`);
  const startTime = Date.now();
  const res = await req('/api/method/upload_file', 'POST', fullBody, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': fullBody.length.toString(),
  });
  const elapsed = Date.now() - startTime;
  console.log(`[Test Proxy] HTTP Status: ${res.status} (${elapsed}ms)`);
  console.log(`[Test Proxy] Response:`, typeof res.body === 'string' ? res.body.slice(0, 300) : JSON.stringify(res.body)?.slice(0, 300));
  return res;
}

async function main() {
  console.log('Verifying Local Proxy Upload Behavior...');
  const res10 = await testUploadOfSize(10);
  console.log('Result for 10MB:', res10.status === 200 ? 'SUCCESS 200' : 'FAILED: ' + res10.status);
}

main().catch(console.error);
