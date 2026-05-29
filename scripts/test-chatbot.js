const http = require('http');
const https = require('https');

const payload = JSON.stringify({
  message: "hi",
  history: []
});

function testPost(url, name) {
  const lib = url.startsWith('https') ? https : http;
  const req = lib.request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`[${name} POST] Status: ${res.statusCode}`);
      console.log(`[${name} POST] Response:`, data);
    });
  });

  req.on('error', (err) => {
    console.error(`[${name} POST] Error:`, err.message);
  });

  req.write(payload);
  req.end();
}

function testGet(url, name) {
  const lib = url.startsWith('https') ? https : http;
  lib.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log(`[${name} GET] Status: ${res.statusCode}`);
      console.log(`[${name} GET] Response:`, data);
    });
  }).on('error', (err) => {
    console.error(`[${name} GET] Error:`, err.message);
  });
}

// Test local
testGet('http://localhost:3000/api/chat', 'LOCAL');
testPost('http://localhost:3000/api/chat', 'LOCAL');

// Test production primary
testGet('https://atul-residency.vercel.app/api/chat', 'PRODUCTION');
testPost('https://atul-residency.vercel.app/api/chat', 'PRODUCTION');

// Test production specific
testGet('https://atul-residency-d0fgfagce.vercel.app/api/chat', 'PROD-SPECIFIC');
testPost('https://atul-residency-d0fgfagce.vercel.app/api/chat', 'PROD-SPECIFIC');
