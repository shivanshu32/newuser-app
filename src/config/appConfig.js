import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

/**
 * Centralized App Configuration
 * Single source of truth for app metadata, version info, and store URLs
 */
export const APP_CONFIG = {
  // App identification
  appType: 'user',
  appName: 'JyotishCall',
  
  // Store URLs - These should match your actual Play Store/App Store listings
  // TODO: Verify these package names match your actual store listings
  storeUrls: {
    android: {
      primary: 'https://play.google.com/store/apps/details?id=com.jyotishtalk',
      // Fallback URLs for legacy users who might have different package expectations
      fallbacks: [
        'https://play.google.com/store/apps/details?id=com.jyotishcall.userapp',
        'https://play.google.com/store/apps/details?id=com.jyotishcall.user'
      ]
    },
    ios: {
      primary: 'https://apps.apple.com/app/jyotishcall/id[ACTUAL_USER_APP_ID]', // TODO: Replace with actual App ID
      fallbacks: []
    }
  },
  
  // API configuration
  api: {
    versionCheck: {
      endpoint: '/version/check',
      includeAppType: true,
      includePlatform: true,
      timeout: 10000 // 10 seconds
    }
  },

  /**
   * Get current app version from device
   * Uses multiple fallback methods to ensure version is always available
   * Handles Expo Go development environment properly
   * NEVER uses hardcoded values
   */
  getCurrentVersion() {
    try {
      // Check if running in Expo Go development environment
      const isExpoGo = Constants.appOwnership === 'expo' || 
                       Constants.executionEnvironment === 'storeClient' ||
                       (Constants.expoConfig && !Application.applicationId);
      
      if (isExpoGo) {
        console.log('🔧 Detected Expo Go development environment');
        
        // In Expo Go, prioritize app.json/app.config.js version over Expo Go client version
        // Method 1: Expo Constants expoConfig (app.json/app.config.js version)
        if (Constants.expoConfig?.version) {
          console.log('✅ Version from Constants.expoConfig.version (Development):', Constants.expoConfig.version);
          return Constants.expoConfig.version;
        }
        
        // Method 2: Expo Constants manifest (legacy fallback for Expo Go)
        if (Constants.manifest?.version) {
          console.log('✅ Version from Constants.manifest.version (Development):', Constants.manifest.version);
          return Constants.manifest.version;
        }
        
        // Method 3: Expo Constants manifest2 (newer Expo versions)
        if (Constants.manifest2?.extra?.expoClient?.version) {
          console.log('✅ Version from Constants.manifest2 (Development):', Constants.manifest2.extra.expoClient.version);
          return Constants.manifest2.extra.expoClient.version;
        }
      } else {
        console.log('📱 Detected standalone/production environment');
        
        // In standalone builds, use native application version first
        // Method 1: Expo Application (most reliable for production)
        if (Application.nativeApplicationVersion) {
          console.log('✅ Version from Application.nativeApplicationVersion (Production):', Application.nativeApplicationVersion);
          return Application.nativeApplicationVersion;
        }
        
        // Method 2: Expo Constants (fallback for standalone builds)
        if (Constants.expoConfig?.version) {
          console.log('✅ Version from Constants.expoConfig.version (Production):', Constants.expoConfig.version);
          return Constants.expoConfig.version;
        }
      }

      // Universal fallbacks (work in both environments)
      // Method 3: Expo Constants manifest (legacy fallback)
      if (Constants.manifest?.version) {
        console.log('✅ Version from Constants.manifest.version (Fallback):', Constants.manifest.version);
        return Constants.manifest.version;
      }

      // Method 4: Expo Constants manifest2 (newer Expo versions)
      if (Constants.manifest2?.extra?.expoClient?.version) {
        console.log('✅ Version from Constants.manifest2 (Fallback):', Constants.manifest2.extra.expoClient.version);
        return Constants.manifest2.extra.expoClient.version;
      }

      // Final fallback - should never happen in production
      console.warn('⚠️ Could not retrieve version from any source, using package.json fallback');
      // Get version from package.json as last resort
      const packageJson = require('../../../package.json');
      return packageJson.version || '1.0.0';
    } catch (error) {
      console.error('❌ Error retrieving app version:', error);
      // Only use hardcoded as absolute last resort
      return '1.0.0';
    }
  },

  /**
   * Get package name/bundle ID for the current platform
   */
  getPackageName() {
    if (Platform.OS === 'android') {
      return Application.applicationId || 'com.jyotishtalk';
    } else {
      return Application.applicationId || 'com.jyotishtalk';
    }
  },

  /**
   * Get primary store URL for current platform
   */
  getPrimaryStoreUrl() {
    return this.storeUrls[Platform.OS]?.primary || this.storeUrls.android.primary;
  },

  /**
   * Get all store URLs (primary + fallbacks) for current platform
   */
  getAllStoreUrls() {
    const platformUrls = this.storeUrls[Platform.OS] || this.storeUrls.android;
    return [platformUrls.primary, ...(platformUrls.fallbacks || [])];
  }
};

export default APP_CONFIG;
