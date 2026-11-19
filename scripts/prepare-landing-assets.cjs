const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputImagePath = 'C:/Users/HP/.gemini/antigravity/brain/a614bd65-d4bd-4e48-bff6-9139572a4ede/.user_uploaded/media_1794904726423_f2fa7471.jpg';
const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

async function extractAssets() {
  const image = sharp(inputImagePath);
  const metadata = await image.metadata();
  console.log('Source image dimensions:', metadata.width, 'x', metadata.height);

  // 1. Hospital Logo Seal from Navbar (x: 35, y: 0, width: 62, height: 60)
  await sharp(inputImagePath)
    .extract({ left: 35, top: 2, width: 60, height: 55 })
    .png()
    .toFile(path.join(imagesDir, 'hospital-seal.png'));
  console.log('Saved hospital-seal.png');

  // 2. Hospital Building Hero Banner (right side and central building)
  // The hero spans top ~58 to ~298. Left: 0 to 1024
  await sharp(inputImagePath)
    .extract({ left: 0, top: 58, width: 1024, height: 240 })
    .jpeg({ quality: 95 })
    .toFile(path.join(imagesDir, 'hero-banner-full.jpg'));
  console.log('Saved hero-banner-full.jpg');

  // Also crop the building itself (x: 430, y: 60, width: 594, height: 236)
  await sharp(inputImagePath)
    .extract({ left: 430, top: 60, width: 590, height: 235 })
    .jpeg({ quality: 95 })
    .toFile(path.join(imagesDir, 'hospital-building.jpg'));
  console.log('Saved hospital-building.jpg');

  // 3. Doctor Callout promo card (x: 690, y: 645, width: 310, height: 110)
  await sharp(inputImagePath)
    .extract({ left: 695, top: 648, width: 300, height: 110 })
    .png()
    .toFile(path.join(imagesDir, 'doctor-promo-card.png'));
  console.log('Saved doctor-promo-card.png');

  // Doctor portrait specifically (x: 885, y: 648, width: 110, height: 110)
  await sharp(inputImagePath)
    .extract({ left: 880, top: 648, width: 115, height: 110 })
    .png()
    .toFile(path.join(imagesDir, 'doctor-portrait.png'));
  console.log('Saved doctor-portrait.png');

  console.log('All image assets extracted successfully.');
}

extractAssets().catch(err => {
  console.error('Extraction error:', err);
  process.exit(1);
});
