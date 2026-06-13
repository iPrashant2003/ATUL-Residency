const { execSync } = require('child_process');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  const baseUrl = 'https://atul-residency.vercel.app';
  
  console.log("1. Fetching CSRF token...");
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  
  const setCookieHeader = csrfRes.headers.get('set-cookie') || '';
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  console.log("CSRF Token:", csrfToken);

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
  console.log("Sending Cookie Header:", cookieHeader);

  console.log("\n2. Executing curl command...");
  
  const postData = `csrfToken=${csrfToken}&identifier=krishnamanitripathi2003%40gmail.com&password=Atul%40123456&json=true`;
  const curlCommand = `curl -i -X POST -H "Content-Type: application/x-www-form-urlencoded" -H "Cookie: ${cookieHeader}" -H "User-Agent: Mozilla/5.0" -d "${postData}" ${baseUrl}/api/auth/callback/credentials`;
  
  console.log("Running command:", curlCommand);
  try {
    const output = execSync(curlCommand, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log("\n--- RAW HTTP RESPONSE FROM CURL ---");
    console.log(output);
  } catch (err) {
    console.error("Curl execution failed:", err);
  }
}

run().catch(console.error);
