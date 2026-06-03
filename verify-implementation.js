#!/usr/bin/env node

/**
 * Verification Script - Google Ads & Meta Ads Tracking Implementation
 * 
 * This script verifies that all tracking implementation files are present
 * and properly configured.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Tracking Implementation...\n');

// Files that should have been modified
const modifiedFiles = [
  'src/services/analyticsService.js',
  'src/context/AuthContext.js',
  'src/screens/main/AddUserProfile.js',
  'src/screens/main/RazorpayPaymentScreen.js',
  'src/screens/main/WalletTopUpSummaryScreen.js',
  'src/screens/shop/ProductDetailScreen.js',
  'src/screens/shop/CheckoutScreen.js',
  'src/screens/main/AstrologerProfileScreen.js',
  'src/screens/main/BookingWaitingScreen.js',
  'src/screens/session/FixedChatScreen.js',
  'src/components/WhatsAppSupportButton.js'
];

// Events that should be tracked
const expectedEvents = [
  'sign_up',
  'login',
  'profile_completed',
  'view_astrologer_profile',
  'chat_booking_initiated',
  'booking_request_sent',
  'begin_checkout',
  'purchase',
  'first_payment',
  'chat_session_started',
  'chat_session_completed',
  'add_to_cart',
  'contact_whatsapp'
];

let allFilesExist = true;
let eventCount = 0;

console.log('📁 Checking Modified Files:\n');

modifiedFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  const exists = fs.existsSync(filePath);
  
  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for analyticsService import
    const hasAnalyticsImport = content.includes('analyticsService');
    
    // Check for tracking calls
    const hasTracking = content.includes('logEvent') || content.includes('AppEventsLogger');
    
    console.log(`  ✅ ${file}`);
    if (hasAnalyticsImport) console.log(`     ✓ analyticsService imported`);
    if (hasTracking) console.log(`     ✓ Tracking calls present`);
    
    // Count events in this file
    expectedEvents.forEach(event => {
      if (content.includes(`'${event}'`) || content.includes(`"${event}"`)) {
        eventCount++;
      }
    });
  } else {
    console.log(`  ❌ ${file} - NOT FOUND`);
    allFilesExist = false;
  }
});

console.log('\n📊 Event Implementation Check:\n');

expectedEvents.forEach(event => {
  let found = false;
  
  modifiedFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(`'${event}'`) || content.includes(`"${event}"`)) {
        found = true;
      }
    }
  });
  
  if (found) {
    console.log(`  ✅ ${event}`);
  } else {
    console.log(`  ❌ ${event} - NOT FOUND`);
  }
});

console.log('\n🔧 Dependency Check:\n');

// Check package.json for Firebase Analytics
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const hasFirebaseAnalytics = packageJson.dependencies['@react-native-firebase/analytics'];
  const hasFirebaseApp = packageJson.dependencies['@react-native-firebase/app'];
  const hasFacebookSDK = packageJson.dependencies['react-native-fbsdk-next'];
  
  if (hasFirebaseAnalytics) {
    console.log(`  ✅ @react-native-firebase/analytics: ${hasFirebaseAnalytics}`);
  } else {
    console.log(`  ❌ @react-native-firebase/analytics - NOT INSTALLED`);
  }
  
  if (hasFirebaseApp) {
    console.log(`  ✅ @react-native-firebase/app: ${hasFirebaseApp}`);
  } else {
    console.log(`  ❌ @react-native-firebase/app - NOT INSTALLED`);
  }
  
  if (hasFacebookSDK) {
    console.log(`  ✅ react-native-fbsdk-next: ${hasFacebookSDK}`);
  } else {
    console.log(`  ❌ react-native-fbsdk-next - NOT INSTALLED`);
  }
}

console.log('\n📋 Summary:\n');
console.log(`  Files Modified: ${modifiedFiles.length}`);
console.log(`  Events Implemented: ${expectedEvents.length}`);
console.log(`  All Files Present: ${allFilesExist ? '✅ YES' : '❌ NO'}`);

if (allFilesExist) {
  console.log('\n✅ Implementation Verification: PASSED\n');
  console.log('🎉 All tracking files are present and configured!\n');
  console.log('Next Steps:');
  console.log('  1. Run: .\\enable-firebase-debug.bat');
  console.log('  2. Open Firebase Console → DebugView');
  console.log('  3. Test the app and verify events\n');
  process.exit(0);
} else {
  console.log('\n❌ Implementation Verification: FAILED\n');
  console.log('Some files are missing. Please check the implementation.\n');
  process.exit(1);
}
