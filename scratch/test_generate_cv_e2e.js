const http = require('http');

async function testGenerateCv(appId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ applicant_name: appId });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Test with APP-00003 and APP-00005
(async () => {
  console.log('Testing generate_cv on APP-00005...');
  const res = await testGenerateCv('APP-00005');
  console.log('Result for APP-00005:', res.status, res.body);
})();
