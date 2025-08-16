import { Platform, Linking, Alert } from 'react-native';
import APP_CONFIG from '../config/appConfig';

/**
 * Centralized Version Service
 * Handles version checking, store URL management, and legacy user fallbacks
 */
class VersionService {
  constructor() {
    this.currentVersion = APP_CONFIG.getCurrentVersion();
    console.log('VersionService initialized with version:', this.currentVersion);
  }

  /**
   * Get current app version (delegated to APP_CONFIG)
   */
  getCurrentVersion() {
    return APP_CONFIG.getCurrentVersion();
  }

  /**
   * Check for app updates via backend API
   * Uses centralized configuration and includes proper error handling
   */
  async checkForUpdate() {
    try {
      const currentVersion = this.getCurrentVersion();
      console.log('Checking for update with version:', currentVersion);

      // Import versionAPI from api.js (uses proper axios instance with auth)
      const { versionAPI } = await import('./api');

      // Use the existing versionAPI with proper payload
      const response = await versionAPI.checkVersion({
        currentVersion,
        appType: APP_CONFIG.appType,
        platform: Platform.OS,
      });

      const data = response;
      console.log('Version check response:', data);
      
      return {
        ...data,
        // Always include fallback URLs for legacy user support
        allStoreUrls: APP_CONFIG.getAllStoreUrls(),
        primaryStoreUrl: APP_CONFIG.getPrimaryStoreUrl()
      };
    } catch (error) {
      console.error('Version check failed:', error);
      return {
        success: false,
        updateRequired: false,
        error: error.message,
        // Provide fallback data for offline scenarios
        latestVersion: this.currentVersion,
        minimumVersion: this.currentVersion,
        playStoreUrl: APP_CONFIG.getPrimaryStoreUrl(),
        allStoreUrls: APP_CONFIG.getAllStoreUrls()
      };
    }
  }

  /**
   * Open store with robust fallback handling for legacy users
   * Tries multiple URLs if the primary one fails
   */
  async openStore(storeUrl = null) {
    // Use provided URL or get from backend response or use primary
    const urlsToTry = storeUrl ? [storeUrl] : APP_CONFIG.getAllStoreUrls();
    
    console.log('Attempting to open store with URLs:', urlsToTry);

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i];
      try {
        console.log(`Trying store URL ${i + 1}/${urlsToTry.length}:`, url);
        
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          console.log('Successfully opened store URL:', url);
          return true;
        } else {
          console.warn('URL not supported:', url);
          continue;
        }
      } catch (error) {
        console.error(`Failed to open store URL ${url}:`, error);
        // Try next URL if available
        if (i < urlsToTry.length - 1) {
          console.log('Trying next fallback URL...');
          continue;
        }
      }
    }

    // All URLs failed - show user-friendly fallback
    console.error('All store URLs failed, showing manual search prompt');
    this.showManualSearchPrompt();
    return false;
  }

  /**
   * Show manual search prompt when all store URLs fail
   * Provides clear instructions for users to manually find the app
   */
  showManualSearchPrompt() {
    const appName = APP_CONFIG.appName;
    const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play Store';
    
    Alert.alert(
      'Update Required',
      `We couldn't automatically open the ${storeName}. Please manually search for "${appName}" in the ${storeName} to update your app.`,
      [
        {
          text: 'Open Store Manually',
          onPress: () => this.openStoreManually()
        },
        {
          text: 'Later',
          style: 'cancel'
        }
      ]
    );
  }

  /**
   * Open the store app directly (without specific app URL)
   * Last resort fallback for legacy users
   */
  async openStoreManually() {
    try {
      const storeUrl = Platform.OS === 'ios' 
        ? 'itms-apps://itunes.apple.com/'
        : 'market://search?q=' + encodeURIComponent(APP_CONFIG.appName);
      
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        // Final fallback - open browser to store
        const browserUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/search?term=' + encodeURIComponent(APP_CONFIG.appName)
          : 'https://play.google.com/store/search?q=' + encodeURIComponent(APP_CONFIG.appName);
        
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error('Failed to open store manually:', error);
      Alert.alert(
        'Unable to Open Store',
        `Please manually open the ${Platform.OS === 'ios' ? 'App Store' : 'Google Play Store'} and search for "${APP_CONFIG.appName}" to update.`,
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Mock data for testing - uses centralized config
   */
  getMockVersionCheckData() {
    return {
      success: true,
      updateRequired: true,
      latestVersion: '5.2.0',
      minimumVersion: '5.0.0',
      forceUpdate: false,
      updateMessage: 'A new version is available with bug fixes and improvements.',
      playStoreUrl: APP_CONFIG.getPrimaryStoreUrl(),
      appStoreUrl: APP_CONFIG.storeUrls.ios.primary,
      allStoreUrls: APP_CONFIG.getAllStoreUrls(),
      primaryStoreUrl: APP_CONFIG.getPrimaryStoreUrl()
    };
  }

  /**
   * Test all store URLs to verify they work
   * Useful for debugging store URL issues
   */
  async testAllStoreUrls() {
    const urls = APP_CONFIG.getAllStoreUrls();
    const results = [];

    for (const url of urls) {
      try {
        const supported = await Linking.canOpenURL(url);
        results.push({ url, supported, error: null });
        console.log(`Store URL test - ${url}: ${supported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
      } catch (error) {
        results.push({ url, supported: false, error: error.message });
        console.error(`Store URL test - ${url}: ERROR -`, error.message);
      }
    }

    return results;
  }
}

export default new VersionService();
