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
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], { 'Content-Type': 'application/json' });
  const cookies = loginRes.headers?.['set-cookie'] || [];
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;
  const authHeaders = { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': csrf };

  // First, upload a sample 1x1 png file
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const png1px = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const headerPart = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="passport_test.png"\r\nContent-Type: image/png\r\n\r\n`);
  const footerPart = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="is_private"\r\n\r\n0\r\n--${boundary}--\r\n`);
  const fullBody = Buffer.concat([headerPart, png1px, footerPart]);

  const uploadRes = await req('/api/method/upload_file', 'POST', fullBody, cookies, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': fullBody.length.toString(),
    'X-Frappe-CSRF-Token': csrf
  });
  console.log('Upload status:', uploadRes.status);
  const fileUrl = uploadRes.body?.message?.file_url;
  console.log('Uploaded file_url:', fileUrl);

  // Now call enqueue_parse_passport_file
  const enqueueRes = await req('/api/method/agency_tracking.passport_parser.enqueue_parse_passport_file', 'POST', JSON.stringify({ file_url: fileUrl }), cookies, authHeaders);
  console.log('enqueue_parse_passport_file status:', enqueueRes.status);
  console.log('enqueue_parse_passport_file body:', JSON.stringify(enqueueRes.body));

  const jobName = enqueueRes.body?.message?.job || enqueueRes.body?.job;
  console.log('Job name:', jobName);
  if (jobName) {
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await req('/api/method/agency_tracking.background_jobs.get_job_status', 'POST', JSON.stringify({ job_name: jobName }), cookies, authHeaders);
      console.log(`Poll ${i + 1} (param job_name) status:`, jobRes.status, 'body:', JSON.stringify(jobRes.body));
      const status = jobRes.body?.message?.status || jobRes.body?.status;
      if (status === 'Completed' || status === 'Failed' || status === 'completed' || status === 'failed') break;
    }
  }
}

main().catch(console.error);
