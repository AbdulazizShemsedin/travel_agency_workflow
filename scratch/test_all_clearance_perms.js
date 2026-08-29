const https = require('https');
const HOST = 'applicantprocessing-production-e2e7.up.railway.app';

function login(usr = 'Administrator', pwd = '1234') {
  return new Promise(res => {
    const data = JSON.stringify({ usr, pwd });
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: '/api/method/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => res(resp.headers['set-cookie'] || []));
    });
    r.write(data);
    r.end();
  });
}

function req(path, method, body, cookies) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: HOST,
      port: 443,
      path: encodeURI(path),
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => {
        try {
          resolve({ status: resp.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: resp.statusCode, raw: d });
        }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const ROLES = ['System Manager', 'LMS Employee', 'Clearance Officer', 'Recruitment Officer', 'Staff'];
const DOCTYPES = [
  'LMS Clearance',
  'Injaz Clearance',
  'Wakala Clearance',
  'Embassy Clearance',
  'Telesign Clearance',
  'DSR Stamp',
  'DSR Ticket',
  'DSR Departure',
  'DSR'
];

async function run() {
  const cookies = await login();
  console.log('Logged in as Administrator');

  // Query existing Custom DocPerms
  const existing = await req('/api/resource/Custom DocPerm?fields=["name","parent","role"]&limit_page_length=200', 'GET', null, cookies);
  const existingMap = new Set((existing.body?.data || []).map(p => `${p.parent}_${p.role}`));

  for (const dt of DOCTYPES) {
    for (const role of ROLES) {
      const key = `${dt}_${role}`;
      if (!existingMap.has(key)) {
        const res = await req('/api/resource/Custom DocPerm', 'POST', {
          parent: dt,
          parenttype: 'DocType',
          parentfield: 'permissions',
          role: role,
          permlevel: 0,
          read: 1,
          write: 1,
          create: 1,
          delete: 1,
          share: 1,
          print: 1,
          email: 1
        }, cookies);
        console.log(`Created Custom DocPerm for ${key}:`, res.status);
      }
    }
  }

  // Clear Frappe cache
  const clearCache = await req('/api/method/frappe.handler.clear_cache', 'POST', {}, cookies);
  console.log('Clear cache status:', clearCache.status);
}

run().catch(console.error);
