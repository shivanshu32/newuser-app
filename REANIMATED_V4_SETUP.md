# React Native Reanimated v4 Setup - FIXED

## Problem
`npx expo prebuild` was failing with error:
```
AssertionError [ERR_ASSERTION]: Unexpected: Config `_internal.projectRoot` isn't defined by expo-cli, this is a bug.
```

And then after fixing prebuild, build was failing with:
```
Execution failed for task ':react-native-reanimated:assertNewArchitectureEnabledTask'.
[Reanimated] Reanimated requires new architecture to be enabled.
```

## Root Cause
1. **react-native-reanimated/plugin** was incorrectly placed in Expo `plugins` array in `app.config.js`
   - It's a **Babel plugin**, not an Expo config plugin
   - When Expo CLI tried to load it as a config plugin, it crashed

2. **react-native-reanimated v4.x requires New Architecture**
   - The babel plugin for v4 is now `react-native-worklets/plugin`
   - New Architecture must be enabled in gradle.properties

## Fixes Applied

### Fix 1: Removed Reanimated from Expo Plugins
**File:** `app.config.js`
```javascript
// BEFORE (WRONG):
plugins: [
  "expo-font",
  "react-native-edge-to-edge",
  "react-native-reanimated/plugin",  // ❌ This crashes prebuild
  ...
]

// AFTER (CORRECT):
plugins: [
  "expo-font",
  "react-native-edge-to-edge",
  // Removed - it's a Babel plugin, not Expo plugin
  ...
]
```

### Fix 2: Added Worklets Plugin to Babel Config
**File:** `babel.config.js`
```javascript
// BEFORE:
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo']
  };
};

// AFTER (CORRECT):
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin']  // ✅ Required for reanimated v4
  };
};
```

### Fix 3: Enabled New Architecture
**File:** `android/gradle.properties`
```properties
# BEFORE:
newArchEnabled=false

# AFTER:
newArchEnabled=true
```

**File:** `app.config.js`
```javascript
android: {
  // ... other config
  newArchEnabled: true,  // ✅ Added
  // ... rest of config
}
```

## Installed Versions
- react-native-reanimated: **4.1.7**
- react-native-worklets: **0.8.3** (auto-installed with reanimated v4)

## Important Notes

### Reanimated v4 Changes
- **Babel plugin changed**: `react-native-reanimated/plugin` → `react-native-worklets/plugin`
- **New Architecture required**: Must set `newArchEnabled=true`
- **Breaking change**: Old reanimated v3 code may need updates

### Apollo GraphQL Warnings (Can Ignore)
You may see warnings like:
```
Apollo: Use of deprecated field `runtimeVersion`
Apollo: Variable `platform` is unused
```
These are from expo-dev-launcher's internal GraphQL files and can be safely ignored.

## Build Commands

### Development Build
```bash
npx expo run:android
```

### Production Build
```bash
cd android
./gradlew assembleRelease
```

### Prebuild (Regenerate Native Folders)
```bash
npx expo prebuild --clean
```

## Verification
✅ Prebuild works without errors
✅ New Architecture enabled in gradle.properties
✅ Worklets plugin configured in babel.config.js
✅ Reanimated v4 compatible configuration

## Status
🎉 **FULLY FIXED AND READY TO BUILD**
