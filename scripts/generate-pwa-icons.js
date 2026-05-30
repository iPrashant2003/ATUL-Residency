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
    <!-- Background Bright Premium Gradient -->
    <linearGradient id="iconBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="50%" stop-color="#8B5CF6" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
    
    <!-- Glassmorphic Highlight/Sheen Gradient -->
    <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.3" />
      <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- Glassmorphic Border/Bezel Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6" />
      <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.45" />
    </linearGradient>

    <!-- Platinum/Gold Reflective Emblem Gradient -->
    <linearGradient id="emblemGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="30%" stop-color="#FFF7E0" />
      <stop offset="70%" stop-color="#FFE082" />
      <stop offset="100%" stop-color="#FFB300" />
    </linearGradient>

    <!-- Glowing Electric Cyan/Teal Gradient for Central Pillar -->
    <linearGradient id="emblemCyan" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00F5FF" />
      <stop offset="100%" stop-color="#00A8FF" />
    </linearGradient>
 
    <!-- Soft Drop Shadow to give 3D depth to the emblem -->
    <filter id="emblemShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>
  
  <!-- Base Background Squircle (rx will be replaced by 0 for full bleed in maskable/Apple icons) -->
  <rect class="icon-bg-rect" x="0" y="0" width="100" height="100" rx="22" fill="url(#iconBg)" />
  
  <!-- Glassmorphic Diagonal Sheen Overlay -->
  <rect class="icon-bg-rect" x="0" y="0" width="100" height="100" rx="22" fill="url(#highlight)" />
  
  <!-- Outer fine detailed rings for architectural luxury look -->
  <circle cx="50" cy="50" r="42" stroke="#FFFFFF" stroke-width="0.75" stroke-dasharray="3 6" opacity="0.25" />
  <circle cx="50" cy="50" r="39" stroke="#FFFFFF" stroke-width="0.5" opacity="0.15" />
  
  <!-- The A-Frame Structure (representing Atul Residency) -->
  <path d="M24 82 L47 18 C48 15, 52 15, 53 18 L76 82" stroke="url(#emblemGold)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#emblemShadow)" />
  <path d="M33 58 L67 58" stroke="url(#emblemGold)" stroke-width="4" stroke-linecap="round" filter="url(#emblemShadow)" />
  
  <!-- Central Glass/Teal core rounded bar -->
  <rect x="48.25" y="24" width="3.5" height="58" rx="1.75" fill="url(#emblemCyan)" filter="url(#emblemShadow)" />
  
  <!-- Decorative Modern Balconies -->
  <path d="M38 42 L50 30 L62 42" stroke="url(#emblemGold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#emblemShadow)" opacity="0.8" />
  <path d="M30 65 L50 50 L70 65" stroke="url(#emblemGold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#emblemShadow)" opacity="0.8" />
  
  <!-- Building Base Foundation -->
  <path d="M18 82 L82 82" stroke="url(#emblemGold)" stroke-width="5" stroke-linecap="round" filter="url(#emblemShadow)" />
  
  <!-- Star representing excellence and luxury -->
  <path d="M50 6 L52 11 L57 11 L53 14 L55 19 L50 16 L45 19 L47 14 L43 11 L48 11 Z" fill="url(#emblemGold)" filter="url(#emblemShadow)" />

  <!-- Outer Glassmorphic Border (rx replaced similarly) -->
  <rect class="icon-bg-rect" x="0.75" y="0.75" width="98.5" height="98.5" rx="21.25" stroke="url(#borderGrad)" stroke-width="1.5" fill="none" />
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
    // Standard PWA transparent background icon (SVG contains the squircle, so outside is transparent)
    let containerStyle = 'width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center;';
    if (isMaskable) {
      // Maskable icons need a solid background and padding (safe zone)
      // Use the exact same premium gradient as the SVG background to bleed perfectly to the edges
      containerStyle += ' background: linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #EC4899 100%); padding: 15vw; box-sizing: border-box;';
    } else if (isApple) {
      // iOS icons cannot be transparent
      containerStyle += ' background: linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #EC4899 100%); padding: 10vw; box-sizing: border-box;';
    }

    // Adapt SVG background corner radius for full bleed rendering if it's maskable or apple touch icon
    let currentSvg = logoSvg;
    if (isMaskable || isApple) {
      currentSvg = currentSvg
        .replace(/rx="22"/g, 'rx="0"')
        .replace(/rx="21.25"/g, 'rx="0"');
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
            ${currentSvg}
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
