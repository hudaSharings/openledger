// Simple script to create placeholder PWA icons
// Run with: node scripts/create-icons.js
// Requires: sharp package (npm install sharp --save-dev)

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(process.cwd(), 'public');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a professional ledger/book icon
async function createIcon(size, filename) {
  const padding = size * 0.15;
  const bookWidth = size * 0.7;
  const bookHeight = size * 0.8;
  const bookX = (size - bookWidth) / 2;
  const bookY = (size - bookHeight) / 2;
  const lineSpacing = bookHeight / 8;
  const lineStartX = bookX + bookWidth * 0.2;
  const lineEndX = bookX + bookWidth * 0.8;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background with gradient -->
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="bookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f3f4f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Rounded background -->
      <rect width="${size}" height="${size}" fill="url(#bgGradient)" rx="${size * 0.25}"/>
      
      <!-- Book/Ledger shape -->
      <rect x="${bookX}" y="${bookY}" width="${bookWidth}" height="${bookHeight}" 
            fill="url(#bookGradient)" rx="${size * 0.05}" stroke="#e5e7eb" stroke-width="${size * 0.01}"/>
      
      <!-- Book binding (left edge) -->
      <rect x="${bookX}" y="${bookY}" width="${bookWidth * 0.08}" height="${bookHeight}" 
            fill="#d1d5db" rx="${size * 0.02}"/>
      
      <!-- Ledger lines -->
      ${Array.from({ length: 6 }, (_, i) => {
        const y = bookY + bookHeight * 0.25 + (i * lineSpacing);
        return `<line x1="${lineStartX}" y1="${y}" x2="${lineEndX}" y2="${y}" 
                      stroke="#9ca3af" stroke-width="${size * 0.008}" stroke-linecap="round"/>`;
      }).join('\n      ')}
      
      <!-- Dollar sign or currency symbol in center -->
      <text x="${size / 2}" y="${bookY + bookHeight * 0.6}" 
            font-family="Arial, sans-serif" font-size="${size * 0.25}" 
            font-weight="bold" fill="#3b82f6" text-anchor="middle" 
            dominant-baseline="middle">₹</text>
      
      <!-- Small decorative circles (like bullet points) -->
      ${Array.from({ length: 3 }, (_, i) => {
        const y = bookY + bookHeight * 0.25 + (i * lineSpacing * 2);
        const x = lineStartX - size * 0.03;
        return `<circle cx="${x}" cy="${y}" r="${size * 0.015}" fill="#3b82f6" opacity="0.6"/>`;
      }).join('\n      ')}
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(publicDir, filename));
  
  console.log(`Created ${filename} (${size}x${size})`);
}

// Create favicon (16x16, 32x32, 48x48 sizes in one ICO file)
async function createFavicon() {
  // Create 32x32 version for favicon
  const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill="url(#bgGrad)" rx="6"/>
      <rect x="5" y="4" width="22" height="24" fill="#ffffff" rx="2"/>
      <rect x="5" y="4" width="2" height="24" fill="#d1d5db" rx="1"/>
      <line x1="9" y1="10" x2="23" y2="10" stroke="#9ca3af" stroke-width="0.5"/>
      <line x1="9" y1="13" x2="23" y2="13" stroke="#9ca3af" stroke-width="0.5"/>
      <line x1="9" y1="16" x2="23" y2="16" stroke="#9ca3af" stroke-width="0.5"/>
      <text x="16" y="22" font-family="Arial" font-size="8" font-weight="bold" fill="#3b82f6" text-anchor="middle" dominant-baseline="middle">₹</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  
  // Also create as .ico (though .png works fine for modern browsers)
  console.log('Created favicon.png (32x32)');
}

async function main() {
  try {
    await createIcon(192, 'icon-192.png');
    await createIcon(512, 'icon-512.png');
    await createFavicon();
    console.log('✅ All icons created successfully!');
    console.log('\n📱 Icon files:');
    console.log('   - icon-192.png (192x192) - PWA icon');
    console.log('   - icon-512.png (512x512) - PWA icon');
    console.log('   - favicon.png (32x32) - Browser favicon');
  } catch (error) {
    console.error('❌ Error creating icons:', error.message);
    console.log('\n📝 Alternative: Create icons manually:');
    console.log('   1. Create 192x192 PNG image → save as public/icon-192.png');
    console.log('   2. Create 512x512 PNG image → save as public/icon-512.png');
    console.log('   3. Use any image editor or online tool like:');
    console.log('      - https://www.pwabuilder.com/imageGenerator');
    console.log('      - https://realfavicongenerator.net/');
  }
}

main();

