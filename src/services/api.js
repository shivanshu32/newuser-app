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
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error(' [API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
API.interceptors.response.use(
  (response) => {
    console.log(' [API] Response received:', response.status, response.config.url);
    return response.data; // Return only the data part
  },
  (error) => {
    console.error(' [API] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data
    });
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
};

// Offers API
export const offersAPI = {
  getActiveOffers: (amount) => API.get('/offers/active', { params: { amount } }),
};

// Sessions API
export const sessionsAPI = {
  start: (bookingId, type) => API.post('/sessions/start', { bookingId, type }),
  end: (sessionId) => API.post('/sessions/end', { sessionId }),
  getActive: () => API.get('/sessions/active'),
};

// Ratings API
export const ratingsAPI = {
  submit: (bookingId, rating, comment) => API.post('/ratings/submit', { bookingId, rating, comment }),
};

export default API;
