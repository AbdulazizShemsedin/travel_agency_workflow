import https from 'https';

function req(path, method = 'GET', body = null, cookies = [], headers = {}) {
  return new Promise(resolve => {
    const r = https.request({
      hostname: 'travelagency-production-b48d.up.railway.app',
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
  const loginRes = await req('/api/method/login', 'POST', JSON.stringify({ usr: 'Administrator', pwd: 'admin123' }), [], { 'Content-Type': 'application/json' });
  const cookies = loginRes.headers?.['set-cookie'] || [];
  const csrfRes = await req('/api/method/agency_tracking.auth_api.get_csrf_token', 'GET', null, cookies);
  const csrf = csrfRes.body?.message?.csrf_token;
  const authHeaders = { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': csrf };

  const todosRes = await req('/api/method/agency_tracking.clearance_api.list_my_todos', 'POST', JSON.stringify({ status: 'Open' }), cookies, authHeaders);
  console.log('list_my_todos (Open) status:', todosRes.status);
  console.log('list_my_todos count:', todosRes.body?.message?.length);
  if (todosRes.body?.message?.length > 0) {
    console.log('Sample todo:', JSON.stringify(todosRes.body.message[0], null, 2));
  } else {
    const allTodosRes = await req('/api/method/agency_tracking.clearance_api.list_my_todos', 'POST', JSON.stringify({ status: '' }), cookies, authHeaders);
    console.log('list_my_todos (All) status:', allTodosRes.status, 'count:', allTodosRes.body?.message?.length);
    if (allTodosRes.body?.message?.length > 0) {
      console.log('Sample all todo:', JSON.stringify(allTodosRes.body.message[0], null, 2));
    }
  }
}
main().catch(console.error);
