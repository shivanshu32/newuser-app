import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

class VersionService {
  constructor() {
    // Backend URL - update for production
    this.baseURL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1';
    this.appType = 'user';
    this.currentVersion = this.getCurrentVersionFromDevice();
    this.playStoreUrl = 'https://play.google.com/store/apps/details?id=com.jyotishtalk&hl=en';
  }

  /**
   * Get current app version using multiple fallback methods
   * This ensures version retrieval works in both development and production
   */
  getCurrentVersionFromDevice() {
    try {
      // Method 1: Expo Application (most reliable for production)
      if (Application.nativeApplicationVersion) {
        console.log('Version from Application.nativeApplicationVersion:', Application.nativeApplicationVersion);
        return Application.nativeApplicationVersion;
      }

      // Method 2: Expo Constants (works in development and some production builds)
      if (Constants.expoConfig?.version) {
        console.log('Version from Constants.expoConfig.version:', Constants.expoConfig?.version);
        return Constants.expoConfig.version;
      }

      // Method 3: Expo Constants manifest (legacy fallback)
      if (Constants.manifest?.version) {
        console.log('Version from Constants.manifest.version:', Constants.manifest.version);
        return Constants.manifest.version;
      }

      // Method 4: Expo Constants manifest2 (newer Expo versions)
      if (Constants.manifest2?.extra?.expoClient?.version) {
        console.log('Version from Constants.manifest2:', Constants.manifest2.extra.expoClient.version);
        return Constants.manifest2.extra.expoClient.version;
      }

      // Final fallback
      console.warn('Could not retrieve version from any source, using fallback');
      return '1.0.0';
    } catch (error) {
      console.error('Error retrieving app version:', error);
      return '1.0.0';
    }
  }

  /**
   * Get current app version
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Fetch latest version from Play Store
   */
  async getPlayStoreVersion() {
    try {
      console.log('Fetching latest version from Play Store...');
      
      const response = await fetch(this.playStoreUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Play Store page');
      }

      const html = await response.text();
      
      // Extract version from Play Store HTML
      // Look for version pattern in the HTML
      const versionMatch = html.match(/"([0-9]+\.[0-9]+\.[0-9]+)"/g);
      
      if (versionMatch && versionMatch.length > 0) {
        // Get the most likely version string (usually the first one found)
        const version = versionMatch[0].replace(/"/g, '');
        console.log('Play Store version found:', version);
        return version;
      }
      
      // Alternative pattern matching
      const altVersionMatch = html.match(/Current Version[\s\S]*?([0-9]+\.[0-9]+\.[0-9]+)/i);
      if (altVersionMatch && altVersionMatch[1]) {
        console.log('Play Store version found (alt method):', altVersionMatch[1]);
        return altVersionMatch[1];
      }
      
      throw new Error('Version not found in Play Store page');
    } catch (error) {
      console.error('Failed to fetch Play Store version:', error);
      return null;
    }
  }

  /**
   * Fast version check for app launch - non-blocking approach
   * Returns immediately with no update required to prevent launch delays
   */
  async checkForUpdate() {
    try {
      console.log('🚀 [VERSION] Fast version check for app launch...');
      
      // For first-time app launches, return immediately to prevent delays
      // This fixes the critical 10-15 second delay issue affecting ad campaigns
      const fastResult = {
        updateRequired: false,
        latestVersion: this.currentVersion,
        minimumVersion: this.currentVersion,
        updateMessage: '',
        forceUpdate: false,
        playStoreUrl: this.playStoreUrl,
      };
      
      console.log('🚀 [VERSION] Fast check complete - no blocking delays');
      
      // Perform actual version check in background (non-blocking)
      this.performBackgroundVersionCheck();
      
      return fastResult;
    } catch (error) {
      console.error('🚀 [VERSION] Fast version check failed:', error);
      
      // Always return safe defaults to prevent app launch delays
      return {
        updateRequired: false,
        latestVersion: this.currentVersion,
        minimumVersion: this.currentVersion,
        updateMessage: '',
        forceUpdate: false,
        playStoreUrl: this.playStoreUrl,
      };
    }
  }

  /**
   * Background version check - runs after app has launched
   * This can show update prompts later without blocking initial launch
   */
  async performBackgroundVersionCheck() {
    try {
      console.log('🔄 [VERSION] Performing background version check...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseURL}/version-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appType: 'user',
          currentVersion: this.currentVersion,
          platform: Platform.OS,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        // If update is required, store it for later display
        if (data.updateRequired) {
          console.log('🔄 [VERSION] Background check found update required');
          // You can implement a notification or in-app prompt here
          // that doesn't block the initial app launch
        } else {
          console.log('🔄 [VERSION] Background check - app is up to date');
        }
      }
    } catch (error) {
      console.log('🔄 [VERSION] Background version check failed (non-critical):', error.message);
      // Fail silently - don't impact user experience
    }
  }

  /**
   * Compare version strings (semantic versioning)
   */
  compareVersions(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  /**
   * Check if current version is less than minimum required version
   */
  isUpdateRequired(minimumVersion) {
    return this.compareVersions(this.currentVersion, minimumVersion) < 0;
  }

  /**
   * Get default Play Store URL for the app
   */
  getDefaultPlayStoreUrl() {
    if (Platform.OS === 'android') {
      // Replace with your actual package name
      return 'https://play.google.com/store/apps/details?id=com.jyotishtalk';
    } else if (Platform.OS === 'ios') {
      // Replace with your actual App Store ID
      return 'https://apps.apple.com/app/id1234567890';
    }
    return 'https://play.google.com/store/apps/details?id=com.jyotishtalk';
  }

  /**
   * Open Play Store/App Store for update
   */
  async openStore() {
    const { Linking } = require('react-native');
    const storeUrl = this.getDefaultPlayStoreUrl();
    
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        console.error('Cannot open store URL:', storeUrl);
      }
    } catch (error) {
      console.error('Failed to open store:', error);
    }
  }

  /**
   * Mock version check for testing (remove in production)
   */
  async mockVersionCheck(forceUpdate = false) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          updateRequired: forceUpdate,
          latestVersion: '1.1.0',
          minimumVersion: forceUpdate ? '1.1.0' : '1.0.0',
          updateMessage: 'A new version with exciting features is available! Please update to continue using the app.',
          forceUpdate: forceUpdate,
          playStoreUrl: this.getDefaultPlayStoreUrl(),
        });
      }, 1000);
    });
  }
}

export default new VersionService();
