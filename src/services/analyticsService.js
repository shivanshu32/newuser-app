import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { firebaseConfig } from '../config/firebase';

// Expo-compatible Firebase Analytics implementation
class ExpoFirebaseAnalytics {
  constructor() {
    this.app = null;
    this.analytics = null;
    this.isInitialized = false;
    this.isSupported = false;
    this.initializationPromise = null;
  }

  // Initialize Firebase Analytics for Expo managed workflow
  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  async _doInitialize() {
    try {
      console.log('🔥 [ANALYTICS] Initializing Firebase Analytics for Expo...');
      
      // Initialize Firebase app
      this.app = initializeApp(firebaseConfig);
      console.log('🔥 [ANALYTICS] Firebase app initialized');
      
      // For React Native/Expo, we can initialize analytics directly
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        this.analytics = getAnalytics(this.app);
        this.isSupported = true;
        this.isInitialized = true;
        console.log('🔥 [ANALYTICS] ✅ Firebase Analytics initialized successfully for mobile');
        console.log('🔥 [ANALYTICS] ✅ Analytics events will be sent to Firebase Console');
        
        // Test the connection with a simple event
        await this.logEvent('analytics_initialized', {
          platform: Platform.OS,
          timestamp: new Date().toISOString()
        });
        
        return true;
      } else {
        console.log('🔥 [ANALYTICS] ⚠️ Platform not supported for analytics:', Platform.OS);
        return false;
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to initialize Firebase Analytics:', error);
      this.isInitialized = false;
      this.isSupported = false;
      return false;
    }
  }

  // Clean parameters to ensure Firebase compatibility
  _cleanParameters(parameters) {
    const cleaned = {};
    for (const [key, value] of Object.entries(parameters)) {
      // Firebase parameter names must be <= 40 characters and alphanumeric + underscore
      const cleanKey = key.substring(0, 40).replace(/[^a-zA-Z0-9_]/g, '_');
      
      // Firebase parameter values must be strings or numbers
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        cleaned[cleanKey] = value;
      } else if (value !== null && value !== undefined) {
        cleaned[cleanKey] = String(value);
      }
    }
    return cleaned;
  }

  // Log custom events
  async logEvent(eventName, parameters = {}) {
    try {
      // Ensure analytics is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isSupported && this.analytics) {
        // Clean parameters to ensure they're Firebase-compatible
        const cleanParams = this._cleanParameters(parameters);
        
        logEvent(this.analytics, eventName, cleanParams);
        console.log(`🔥 [ANALYTICS] ✅ Event logged: ${eventName}`, cleanParams);
        console.log(`🔥 [ANALYTICS] ✅ Event will appear in Firebase Console within 24 hours`);
        return true;
      } else {
        console.log(`🔥 [ANALYTICS] ❌ Analytics not available - Event: ${eventName}`, parameters);
        return false;
      }
    } catch (error) {
      console.error(`🔥 [ANALYTICS] ❌ Failed to log event ${eventName}:`, error);
      return false;
    }
  }

  // Set user properties
  async setUserProperties(properties = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isSupported && this.analytics) {
        const cleanProps = this._cleanParameters(properties);
        setUserProperties(this.analytics, cleanProps);
        console.log(`🔥 [ANALYTICS] ✅ User properties set:`, cleanProps);
        return true;
      } else {
        console.log(`🔥 [ANALYTICS] ❌ Analytics not available - User properties:`, properties);
        return false;
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to set user properties:', error);
      return false;
    }
  }

  // Set user ID
  async setUserId(userId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (this.isSupported && this.analytics) {
        setUserId(this.analytics, userId);
        console.log(`🔥 [ANALYTICS] ✅ User ID set: ${userId}`);
        return true;
      } else {
        console.log(`🔥 [ANALYTICS] ❌ Analytics not available - User ID: ${userId}`);
        return false;
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to set user ID:', error);
      return false;
    }
  }

  // Log screen view
  async logScreenView(screenName, screenClass) {
    try {
      await this.logEvent('screen_view', {
        screen_name: screenName,
        screen_class: screenClass || screenName
      });
      console.log(`🔥 [ANALYTICS] ✅ Screen view logged: ${screenName}`);
      return true;
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to log screen view:', error);
      return false;
    }
  }

  // Get analytics status
  getStatus() {
    return {
      initialized: this.isInitialized,
      supported: this.isSupported,
      hasAnalytics: !!this.analytics,
      hasFirebaseApp: !!this.app,
      platform: Platform.OS
    };
  }
}

// Create singleton instance
const analyticsInstance = new ExpoFirebaseAnalytics();

// Analytics service class with comprehensive functionality
class AnalyticsService {
  constructor() {
    this.analytics = analyticsInstance;
    this.hasTrackedFirstOpen = false;
    this.hasTrackedAppInstall = false;
  }

  // Initialize Firebase Analytics
  async initialize() {
    try {
      console.log('🔥 [ANALYTICS] AnalyticsService initializing...');
      
      const success = await this.analytics.initialize();
      
      if (success) {
        console.log('🔥 [ANALYTICS] ✅ AnalyticsService initialized successfully');
        
        // Track app open events
        await this.trackAppOpenEvents();
        
        return true;
      } else {
        console.log('🔥 [ANALYTICS] ❌ AnalyticsService initialization failed');
        return false;
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to initialize AnalyticsService:', error);
      return false;
    }
  }

  // Track app open events (first_open and app_install)
  async trackAppOpenEvents() {
    try {
      const hasTrackedFirstOpen = await AsyncStorage.getItem('analytics_first_open_tracked');
      const hasTrackedAppInstall = await AsyncStorage.getItem('analytics_app_install_tracked');
      
      if (!hasTrackedFirstOpen) {
        await this.logEvent('first_open', {
          timestamp: new Date().toISOString(),
          platform: Platform.OS
        });
        await AsyncStorage.setItem('analytics_first_open_tracked', 'true');
        console.log('🔥 [ANALYTICS] ✅ first_open event tracked');
        this.hasTrackedFirstOpen = true;
      }
      
      if (!hasTrackedAppInstall) {
        await this.logEvent('app_install', {
          timestamp: new Date().toISOString(),
          platform: Platform.OS
        });
        await AsyncStorage.setItem('analytics_app_install_tracked', 'true');
        console.log('🔥 [ANALYTICS] ✅ app_install event tracked');
        this.hasTrackedAppInstall = true;
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to track app open events:', error);
    }
  }

  // Track login success event
  async trackLoginSuccess(userId, loginMethod = 'phone') {
    try {
      // Set user ID for better attribution
      await this.analytics.setUserId(userId);
      
      // Set user properties
      await this.setUserProperties(userId, loginMethod);
      
      // Check if this is first login
      const isFirst = await this.isFirstLogin(userId);
      
      // Track login event
      await this.logEvent('login', {
        method: loginMethod,
        user_id: userId,
        is_first_login: isFirst,
        timestamp: new Date().toISOString()
      });
      
      console.log(`🔥 [ANALYTICS] ✅ Login success tracked for user: ${userId}`);
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to track login success:', error);
    }
  }

  // Check if this is the user's first login
  async isFirstLogin(userId) {
    try {
      const key = `analytics_first_login_${userId}`;
      const hasLoggedIn = await AsyncStorage.getItem(key);
      
      if (!hasLoggedIn) {
        await AsyncStorage.setItem(key, 'true');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to check first login:', error);
      return false;
    }
  }

  // Set user properties for better analytics segmentation
  async setUserProperties(userId, loginMethod) {
    try {
      const properties = {
        user_id: userId,
        login_method: loginMethod,
        platform: Platform.OS,
        app_version: '5.1.1',
        last_login: new Date().toISOString()
      };
      
      await this.analytics.setUserProperties(properties);
      console.log('🔥 [ANALYTICS] ✅ User properties set:', properties);
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to set user properties:', error);
    }
  }

  // Track custom events
  async logEvent(eventName, parameters = {}) {
    try {
      await this.analytics.logEvent(eventName, parameters);
      console.log(`🔥 [ANALYTICS] ✅ Custom event logged: ${eventName}`, parameters);
    } catch (error) {
      console.error(`🔥 [ANALYTICS] ❌ Failed to log custom event ${eventName}:`, error);
    }
  }

  // TEST METHOD: Comprehensive analytics test
  async testAnalytics() {
    try {
      console.log('🧪 [ANALYTICS TEST] Starting comprehensive Firebase Analytics test...');
      
      const testResults = this.analytics.getStatus();
      
      console.log('🧪 [ANALYTICS TEST] Test Results:', testResults);
      
      // Test event logging
      await this.logEvent('analytics_test_event', {
        test_timestamp: new Date().toISOString(),
        test_platform: Platform.OS,
        test_version: '1.0.0'
      });
      
      console.log('🧪 [ANALYTICS TEST] ✅ Test completed successfully!');
      console.log('🧪 [ANALYTICS TEST] ✅ If all values are true, events should appear in Firebase Console within 24 hours');
      
      return testResults;
    } catch (error) {
      console.error('🧪 [ANALYTICS TEST] ❌ Test failed:', error);
      throw error;
    }
  }

  // Track consultation-related events
  async trackConsultationEvent(eventType, consultationData = {}) {
    try {
      const eventName = `consultation_${eventType}`;
      await this.logEvent(eventName, {
        ...consultationData,
        timestamp: new Date().toISOString()
      });
      console.log(`🔥 [ANALYTICS] ✅ Consultation event tracked: ${eventName}`);
    } catch (error) {
      console.error(`🔥 [ANALYTICS] ❌ Failed to track consultation event:`, error);
    }
  }

  // Track purchase events
  async trackPurchase(purchaseData) {
    try {
      await this.logEvent('purchase', {
        ...purchaseData,
        timestamp: new Date().toISOString()
      });
      console.log('🔥 [ANALYTICS] ✅ Purchase event tracked:', purchaseData);
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to track purchase:', error);
    }
  }

  // Reset analytics data (useful for testing)
  async resetAnalyticsData() {
    try {
      // Clear local tracking flags
      await AsyncStorage.multiRemove([
        'analytics_first_open_tracked',
        'analytics_app_install_tracked'
      ]);
      
      // Clear user-specific flags
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith('analytics_first_login_'));
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
      
      this.hasTrackedFirstOpen = false;
      this.hasTrackedAppInstall = false;
      
      console.log('🔥 [ANALYTICS] ✅ Analytics data reset completed');
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to reset analytics data:', error);
    }
  }

  // Get analytics status for debugging
  async getAnalyticsStatus() {
    try {
      const status = {
        ...this.analytics.getStatus(),
        hasTrackedFirstOpen: this.hasTrackedFirstOpen,
        hasTrackedAppInstall: this.hasTrackedAppInstall
      };
      
      console.log('🔥 [ANALYTICS] Current status:', status);
      return status;
    } catch (error) {
      console.error('🔥 [ANALYTICS] ❌ Failed to get analytics status:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new AnalyticsService();
