const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths to clean
const cachePaths = [
  path.join(__dirname, '.expo'),
  path.join(__dirname, 'node_modules', '.cache'),
  path.join(__dirname, '.babel-cache')
];

// Clean cache directories
console.log('Cleaning project cache directories...');
cachePaths.forEach(cachePath => {
  if (fs.existsSync(cachePath)) {
    try {
      console.log(`Removing ${cachePath}...`);
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log(`Successfully removed ${cachePath}`);
    } catch (error) {
      console.error(`Error removing ${cachePath}:`, error);
    }
  } else {
    console.log(`Directory not found: ${cachePath}`);
  }
});

// Update metro.config.js
console.log('Creating simplified metro.config.js...');
const metroConfig = `// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = config;`;

fs.writeFileSync(path.join(__dirname, 'metro.config.js'), metroConfig);
console.log('Created simplified metro.config.js');

console.log('Project cleanup completed successfully!');
console.log('Please try running your app again with: expo start --clear');
