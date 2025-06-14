const fs = require('fs');
const path = require('path');

// Path to the main babel.config.js file
const mainBabelConfigPath = path.join(__dirname, 'babel.config.js');

// Create a minimal babel.config.js file
const minimalBabelConfig = `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo']
  };
};`;

// Write the minimal babel config
fs.writeFileSync(mainBabelConfigPath, minimalBabelConfig);
console.log('Created minimal babel.config.js without plugins');

// Try to fix any problematic babel configurations in node_modules
try {
  // Check if the expo babel preset exists
  const expoBabelPresetPath = path.join(__dirname, 'node_modules', 'babel-preset-expo');
  if (fs.existsSync(expoBabelPresetPath)) {
    console.log('Found babel-preset-expo');
  } else {
    console.log('Warning: babel-preset-expo not found in node_modules');
  }
  
  // Check for any problematic babel config in @expo/cli
  const expoBabelConfigPath = path.join(__dirname, 'node_modules', '@expo', 'cli', 'static', 'template', 'babel.config.js');
  if (fs.existsSync(expoBabelConfigPath)) {
    console.log('Found @expo/cli babel config template');
    
    // Read the content to check for issues
    const content = fs.readFileSync(expoBabelConfigPath, 'utf8');
    console.log('Expo CLI babel template content:', content);
  }
  
} catch (error) {
  console.error('Error checking node_modules babel configs:', error);
}

console.log('Babel plugin fix completed');
