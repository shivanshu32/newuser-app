import api from './api';

const prepaidRechargeCardsAPI = {
  // Get all active prepaid recharge cards
  getActiveCards: async () => {
    try {
      const response = await api.get('/prepaid-recharge-cards');
      return response;
    } catch (error) {
      console.error('Error fetching active cards:', error);
      throw error;
    }
  },

  // Get specific card details
  getCard: async (cardId) => {
    try {
      const response = await api.get(`/prepaid-recharge-cards/${cardId}`);
      return response;
    } catch (error) {
      console.error('Error fetching card details:', error);
      throw error;
    }
  },

  // Create Razorpay order for card purchase
  createOrder: async (cardId) => {
    try {
      const response = await api.post(`/prepaid-recharge-cards/${cardId}/create-order`);
      return response;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  // Verify payment and create offer
  verifyPayment: async (paymentData) => {
    try {
      const response = await api.post('/prepaid-recharge-cards/verify-payment', paymentData);
      return response;
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  },

  // Get user's available offers (paid and not used)
  getMyOffers: async () => {
    try {
      const response = await api.get('/prepaid-recharge-cards/my-offers');
      return response;
    } catch (error) {
      console.error('Error fetching my offers:', error);
      throw error;
    }
  },

  // Start prepaid card chat session
  startChatSession: async (purchaseId, astrologerId) => {
    try {
      const response = await api.post(`/prepaid-recharge-cards/${purchaseId}/start-chat`, {
        astrologerId
      });
      return response;
    } catch (error) {
      console.error('Error starting chat session:', error);
      throw error;
    }
  },

  // Get purchase history
  getMyPurchases: async (page = 1, limit = 20) => {
    try {
      const response = await api.get(`/prepaid-recharge-cards/my-purchases?page=${page}&limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching purchase history:', error);
      throw error;
    }
  }
};

export default prepaidRechargeCardsAPI;
