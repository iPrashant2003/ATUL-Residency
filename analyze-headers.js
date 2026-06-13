const fs = require('fs');
const path = require('path');

function run() {
  const filePath = path.join(__dirname, 'scratch', 'curl_response.txt');
  if (!fs.existsSync(filePath)) {
    console.error("File not found!");
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\r\n');
  
  console.log("Parsing Set-Cookie headers:");
  let count = 0;
  let totalLength = 0;

  lines.forEach((line, index) => {
    if (line.toLowerCase().startsWith('set-cookie:')) {
      const value = line.slice(11).trim();
      const parts = value.split(';');
      const cookieNameVal = parts[0];
      const nameIdx = cookieNameVal.indexOf('=');
      const name = cookieNameVal.slice(0, nameIdx).trim();
      const val = cookieNameVal.slice(nameIdx + 1).trim();
      
      console.log(`[${count}] Cookie Name: "${name}" | Value Length: ${val.length} bytes`);
      count++;
      totalLength += val.length;
    }
  });

  console.log(`\nTotal Set-Cookie headers found: ${count}`);
  console.log(`Total cookie value size: ${totalLength} bytes`);
}

run();
