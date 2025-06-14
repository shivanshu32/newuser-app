// This is a workaround for the missing importLocationsPlugin module
// Create a mock implementation of the missing module
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'node_modules', 'metro', 'src', 'ModuleGraph', 'worker');
const mockFile = path.join(targetDir, 'importLocationsPlugin.js');

// Ensure directory exists
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Create a mock implementation of the missing module
const mockContent = `
// Mock implementation of importLocationsPlugin
module.exports = function importLocationsPlugin() {
  return {
    visitor: {
      ImportDeclaration() {},
      ExportNamedDeclaration() {},
      ExportAllDeclaration() {},
      ExportDefaultDeclaration() {}
    }
  };
};
`;

// Write the mock file
fs.writeFileSync(mockFile, mockContent);

console.log('Created mock implementation for importLocationsPlugin');
