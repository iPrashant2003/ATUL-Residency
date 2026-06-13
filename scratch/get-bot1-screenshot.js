const fs = require('fs');
const path = require('path');

async function getScreenshot() {
  try {
    const res = await fetch('http://localhost:3001/screenshot?bot=bot1');
    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to fetch screenshot:', text);
      return;
    }
    const buffer = await res.arrayBuffer();
    const destPath = path.join('C:\\Users\\prash\\.gemini\\antigravity\\brain\\638ac3ac-51cb-481c-947c-13b4b025c591', 'bot1-screen.png');
    fs.writeFileSync(destPath, Buffer.from(buffer));
    console.log('Successfully saved screenshot to:', destPath);
  } catch (err) {
    console.error('Error fetching screenshot:', err);
  }
}

getScreenshot();
