const http = require('http');

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': 'sid=Guest; theme=dark',
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

async function run() {
  // 1. Get latest applicants
  const appList = await req('/api/resource/Applicant?fields=["name","full_name","destination_country","applicant_state","cv_file_url"]&limit_page_length=5&order_by=creation desc');
  console.log('Latest Applicants:', appList.body?.data);

  if (appList.body?.data?.length > 0) {
    const latestApp = appList.body.data[0];
    console.log(`\nTesting generate CV on latest applicant: ${latestApp.name} (${latestApp.full_name})...`);

    const genRes = await req('/api/method/applicant_processing.applicant_processing.doctype.applicant.applicant.generate_cv', 'POST', {
      applicant: latestApp.name
    });
    console.log('Generate CV status:', genRes.status, genRes.body);

    const pdfUrl = genRes.body?.message?.pdf_url || genRes.body?.pdf_url;
    if (pdfUrl) {
      console.log(`\nFetching generated PDF from: ${pdfUrl}`);
      const pdfFetch = await new Promise(res => {
        http.get(`http://localhost:3000${pdfUrl}`, resp => {
          let b = [];
          resp.on('data', c => b.push(c));
          resp.on('end', () => res({ status: resp.statusCode, type: resp.headers['content-type'], length: Buffer.concat(b).length }));
        });
      });
      console.log('PDF fetch result:', pdfFetch);
    }
  }
}

run().catch(console.error);
