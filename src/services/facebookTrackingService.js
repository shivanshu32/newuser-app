import { AppEventsLogger } from 'react-native-fbsdk-next';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Facebook SDK Payment Tracking Service
 * Tracks Razorpay payment events for Facebook Ads attribution
 */
class FacebookTrackingService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize Facebook tracking
   */
  async initialize() {
    try {
      console.log('📊 [FB-TRACKING] Initializing Facebook tracking service...');
      this.isInitialized = true;
      console.log('✅ [FB-TRACKING] Facebook tracking service initialized');
      return true;
    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to initialize Facebook tracking:', error);
      return false;
    }
  }

  /**
   * Track payment initiation (when user starts payment process)
   */
  async trackPaymentInitiated(paymentData) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ [FB-TRACKING] Service not initialized, skipping payment initiation tracking');
        return;
      }

      const {
        amount,
        currency = 'INR',
        paymentType = 'wallet_recharge',
        selectedPackage = null,
        offerId = null
      } = paymentData;

      // Track InitiatedCheckout event
      const parameters = {
        fb_content_type: paymentType,
        fb_currency: currency,
        fb_num_items: 1,
        fb_payment_info_available: 1,
        fb_registration_method: 'razorpay'
      };

      // Add package-specific parameters
      if (selectedPackage) {
        parameters.fb_content_id = selectedPackage.id || selectedPackage._id;
        parameters.fb_content_name = selectedPackage.name;
        parameters.fb_content_category = 'recharge_package';
        parameters.package_bonus = selectedPackage.percentageBonus || selectedPackage.flatBonus || 0;
      } else if (offerId) {
        parameters.fb_content_id = offerId;
        parameters.fb_content_category = 'prepaid_offer';
      } else {
        parameters.fb_content_category = 'manual_recharge';
      }

      await AppEventsLogger.logEvent('InitiatedCheckout', amount, parameters);
      
      console.log('📊 [FB-TRACKING] Payment initiation tracked:', {
        event: 'InitiatedCheckout',
        amount,
        parameters
      });

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track payment initiation:', error);
    }
  }

  /**
   * Track successful payment completion
   */
  async trackPaymentCompleted(paymentData) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ [FB-TRACKING] Service not initialized, skipping payment completion tracking');
        return;
      }

      const {
        amount,
        currency = 'INR',
        paymentId,
        orderId,
        paymentType = 'wallet_recharge',
        selectedPackage = null,
        offerId = null,
        bonusAmount = 0,
        totalWalletCredit = 0
      } = paymentData;

      // Track Purchase event (Facebook's standard commerce event)
      const purchaseParameters = {
        fb_content_type: paymentType,
        fb_currency: currency,
        fb_num_items: 1,
        fb_payment_info_available: 1,
        fb_registration_method: 'razorpay',
        payment_id: paymentId,
        order_id: orderId
      };

      // Add package-specific parameters
      if (selectedPackage) {
        purchaseParameters.fb_content_id = selectedPackage.id || selectedPackage._id;
        purchaseParameters.fb_content_name = selectedPackage.name;
        purchaseParameters.fb_content_category = 'recharge_package';
        purchaseParameters.package_bonus = selectedPackage.percentageBonus || selectedPackage.flatBonus || 0;
        purchaseParameters.bonus_amount = bonusAmount;
        purchaseParameters.total_wallet_credit = totalWalletCredit;
      } else if (offerId) {
        purchaseParameters.fb_content_id = offerId;
        purchaseParameters.fb_content_category = 'prepaid_offer';
      } else {
        purchaseParameters.fb_content_category = 'manual_recharge';
      }

      // Log Purchase event
      await AppEventsLogger.logEvent('Purchase', amount, purchaseParameters);

      // Also track custom wallet recharge event for better segmentation
      const walletParameters = {
        ...purchaseParameters,
        wallet_credit_amount: totalWalletCredit || amount,
        payment_method: 'razorpay',
        success: true
      };

      await AppEventsLogger.logEvent('WalletRecharge', amount, walletParameters);

      console.log('📊 [FB-TRACKING] Payment completion tracked:', {
        events: ['Purchase', 'WalletRecharge'],
        amount,
        purchaseParameters,
        walletParameters
      });

      // Track conversion milestone
      await this.trackConversionMilestone('payment_completed', amount);

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track payment completion:', error);
    }
  }

  /**
   * Track payment failure
   */
  async trackPaymentFailed(paymentData) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ [FB-TRACKING] Service not initialized, skipping payment failure tracking');
        return;
      }

      const {
        amount,
        currency = 'INR',
        error,
        paymentType = 'wallet_recharge',
        selectedPackage = null,
        offerId = null
      } = paymentData;

      const parameters = {
        fb_content_type: paymentType,
        fb_currency: currency,
        fb_num_items: 1,
        error_message: error || 'Unknown error',
        payment_method: 'razorpay',
        success: false
      };

      // Add package-specific parameters
      if (selectedPackage) {
        parameters.fb_content_id = selectedPackage.id || selectedPackage._id;
        parameters.fb_content_category = 'recharge_package';
      } else if (offerId) {
        parameters.fb_content_id = offerId;
        parameters.fb_content_category = 'prepaid_offer';
      } else {
        parameters.fb_content_category = 'manual_recharge';
      }

      await AppEventsLogger.logEvent('PaymentFailed', amount, parameters);

      console.log('📊 [FB-TRACKING] Payment failure tracked:', {
        event: 'PaymentFailed',
        amount,
        parameters
      });

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track payment failure:', error);
    }
  }

  /**
   * Track prepaid offer purchase specifically
   */
  async trackPrepaidOfferPurchase(offerData) {
    try {
      if (!this.isInitialized) {
        console.warn('⚠️ [FB-TRACKING] Service not initialized, skipping prepaid offer tracking');
        return;
      }

      const {
        offerId,
        amount,
        currency = 'INR',
        astrologerName,
        durationMinutes,
        paymentId,
        orderId
      } = offerData;

      const parameters = {
        fb_content_type: 'prepaid_chat_offer',
        fb_content_id: offerId,
        fb_content_name: `Prepaid Chat - ${durationMinutes}min with ${astrologerName}`,
        fb_content_category: 'astrology_consultation',
        fb_currency: currency,
        fb_num_items: 1,
        astrologer_name: astrologerName,
        duration_minutes: durationMinutes,
        payment_id: paymentId,
        order_id: orderId,
        consultation_type: 'chat'
      };

      await AppEventsLogger.logEvent('PrepaidOfferPurchase', amount, parameters);

      console.log('📊 [FB-TRACKING] Prepaid offer purchase tracked:', {
        event: 'PrepaidOfferPurchase',
        amount,
        parameters
      });

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track prepaid offer purchase:', error);
    }
  }

  /**
   * Track conversion milestones for Facebook optimization
   */
  async trackConversionMilestone(milestone, value = 0) {
    try {
      if (!this.isInitialized) {
        return;
      }

      const parameters = {
        milestone_type: milestone,
        timestamp: new Date().toISOString(),
        app_version: '5.3.3'
      };

      await AppEventsLogger.logEvent('ConversionMilestone', value, parameters);

      console.log('📊 [FB-TRACKING] Conversion milestone tracked:', {
        milestone,
        value,
        parameters
      });

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track conversion milestone:', error);
    }
  }

  /**
   * Track user registration (for attribution)
   */
  async trackUserRegistration(userData) {
    try {
      if (!this.isInitialized) {
        return;
      }

      const parameters = {
        fb_registration_method: 'phone_otp',
        user_id: userData.id || userData._id,
        registration_timestamp: new Date().toISOString()
      };

      await AppEventsLogger.logEvent('CompleteRegistration', 0, parameters);

      console.log('📊 [FB-TRACKING] User registration tracked:', {
        event: 'CompleteRegistration',
        parameters
      });

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track user registration:', error);
    }
  }

  /**
   * Track first payment (important for attribution)
   */
  async trackFirstPayment(paymentData) {
    try {
      if (!this.isInitialized) {
        return;
      }

      // Check if this is user's first payment
      const hasFirstPayment = await AsyncStorage.getItem('fb_first_payment_tracked');
      if (hasFirstPayment) {
        console.log('📊 [FB-TRACKING] First payment already tracked, skipping');
        return;
      }

      const {
        amount,
        currency = 'INR',
        paymentType,
        paymentId
      } = paymentData;

      const parameters = {
        fb_currency: currency,
        payment_type: paymentType,
        payment_id: paymentId,
        first_payment_timestamp: new Date().toISOString()
      };

      await AppEventsLogger.logEvent('FirstPayment', amount, parameters);

      // Mark first payment as tracked
      await AsyncStorage.setItem('fb_first_payment_tracked', 'true');

      console.log('📊 [FB-TRACKING] First payment tracked:', {
        event: 'FirstPayment',
        amount,
        parameters
      });

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track first payment:', error);
    }
  }

  /**
   * Set user properties for better targeting
   */
  async setUserProperties(userData) {
    try {
      if (!this.isInitialized) {
        return;
      }

      const properties = {
        user_id: userData.id || userData._id,
        registration_date: userData.createdAt || new Date().toISOString(),
        wallet_balance: userData.walletBalance || 0,
        total_consultations: userData.totalConsultations || 0,
        preferred_consultation_type: userData.preferredConsultationType || 'chat'
      };

      await AppEventsLogger.setUserProperties(properties);

      console.log('📊 [FB-TRACKING] User properties set:', properties);

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to set user properties:', error);
    }
  }

  /**
   * Track app install (call this on first app launch)
   */
  async trackAppInstall() {
    try {
      if (!this.isInitialized) {
        return;
      }

      // Check if install already tracked
      const installTracked = await AsyncStorage.getItem('fb_install_tracked');
      if (installTracked) {
        console.log('📊 [FB-TRACKING] App install already tracked');
        return;
      }

      const parameters = {
        install_timestamp: new Date().toISOString(),
        app_version: '5.3.3',
        platform: 'android'
      };

      await AppEventsLogger.logEvent('AppInstall', 0, parameters);
      await AsyncStorage.setItem('fb_install_tracked', 'true');

      console.log('📊 [FB-TRACKING] App install tracked:', parameters);

    } catch (error) {
      console.error('❌ [FB-TRACKING] Failed to track app install:', error);
    }
  }

  /**
   * Get tracking status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      service: 'Facebook SDK',
      events: [
        'InitiatedCheckout',
        'Purchase', 
        'WalletRecharge',
        'PaymentFailed',
        'PrepaidOfferPurchase',
        'ConversionMilestone',
        'CompleteRegistration',
        'FirstPayment',
        'AppInstall'
      ]
    };
  }
}

// Export singleton instance
export default new FacebookTrackingService();
