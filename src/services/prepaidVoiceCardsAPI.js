import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1';

/**
 * Get auth token from storage
 */
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Make authenticated API request
 */
const makeRequest = async (endpoint, options = {}) => {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

/**
 * Prepaid Voice Cards API Service
 */
const prepaidVoiceCardsAPI = {
  /**
   * Get all active prepaid voice cards
   */
  getActiveCards: async () => {
    try {
      console.log('📱 [PREPAID_VOICE_API] Fetching active voice cards');
      const response = await makeRequest('/prepaid-voice-cards');
      console.log('✅ [PREPAID_VOICE_API] Cards fetched:', response.count);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error fetching cards:', error);
      throw error;
    }
  },

  /**
   * Get cards available for specific astrologer
   */
  getCardsForAstrologer: async (astrologerId) => {
    try {
      console.log('📱 [PREPAID_VOICE_API] Fetching cards for astrologer:', astrologerId);
      const response = await makeRequest(`/prepaid-voice-cards/for-astrologer/${astrologerId}`);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error fetching cards for astrologer:', error);
      throw error;
    }
  },

  /**
   * Get single card details
   */
  getCard: async (cardId) => {
    try {
      const response = await makeRequest(`/prepaid-voice-cards/${cardId}`);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error fetching card:', error);
      throw error;
    }
  },

  /**
   * Create order for card purchase
   */
  createOrder: async (cardId) => {
    try {
      console.log('💳 [PREPAID_VOICE_API] Creating order for card:', cardId);
      const response = await makeRequest(`/prepaid-voice-cards/${cardId}/create-order`, {
        method: 'POST',
      });
      console.log('✅ [PREPAID_VOICE_API] Order created:', response.data?.orderId);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error creating order:', error);
      throw error;
    }
  },

  /**
   * Verify payment
   */
  verifyPayment: async (paymentData) => {
    try {
      console.log('🔍 [PREPAID_VOICE_API] Verifying payment');
      const response = await makeRequest('/prepaid-voice-cards/verify-payment', {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
      console.log('✅ [PREPAID_VOICE_API] Payment verified');
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error verifying payment:', error);
      throw error;
    }
  },

  /**
   * Get user's available offers (paid and not used)
   */
  getMyAvailableOffers: async () => {
    try {
      console.log('📱 [PREPAID_VOICE_API] Fetching available offers');
      const response = await makeRequest('/prepaid-voice-cards/my-offers');
      console.log('✅ [PREPAID_VOICE_API] Available offers:', response.count);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error fetching offers:', error);
      throw error;
    }
  },

  /**
   * Get user's purchase history
   */
  getMyPurchases: async (options = {}) => {
    try {
      const { page = 1, limit = 20, status } = options;
      let endpoint = `/prepaid-voice-cards/my-purchases?page=${page}&limit=${limit}`;
      if (status) {
        endpoint += `&status=${status}`;
      }
      const response = await makeRequest(endpoint);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error fetching purchases:', error);
      throw error;
    }
  },

  /**
   * Start voice call session with prepaid card
   */
  startVoiceCall: async (purchaseId, astrologerId) => {
    try {
      console.log('📞 [PREPAID_VOICE_API] Starting voice call:', { purchaseId, astrologerId });
      const response = await makeRequest(`/prepaid-voice-cards/${purchaseId}/start-call`, {
        method: 'POST',
        body: JSON.stringify({ astrologerId }),
      });
      console.log('✅ [PREPAID_VOICE_API] Voice call initiated:', response.data?.bookingId);
      return response;
    } catch (error) {
      console.error('❌ [PREPAID_VOICE_API] Error starting voice call:', error);
      throw error;
    }
  },
};

export default prepaidVoiceCardsAPI;
