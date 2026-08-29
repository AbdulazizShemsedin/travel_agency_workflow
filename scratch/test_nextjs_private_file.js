const http = require('http');

function req(path, cookie = 'sid=Guest; theme=dark') {
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: 'localhost',
      port: 3000,
      path: encodeURI(path),
      method: 'GET',
      headers: {
        'Accept': '*/*',
        ...(cookie ? { 'Cookie': cookie } : {})
      }
    }, resp => {
      let d = [];
      resp.on('data', c => d.push(c));
      resp.on('end', () => {
        const buf = Buffer.concat(d);
        resolve({
          status: resp.statusCode,
          contentType: resp.headers['content-type'],
          length: buf.length,
          preview: buf.toString('utf8').slice(0, 100)
        });
      });
    });
    r.on('error', reject);
    r.end();
  });
}

async function run() {
  const filePath = '/private/files/CV-APP-00006-CV-00008712266.pdf';
  console.log('Testing Next.js Proxy for private file:', filePath);
  const res = await req(filePath);
  console.log('Status:', res.status);
  console.log('Content-Type:', res.contentType);
  console.log('Bytes received:', res.length);
  console.log('Starts with PDF magic header %PDF-:', res.preview.startsWith('%PDF-'));
}

run().catch(console.error);
