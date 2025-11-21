module.exports = ({ config }) => ({
  ...config,
  // Use consistent configuration from app.json
  jsEngine: "hermes",
  name: "Jyotish Call",
  slug: "jyotishcall-user-app",
  version: "5.5.5",
  // Remove global orientation restriction for Android 16+ large screen support
  // orientation: "portrait", // Commented out for large screen compatibility
  icon: "./assets/icon-square.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.jyotishtalk",
    infoPlist: {
      NSMicrophoneUsageDescription: "Allow Jyotish Call to access your microphone for voice consultations with astrologers",
      NSCameraUsageDescription: "Allow Jyotish Call to access your camera for video consultations with astrologers",
      NSUserNotificationsUsageDescription: "Allow Jyotish Call to send you notifications about booking requests, chat messages, and important updates"
    },
    entitlements: {
      "aps-environment": "production"
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/icon-square.png",
      backgroundColor: "#ffffff"
    },
    package: "com.jyotishtalk",
    versionCode: 79,
    minSdkVersion: 24,
    compileSdkVersion: 36,
    targetSdkVersion: 36,
    googleServicesFile: "./google-services.json",
    permissions: [
      "MODIFY_AUDIO_SETTINGS",
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
      "WAKE_LOCK",
      "com.google.android.c2dm.permission.RECEIVE",
      "com.google.android.gms.permission.AD_ID"
    ],
    usesCleartextTraffic: true,
    networkSecurityConfig: {
      "domain-config": [
        {
          domain: "jyotishcallbackend-2uxrv.ondigitalocean.app",
          includeSubdomains: true
        }
      ]
    },
    ndkVersion: "26.1.10909125",
    // Enable edge-to-edge for Android 16+ compatibility
    edgeToEdgeEnabled: true,
    // Android 16+ Large Screen Device Support
    supportsTablet: true,
    // Remove orientation restrictions for foldables and tablets
    screenOrientation: "unspecified",
    // Enable resizable activities for all form factors
    resizeableActivity: true,
    // Support multi-window mode
    supportsPictureInPicture: false,
    // Additional Android 15 compatibility settings
    allowBackup: false,
    largeHeap: true,
    // Window configuration for edge-to-edge
    windowSoftInputMode: "adjustResize",
    // Support for different screen densities and sizes
    anyDensity: true,
    smallScreens: true,
    normalScreens: true,
    largeScreens: true,
    xlargeScreens: true
  },
  web: {
    favicon: "./assets/splash.png"
  },
  plugins: [
    "expo-asset",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#ffffff",
        sounds: [
          "./assets/notification.mp3"
        ]
      }
    ],
    "@react-native-firebase/app",
    "expo-dev-client",
    "expo-font",
    "react-native-edge-to-edge",
    [
      "react-native-fbsdk-next",
      {
        appID: "1310699930409258",
        clientToken: "749b16b18a225d9c7a43bdeb2e2aedd9",
        displayName: "Jyotish Call",
        scheme: "fb1310699930409258",
        advertiserIDCollectionEnabled: false,
        autoLogAppEventsEnabled: true,
        isAutoInitEnabled: true,
        iosUserTrackingPermission: "This identifier will be used to deliver personalized ads to you."
      }
    ]
  ],
  // Updates configuration
  updates: {
    url: "https://u.expo.dev/19ce1c4d-7c68-407f-96a0-d41bedaa3d55"
  },
  runtimeVersion: "1.0.0",
  extra: {
    eas: {
      projectId: "19ce1c4d-7c68-407f-96a0-d41bedaa3d55"
    }
  },
  owner: "shivanshu32"
});
