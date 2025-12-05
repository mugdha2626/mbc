import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const sourceIcon = path.join(publicDir, 'icon_1.png');

// Color palette based on the logo
const COLORS = {
  background: '#DCD0E6', // Light lavender background
  darkPurple: '#4A3C5B', // Dark purple for text
  lightPurple: '#9b87c5', // Medium purple
  accentPurple: '#B8A5D0', // Accent purple
};

async function generateOGImage() {
  const width = 1200;
  const height = 630;
  const logoSize = 280;
  
  // Load and resize the logo
  const logo = await sharp(sourceIcon)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create modern SVG background with gradient and decorative elements
  const svgBackground = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Main gradient background -->
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#E8DFF0;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#DCD0E6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#D0C4DC;stop-opacity:1" />
        </linearGradient>
        
        <!-- Subtle pattern -->
        <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="20" cy="20" r="1.5" fill="${COLORS.lightPurple}" opacity="0.3"/>
        </pattern>
        
        <!-- Glow effect for logo area -->
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:#fff;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#fff;stop-opacity:0" />
        </radialGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
      <rect width="${width}" height="${height}" fill="url(#dots)"/>
      
      <!-- Decorative circles -->
      <circle cx="100" cy="100" r="200" fill="${COLORS.accentPurple}" opacity="0.15"/>
      <circle cx="${width - 100}" cy="${height - 80}" r="180" fill="${COLORS.lightPurple}" opacity="0.12"/>
      <circle cx="${width / 2}" cy="${height + 100}" r="300" fill="${COLORS.accentPurple}" opacity="0.08"/>
      
      <!-- Subtle glow behind logo area -->
      <ellipse cx="300" cy="${height / 2}" rx="200" ry="180" fill="url(#glow)"/>
      
      <!-- Modern line accents -->
      <line x1="80" y1="${height - 60}" x2="200" y2="${height - 60}" stroke="${COLORS.lightPurple}" stroke-width="3" opacity="0.4" stroke-linecap="round"/>
      <line x1="${width - 200}" y1="60" x2="${width - 80}" y2="60" stroke="${COLORS.lightPurple}" stroke-width="3" opacity="0.4" stroke-linecap="round"/>
      
      <!-- Text content -->
      <text x="680" y="${height / 2 - 60}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" font-size="96" font-weight="700" fill="${COLORS.darkPurple}" letter-spacing="-2">tmap</text>
      <text x="680" y="${height / 2 + 20}" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif" font-size="32" fill="${COLORS.darkPurple}" opacity="0.75">Social Map of Food Culture</text>
      
      <!-- Feature pills -->
      <g transform="translate(680, ${height / 2 + 70})">
        <rect x="0" y="0" width="100" height="32" rx="16" fill="${COLORS.lightPurple}" opacity="0.3"/>
        <text x="50" y="21" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="14" fill="${COLORS.darkPurple}" text-anchor="middle" font-weight="500">Discover</text>
        
        <rect x="115" y="0" width="70" height="32" rx="16" fill="${COLORS.lightPurple}" opacity="0.3"/>
        <text x="150" y="21" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="14" fill="${COLORS.darkPurple}" text-anchor="middle" font-weight="500">Mint</text>
        
        <rect x="200" y="0" width="80" height="32" rx="16" fill="${COLORS.lightPurple}" opacity="0.3"/>
        <text x="240" y="21" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" font-size="14" fill="${COLORS.darkPurple}" text-anchor="middle" font-weight="500">Trade</text>
      </g>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgBackground);
  
  // Create base image from SVG
  const baseImage = await sharp(svgBuffer).toBuffer();
  
  // Composite logo onto the base
  const finalImage = await sharp(baseImage)
    .composite([
      {
        input: logo,
        top: Math.round((height - logoSize) / 2),
        left: Math.round(160),
      },
    ])
    .png({
      quality: 100,
      compressionLevel: 9,
    })
    .toFile(path.join(publicDir, 'og-image.png'));

  console.log(`✓ Created: ${path.join(publicDir, 'og-image.png')} (${width}x${height})`);
}

async function generateSplashImage() {
  const size = 512;
  const logoSize = Math.round(size * 0.55);
  
  // Load and resize the logo
  const logo = await sharp(sourceIcon)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create modern SVG background for splash
  const svgBackground = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Radial gradient for depth -->
        <radialGradient id="splashBg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" style="stop-color:#EDE6F2;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#D8CCE4;stop-opacity:1" />
        </radialGradient>
        
        <!-- Glow effect -->
        <radialGradient id="centerGlow" cx="50%" cy="45%" r="40%">
          <stop offset="0%" style="stop-color:#fff;stop-opacity:0.5" />
          <stop offset="100%" style="stop-color:#fff;stop-opacity:0" />
        </radialGradient>
        
        <!-- Subtle ring pattern -->
        <radialGradient id="ring" cx="50%" cy="50%" r="50%">
          <stop offset="80%" style="stop-color:transparent;stop-opacity:0" />
          <stop offset="82%" style="stop-color:${COLORS.lightPurple};stop-opacity:0.1" />
          <stop offset="85%" style="stop-color:transparent;stop-opacity:0" />
        </radialGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${size}" height="${size}" fill="url(#splashBg)"/>
      
      <!-- Decorative elements -->
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="none" stroke="${COLORS.lightPurple}" stroke-width="1" opacity="0.2"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.38}" fill="none" stroke="${COLORS.lightPurple}" stroke-width="0.5" opacity="0.15"/>
      
      <!-- Center glow -->
      <ellipse cx="${size / 2}" cy="${size * 0.42}" rx="${size * 0.35}" ry="${size * 0.3}" fill="url(#centerGlow)"/>
      
      <!-- Subtle corner accents -->
      <circle cx="60" cy="60" r="80" fill="${COLORS.accentPurple}" opacity="0.08"/>
      <circle cx="${size - 60}" cy="${size - 60}" r="80" fill="${COLORS.lightPurple}" opacity="0.08"/>
      
      <!-- Loading indicator dots (subtle branding) -->
      <g transform="translate(${size / 2}, ${size - 70})">
        <circle cx="-20" cy="0" r="4" fill="${COLORS.lightPurple}" opacity="0.5"/>
        <circle cx="0" cy="0" r="4" fill="${COLORS.darkPurple}" opacity="0.7"/>
        <circle cx="20" cy="0" r="4" fill="${COLORS.lightPurple}" opacity="0.5"/>
      </g>
    </svg>
  `;

  const svgBuffer = Buffer.from(svgBackground);
  
  // Create base image from SVG
  const baseImage = await sharp(svgBuffer).toBuffer();
  
  // Composite logo centered
  const finalImage = await sharp(baseImage)
    .composite([
      {
        input: logo,
        top: Math.round((size - logoSize) / 2) - 20,
        left: Math.round((size - logoSize) / 2),
      },
    ])
    .png({
      quality: 100,
      compressionLevel: 9,
    })
    .toFile(path.join(publicDir, 'splash.png'));

  console.log(`✓ Created: ${path.join(publicDir, 'splash.png')} (${size}x${size})`);
}

async function main() {
  try {
    console.log('Generating og-image.png and splash.png from new logo...\n');
    
    await generateOGImage();
    await generateSplashImage();
    
    console.log('\n✓ All images generated successfully!');
  } catch (error) {
    console.error('\n✗ Error generating images:', error);
    process.exit(1);
  }
}

main();

