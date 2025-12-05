import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

async function convertSvgToPng(svgPath, pngPath, width, height) {
  const svgBuffer = fs.readFileSync(svgPath);
  await sharp(svgBuffer)
    .resize(width, height)
    .png()
    .toFile(pngPath);
  console.log(`Created: ${pngPath}`);
}

async function main() {
  try {
    // Convert icon.svg to icon.png (200x200)
    await convertSvgToPng(
      path.join(publicDir, 'icon.svg'),
      path.join(publicDir, 'icon.png'),
      200, 200
    );

    // Convert splash.svg to splash.png (200x200)
    await convertSvgToPng(
      path.join(publicDir, 'splash.svg'),
      path.join(publicDir, 'splash.png'),
      200, 200
    );

    // Convert og-image.svg to og-image.png (1200x630)
    await convertSvgToPng(
      path.join(publicDir, 'og-image.svg'),
      path.join(publicDir, 'og-image.png'),
      1200, 630
    );

    console.log('\nAll images converted successfully!');
  } catch (error) {
    console.error('Error converting images:', error);
    process.exit(1);
  }
}

main();
