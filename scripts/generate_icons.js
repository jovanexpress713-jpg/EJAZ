import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgPath = path.resolve('public/icon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Copy SVG to app/src/main/assets/www/icon.svg
fs.mkdirSync('app/src/main/assets/www', { recursive: true });
fs.copyFileSync(svgPath, 'app/src/main/assets/www/icon.svg');

const targets = [
  { file: 'public/icon.png', size: 512 },
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'app/src/main/assets/www/icon.png', size: 512 },
  { file: 'app/src/main/assets/www/apple-touch-icon.png', size: 180 },
  { file: 'app/src/main/res/mipmap-mdpi/ic_launcher.png', size: 48 },
  { file: 'app/src/main/res/mipmap-mdpi/ic_launcher_round.png', size: 48 },
  { file: 'app/src/main/res/mipmap-hdpi/ic_launcher.png', size: 72 },
  { file: 'app/src/main/res/mipmap-hdpi/ic_launcher_round.png', size: 72 },
  { file: 'app/src/main/res/mipmap-xhdpi/ic_launcher.png', size: 96 },
  { file: 'app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', size: 96 },
  { file: 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png', size: 144 },
  { file: 'app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', size: 144 },
  { file: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', size: 192 },
  { file: 'app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', size: 192 },
];

async function generateAll() {
  for (const t of targets) {
    const dir = path.dirname(t.file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png()
      .toFile(t.file);
    console.log(`Generated: ${t.file} (${t.size}x${t.size})`);
  }
  console.log('All icons generated successfully!');
}

generateAll().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
