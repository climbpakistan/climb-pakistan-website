const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '..', 'frontend', 'main', 'public', 'logo-original.png');
const data = fs.readFileSync(pngPath);
const base64 = data.toString('base64');

// 1. logo.svg - full size
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4000 4000" width="4000" height="4000">
  <image href="data:image/png;base64,${base64}" width="4000" height="4000"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'main', 'public', 'logo.svg'), logoSvg);
console.log('✅ Created logo.svg');

// 2. favicon.svg - for browser tab
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <image href="data:image/png;base64,${base64}" width="100" height="100"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'main', 'public', 'favicon.svg'), faviconSvg);
console.log('✅ Created favicon.svg');

// 3. og-default.svg - 1200x630 social banner with properly sized/positioned logo
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a120d"/>
      <stop offset="100%" stop-color="#0e1712"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#3fbf6a" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0a120d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <image href="data:image/png;base64,${base64}" x="300" y="15" width="600" height="600"/>
</svg>`;
fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'main', 'public', 'og-default.svg'), ogSvg);
console.log('✅ Created og-default.svg');

console.log('\\nAll SVG files generated successfully!');
