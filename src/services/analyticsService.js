import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';

// Firebase Analytics Service - Real implementation for Google Ads & Meta Ads tracking
class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.isSupported = true;
  }

  // Initialize Firebase Analytics
  async initialize() {
    try {
      this.isInitialized = true;
      console.log('📊 [GA4] Firebase Analytics initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ [GA4] Analytics initialization error:', error);
      this.isSupported = false;
      return false;
    }
  }

  // Check if analytics is supported
  async isSupported() {
    return this.isSupported;
  }

  // Log event to Firebase Analytics (GA4)
  async logEvent(eventName, parameters = {}) {
    try {
      // Clean parameters - remove undefined values and ensure proper types
      const cleanParams = {};
      Object.keys(parameters).forEach(key => {
        const value = parameters[key];
        if (value !== undefined && value !== null) {
          // GA4 only accepts string, number, or boolean values
          if (typeof value === 'object') {
            cleanParams[key] = JSON.stringify(value);
          } else {
            cleanParams[key] = value;
          }
        }
      });

      await analytics().logEvent(eventName, cleanParams);
      console.log(`📊 [GA4] Event logged: ${eventName}`, cleanParams);
      return true;
    } catch (error) {
      console.error(`❌ [GA4] Error logging event ${eventName}:`, error);
      return false;
    }
  }

  // Set user ID for analytics
  async setUserId(userId) {
    try {
      if (userId) {
        await analytics().setUserId(userId.toString());
        console.log(`📊 [GA4] User ID set: ${userId}`);
      }
      return true;
    } catch (error) {
      console.error('❌ [GA4] Error setting user ID:', error);
      return false;
    }
  }

  // Set user properties
  async setUserProperties(properties) {
    try {
      if (properties && typeof properties === 'object') {
        await analytics().setUserProperties(properties);
        console.log('📊 [GA4] User properties set:', properties);
      }
      return true;
    } catch (error) {
      console.error('❌ [GA4] Error setting user properties:', error);
      return false;
    }
  }

  // Track app open events
  async trackAppOpenEvents() {
    try {
      await this.logEvent('app_open', {
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('❌ [GA4] Error tracking app open:', error);
      return false;
    }
  }

  // Track login success
  async trackLoginSuccess(userId, loginMethod = 'phone') {
    try {
      await this.logEvent('login', {
        method: loginMethod,
        user_id: userId
      });
      return true;
    } catch (error) {
      console.error('❌ [GA4] Error tracking login:', error);
      return false;
    }
  }

  // Track consultation event
  async trackConsultationEvent(eventType, consultationData = {}) {
    try {
      await this.logEvent(eventType, consultationData);
      return true;
    } catch (error) {
      console.error(`❌ [GA4] Error tracking consultation event ${eventType}:`, error);
      return false;
    }
  }

  // Track purchase event
  async trackPurchase(purchaseData) {
    try {
      await this.logEvent('purchase', purchaseData);
      return true;
    } catch (error) {
      console.error('❌ [GA4] Error tracking purchase:', error);
      return false;
    }
  }

  // Test analytics
  async testAnalytics() {
    try {
      await this.logEvent('analytics_test', {
        test_time: new Date().toISOString(),
        platform: Platform.OS
      });
      return {
        isInitialized: this.isInitialized,
        isSupported: this.isSupported,
        disabled: false
      };
    } catch (error) {
      console.error('❌ [GA4] Analytics test failed:', error);
      return {
        isInitialized: false,
        isSupported: false,
        disabled: true,
        error: error.message
      };
    }
  }

  // Reset analytics data
  async resetAnalyticsData() {
    try {
      await analytics().resetAnalyticsData();
      console.log('📊 [GA4] Analytics data reset');
      return true;
    } catch (error) {
      console.error('❌ [GA4] Error resetting analytics:', error);
      return false;
    }
  }

  // Get analytics status
  getAnalyticsStatus() {
    return {
      isInitialized: this.isInitialized,
      isSupported: this.isSupported,
      disabled: false,
      platform: Platform.OS
    };
  }

  // Get current status
  getStatus() {
    return this.getAnalyticsStatus();
  }

  // Reset
  reset() {
    this.resetAnalyticsData();
  }
}

// Export singleton instance
export default new AnalyticsService();
