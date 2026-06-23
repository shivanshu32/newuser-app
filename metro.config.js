const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// Add custom source extensions
config.resolver.sourceExts.push('cjs');

// Force transpilation of packages that use private class fields (#private)
// which Hermes doesn't support natively
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Ensure these packages are transpiled (they contain ES6+ syntax)
config.resolver.unstable_enablePackageExports = false;

const defaultBlockList = Array.isArray(config.resolver.blockList)
  ? config.resolver.blockList
  : [config.resolver.blockList].filter(Boolean);

config.resolver.blockList = [
  ...defaultBlockList,
  /node_modules[\\/].*[\\/]android[\\/]build[\\/].*/,
];

module.exports = config;