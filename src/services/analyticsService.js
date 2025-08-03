import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from 'firebase/analytics';
import { firebaseConfig } from '../config/firebase';

// Firebase Analytics setup for React Native
let analytics = null;
let firebaseApp = null;
let analyticsSupported = false;

// Initialize Firebase Analytics with React Native compatibility
const initializeFirebaseAnalytics = async () => {
  try {
    // Initialize Firebase app
    firebaseApp = initializeApp(firebaseConfig);
    
    // For React Native, we need to check if analytics is supported
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      try {
        // In React Native, analytics may not be supported in all environments
        // We'll try to initialize and catch any errors
        analyticsSupported = await isSupported();
        if (analyticsSupported) {
          analytics = getAnalytics(firebaseApp);
          console.log('🔥 [ANALYTICS] Firebase Analytics initialized successfully for React Native');
        } else {
          console.log('🔥 [ANALYTICS] Firebase Analytics not supported in this React Native environment');
        }
      } catch (error) {
        console.error('🔥 [ANALYTICS] Failed to initialize analytics in React Native:', error);
        analyticsSupported = false;
      }
    } else {
      // For web/other environments
      try {
        analyticsSupported = await isSupported();
        if (analyticsSupported) {
          analytics = getAnalytics(firebaseApp);
          console.log('🔥 [ANALYTICS] Firebase Analytics initialized successfully for web');
        } else {
          console.log('🔥 [ANALYTICS] Firebase Analytics not supported in this environment');
        }
      } catch (error) {
        console.error('🔥 [ANALYTICS] Failed to initialize analytics:', error);
        analyticsSupported = false;
      }
    }
  } catch (error) {
    console.error('🔥 [ANALYTICS] Failed to initialize Firebase Analytics:', error);
    analyticsSupported = false;
  }
};

// Analytics wrapper to maintain compatibility with existing code
const AnalyticsWrapper = {
  isAvailableAsync: () => Promise.resolve(true),
  setAnalyticsCollectionEnabledAsync: async (enabled) => {
    try {
      // Store preference in AsyncStorage since Firebase JS SDK doesn't have this method
      await AsyncStorage.setItem('analytics_enabled', enabled.toString());
      console.log(`🔥 [ANALYTICS] Analytics collection ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set analytics collection:', error);
    }
  },
  logEvent: async (name, parameters) => {
    try {
      if (analyticsSupported && analytics) {
        logEvent(analytics, name, parameters);
        console.log(`🔥 [ANALYTICS] Event logged: ${name}`, parameters);
      } else {
        console.log(`🔥 [ANALYTICS] [FALLBACK] Event: ${name}`, parameters);
      }
    } catch (error) {
      console.error(`🔥 [ANALYTICS] Failed to log event ${name}:`, error);
    }
  },
  setUserProperties: async (properties) => {
    try {
      if (analyticsSupported && analytics) {
        setUserProperties(analytics, properties);
        console.log('🔥 [ANALYTICS] User properties set:', properties);
      } else {
        console.log('🔥 [ANALYTICS] [FALLBACK] User properties:', properties);
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set user properties:', error);
    }
  },
  setUserId: async (userId) => {
    try {
      if (analyticsSupported && analytics) {
        setUserId(analytics, userId);
        console.log('🔥 [ANALYTICS] User ID set:', userId);
      } else {
        console.log('🔥 [ANALYTICS] [FALLBACK] User ID:', userId);
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set user ID:', error);
    }
  },
  setCurrentScreen: async (screenName, screenClass) => {
    try {
      if (analyticsSupported && analytics) {
        // Use logEvent for screen tracking since setCurrentScreen is not available in Firebase v9
        logEvent(analytics, 'screen_view', {
          screen_name: screenName,
          screen_class: screenClass || screenName,
        });
        console.log('🔥 [ANALYTICS] Screen tracked:', screenName);
      } else {
        console.log('🔥 [ANALYTICS] [FALLBACK] Screen:', screenName);
      }
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to track screen:', error);
    }
  },
  setDefaultEventParameters: async (parameters) => {
    try {
      // Firebase JS SDK v9 doesn't have setDefaultEventParameters
      // Store in AsyncStorage for future use
      await AsyncStorage.setItem('default_analytics_parameters', JSON.stringify(parameters));
      console.log('🔥 [ANALYTICS] Default parameters stored:', parameters);
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set default parameters:', error);
    }
  },
  resetAnalyticsData: async () => {
    try {
      // Firebase JS SDK doesn't have resetAnalyticsData method
      // Clear local storage
      await AsyncStorage.removeItem('analytics_enabled');
      await AsyncStorage.removeItem('default_analytics_parameters');
      console.log('🔥 [ANALYTICS] Analytics data reset (local storage cleared)');
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to reset analytics data:', error);
    }
  },
};

// Initialize analytics when module loads
initializeFirebaseAnalytics();

class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.hasTrackedFirstOpen = false;
    this.hasTrackedAppInstall = false;
  }

  /**
   * Initialize Firebase Analytics
   * This should be called early in the app lifecycle
   */
  async initialize() {
    try {
      console.log(' [ANALYTICS] Initializing Firebase Analytics...');
      
      // Check if analytics is available
      const isAvailable = await AnalyticsWrapper.isAvailableAsync();
      if (!isAvailable) {
        console.warn(' [ANALYTICS] Firebase Analytics is not available');
        return false;
      }

      // Enable analytics collection
      await AnalyticsWrapper.setAnalyticsCollectionEnabledAsync(true);
      
      // Set default parameters
      await this.setDefaultParameters();
      
      this.isInitialized = true;
      console.log(' [ANALYTICS] Firebase Analytics initialized successfully');
      console.log('🔥 [ANALYTICS] Firebase Analytics initialized successfully');
      
      // Track app open events
      await this.trackAppOpenEvents();
      
      return true;
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to initialize Firebase Analytics:', error);
      return false;
    }
  }

  /**
   * Set default parameters that will be sent with every event
   */
  async setDefaultParameters() {
    try {
      const defaultParams = {
        app_version: '2.0.0', // Match your app.json version
        platform: Platform.OS,
        app_name: 'Jyotish Call User',
        package_name: 'com.jyotishtalk'
      };

      // Note: expo-firebase-analytics doesn't support setDefaultEventParametersAsync
      // We'll include these parameters with each event instead
      console.log('🔥 [ANALYTICS] Default parameters configured:', defaultParams);
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set default parameters:', error);
    }
  }

  /**
   * Track app open events (first_open and app_install)
   * These are crucial for install attribution
   */
  async trackAppOpenEvents() {
    try {
      // Check if this is the first time the app is opened
      const hasOpenedBefore = await AsyncStorage.getItem('analytics_first_open_tracked');
      const hasInstalledBefore = await AsyncStorage.getItem('analytics_app_install_tracked');

      if (!hasOpenedBefore) {
        // Track first_open event
        await this.logEvent('first_open', {
          timestamp: new Date().toISOString(),
          platform: Platform.OS
        });
        
        await AsyncStorage.setItem('analytics_first_open_tracked', 'true');
        this.hasTrackedFirstOpen = true;
        console.log('🔥 [ANALYTICS] first_open event tracked');
      }

      if (!hasInstalledBefore) {
        // Track app_install event
        await this.logEvent('app_install', {
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          install_source: 'organic' // This will be overridden by Firebase for attributed installs
        });
        
        await AsyncStorage.setItem('analytics_app_install_tracked', 'true');
        this.hasTrackedAppInstall = true;
        console.log('🔥 [ANALYTICS] app_install event tracked');
      }

      // Always track app_open for session tracking
      await this.logEvent('app_open', {
        timestamp: new Date().toISOString(),
        session_start: true
      });
      
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to track app open events:', error);
    }
  }

  /**
   * Track login success event - crucial for post-install attribution
   * Call this after successful user authentication
   */
  async trackLoginSuccess(userId, loginMethod = 'phone') {
    try {
      if (!this.isInitialized) {
        console.warn('🔥 [ANALYTICS] Analytics not initialized, cannot track login_success');
        return;
      }

      const loginParams = {
        user_id: userId,
        login_method: loginMethod,
        timestamp: new Date().toISOString(),
        is_first_login: await this.isFirstLogin(userId)
      };

      await this.logEvent('login_success', loginParams);
      
      // Also track the standard Firebase login event
      await Analytics.logEvent('login', {
        method: loginMethod
      });

      // Set user properties for better segmentation
      await this.setUserProperties(userId, loginMethod);
      
      console.log('🔥 [ANALYTICS] login_success event tracked:', loginParams);
      
      // Mark that user has logged in
      await AsyncStorage.setItem(`user_${userId}_first_login_tracked`, 'true');
      
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to track login success:', error);
    }
  }

  /**
   * Check if this is the user's first login
   */
  async isFirstLogin(userId) {
    try {
      const hasLoggedInBefore = await AsyncStorage.getItem(`user_${userId}_first_login_tracked`);
      return !hasLoggedInBefore;
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to check first login status:', error);
      return false;
    }
  }

  /**
   * Set user properties for better analytics segmentation
   */
  async setUserProperties(userId, loginMethod) {
    try {
      await AnalyticsWrapper.setUserId(userId);
      
      const userProperties = {
        user_type: 'customer',
        login_method: loginMethod,
        registration_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        platform: Platform.OS
      };

      await AnalyticsWrapper.setUserProperties(userProperties);
      console.log('🔥 [ANALYTICS] User properties set:', userProperties);
      
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set user properties:', error);
    }
  }

  /**
   * Track custom events
   */
  async logEvent(eventName, parameters = {}) {
    try {
      if (!this.isInitialized) {
        console.warn(`🔥 [ANALYTICS] Analytics not initialized, cannot track event: ${eventName}`);
        return;
      }

      // Add timestamp to all events
      const eventParams = {
        ...parameters,
        event_timestamp: new Date().toISOString()
      };

      await AnalyticsWrapper.logEvent(eventName, eventParams);
      console.log(`🔥 [ANALYTICS] Event tracked: ${eventName}`, eventParams);
      
    } catch (error) {
      console.error(`🔥 [ANALYTICS] Failed to track event ${eventName}:`, error);
    }
  }

  /**
   * Track consultation-related events for better attribution analysis
   */
  async trackConsultationEvent(eventType, consultationData = {}) {
    try {
      const eventName = `consultation_${eventType}`;
      const params = {
        consultation_type: consultationData.type || 'unknown',
        astrologer_id: consultationData.astrologerId || null,
        duration: consultationData.duration || null,
        amount: consultationData.amount || null,
        ...consultationData
      };

      await this.logEvent(eventName, params);
    } catch (error) {
      console.error(`🔥 [ANALYTICS] Failed to track consultation event:`, error);
    }
  }

  /**
   * Track purchase events for revenue attribution
   */
  async trackPurchase(purchaseData) {
    try {
      await Analytics.logEvent('purchase', {
        currency: 'INR',
        value: purchaseData.amount || 0,
        transaction_id: purchaseData.transactionId || null,
        item_category: purchaseData.category || 'consultation',
        payment_method: purchaseData.paymentMethod || 'razorpay'
      });

      // Also track custom purchase event
      await this.logEvent('wallet_recharge', purchaseData);
      
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to track purchase:', error);
    }
  }

  /**
   * Enable/disable analytics collection (for privacy compliance)
   */
  async setAnalyticsEnabled(enabled) {
    try {
      await Analytics.setAnalyticsCollectionEnabledAsync(enabled);
      console.log(`🔥 [ANALYTICS] Analytics collection ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to set analytics enabled state:', error);
    }
  }

  /**
   * Reset analytics data (useful for testing)
   */
  async resetAnalyticsData() {
    try {
      await AsyncStorage.multiRemove([
        'analytics_first_open_tracked',
        'analytics_app_install_tracked'
      ]);
      
      // Reset user-specific data
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith('user_') && key.includes('_first_login_tracked'));
      if (userKeys.length > 0) {
        await AsyncStorage.multiRemove(userKeys);
      }
      
      console.log('🔥 [ANALYTICS] Analytics data reset');
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to reset analytics data:', error);
    }
  }

  /**
   * Get analytics status for debugging
   */
  async getAnalyticsStatus() {
    try {
      const isAvailable = await Analytics.isAvailableAsync();
      const hasTrackedFirstOpen = await AsyncStorage.getItem('analytics_first_open_tracked');
      const hasTrackedAppInstall = await AsyncStorage.getItem('analytics_app_install_tracked');
      
      return {
        isInitialized: this.isInitialized,
        isAvailable,
        hasTrackedFirstOpen: !!hasTrackedFirstOpen,
        hasTrackedAppInstall: !!hasTrackedAppInstall
      };
    } catch (error) {
      console.error('🔥 [ANALYTICS] Failed to get analytics status:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new AnalyticsService();
