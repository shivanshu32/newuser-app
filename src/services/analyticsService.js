import { Platform } from 'react-native';
import analytics from '@react-native-firebase/analytics';

// Firebase Analytics Service - Full UAC / GA4 event implementation
// All events are non-blocking and fail silently to prevent app crashes.
class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this._isSupported = true;
  }

  // ─── Core ──────────────────────────────────────────────────────────────────

  async initialize() {
    try {
      await analytics().setAnalyticsCollectionEnabled(true);
      this.isInitialized = true;
      console.log('📊 [GA4] Firebase Analytics initialized');
      return true;
    } catch (error) {
      console.error('❌ [GA4] Analytics initialization error:', error);
      this._isSupported = false;
      return false;
    }
  }

  // Clean params: strip nulls/undefined and coerce objects to strings (GA4 requirement)
  _clean(parameters = {}) {
    const out = {};
    Object.keys(parameters).forEach(key => {
      const v = parameters[key];
      if (v !== undefined && v !== null) {
        out[key] = typeof v === 'object' ? JSON.stringify(v) : v;
      }
    });
    return out;
  }

  async logEvent(eventName, parameters = {}) {
    try {
      await analytics().logEvent(eventName, this._clean(parameters));
      console.log(`📊 [GA4] ${eventName}`, parameters);
      return true;
    } catch (error) {
      console.error(`❌ [GA4] logEvent(${eventName}):`, error);
      return false;
    }
  }

  async setUserId(userId) {
    try {
      if (userId) {
        await analytics().setUserId(userId.toString());
        console.log(`📊 [GA4] userId set: ${userId}`);
      }
      return true;
    } catch (error) {
      console.error('❌ [GA4] setUserId:', error);
      return false;
    }
  }

  async setUserProperties(properties) {
    try {
      if (properties && typeof properties === 'object') {
        // GA4 user properties must be strings
        const stringified = {};
        Object.keys(properties).forEach(k => {
          const v = properties[k];
          if (v !== undefined && v !== null) {
            stringified[k] = String(v);
          }
        });
        await analytics().setUserProperties(stringified);
        console.log('📊 [GA4] userProperties set:', stringified);
      }
      return true;
    } catch (error) {
      console.error('❌ [GA4] setUserProperties:', error);
      return false;
    }
  }

  // ─── Install / Session ─────────────────────────────────────────────────────

  // Called once per app launch; GA4 auto-collects first_open but this ensures
  // app_open fires for every session so UAC learning works on returning users.
  async trackAppOpen() {
    return this.logEvent('app_open', { platform: Platform.OS });
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  // GA4 standard: 'login' event (used as UAC Phase 2 optimization target)
  async trackLoginSuccess(userId, loginMethod = 'phone_otp') {
    return this.logEvent('login', { method: loginMethod, user_id: String(userId) });
  }

  // GA4 standard: 'sign_up' (new user registration)
  async trackSignUp(userId, method = 'phone_otp') {
    return this.logEvent('sign_up', { method, user_id: String(userId) });
  }

  // ─── Onboarding ────────────────────────────────────────────────────────────

  // Fired when user saves their birth profile (profile completion step)
  async trackOnboardingComplete(userId) {
    return this.logEvent('onboarding_complete', {
      user_id: String(userId),
      platform: Platform.OS
    });
  }

  // ─── Discovery ─────────────────────────────────────────────────────────────

  // Fired when user searches / filters astrologers
  async trackAstrologerSearch(searchQuery = '', filterType = 'all', resultCount = 0) {
    return this.logEvent('search', {
      search_term: searchQuery.slice(0, 100),
      filter_type: filterType,
      result_count: resultCount
    });
  }

  // Fired when user views an astrologer profile
  async trackAstrologerProfileView(astrologerId, astrologerName, consultationType = 'chat') {
    return this.logEvent('select_content', {
      content_type: 'astrologer_profile',
      item_id: String(astrologerId),
      item_name: astrologerName,
      consultation_type: consultationType
    });
  }

  // ─── Consultation ──────────────────────────────────────────────────────────

  // Fired when a chat/voice session successfully connects
  async trackConsultationStarted(data = {}) {
    return this.logEvent('consultation_started', {
      consultation_type: data.consultationType || 'chat',
      astrologer_id: String(data.astrologerId || ''),
      session_id: String(data.sessionId || ''),
      is_free_chat: data.isFreeChat ? 'true' : 'false',
      is_prepaid: data.isPrepaid ? 'true' : 'false'
    });
  }

  // Fired when session ends (user or system triggered)
  async trackConsultationEnded(data = {}) {
    return this.logEvent('consultation_ended', {
      consultation_type: data.consultationType || 'chat',
      astrologer_id: String(data.astrologerId || ''),
      session_id: String(data.sessionId || ''),
      duration_seconds: data.durationSeconds || 0,
      end_reason: data.endReason || 'user',
      is_free_chat: data.isFreeChat ? 'true' : 'false'
    });
  }

  // Fired when user submits a rating after a session
  async trackRatingSubmitted(data = {}) {
    return this.logEvent('rating_submitted', {
      booking_id: String(data.bookingId || ''),
      astrologer_id: String(data.astrologerId || ''),
      rating: data.rating || 0,
      consultation_type: data.consultationType || 'chat',
      has_review: data.hasReview ? 'true' : 'false'
    });
  }

  // ─── Commerce ──────────────────────────────────────────────────────────────

  // GA4 standard: 'begin_checkout' – already called in WalletTopUpSummaryScreen
  async trackBeginCheckout(data = {}) {
    return this.logEvent('begin_checkout', {
      currency: data.currency || 'INR',
      value: data.value || 0,
      coupon: data.coupon || '',
      payment_type: data.paymentType || 'wallet_recharge'
    });
  }

  // GA4 standard: 'purchase' – primary revenue conversion event
  // value must be the amount actually paid (including GST) for correct ROAS reporting
  async trackPurchase(data = {}) {
    return this.logEvent('purchase', {
      transaction_id: String(data.transactionId || data.paymentId || ''),
      value: data.value || 0,
      currency: data.currency || 'INR',
      coupon: data.coupon || '',
      items: JSON.stringify([{
        item_id: data.itemId || 'wallet_topup',
        item_name: data.itemName || 'Wallet Top-up',
        item_category: data.itemCategory || 'wallet',
        price: data.value || 0,
        quantity: 1
      }])
    });
  }

  // Fired on first wallet top-up (high-value signal for UAC optimization)
  async trackFirstPurchase(data = {}) {
    return this.logEvent('first_purchase', {
      transaction_id: String(data.transactionId || data.paymentId || ''),
      value: data.value || 0,
      currency: data.currency || 'INR'
    });
  }

  // ─── Free-question funnel (primary UAC signals) ────────────────────────────

  // PRIMARY CONVERSION: fired once per user lifetime when first free question is sent
  async trackFirstFreeQuestionSent(userId) {
    return this.logEvent('first_free_question_sent', { user_id: String(userId || '') });
  }

  // Fired when astrologer sends first reply – confirms value delivery
  async trackFreeAnswerReceived({ freeChatId, astrologerId } = {}) {
    return this.logEvent('free_answer_received', {
      free_chat_id: String(freeChatId || ''),
      astrologer_id: String(astrologerId || '')
    });
  }

  // Fired when continuation offer bottom-sheet becomes visible
  async trackContinueOfferShown({ astrologerId, durationMinutes, basePrice, gstAmount, totalAmount } = {}) {
    return this.logEvent('continue_offer_shown', {
      astrologer_id: String(astrologerId || ''),
      duration_minutes: durationMinutes || 5,
      base_price: basePrice || 25,
      gst_amount: gstAmount || 0,
      value: totalAmount || 29.5,
      currency: 'INR'
    });
  }

  // Fired when user taps "Proceed to Pay" on the continuation offer – highest-intent pre-purchase signal
  async trackContinueOfferClicked({ astrologerId, offerId } = {}) {
    return this.logEvent('continue_offer_clicked', {
      astrologer_id: String(astrologerId || ''),
      offer_id: String(offerId || '')
    });
  }

  // Fired when continuation offer payment is verified successfully
  async trackContinueOfferPurchased({ transactionId, value, currency = 'INR', offerId } = {}) {
    return this.logEvent('continue_offer_purchased', {
      transaction_id: String(transactionId || ''),
      value: value || 0,
      currency,
      offer_id: String(offerId || '')
    });
  }

  // Fired on every successful wallet recharge
  async trackWalletRecharge({ transactionId, value, currency = 'INR' } = {}) {
    return this.logEvent('wallet_recharge', {
      transaction_id: String(transactionId || ''),
      value: value || 0,
      currency
    });
  }

  // Fired when a prepaid chat pack is purchased
  async trackChatPackPurchase({ transactionId, value, currency = 'INR', packId } = {}) {
    return this.logEvent('chat_pack_purchase', {
      transaction_id: String(transactionId || ''),
      value: value || 0,
      currency,
      pack_id: String(packId || '')
    });
  }

  // Fired when a prepaid voice pack is purchased
  async trackVoicePackPurchase({ transactionId, value, currency = 'INR', packId } = {}) {
    return this.logEvent('voice_pack_purchase', {
      transaction_id: String(transactionId || ''),
      value: value || 0,
      currency,
      pack_id: String(packId || '')
    });
  }

  // ─── Legacy shims (keep callers working) ──────────────────────────────────

  async trackAppOpenEvents() { return this.trackAppOpen(); }

  async trackConsultationEvent(eventType, consultationData = {}) {
    return this.logEvent(eventType, consultationData);
  }

  // ─── Diagnostics ───────────────────────────────────────────────────────────

  async testAnalytics() {
    try {
      await this.logEvent('analytics_test', { platform: Platform.OS });
      return { isInitialized: this.isInitialized, isSupported: this._isSupported, disabled: false };
    } catch (error) {
      return { isInitialized: false, isSupported: false, disabled: true, error: error.message };
    }
  }

  async resetAnalyticsData() {
    try {
      await analytics().resetAnalyticsData();
      console.log('📊 [GA4] Analytics data reset');
      return true;
    } catch (error) {
      console.error('❌ [GA4] resetAnalyticsData:', error);
      return false;
    }
  }

  getAnalyticsStatus() {
    return { isInitialized: this.isInitialized, isSupported: this._isSupported, disabled: false, platform: Platform.OS };
  }

  getStatus() { return this.getAnalyticsStatus(); }

  reset() { this.resetAnalyticsData(); }
}

// Export singleton instance
export default new AnalyticsService();
