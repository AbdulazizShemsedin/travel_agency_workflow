import https from 'https';

function check(path) {
  return new Promise(resolve => {
    const req = https.request({
      hostname: 'travelagency-production-b48d.up.railway.app',
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ path, status: res.statusCode, data: d.slice(0, 150) }));
    });
    req.on('error', e => resolve({ path, error: e.message }));
    req.end('{}');
  });
}

async function run() {
  console.log(await check('/api/method/agency_tracking.passport_parser.enqueue_parse_passport_file'));
  console.log(await check('/api/method/agency_tracking.background_jobs.get_job_status'));
  console.log(await check('/api/method/agency_tracking.clearance_api.list_my_todos'));
  console.log(await check('/api/method/agency_tracking.finance_api.list_batch_write_offs'));
  console.log(await check('/api/method/agency_tracking.clearance_api.reopen_clearance_step'));
}

run().catch(console.error);
