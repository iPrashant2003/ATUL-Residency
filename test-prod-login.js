const https = require('https');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function run() {
  const baseUrl = 'https://atul-residency.vercel.app';
  
  console.log("1. Fetching CSRF token...");
  const csrfRes = await makeRequest(`${baseUrl}/api/auth/csrf`);
  
  const setCookieHeader = csrfRes.headers['set-cookie'] ? csrfRes.headers['set-cookie'].join(', ') : '';
  const csrfData = JSON.parse(csrfRes.body);
  const csrfToken = csrfData.csrfToken;

  console.log("CSRF Token from JSON:", csrfToken);
  console.log("Raw Set-Cookie Header:", setCookieHeader);

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
  console.log("Sending Deduplicated Cookie Header:", cookieHeader);

  console.log("\n2. Attempting sign in...");
  
  // Create search params for url-encoded form body
  const body = new URLSearchParams();
  body.append('csrfToken', csrfToken);
  body.append('identifier', 'krishnamanitripathi2003@gmail.com');
  body.append('password', 'Atul@123456');
  body.append('json', 'true');

  const bodyString = body.toString();
  const loginRes = await makeRequest(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(bodyString),
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0'
    },
    body: bodyString
  });

  console.log("Status:", loginRes.status);
  console.log("Headers:");
  Object.entries(loginRes.headers).forEach(([key, val]) => {
    console.log(`  ${key}: ${Array.isArray(val) ? val.join(', ') : val}`);
  });

  console.log("\nResponse Body:", loginRes.body);
}

run().catch(console.error);
