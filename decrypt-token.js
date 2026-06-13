const fs = require('fs');
const path = require('path');
const { decode } = require('next-auth/jwt');
require('@next/env').loadEnvConfig(process.cwd());

async function run() {
  const filePath = path.join(__dirname, 'scratch', 'curl_response.txt');
  if (!fs.existsSync(filePath)) {
    console.error("File not found!");
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\r\n');
  
  // Re-assemble chunked cookie values in order
  const chunks = [];
  lines.forEach((line) => {
    if (line.toLowerCase().startsWith('set-cookie:')) {
      const value = line.slice(11).trim();
      const parts = value.split(';');
      const cookieNameVal = parts[0];
      const nameIdx = cookieNameVal.indexOf('=');
      const name = cookieNameVal.slice(0, nameIdx).trim();
      const val = cookieNameVal.slice(nameIdx + 1).trim();
      
      const match = name.match(/__Secure-authjs\.session-token\.(\d+)/);
      if (match) {
        const index = parseInt(match[1]);
        chunks[index] = val;
      }
    }
  });

  const fullToken = chunks.join('');
  console.log(`Re-assembled token length: ${fullToken.length} characters.`);

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("AUTH_SECRET is required to decrypt the token.");
    return;
  }

  try {
    const decoded = await decode({
      token: fullToken,
      secret: secret,
      salt: '__Secure-authjs.session-token'
    });

    console.log("\n--- DECRYPTED JWT CONTENT BREAKDOWN ---");
    Object.entries(decoded).forEach(([key, val]) => {
      const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
      console.log(`Key: "${key}" | Size: ${valStr.length} bytes | Preview: ${valStr.slice(0, 100)}`);
    });
  } catch (err) {
    try {
      const decoded = await decode({
        token: fullToken,
        secret: secret,
        salt: 'authjs.session-token'
      });
      console.log("\n--- DECRYPTED JWT CONTENT BREAKDOWN (fallback) ---");
      Object.entries(decoded).forEach(([key, val]) => {
        const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
        console.log(`Key: "${key}" | Size: ${valStr.length} bytes | Preview: ${valStr.slice(0, 100)}`);
      });
    } catch (err2) {
      console.error("\n❌ FAILED TO DECRYPT JWT:", err2.message);
    }
  }
}

run().catch(console.error);
