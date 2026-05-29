const https = require('https');

https.get('https://atul-residency.vercel.app/', (res) => {
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", JSON.stringify(res.headers, null, 2));
}).on('error', (err) => {
  console.error("Error:", err.message);
});
