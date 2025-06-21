import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API URL Configuration based on environment
const getApiUrl = () => {
  // Check if we're in development (Expo Go)
  const isDevelopment = __DEV__ || Constants.appOwnership === 'expo';
  
  if (isDevelopment) {
    // Local development - use your local IP (commented out for production)
    // return 'http://192.168.29.107:5000';
    
    // Production URL for development testing
    return 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
  } else {
    // Production - use new production URL
    // Old production URL: return 'https://3.110.171.85';
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
    }
    return config;
  },
  (error) => {
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
  create: (bookingData) => API.post('/bookings/create', bookingData),
  getAll: () => API.get('/bookings'),
  getById: (id) => API.get(`/bookings/${id}`),
  cancel: (id) => API.put(`/bookings/${id}/cancel`),
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
  submit: (sessionId, rating, review) => API.post('/ratings/submit', { sessionId, rating, review }),
};

export default API;
