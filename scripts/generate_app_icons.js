import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImage = path.resolve('public/assets/aistudio/file_00000000526082118a00f225ddbadc8f_48c2c0f1.png');

if (!fs.existsSync(sourceImage)) {
  console.error('Source image not found:', sourceImage);
  process.exit(1);
}

const targets = [
  // Web & PWA
  { path: 'public/icon.png', size: 512 },
  { path: 'public/apple-touch-icon.png', size: 180 },
  { path: 'public/favicon.png', size: 64 },
  
  // Android launcher mipmaps
  { path: 'app/src/main/res/mipmap-mdpi/ic_launcher.png', size: 48 },
  { path: 'app/src/main/res/mipmap-mdpi/ic_launcher_round.png', size: 48 },
  { path: 'app/src/main/res/mipmap-hdpi/ic_launcher.png', size: 72 },
  { path: 'app/src/main/res/mipmap-hdpi/ic_launcher_round.png', size: 72 },
  { path: 'app/src/main/res/mipmap-xhdpi/ic_launcher.png', size: 96 },
  { path: 'app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', size: 96 },
  { path: 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png', size: 144 },
  { path: 'app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', size: 144 },
  { path: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', size: 192 },
  { path: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', size: 192 }
];

async function generateIcons() {
  console.log('Generating external application icons from:', sourceImage);
  for (const target of targets) {
    const targetDir = path.dirname(path.resolve(target.path));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    await sharp(sourceImage)
      .resize(target.size, target.size, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.resolve(target.path));
    console.log(`✓ Generated ${target.path} (${target.size}x${target.size})`);
  }
  console.log('Done generating all external app icons.');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
