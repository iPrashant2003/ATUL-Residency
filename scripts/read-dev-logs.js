const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\prash\\.gemini\\antigravity\\brain\\638ac3ac-51cb-481c-947c-13b4b025c591\\.system_generated\\tasks\\task-3631.log';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  // Filter out QR code block lines, Polled DB lines, etc.
  const filtered = lines.filter(line => {
    if (line.includes('Polled DB')) return false;
    if (line.includes('SCAN THIS QR CODE')) return false;
    if (line.includes('█') || line.includes('▄') || line.includes('▀')) return false;
    return true;
  });

  console.log("=== LAST 100 FILTERED LOG LINES ===");
  console.log(filtered.slice(-100).join('\n'));
} catch (err) {
  console.error("Error reading log:", err.message);
}
