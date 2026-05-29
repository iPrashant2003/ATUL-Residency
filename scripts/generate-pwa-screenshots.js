const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const screenshotsDir = path.join(publicDir, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshot(url, width, height, outputPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    
    console.log(`Navigating to ${url}...`);
    // Wait until network is idle so all ambient animations and database counts are fully loaded
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait a couple of seconds for any initial layout animations to complete
    await new Promise(r => setTimeout(r, 2000));
    
    console.log(`Capturing screenshot (${width}x${height}) to ${outputPath}...`);
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`✓ Saved ${outputPath}`);
  } catch (error) {
    console.error(`Error capturing screenshot for ${url}:`, error.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log("Starting PWA Screenshot Generator...");
  
  // 1. Desktop Landing Page
  await captureScreenshot(
    'https://atul-residency.vercel.app/',
    1280,
    720,
    path.join(screenshotsDir, 'desktop-home.png')
  );

  // 2. Mobile Landing Page
  await captureScreenshot(
    'https://atul-residency.vercel.app/',
    720,
    1280,
    path.join(screenshotsDir, 'mobile-home.png')
  );

  // 3. Desktop Login Page
  await captureScreenshot(
    'https://atul-residency.vercel.app/login',
    1280,
    720,
    path.join(screenshotsDir, 'desktop-login.png')
  );

  // 4. Mobile Login Page
  await captureScreenshot(
    'https://atul-residency.vercel.app/login',
    720,
    1280,
    path.join(screenshotsDir, 'mobile-login.png')
  );

  console.log("✓ All screenshots generated successfully!");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
