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

// Create a simple blue icon with "OL" text
async function createIcon(size, filename) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#3b82f6" rx="${size * 0.2}"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">OL</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(publicDir, filename));
  
  console.log(`Created ${filename} (${size}x${size})`);
}

async function main() {
  try {
    await createIcon(192, 'icon-192.png');
    await createIcon(512, 'icon-512.png');
    console.log('✅ Icons created successfully!');
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

