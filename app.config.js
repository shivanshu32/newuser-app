module.exports = ({ config }) => ({
  ...config,
  name: "JyotishCall User",
  slug: "jyotishcall-user-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
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
    infoPlist: {
      NSCameraUsageDescription: "This app needs access to your camera for video calls with astrologers.",
      NSMicrophoneUsageDescription: "This app needs access to your microphone for voice and video calls with astrologers.",
      NSLocalNetworkUsageDescription: "This app needs access to local network for WebRTC connections."
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#FFFFFF"
    },
    minSdkVersion: 24,        // Fixed for Hermes compatibility
    compileSdkVersion: 35,    // Latest Android SDK
    targetSdkVersion: 35,     // Updated for Google Play requirements
    permissions: [
      "MODIFY_AUDIO_SETTINGS",
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "BLUETOOTH",
      "BLUETOOTH_CONNECT",
      "WAKE_LOCK",
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
      "com.google.android.c2dm.permission.RECEIVE",
      "com.google.android.gms.permission.AD_ID"
    ],
    package: "com.jyotishtalk",
    versionCode: 10,
    usesCleartextTraffic: true  // For development/testing
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-notifications",
    "expo-av",
    [
      "expo-dev-client",
      {
        "addGeneratedScheme": false
      }
    ]
    // [
    //   "@config-plugins/react-native-webrtc",
    //   {
    //     "cameraPermission": "This app needs access to your camera for video calls with astrologers.",
    //     "microphonePermission": "This app needs access to your microphone for voice and video calls with astrologers."
    //   }
    // ]
  ],
  extra: {
    eas: {
      projectId: "19ce1c4d-7c68-407f-96a0-d41bedaa3d55"
    }
  },
  updates: {
    url: "https://u.expo.dev/19ce1c4d-7c68-407f-96a0-d41bedaa3d55"
  }
});
