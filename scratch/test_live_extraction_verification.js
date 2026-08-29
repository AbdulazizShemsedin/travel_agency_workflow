const http = require('http');

async function checkNextDev() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/resource/Applicant?limit_page_length=3',
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing Next.js local server API proxy...');
  try {
    const res = await checkNextDev();
    console.log('Next.js API proxy GET /api/resource/Applicant status:', res.status);
    console.log('Response sample:', res.body.slice(0, 200));
  } catch (err) {
    console.log('Next.js server test error:', err.message);
  }
}

run();
