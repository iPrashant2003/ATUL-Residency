const https = require('https');

https.get('https://atul-residency.vercel.app/api/chat', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("PRODUCTION GET Status:", res.statusCode);
    console.log("PRODUCTION GET Response:", data);
  });
}).on('error', (err) => {
  console.error("Error:", err.message);
});
