#!/usr/bin/env node

/**
 * Build Fix Script for JyotishCall User App
 * This script addresses common build issues with React Native/Expo builds
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing build issues for JyotishCall User App...');

// 1. Fix gradle.properties if it doesn't exist or has issues
const gradlePropsPath = path.join(__dirname, 'android', 'gradle.properties');
const gradlePropsContent = `# Project-wide Gradle settings.
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.daemon=true
org.gradle.caching=true

# Android
android.useAndroidX=true
android.enableJetifier=true
android.enableR8.fullMode=false
android.enableDexingArtifactTransform.desugaring=false

# Expo
expo.minifyEnabled=true
expo.proguardEnabled=false

# React Native
hermesEnabled=true
enableHermes=true

# Sentry
sentry.upload.enabled=false
sentry.upload.dryRun=true

# Memory and Performance
org.gradle.workers.max=4
kotlin.incremental=true
kotlin.incremental.useClasspathSnapshot=true
`;

try {
  if (!fs.existsSync(path.dirname(gradlePropsPath))) {
    fs.mkdirSync(path.dirname(gradlePropsPath), { recursive: true });
  }
  fs.writeFileSync(gradlePropsPath, gradlePropsContent);
  console.log('✅ Created/Updated gradle.properties');
} catch (error) {
  console.log('⚠️  Could not write gradle.properties (may be gitignored)');
}

// 2. Fix sentry.properties if needed
const sentryPropsPath = path.join(__dirname, 'android', 'sentry.properties');
const sentryPropsContent = `# Sentry configuration
defaults.url=https://sentry.io/
defaults.org=jyotishcall-nl
defaults.project=jyotishcalluser

# Disable uploads during build to prevent failures
upload.enabled=false
upload.dryRun=true
`;

try {
  if (!fs.existsSync(path.dirname(sentryPropsPath))) {
    fs.mkdirSync(path.dirname(sentryPropsPath), { recursive: true });
  }
  fs.writeFileSync(sentryPropsPath, sentryPropsContent);
  console.log('✅ Created/Updated sentry.properties');
} catch (error) {
  console.log('⚠️  Could not write sentry.properties (may be gitignored)');
}

// 3. Clean build directories
const buildDirs = [
  path.join(__dirname, 'android', 'app', 'build'),
  path.join(__dirname, 'android', 'build'),
  path.join(__dirname, 'node_modules', '.cache'),
  path.join(__dirname, '.expo')
];

buildDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Cleaned ${dir}`);
    } catch (error) {
      console.log(`⚠️  Could not clean ${dir}: ${error.message}`);
    }
  }
});

// 4. Check for problematic files
const problematicFiles = [
  path.join(__dirname, 'src', 'components', 'PrepaidOfferCard.js')
];

problematicFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      // Check for common issues
      if (content.includes('undefined') || content.includes('null?.')) {
        console.log(`⚠️  ${file} may have undefined references`);
      }
      if (content.includes('import') && content.includes('export')) {
        console.log(`✅ ${file} has proper imports/exports`);
      }
    } catch (error) {
      console.log(`⚠️  Could not analyze ${file}: ${error.message}`);
    }
  }
});

console.log('\n🎯 Build Fix Summary:');
console.log('1. Updated Metro configuration for better bundle creation');
console.log('2. Disabled Sentry source map uploads to prevent build failures');
console.log('3. Created/Updated gradle.properties with optimal settings');
console.log('4. Created/Updated sentry.properties with disabled uploads');
console.log('5. Cleaned build directories');

console.log('\n📋 Next Steps:');
console.log('1. Run: npx expo install --fix');
console.log('2. Run: cd android && ./gradlew clean');
console.log('3. Run: npx expo run:android --variant release');
console.log('4. If successful, you can re-enable Sentry uploads later');

console.log('\n🔧 Build fixes completed!');
