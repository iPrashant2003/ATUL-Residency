const fs = require('fs');
const path = require('path');

function createSVG(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0D9488"/>
  <text x="50%" y="55%" font-family="Arial,sans-serif" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">AR</text>
</svg>`;
}

// Write SVG files as PNG placeholders (browsers accept SVG in manifest too)
const sizes = [192, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(s => {
  const svg = createSVG(s);
  fs.writeFileSync(path.join(iconsDir, `icon-${s}.svg`), svg);
  console.log(`Created icon-${s}.svg`);
});
