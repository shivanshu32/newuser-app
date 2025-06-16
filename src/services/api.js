import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API URL - Using local network IP instead of localhost for device/emulator access
const API_URL = 'http://192.168.29.107:5000';
const API_BASE = `${API_URL}/api/v1`;

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
  getAll: () => API.get('/bookings/user'),
  getById: (id) => API.get(`/bookings/${id}`),
  cancel: (id) => API.put(`/bookings/${id}/cancel`),
};

// Wallet API
export const walletAPI = {
  getBalance: () => API.get('/wallet/balance'),
  createOrder: (amount) => API.post('/wallet/create-order', { amount }),
  verifyPayment: (paymentData) => API.post('/wallet/verify-payment', paymentData),
  getTransactions: () => API.get('/wallet/transactions'),
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
