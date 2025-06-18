#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes to generate
const iconSizes = [192, 512];

// Function to download a file
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (error) => {
      fs.unlink(outputPath, () => {}); // Delete the file if there's an error
      reject(error);
    });
  });
}

// Generate icons
async function generateIcons() {
  try {
    console.log('Setting up PWA icons...');
    
    // Create a simple placeholder icon
    for (const size of iconSizes) {
      const outputFile = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      // Skip if the file already exists
      if (fs.existsSync(outputFile)) {
        console.log(`Icon already exists: ${outputFile}`);
        continue;
      }
      
      // Create a simple colored square as a placeholder
      const canvas = require('canvas').createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Draw a gradient background
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#4f46e5');
      gradient.addColorStop(1, '#7c3aed');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      
      // Add text in the center
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${size / 5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('RC', size / 2, size / 2);
      
      // Save the image
      const out = fs.createWriteStream(outputFile);
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      
      console.log(`Created placeholder icon: ${outputFile}`);
    }
    
    console.log('PWA icon setup complete!');
    console.log('To use custom icons, replace the files in the public/icons directory with your own.');
  } catch (error) {
    console.error('Error setting up PWA icons:', error);
    console.log('Falling back to manual icon setup...');
    
    // Create a simple text file with instructions
    const readmePath = path.join(iconsDir, 'README.txt');
    const instructions = `
PWA Icons Setup
==============

To set up your PWA icons:

1. Place your icon files in this directory with the following names:
   - icon-192x192.png (192x192 pixels)
   - icon-512x512.png (512x512 pixels)

2. Ensure the icons are square and in PNG format.

3. The icons will be used for the PWA app icon on different devices.

Note: These icons are automatically referenced in the web app manifest.
`;
    
    fs.writeFileSync(readmePath, instructions.trim());
    console.log(`Created instructions at: ${readmePath}`);
  }
}

// Install canvas if not already installed
function ensureCanvas() {
  try {
    require.resolve('canvas');
  } catch (e) {
    console.log('Installing canvas package...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install canvas --save-dev', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to install canvas. Using fallback method.');
      throw error;
    }
  }
}

// Run the setup
(async () => {
  try {
    ensureCanvas();
    await generateIcons();
  } catch (error) {
    console.error('Failed to set up PWA assets:', error);
    process.exit(1);
  }
})();
