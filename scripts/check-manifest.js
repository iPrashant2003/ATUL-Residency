const https = require('https');

function getUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function run() {
  const assets = [
    'https://atul-residency.vercel.app/manifest.json',
    'https://atul-residency.vercel.app/sw.js',
    'https://atul-residency.vercel.app/offline',
    'https://atul-residency.vercel.app/.well-known/assetlinks.json',
    'https://atul-residency.vercel.app/.well-known/apple-app-site-association'
  ];

  for (const asset of assets) {
    try {
      const res = await getUrl(asset);
      console.log(`ASSET: ${asset}`);
      console.log(`STATUS: ${res.status}`);
      console.log(`CONTENT TYPE: ${res.headers['content-type']}`);
      console.log(`LOCATION: ${res.headers['location'] || 'None'}`);
      console.log("-----------------------------------------");
    } catch (err) {
      console.error(`Error for ${asset}:`, err.message);
    }
  }
}

run();
