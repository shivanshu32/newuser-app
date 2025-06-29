# Native WebRTC Migration Setup Guide

## Overview
This guide will help you migrate from WebView-based WebRTC to native `react-native-webrtc` for better performance and lower latency.

## Prerequisites
- Node.js installed
- Expo CLI installed
- EAS CLI installed

## Step 1: Install Dependencies

### Option A: Using Command Prompt (Bypass PowerShell)
Open Command Prompt (cmd) as Administrator and run:
```cmd
cd "c:\Users\shubh\OneDrive\Desktop\jyotishcall2\user-app"
npm install react-native-webrtc
npm install @config-plugins/react-native-webrtc
npm install expo-dev-client
```

### Option B: Using PowerShell with Execution Policy Override
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
npm install react-native-webrtc @config-plugins/react-native-webrtc expo-dev-client
```

### Option C: Using Yarn (Alternative)
```cmd
yarn add react-native-webrtc @config-plugins/react-native-webrtc expo-dev-client
```

## Step 2: Update Package.json Scripts

Add these scripts to your `package.json`:
```json
{
  "scripts": {
    "dev-client": "expo install --fix && eas build --profile development --platform android",
    "dev-client-ios": "expo install --fix && eas build --profile development --platform ios"
  }
}
```

## Step 3: Update EAS Build Configuration

Update your `eas.json` to include development build profile:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

## Step 4: Configure App Config

Replace your `app.json` with the new `app.config.js` (already created) that includes:
- WebRTC permissions for Android and iOS
- Development client plugin
- WebRTC config plugin

## Step 5: Build Development Client

### For Android:
```cmd
eas build --profile development --platform android
```

### For iOS:
```cmd
eas build --profile development --platform ios
```

## Step 6: Install Development Client

1. Download the development build APK/IPA from EAS
2. Install it on your test device
3. The development client will allow you to load your app with native WebRTC support

## Step 7: Update Navigation

Add the new `NativeVideoCallScreen` to your navigation:

```javascript
// In your navigation file
import NativeVideoCallScreen from '../screens/NativeVideoCallScreen';

// Add to your stack navigator
<Stack.Screen 
  name="NativeVideoCall" 
  component={NativeVideoCallScreen}
  options={{ headerShown: false }}
/>
```

## Step 8: Update Call Initiation

Replace WebView navigation with native screen navigation:

```javascript
// Instead of navigating to VideoConsultationScreen
navigation.navigate('NativeVideoCall', {
  consultationId: consultation.id,
  astrologerId: consultation.astrologer.id,
  isAstrologer: false
});
```

## Step 9: Testing

### Development Testing:
1. Start your development server: `expo start --dev-client`
2. Open the development client app on your device
3. Scan the QR code or enter the URL
4. Test video calls between user and astrologer apps

### Production Testing:
1. Build preview APK with native WebRTC: `eas build --profile preview --platform android`
2. Install and test on real devices

## Step 10: Cleanup (After Successful Migration)

Once native WebRTC is working:
1. Remove WebView-based video call screens
2. Remove `webrtc.html` and `voice-webrtc.html` files
3. Update navigation to remove old screens
4. Remove unused WebView dependencies if not used elsewhere

## Troubleshooting

### Common Issues:

1. **Build Fails with WebRTC Errors:**
   - Ensure you have the latest version of `@config-plugins/react-native-webrtc`
   - Check that all permissions are properly configured

2. **Camera/Microphone Access Denied:**
   - Verify permissions in `app.config.js`
   - Check device settings for app permissions

3. **Connection Issues:**
   - Ensure STUN servers are accessible
   - Check network connectivity
   - Verify signaling server is reachable

4. **Development Client Won't Load:**
   - Ensure you're using the development build, not Expo Go
   - Check that `expo-dev-client` is properly installed

### Debug Commands:
```cmd
# Check installed packages
npm list react-native-webrtc

# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Check EAS build logs
eas build:list
```

## Performance Benefits

After migration, you should see:
- **Lower Latency:** Direct native WebRTC vs WebView overhead
- **Better Audio Quality:** Native audio processing
- **Improved Video Performance:** Hardware-accelerated encoding/decoding
- **Better Battery Life:** More efficient native implementation
- **Enhanced Stability:** No WebView crashes or limitations

## Next Steps

1. Install dependencies using one of the methods above
2. Build and install development client
3. Test native video calls
4. Gradually replace WebView screens
5. Deploy to production after thorough testing

## Support

If you encounter issues:
1. Check the console logs for WebRTC errors
2. Verify all permissions are granted
3. Test on multiple devices
4. Check network connectivity and STUN server access
