import http from 'http';

const routes = [
  '/',
  '/login',
  '/dashboard',
  '/applicants',
  '/applicants/new',
  '/commission',
  '/complaints',
  '/contractors',
  '/employees',
  '/expenses-income',
  '/notifications',
  '/reports',
  '/settings',
  '/agent',
  '/agent/discovery',
  '/agent/reserved',
  '/agent/commission',
  '/agent/complaints',
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${route}`, (res) => {
      resolve({ route, status: res.statusCode });
    });
    req.on('error', (err) => {
      resolve({ route, status: 'ERROR', error: err.message });
    });
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ route, status: 'TIMEOUT' });
    });
  });
}

async function run() {
  console.log('Testing App Router routes...');
  for (const r of routes) {
    const res = await checkRoute(r);
    console.log(`[${res.status}] ${res.route}`);
  }
}

run();
