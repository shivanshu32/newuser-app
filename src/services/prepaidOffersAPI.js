import api from './api';

const prepaidOffersAPI = {
  // Create prepaid chat offer after free chat ends
  createOffer: async (astrologerId, originalSessionId) => {
    try {
      const response = await api.post('/prepaid-offers/create', {
        astrologerId,
        originalSessionId
      });
      // API interceptor already extracts response.data, so return the full response
      return response;
    } catch (error) {
      console.error('Error creating prepaid offer:', error);
      throw error;
    }
  },

  // Get active offers for user
  getActiveOffers: async () => {
    try {
      const response = await api.get('/prepaid-offers/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active offers:', error);
      throw error;
    }
  },

  // Get specific offer details
  getOfferDetails: async (offerId) => {
    try {
      const response = await api.get(`/prepaid-offers/${offerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching offer details:', error);
      throw error;
    }
  },

  // Create Razorpay order for prepaid chat offer
  createRazorpayOrder: async (offerId) => {
    try {
      const response = await api.post(`/prepaid-offers/${offerId}/create-order`);
      return response.data;
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  },

  // Verify Razorpay payment for prepaid chat offer
  verifyRazorpayPayment: async (offerId, paymentData) => {
    try {
      const response = await api.post(`/prepaid-offers/${offerId}/verify-payment`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  },

  // Start prepaid chat session
  startPrepaidChat: async (offerId) => {
    try {
      const response = await api.post(`/prepaid-offers/${offerId}/start-chat`);
      return response.data;
    } catch (error) {
      console.error('Error starting prepaid chat:', error);
      throw error;
    }
  },

  // Expire/cancel offer
  expireOffer: async (offerId) => {
    try {
      const response = await api.put(`/prepaid-offers/${offerId}/expire`);
      return response.data;
    } catch (error) {
      console.error('Error expiring offer:', error);
      throw error;
    }
  }
};

export default prepaidOffersAPI;
