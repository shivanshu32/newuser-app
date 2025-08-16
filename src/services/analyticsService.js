import { Platform } from 'react-native';

// No-op Analytics Service - Firebase Analytics completely removed
// This prevents any analytics-related crashes while maintaining API compatibility

// Simple Analytics Service that does nothing but maintains API compatibility
class AnalyticsService {
  constructor() {
    this.isInitialized = true;
    this.isSupported = false;
  }

  // Initialize - always succeeds but does nothing
  async initialize() {
    console.log('📊 [ANALYTICS] Analytics disabled - no initialization needed');
    return true;
  }

  // Check if analytics is supported - always false
  async isSupported() {
    return false;
  }

  // Log event - no-op
  async logEvent(eventName, parameters = {}) {
    console.log(`📊 [ANALYTICS] Event skipped (analytics disabled): ${eventName}`, parameters);
    return true;
  }

  // Set user ID - no-op
  async setUserId(userId) {
    console.log(`📊 [ANALYTICS] User ID skipped (analytics disabled): ${userId}`);
    return true;
  }

  // Set user properties - no-op
  async setUserProperties(properties) {
    console.log('📊 [ANALYTICS] User properties skipped (analytics disabled):', properties);
    return true;
  }

  // Track app open events - no-op
  async trackAppOpenEvents() {
    console.log('📊 [ANALYTICS] App open events skipped (analytics disabled)');
    return true;
  }

  // Track login success - no-op
  async trackLoginSuccess(userId, loginMethod = 'phone') {
    console.log(`📊 [ANALYTICS] Login success skipped (analytics disabled): ${userId}`);
    return true;
  }

  // Track consultation event - no-op
  async trackConsultationEvent(eventType, consultationData = {}) {
    console.log(`📊 [ANALYTICS] Consultation event skipped (analytics disabled): ${eventType}`);
    return true;
  }

  // Track purchase - no-op
  async trackPurchase(purchaseData) {
    console.log('📊 [ANALYTICS] Purchase event skipped (analytics disabled):', purchaseData);
    return true;
  }

  // Test analytics - no-op
  async testAnalytics() {
    console.log('📊 [ANALYTICS] Analytics test skipped (analytics disabled)');
    return {
      isInitialized: true,
      isSupported: false,
      disabled: true
    };
  }

  // Reset analytics data - no-op
  async resetAnalyticsData() {
    console.log('📊 [ANALYTICS] Analytics reset skipped (analytics disabled)');
    return true;
  }

  // Get analytics status
  getAnalyticsStatus() {
    return {
      isInitialized: true,
      isSupported: false,
      disabled: true,
      platform: Platform.OS
    };
  }

  // Get current status
  getStatus() {
    return this.getAnalyticsStatus();
  }

  // Reset - no-op
  reset() {
    console.log('📊 [ANALYTICS] Reset skipped (analytics disabled)');
  }
}

// Export singleton instance
export default new AnalyticsService();
