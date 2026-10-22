import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const wwwDir = path.resolve('app/src/main/assets/www');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run vite build first.');
  process.exit(1);
}

// Ensure destination exists
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// Copy recursively from dist to app/src/main/assets/www
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Clean old files in wwwDir except keep icon if exists
fs.readdirSync(wwwDir).forEach((file) => {
  const filePath = path.join(wwwDir, file);
  fs.rmSync(filePath, { recursive: true, force: true });
});

// Copy new dist assets
copyRecursiveSync(distDir, wwwDir);

// Also copy icon.svg and icon.png if present
if (fs.existsSync('public/icon.svg')) {
  fs.copyFileSync('public/icon.svg', path.join(wwwDir, 'icon.svg'));
}
if (fs.existsSync('public/icon.png')) {
  fs.copyFileSync('public/icon.png', path.join(wwwDir, 'icon.png'));
}
if (fs.existsSync('public/apple-touch-icon.png')) {
  fs.copyFileSync('public/apple-touch-icon.png', path.join(wwwDir, 'apple-touch-icon.png'));
}

console.log('✅ Successfully synced compiled web assets to app/src/main/assets/www/');
