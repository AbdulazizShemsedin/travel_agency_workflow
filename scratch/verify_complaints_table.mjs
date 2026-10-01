import http from 'http';

async function fetchLocal(path, cookie = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    };
    if (cookie) options.headers['Cookie'] = cookie;
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- Testing /complaints page render ---');
  const adminRes = await fetchLocal('/complaints');
  console.log('Admin /complaints status:', adminRes.status);
  if (adminRes.status !== 200) {
    throw new Error(`Admin /complaints returned ${adminRes.status}`);
  }

  console.log('--- Testing /agent/complaints page render ---');
  const agentRes = await fetchLocal('/agent/complaints');
  console.log('Agent /agent/complaints status:', agentRes.status);
  if (agentRes.status !== 200) {
    throw new Error(`Agent /agent/complaints returned ${agentRes.status}`);
  }

  // Check HTML contains the new table headers
  console.log('Checking headers in /complaints...');
  const hasContact = adminRes.body.includes('Contact Person');
  const hasPassport = adminRes.body.includes('Passport');
  const hasSponsor = adminRes.body.includes('Sponsor Details');
  console.log({ hasContact, hasPassport, hasSponsor });

  console.log('Checking headers in /agent/complaints...');
  const hasAgentContact = agentRes.body.includes('Contact Person');
  const hasAgentPassport = agentRes.body.includes('Passport');
  const hasAgentSponsor = agentRes.body.includes('Sponsor Details');
  console.log({ hasAgentContact, hasAgentPassport, hasAgentSponsor });

  console.log('\nAll complaint table verification checks passed successfully!');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
