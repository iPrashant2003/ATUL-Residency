const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Ensure output directories exist
const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Brand SVG Logo markup (centered, beautiful design)
const logoSvg = `
<svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFE259" />
      <stop offset="60%" stopColor="#FFA751" />
      <stop offset="100%" stopColor="#FF6B6B" />
    </linearGradient>
    <linearGradient id="logoTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#00F2FE" />
      <stop offset="100%" stopColor="#4FACFE" />
    </linearGradient>
    <linearGradient id="containerBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#1E1E28" />
      <stop offset="100%" stopColor="#0F0F14" />
    </linearGradient>
    <linearGradient id="containerBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFE259" stopOpacity="0.4" />
      <stop offset="100%" stopColor="#FFA751" stopOpacity="0.15" />
    </linearGradient>
    <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  
  {/* Solid Background filling the entire 100x100 canvas (prevents Windows transparency artifacts) */}
  <rect x="0" y="0" width="100" height="100" fill="url(#containerBg)" />
  <rect x="0.75" y="0.75" width="98.5" height="98.5" stroke="url(#containerBorder)" strokeWidth="1.5" />
  <rect x="4" y="4" width="92" height="92" rx="16" stroke="url(#logoGold)" strokeWidth="0.5" opacity="0.1" />
  
  {/* Logo scaled down to 65% and centered inside the squircle container */}
  <g transform="translate(17.5, 17.5) scale(0.65)">
    <circle cx="50" cy="50" r="42" fill="url(#logoGold)" opacity="0.05" />
    <circle cx="50" cy="50" r="45" stroke="url(#logoGold)" strokeWidth="1" strokeDasharray="3 6" opacity="0.4" />
    
    <path d="M24 82 L47 18 C48 15, 52 15, 53 18 L76 82" stroke="url(#logoGold)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" filter="url(#logoGlow)" />
    <path d="M33 58 L67 58" stroke="url(#logoGold)" strokeWidth="4" strokeLinecap="round" filter="url(#logoGlow)" />
    <path d="M50 24 L50 82" stroke="url(#logoTeal)" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
    <path d="M38 42 L50 30 L62 42" stroke="url(#logoGold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <path d="M30 65 L50 50 L70 65" stroke="url(#logoGold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    <path d="M18 82 L82 82" stroke="url(#logoGold)" strokeWidth="5" strokeLinecap="round" filter="url(#logoGlow)" />
    <path d="M50 6 L52 11 L57 11 L53 14 L55 19 L50 16 L45 19 L47 14 L43 11 L48 11 Z" fill="url(#logoGold)" filter="url(#logoGlow)" />

    <g>
      <circle cx="76" cy="72" r="14" fill="#050606" />
      <circle cx="76" cy="72" r="12" fill="#050606" stroke="url(#logoGold)" strokeWidth="1.5" filter="url(#logoGlow)" />
      <circle cx="76" cy="72" r="12" stroke="url(#logoTeal)" strokeWidth="0.75" opacity="0.8" />
      
      <path d="M71 77 L69 71 L73 73 L76 68 L79 73 L83 71 L81 77 Z" fill="url(#logoGold)" filter="url(#logoGlow)" />
      <path d="M71 77 L69 71 L73 73 L76 68 L79 73 L83 71 L81 77 Z" fill="url(#logoGold)" />
      <rect x="71.5" y="78" width="9" height="1.2" rx="0.4" fill="url(#logoGold)" />
      <circle cx="69" cy="70" r="0.75" fill="url(#logoGold)" />
      <circle cx="76" cy="67" r="0.9" fill="url(#logoGold)" />
      <circle cx="83" cy="70" r="0.75" fill="url(#logoGold)" />
    </g>
  </g>
</svg>
`;

// Save the brand SVG icons directly first
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), logoSvg);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), logoSvg);
console.log('✓ Wrote base brand SVGs.');

async function generateIcons() {
  console.log('Launching Puppeteer to generate PNG PWA icons...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Helper function to render logo in HTML and take a screenshot
  const capturePng = async (width, height, isMaskable = false, isApple = false) => {
    // Standard PWA transparent background icon
    let containerStyle = 'width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;';
    if (isMaskable) {
      // Maskable icons need a solid background and padding (safe zone)
      containerStyle += ' background: #050606; padding: 15vw; box-sizing: border-box;';
    } else if (isApple) {
      // iOS icons cannot be transparent (otherwise they show black background on iOS)
      containerStyle += ' background: #050606; padding: 10vw; box-sizing: border-box;';
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { margin: 0; padding: 0; background: transparent; overflow: hidden; }
            .container { ${containerStyle} }
            svg { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoSvg}
          </div>
        </body>
      </html>
    `;

    await page.setViewport({ width, height });
    await page.setContent(htmlContent);
    // Give gradients and filters a split second to render
    await new Promise(r => setTimeout(r, 100));

    const options = {
      type: 'png',
      omitBackground: !isMaskable && !isApple // Keep background transparent for standard icons
    };

    return await page.screenshot(options);
  };

  // 1. Standard PNG Icons (Transparent Background)
  console.log('Generating standard PWA icons (transparent background)...');
  const icon192 = await capturePng(192, 192, false);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
  console.log('  ✓ icon-192.png');

  const icon512 = await capturePng(512, 512, false);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);
  console.log('  ✓ icon-512.png');

  // 2. Maskable PWA Icons (Dark Background + Padding)
  console.log('Generating PWA maskable icons (safe zone)...');
  const maskable192 = await capturePng(192, 192, true);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), maskable192);
  console.log('  ✓ icon-maskable-192.png');

  const maskable512 = await capturePng(512, 512, true);
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), maskable512);
  console.log('  ✓ icon-maskable-512.png');

  // 3. Apple Touch Icon (180x180 px, Solid Background)
  console.log('Generating iOS Apple Touch icon...');
  const appleIcon = await capturePng(180, 180, false, true);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
  console.log('  ✓ apple-touch-icon.png');

  // 4. Favicon PNG fallback sizes
  console.log('Generating favicon PNG sizes...');
  const favicon32 = await capturePng(32, 32, false);
  fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), favicon32);
  const favicon16 = await capturePng(16, 16, false);
  fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), favicon16);
  console.log('  ✓ favicon PNG sizes.');

  await browser.close();
  console.log('✓ All PWA PNG/SVG icons successfully generated.');
}

generateIcons().catch(err => {
  console.error('Fatal error generating PWA icons:', err);
  process.exit(1);
});
