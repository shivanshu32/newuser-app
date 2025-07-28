# 🔥 Firebase Setup Guide for User-App

## Overview
This guide will help you add your user-app to your existing Firebase project to enable FCM (Firebase Cloud Messaging) push notifications.

## Step 1: Firebase Console Setup

### 1.1 Add Android App
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your existing project (the one your astrologer-app uses)
3. Click "Add app" → Select **Android**
4. Fill in the details:
   - **Android package name**: `com.jyotishtalk`
   - **App nickname**: `Jyotish Call User Android`
   - **Debug signing certificate SHA-1**: (leave empty for now)
5. Click "Register app"
6. **Download `google-services.json`**
7. **IMPORTANT**: Place the `google-services.json` file in:
   ```
   user-app/android/app/google-services.json
   ```

### 1.2 Add iOS App
1. In the same Firebase project, click "Add app" → Select **iOS**
2. Fill in the details:
   - **iOS bundle ID**: `com.jyotishtalk`
   - **App nickname**: `Jyotish Call User iOS`
   - **App Store ID**: (leave empty for now)
3. Click "Register app"
4. **Download `GoogleService-Info.plist`**
5. **IMPORTANT**: Place the `GoogleService-Info.plist` file in:
   ```
   user-app/ios/GoogleService-Info.plist
   ```

## Step 2: Update Firebase Configuration

### 2.1 Get Your Firebase Config
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click on your **Android app** → "Config" tab
4. Copy the `firebaseConfig` object

### 2.2 Update firebase.js
Open `user-app/src/config/firebase.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

**Example** (replace with your actual values):
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "jyotishcall-12345.firebaseapp.com",
  projectId: "jyotishcall-12345",
  storageBucket: "jyotishcall-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:android:abcdef123456",
};
```

## Step 3: Enable FCM in Firebase

### 3.1 Enable Cloud Messaging
1. In Firebase Console, go to **Cloud Messaging**
2. If prompted, enable the **Cloud Messaging API**
3. Note down your **Server Key** (you'll need this for backend)

### 3.2 Configure Notification Settings
1. Go to **Cloud Messaging** → **Settings**
2. Enable **Analytics** (recommended)
3. Configure **Default notification settings**:
   - **Default notification channel**: `default`
   - **Default sound**: `default`

## Step 4: Backend Configuration

### 4.1 Update Backend Firebase Config
Your backend already has Firebase Admin SDK configured. Make sure it's using the same Firebase project.

### 4.2 Add FCM Token Registration Endpoint
Your backend should have an endpoint to register FCM tokens. If not, add this to your backend:

```javascript
// POST /api/v1/auth/register-fcm-token
app.post('/auth/register-fcm-token', async (req, res) => {
  try {
    const { fcmToken, platform, userType = 'user' } = req.body;
    const userId = req.user.id; // from auth middleware
    
    // Save token to database
    await User.findByIdAndUpdate(userId, {
      fcmToken,
      platform,
      userType,
      tokenUpdatedAt: new Date()
    });
    
    res.json({ success: true, message: 'FCM token registered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## Step 5: Test the Setup

### 5.1 Build and Test
1. **Clean and rebuild** your app:
   ```bash
   cd user-app
   npx expo run:android
   # or
   npx expo run:ios
   ```

2. **Check logs** for Firebase initialization:
   ```
   ✅ [FCM] Firebase initialized successfully
   ✅ [FCM] FCM token obtained: [token]
   ```

### 5.2 Test Notifications
1. **From Firebase Console**:
   - Go to **Cloud Messaging** → **Send your first message**
   - Target: **Single device**
   - FCM registration token: [copy from app logs]
   - Send test notification

2. **From Backend**:
   ```javascript
   // Test notification
   const message = {
     token: 'user-fcm-token-here',
     notification: {
       title: 'Test Notification',
       body: 'Firebase FCM is working!'
     },
     data: {
       type: 'test',
       timestamp: new Date().toISOString()
     }
   };
   
   await admin.messaging().send(message);
   ```

## Step 6: Production Checklist

### 6.1 Security
- [ ] **Restrict API keys** in Firebase Console
- [ ] **Enable App Check** for production
- [ ] **Configure SHA-1 fingerprints** for release builds

### 6.2 Performance
- [ ] **Test on physical devices** (not simulators)
- [ ] **Test all notification types** (booking, chat, payment)
- [ ] **Test background/foreground** scenarios
- [ ] **Verify badge counts** and unread states

### 6.3 Analytics
- [ ] **Enable Firebase Analytics**
- [ ] **Set up custom events** for notification interactions
- [ ] **Monitor delivery rates** in Firebase Console

## Troubleshooting

### Common Issues

1. **"Default FirebaseApp is not initialized"**
   - Check if `google-services.json` and `GoogleService-Info.plist` are in correct locations
   - Verify Firebase config in `firebase.js`

2. **"FCM token not generated"**
   - Check device permissions
   - Ensure app is running on physical device
   - Check Firebase project configuration

3. **"Notifications not received"**
   - Verify FCM token registration with backend
   - Check Firebase Console message delivery status
   - Test with Firebase Console first

4. **"Build errors after adding Firebase"**
   - Clean build: `npx expo run:android --clear`
   - Update Expo CLI: `npm install -g @expo/cli`

### Debug Commands

```bash
# Check Firebase configuration
npx expo config --type introspect

# View detailed logs
npx expo run:android --variant debug

# Clear cache and rebuild
npx expo run:android --clear
```

## Next Steps

After completing this setup:

1. **Test FCM thoroughly** on both Android and iOS
2. **Update your backend** to send notifications for:
   - New booking requests
   - Chat messages
   - Payment updates
   - Astrologer responses
3. **Configure notification icons and sounds**
4. **Set up analytics and monitoring**

## Support

If you encounter issues:
1. Check Firebase Console logs
2. Review app logs for FCM-related messages
3. Test with Firebase Console test messages first
4. Verify all configuration files are in correct locations

---

**Important**: Make sure to replace all placeholder values with your actual Firebase project configuration!
