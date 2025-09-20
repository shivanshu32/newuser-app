# Build Troubleshooting Guide for JyotishCall User App

## Issues Fixed

### 1. JavaScript Bundle Creation Error
**Error**: `createBundleReleaseJsAndAssets` failed with exit code -1073740791

**Root Cause**: Metro bundler configuration issues and memory constraints during bundle creation.

**Fixes Applied**:
- Updated `metro.config.js` with proper Sentry integration
- Added minifier configuration to handle large bundles
- Disabled problematic custom serializers
- Added memory optimization settings

### 2. Sentry Upload Error
**Error**: `createBundleReleaseJsAndAssets_SentryUpload` failed with exit code 1

**Root Cause**: Sentry source map upload failing during build process.

**Fixes Applied**:
- Disabled `uploadSourceMaps` in `app.config.js`
- Updated Sentry configuration to prevent build failures
- Can be re-enabled after successful build

## Build Steps (In Order)

### Step 1: Run Build Fix Script
```bash
npm run fix-build
```

### Step 2: Clean and Reinstall Dependencies
```bash
npm run clean
# OR manually:
npx expo install --fix
cd android
./gradlew clean
cd ..
```

### Step 3: Try Building
```bash
npm run build-android
# OR manually:
npx expo run:android --variant release
```

## Alternative Build Methods

### Method 1: EAS Build (Recommended)
```bash
# Install EAS CLI if not installed
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android --profile production
```

### Method 2: Local Build with Gradle
```bash
cd android
./gradlew assembleRelease
```

### Method 3: Expo Build (Legacy)
```bash
expo build:android
```

## Common Issues and Solutions

### Issue: Out of Memory Error
**Solution**: Add to `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
org.gradle.daemon=true
```

### Issue: Sentry Upload Fails
**Solution**: Temporarily disable in `app.config.js`:
```javascript
"uploadSourceMaps": false
```

### Issue: Metro Bundler Crashes
**Solution**: Clear Metro cache:
```bash
npx expo start --clear
```

### Issue: Android Build Tools Issues
**Solution**: Update Android SDK and build tools:
```bash
# In Android Studio, go to SDK Manager
# Update to latest Android SDK Platform-Tools
# Update to latest Android SDK Build-Tools
```

## Configuration Files Updated

1. **metro.config.js**: Enhanced with proper Sentry integration and bundle optimization
2. **app.config.js**: Disabled Sentry source map uploads
3. **package.json**: Added build scripts for easier troubleshooting
4. **gradle.properties**: (Auto-created) Optimized Gradle settings
5. **sentry.properties**: (Auto-created) Disabled Sentry uploads during build

## Memory and Performance Optimizations

### Gradle JVM Settings
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.daemon=true
org.gradle.caching=true
```

### Metro Bundle Optimization
- Disabled custom serializers that can cause crashes
- Added minifier configuration for better compression
- Optimized source map generation

## Debugging Build Issues

### Enable Verbose Logging
```bash
npx expo run:android --variant release --verbose
```

### Check Gradle Logs
```bash
cd android
./gradlew assembleRelease --stacktrace --info
```

### Check Metro Logs
```bash
npx expo start --clear --verbose
```

## Post-Build Steps

### Re-enable Sentry (Optional)
After successful build, you can re-enable Sentry source maps:
1. Set `"uploadSourceMaps": true` in `app.config.js`
2. Ensure Sentry auth token is configured
3. Test build again

### Verify APK
```bash
# Check APK location
ls -la android/app/build/outputs/apk/release/

# Install APK for testing
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Environment Requirements

- Node.js 18+ 
- Java 17 (for Android builds)
- Android SDK 34+
- Gradle 8.0+
- Expo CLI 6+

## Support

If build issues persist:
1. Check Expo documentation: https://docs.expo.dev/
2. Check React Native troubleshooting: https://reactnative.dev/docs/troubleshooting
3. Check Sentry React Native docs: https://docs.sentry.io/platforms/react-native/

## Build Success Indicators

✅ Bundle creation completes without memory errors
✅ Sentry upload either succeeds or is properly disabled
✅ APK is generated in `android/app/build/outputs/apk/release/`
✅ APK installs and runs on device without crashes
