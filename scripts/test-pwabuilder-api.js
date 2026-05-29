const https = require('https');

https.get('https://pwabuilder-manifest-finder.azurewebsites.net/api/findmanifest?url=https://atul-residency.vercel.app&verbose=true', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("STATUS CODE:", res.statusCode);
      console.log("MANIFEST URL:", parsed.manifestUrl);
      console.log("MANIFEST SCORE DETAILS:");
      console.log(JSON.stringify(parsed.manifestScore, null, 2));
    } catch (e) {
      console.log("Failed to parse response:", data);
    }
  });
}).on('error', (err) => {
  console.error("Error:", err.message);
});
