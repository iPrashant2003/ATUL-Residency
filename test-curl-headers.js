const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  const baseUrl = 'https://atul-residency.vercel.app';
  
  console.log("1. Fetching CSRF token...");
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const setCookieHeader = csrfRes.headers.get('set-cookie') || '';
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  if (!csrfToken || !setCookieHeader) {
    console.error("Failed to get CSRF token or cookies!");
    return;
  }

  // Parse and deduplicate cookies, keeping the latest value for each name
  const cookieParts = setCookieHeader.split(',').map(c => c.trim().split(';')[0]).filter(Boolean);
  const cookieMap = {};
  cookieParts.forEach(part => {
    const idx = part.indexOf('=');
    if (idx !== -1) {
      const name = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      cookieMap[name] = val;
    }
  });

  const cookieHeader = Object.entries(cookieMap).map(([name, val]) => `${name}=${val}`).join('; ');

  console.log("\n2. Executing curl command and writing to scratch/curl_response.txt...");
  const postData = `csrfToken=${csrfToken}&identifier=krishnamanitripathi2003%40gmail.com&password=Atul%40123456&json=true`;
  const curlCommand = `curl -i -X POST -H "Content-Type: application/x-www-form-urlencoded" -H "Cookie: ${cookieHeader}" -H "User-Agent: Mozilla/5.0" -d "${postData}" ${baseUrl}/api/auth/callback/credentials`;
  
  try {
    const output = execSync(curlCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    const scratchDir = path.join(__dirname, 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir);
    }
    fs.writeFileSync(path.join(scratchDir, 'curl_response.txt'), output, 'utf8');
    console.log("Response written successfully.");
  } catch (err) {
    console.error("Curl execution failed:", err);
  }
}

run().catch(console.error);
