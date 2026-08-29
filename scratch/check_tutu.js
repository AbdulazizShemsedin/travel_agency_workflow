const https = require('https');

const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr, pwd) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ usr, pwd });
    const req = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve(res.headers['set-cookie'] || []));
    });
    req.write(postData);
    req.end();
  });
}

function req(path, cookies) {
  return new Promise((resolve) => {
    const cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
    const r = https.request({ hostname: HOST, port: 443, path: encodeURI(path), headers: { 'Cookie': cookieHeader } }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.end();
  });
}

async function check() {
  const cookies = await login('Administrator', '1234');
  const user = await req('/api/resource/User/tutu@gmail.com', cookies);
  console.log('User tutu:', JSON.stringify(user.data, null, 2));

  const hasRoleList = await req('/api/resource/Has Role?filters=[["parent","=","tutu@gmail.com"]]&fields=["role"]', cookies);
  console.log('Tutu Roles:', JSON.stringify(hasRoleList.data, null, 2));

  const contractorList = await req('/api/resource/Contractor?fields=["*"]', cookies);
  console.log('Contractors:', JSON.stringify(contractorList.data, null, 2));
}

check().catch(console.error);
