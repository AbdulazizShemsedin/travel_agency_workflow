import http from 'http';

function req(path, method = 'GET', body = null, cookies = []) {
  return new Promise(resolve => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Cookie': cookies.map(c => c.split(';')[0]).join('; '),
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    if (data) r.write(data);
    r.end();
  });
}

async function updateBackendUserRoles() {
  const loginRes = await req('/api/method/login', 'POST', { usr: 'Administrator', pwd: 'admin123' });
  const cookies = loginRes.headers['set-cookie'] || [];
  
  // Get tutu@gmail.com
  const userRes = await req('/api/method/frappe.client.get', 'POST', {
    doctype: 'User',
    name: 'tutu@gmail.com'
  }, cookies);
  const doc = JSON.parse(userRes.body).message;
  if (doc) {
    const rolesToRemove = new Set(['Manager', 'System Manager', 'Administrator']);
    let hasAdmin = doc.roles.some(r => r.role.toLowerCase() === 'admin');
    
    // Filter out Manager, System Manager, Administrator
    let newRoles = doc.roles.filter(r => !rolesToRemove.has(r.role));
    if (!hasAdmin) {
      newRoles.push({ role: 'Admin' });
    }
    
    doc.roles = newRoles;
    const saveRes = await req('/api/method/frappe.client.save', 'POST', {
      doc: doc
    }, cookies);
    console.log('tutu@gmail.com save status:', saveRes.status);
    const saved = JSON.parse(saveRes.body).message;
    console.log('Updated tutu roles:', (saved?.roles || []).map(r => r.role).filter(r => ['Admin', 'Manager', 'System Manager', 'Administrator'].includes(r)));
  }
}

updateBackendUserRoles().catch(console.error);
