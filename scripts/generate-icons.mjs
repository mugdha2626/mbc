import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const appDir = path.join(rootDir, 'app');
const sourceIcon = path.join(publicDir, 'icon_1.png');

async function generateIcon(outputPath, size, options = {}) {
  try {
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png({
        quality: 100,
        compressionLevel: 9
      })
      .toFile(outputPath);
    console.log(`✓ Created: ${outputPath} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Error creating ${outputPath}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('Generating icons from icon_1.png...\n');

    // Ensure app directory exists
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Next.js App Router icon (512x512) - Next.js will auto-generate favicons from this
    await generateIcon(
      path.join(appDir, 'icon.png'),
      512
    );

    // Public icon for general use (512x512)
    await generateIcon(
      path.join(publicDir, 'icon.png'),
      512
    );

    // Apple touch icon (180x180) - iOS standard
    await generateIcon(
      path.join(publicDir, 'apple-icon.png'),
      180
    );

    // PWA icons
    await generateIcon(
      path.join(publicDir, 'icon-192.png'),
      192
    );

    await generateIcon(
      path.join(publicDir, 'icon-512.png'),
      512
    );

    // Favicon sizes
    await generateIcon(
      path.join(publicDir, 'favicon-16.png'),
      16
    );

    await generateIcon(
      path.join(publicDir, 'favicon-32.png'),
      32
    );

    console.log('\n✓ All icons generated successfully!');
    console.log('\nNext.js will automatically generate favicons from app/icon.png');
  } catch (error) {
    console.error('\n✗ Error generating icons:', error);
    process.exit(1);
  }
}

main();

