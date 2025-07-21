import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API URL Configuration based on environment
const getApiUrl = () => {
  // Check if we're in development (Expo Go)
  const isDevelopment = __DEV__ || Constants.appOwnership === 'expo';
  
  // Debug logging to help identify environment in APK builds
  console.log('Environment Detection:', {
    __DEV__,
    appOwnership: Constants.appOwnership,
    isDevelopment,
    executionEnvironment: Constants.executionEnvironment
  });
  
  if (isDevelopment) {
    // Local development - use your local IP (commented out for production)
    // return 'http://192.168.29.107:5000';
    
    // Production URL for development testing
    console.log('Using development/Expo Go URL');
    return 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
  } else {
    // Production - use new production URL
    // Old production URL: return 'https://3.110.171.85';
    console.log('Using production APK URL');
    return 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
  }
};

const API_URL = getApiUrl();
const API_BASE = `${API_URL}/api/v1`;

console.log('API Configuration:', { API_URL, isDev: __DEV__, appOwnership: Constants.appOwnership });

// Create axios instance
const API = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'JyotishCall-UserApp/1.0.0',
    'Accept': 'application/json',
  },
});

// Add authorization header to every request if token exists
API.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(' [API] Request with auth token:', config.method?.toUpperCase(), config.url);
    } else {
      console.log(' [API] Request without auth token:', config.method?.toUpperCase(), config.url);
    }
    
    console.log(' [API] Request config:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      data: config.data,
      headers: config.headers
    });
    
    return config;
  },
  (error) => {
    console.error(' [API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
API.interceptors.response.use(
  (response) => {
    console.log(' [API] Response success:', response.status, response.config.url);
    return response.data; // Return only the data part
  },
  (error) => {
    // Enhanced error logging for network debugging
    console.error(' [API] Response error:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      isNetworkError: error.message === 'Network Error',
      isTimeout: error.code === 'ECONNABORTED'
    });
    
    // Add specific handling for common network issues
    if (error.message === 'Network Error') {
      console.error(' [API] Network Error - Check internet connection and backend availability');
    } else if (error.code === 'ECONNABORTED') {
      console.error(' [API] Request Timeout - Backend took too long to respond');
    }
    
    // Return a rejected promise with the error
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  requestOtp: (phoneNumber) => API.post('/auth/request-otp', { phoneNumber, role: 'user' }),
  verifyOtp: (phoneNumber, otp) => API.post('/auth/verify-otp', { phoneNumber, otp, role: 'user' }),
  updateProfile: (profileData) => API.put('/users/profile', profileData),
  registerDeviceToken: (token) => API.post('/users/register-device-token', { token }),
};

// Astrologers API
export const astrologersAPI = {
  getAll: (params) => API.get('/astrologers', { params }),
  getById: (id) => API.get(`/astrologers/${id}`),
  getAvailability: (id) => API.get(`/astrologers/${id}/availability`),
};

// Bookings API
export const bookingsAPI = {
  create(bookingData) {
    return API.post('/bookings', bookingData);
  },
  createBooking(bookingData) {
    // Enhanced booking creation with user information support
    return API.post('/bookings/create', bookingData);
  },
  getAll() {
    return API.get('/bookings');
  },
  getById(id) {
    return API.get(`/bookings/${id}`);
  },
  cancel(id, reason = 'User cancelled') {
    return API.post(`/bookings/${id}/cancel`, { reason });
  },
  // New lifecycle endpoints
  joinUser(id) {
    return API.post(`/bookings/${id}/join-user`);
  },
  complete(id) {
    return API.post(`/bookings/${id}/complete`);
  },
  reschedule(id, newScheduledTime, reason) {
    return API.post(`/bookings/${id}/reschedule`, { 
      newScheduledTime, 
      reason 
    });
  },
  getStats() {
    return API.get('/bookings/stats');
  }
};

// Wallet API
export const walletAPI = {
  getBalance: () => API.get('/wallet/balance'),
  createOrder: (amount) => API.post('/wallet/create-order', { amount }),
  verifyPayment: (paymentData) => API.post('/wallet/verify-payment', paymentData),
  getTransactions: (params) => API.get('/wallet/transactions', { params }),
  getRazorpayConfig: () => API.get('/wallet/razorpay-config'),
  checkTransactionStatus: (transactionId) => API.get(`/wallet/transaction/${transactionId}/status`),
  cancelTransaction: (transactionId, reason) => API.post(`/wallet/transaction/${transactionId}/cancel`, { reason }),
};

// Offers API
export const offersAPI = {
  getActiveOffers: (amount) => API.get('/offers/active', { params: { amount } }),
  getRechargePackages: () => API.get('/offers/active'), // Get all active recharge packages
  getPackageById: (id) => API.get(`/offers/${id}`), // Get specific package details
};

// Sessions API
export const sessionsAPI = {
  start: (bookingId, type) => API.post('/sessions/start', { bookingId, type }),
  end: (sessionId) => API.post('/sessions/end', { sessionId }),
  getActive: () => API.get('/sessions/active'),
};

// Free Chat API
export const freeChatAPI = {
  checkEligibility: () => API.get('/free-chat/eligibility'),
  requestFreeChat: () => API.post('/free-chat/request'),
  getFreeChatDetails: (freeChatId) => API.get(`/free-chat/${freeChatId}`),
  cancelFreeChat: (freeChatId) => API.delete(`/free-chat/${freeChatId}/cancel`),
  getHistory: () => API.get('/free-chat/history'),
};

// Ratings API
export const ratingsAPI = {
  submit: (bookingId, rating, comment) => API.post(`/ratings/submit`, { bookingId, rating, comment }),
};

// Chat History API
export const chatHistoryAPI = {
  getChatHistory: (sessionId) => API.get(`/chat-history/${sessionId}`),
};

// Version API
export const versionAPI = {
  checkVersion: (currentVersion) => API.post(`/version/check`, { currentVersion }),
};

// Ledger API
export const ledgerAPI = {
  getMyTransactions: (params) => API.get('/ledger/my-transactions', { params }),
  getBalanceSummary: () => API.get('/ledger/balance-summary'),
  getLedgerEntry: (entryId) => API.get(`/ledger/entry/${entryId}`),
  getUserTransactions: (userId, params) => API.get(`/ledger/user/${userId}/transactions`, { params }),
};

export default API;
