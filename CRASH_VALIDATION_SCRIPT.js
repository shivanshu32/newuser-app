/**
 * Crash-on-First-Start Validation Script
 * Run this script to validate critical fixes and test crash scenarios
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚨 Starting Crash-on-First-Start Validation...\n');

// Validation checks
const validationChecks = [
  {
    name: 'Android Manifest Permissions',
    check: () => {
      const manifestPath = './android/app/src/main/AndroidManifest.xml';
      const manifest = fs.readFileSync(manifestPath, 'utf8');
      
      const checks = [
        { rule: 'POST_NOTIFICATIONS permission', test: manifest.includes('POST_NOTIFICATIONS') },
        { rule: 'READ_EXTERNAL_STORAGE maxSdkVersion', test: manifest.includes('maxSdkVersion="32"') },
        { rule: 'WRITE_EXTERNAL_STORAGE maxSdkVersion', test: manifest.includes('maxSdkVersion="28"') },
        { rule: 'MainActivity exported', test: manifest.includes('android:exported="true"') }
      ];
      
      return checks;
    }
  },
  {
    name: 'ProGuard Rules',
    check: () => {
      const proguardPath = './android/app/proguard-rules.pro';
      const proguard = fs.readFileSync(proguardPath, 'utf8');
      
      const checks = [
        { rule: 'React Native Core', test: proguard.includes('-keep class com.facebook.react.**') },
        { rule: 'Expo Modules', test: proguard.includes('-keep class expo.modules.**') },
        { rule: 'App Classes', test: proguard.includes('-keep class com.jyotishtalk.**') },
        { rule: 'React Methods', test: proguard.includes('@com.facebook.react.bridge.ReactMethod') },
        { rule: 'Hermes Engine', test: proguard.includes('-keep class com.facebook.hermes.**') }
      ];
      
      return checks;
    }
  },
  {
    name: 'Error Boundary Implementation',
    check: () => {
      const errorBoundaryPath = './src/components/ErrorBoundary.js';
      const appPath = './App.js';
      
      const checks = [
        { rule: 'ErrorBoundary file exists', test: fs.existsSync(errorBoundaryPath) },
        { rule: 'ErrorBoundary imported in App.js', test: fs.readFileSync(appPath, 'utf8').includes('ErrorBoundary') },
        { rule: 'App wrapped with ErrorBoundary', test: fs.readFileSync(appPath, 'utf8').includes('<ErrorBoundary>') }
      ];
      
      return checks;
    }
  },
  {
    name: 'AuthContext Error Handling',
    check: () => {
      const authContextPath = './src/context/AuthContext.js';
      const authContext = fs.readFileSync(authContextPath, 'utf8');
      
      const checks = [
        { rule: 'Corrupted data detection', test: authContext.includes('Invalid user data structure') },
        { rule: 'AsyncStorage cleanup', test: authContext.includes('multiRemove') },
        { rule: 'Token validation', test: authContext.includes('Invalid token format') },
        { rule: 'Comprehensive logging', test: authContext.includes('🚨 [AuthContext]') }
      ];
      
      return checks;
    }
  },
  {
    name: 'Version Check Safety',
    check: () => {
      const appPath = './App.js';
      const app = fs.readFileSync(appPath, 'utf8');
      
      const checks = [
        { rule: 'Promise race with timeout', test: app.includes('Promise.race') },
        { rule: 'Error handling for version check', test: app.includes('versionCheckPromise') },
        { rule: 'Non-blocking startup', test: app.includes('setVersionCheckComplete(true)') },
        { rule: 'Graceful failure handling', test: app.includes('updateData.error') }
      ];
      
      return checks;
    }
  }
];

// Run validation checks
let totalChecks = 0;
let passedChecks = 0;

validationChecks.forEach(validation => {
  console.log(`\n📋 ${validation.name}:`);
  const checks = validation.check();
  
  checks.forEach(check => {
    totalChecks++;
    const status = check.test ? '✅' : '❌';
    console.log(`  ${status} ${check.rule}`);
    if (check.test) passedChecks++;
  });
});

console.log(`\n📊 Validation Summary:`);
console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);
console.log(`❌ Failed: ${totalChecks - passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
  console.log('\n🎉 All critical fixes validated successfully!');
  console.log('📱 App is ready for crash-free first-start testing.');
} else {
  console.log('\n⚠️  Some critical fixes are missing or incomplete.');
  console.log('📱 Please review and apply missing fixes before testing.');
}

console.log('\n🧪 Next Steps:');
console.log('1. Run: npx expo run:android --variant release');
console.log('2. Test on Android 12+ devices');
console.log('3. Monitor crash-free session rate');
console.log('4. Compare install-to-login conversion rates');

console.log('\n📈 Monitoring Commands:');
console.log('- adb logcat | grep "JyotishCall"');
console.log('- adb logcat | grep "FATAL"');
console.log('- adb logcat | grep "AndroidRuntime"');
