const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { JSDOM } = require('jsdom');
const { SVGPathData } = require('svg-pathdata');
const sharp = require('sharp');

async function convertSvgToPng(svgPath, pngPath, size = 1024) {
  try {
    // Read SVG file
    console.log(`Reading SVG file: ${svgPath}`);
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    // Use sharp for the conversion
    console.log(`Converting to PNG with size: ${size}x${size}`);
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(`Successfully created PNG file: ${pngPath}`);
    return true;
  } catch (error) {
    console.error('Error converting SVG to PNG:', error);
    return false;
  }
}

// Convert icon-square.svg to icon-square.png
const assetsDir = path.join(__dirname, 'assets');
const svgPath = path.join(assetsDir, 'icon-square.svg');
const pngPath = path.join(assetsDir, 'icon-square.png');

// Install required packages if not already installed
console.log('Installing required packages...');
const { execSync } = require('child_process');
try {
  execSync('npm list sharp || npm install sharp', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to install sharp:', error);
  process.exit(1);
}

// Run the conversion
console.log('Starting conversion...');
convertSvgToPng(svgPath, pngPath)
  .then(success => {
    if (success) {
      console.log('Conversion completed successfully!');
      console.log('Now update your app.json to use the new PNG file.');
    } else {
      console.error('Conversion failed.');
    }
  })
  .catch(error => {
    console.error('Conversion process error:', error);
  });
