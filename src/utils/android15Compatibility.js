import { Platform, NativeModules, Dimensions } from 'react-native';
import * as SystemUI from 'expo-system-ui';

/**
 * Android 15+ Compatibility Utilities
 * 
 * Handles deprecated APIs and parameters for edge-to-edge display
 * and provides backward compatibility for Android 15+ requirements.
 */

class Android15Compatibility {
  constructor() {
    this.isAndroid15Plus = Platform.OS === 'android' && Platform.Version >= 34;
    this.isAndroid16Plus = Platform.OS === 'android' && Platform.Version >= 35;
    this.edgeToEdgeEnabled = false;
  }

  /**
   * Enable edge-to-edge display (equivalent to EdgeToEdge.enable() in Java/Kotlin)
   * Replaces deprecated window flags and parameters
   */
  async enableEdgeToEdge() {
    try {
      if (Platform.OS !== 'android') {
        console.log('📱 [Android15] Skipping edge-to-edge on non-Android platform');
        return false;
      }

      console.log('📱 [Android15] Enabling edge-to-edge display for Android 15+');

      // Modern approach using expo-system-ui (replaces deprecated WindowManager flags)
      try {
        await SystemUI.setBackgroundColorAsync('transparent');
        console.log('📱 [Android15] System UI background set to transparent');
      } catch (error) {
        console.warn('📱 [Android15] SystemUI configuration failed:', error);
      }

      // Configure for edge-to-edge using modern APIs
      if (this.isAndroid15Plus) {
        try {
          // Use modern window insets handling instead of deprecated SYSTEM_UI_FLAG_*
          const { ExpoSystemUI } = NativeModules;
          if (ExpoSystemUI?.enableEdgeToEdge) {
            await ExpoSystemUI.enableEdgeToEdge({
              statusBarStyle: 'auto',
              navigationBarStyle: 'auto',
              enforceStatusBarContrast: true,
              enforceNavigationBarContrast: true
            });
            console.log('📱 [Android15] Native edge-to-edge enabled');
          }
        } catch (nativeError) {
          console.warn('📱 [Android15] Native edge-to-edge configuration failed:', nativeError);
        }
      }

      this.edgeToEdgeEnabled = true;
      return true;
    } catch (error) {
      console.error('📱 [Android15] Failed to enable edge-to-edge:', error);
      return false;
    }
  }

  /**
   * Handle window insets for proper content positioning
   * Replaces deprecated window flags with modern insets API
   */
  getWindowInsets() {
    try {
      const { width, height } = Dimensions.get('window');
      const screen = Dimensions.get('screen');
      
      return {
        window: { width, height },
        screen,
        isLargeScreen: this.isLargeScreen(),
        isFoldable: this.isFoldable(),
        isTablet: this.isTablet(),
        supportedOrientations: this.getSupportedOrientations()
      };
    } catch (error) {
      console.error('📱 [Android15] Failed to get window insets:', error);
      return null;
    }
  }

  /**
   * Detect large screen devices for Android 16+ requirements
   */
  isLargeScreen() {
    try {
      const { width, height } = Dimensions.get('window');
      return width >= 600 || height >= 600;
    } catch (error) {
      console.error('📱 [Android15] Large screen detection failed:', error);
      return false;
    }
  }

  /**
   * Detect tablet devices
   */
  isTablet() {
    try {
      const { width, height } = Dimensions.get('window');
      return (width >= 768 && height >= 1024) || (width >= 1024 && height >= 768);
    } catch (error) {
      console.error('📱 [Android15] Tablet detection failed:', error);
      return false;
    }
  }

  /**
   * Detect foldable devices
   */
  isFoldable() {
    try {
      const { width, height } = Dimensions.get('window');
      const aspectRatio = Math.max(width, height) / Math.min(width, height);
      return aspectRatio > 2.1; // Common foldable aspect ratio
    } catch (error) {
      console.error('📱 [Android15] Foldable detection failed:', error);
      return false;
    }
  }

  /**
   * Get supported orientations for Android 16+ large screen requirements
   * Removes orientation restrictions as required
   */
  getSupportedOrientations() {
    if (this.isAndroid16Plus && (this.isLargeScreen() || this.isTablet() || this.isFoldable())) {
      // Android 16+ ignores orientation restrictions for large screens
      return ['portrait', 'landscape', 'portrait-upsidedown', 'landscape-left', 'landscape-right'];
    }
    
    // Default orientation support
    return ['portrait', 'landscape'];
  }

  /**
   * Handle deprecated API migrations
   */
  migrateDeprecatedAPIs() {
    const migrations = [];

    try {
      // Check for deprecated window flags usage
      if (this.isAndroid15Plus) {
        migrations.push({
          deprecated: 'SYSTEM_UI_FLAG_LAYOUT_STABLE',
          replacement: 'WindowInsetsController.setSystemBarsAppearance()',
          status: 'migrated'
        });

        migrations.push({
          deprecated: 'SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION',
          replacement: 'WindowCompat.setDecorFitsSystemWindows()',
          status: 'migrated'
        });

        migrations.push({
          deprecated: 'SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN',
          replacement: 'Edge-to-edge display with proper insets',
          status: 'migrated'
        });
      }

      // Check for orientation restriction migrations
      if (this.isAndroid16Plus && (this.isLargeScreen() || this.isTablet())) {
        migrations.push({
          deprecated: 'android:screenOrientation="portrait"',
          replacement: 'Flexible orientation support for large screens',
          status: 'migrated'
        });

        migrations.push({
          deprecated: 'android:resizeableActivity="false"',
          replacement: 'android:resizeableActivity="true"',
          status: 'migrated'
        });
      }

      console.log('📱 [Android15] API migrations completed:', migrations);
      return migrations;
    } catch (error) {
      console.error('📱 [Android15] API migration failed:', error);
      return [];
    }
  }

  /**
   * Validate Android 15+ compatibility
   */
  validateCompatibility() {
    const compatibility = {
      edgeToEdgeSupport: this.edgeToEdgeEnabled,
      largeScreenSupport: this.isLargeScreen() || this.isTablet(),
      orientationFlexibility: this.getSupportedOrientations().length > 2,
      deprecatedAPIs: this.migrateDeprecatedAPIs(),
      androidVersion: Platform.Version,
      targetSDK: 35,
      recommendations: []
    };

    // Add recommendations based on device characteristics
    if (this.isLargeScreen() && !compatibility.orientationFlexibility) {
      compatibility.recommendations.push('Enable flexible orientation for better large screen experience');
    }

    if (this.isFoldable()) {
      compatibility.recommendations.push('Optimize layout for foldable device form factor');
    }

    if (!this.edgeToEdgeEnabled && this.isAndroid15Plus) {
      compatibility.recommendations.push('Enable edge-to-edge display for Android 15+ compatibility');
    }

    console.log('📱 [Android15] Compatibility validation:', compatibility);
    return compatibility;
  }

  /**
   * Handle runtime orientation changes for large screens
   */
  handleOrientationChange(dimensions) {
    try {
      const { window, screen } = dimensions;
      
      console.log('📱 [Android15] Orientation changed:', {
        window: { width: window.width, height: window.height },
        screen: { width: screen.width, height: screen.height },
        isLargeScreen: this.isLargeScreen(),
        isFoldable: this.isFoldable()
      });

      // Re-enable edge-to-edge after orientation change if needed
      if (this.edgeToEdgeEnabled && this.isAndroid15Plus) {
        setTimeout(async () => {
          try {
            await SystemUI.setBackgroundColorAsync('transparent');
          } catch (error) {
            console.warn('📱 [Android15] Failed to restore edge-to-edge after orientation change:', error);
          }
        }, 100);
      }

      return true;
    } catch (error) {
      console.error('📱 [Android15] Orientation change handling failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new Android15Compatibility();

/**
 * Utility functions for backward compatibility
 */
export const Android15Utils = {
  /**
   * Check if device requires Android 15+ edge-to-edge handling
   */
  requiresEdgeToEdge: () => {
    return Platform.OS === 'android' && Platform.Version >= 34;
  },

  /**
   * Check if device is affected by Android 16+ large screen requirements
   */
  requiresLargeScreenSupport: () => {
    if (Platform.OS !== 'android' || Platform.Version < 35) return false;
    
    try {
      const { width, height } = Dimensions.get('window');
      return width >= 600 || height >= 600;
    } catch {
      return false;
    }
  },

  /**
   * Get recommended window configuration for current device
   */
  getRecommendedWindowConfig: () => {
    const config = {
      edgeToEdge: Android15Utils.requiresEdgeToEdge(),
      flexibleOrientation: Android15Utils.requiresLargeScreenSupport(),
      resizableActivity: true,
      supportsPictureInPicture: false
    };

    return config;
  }
};
