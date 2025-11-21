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

// Create axios instance with enhanced configuration
const API = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'JyotishCall-UserApp/1.0.0',
    'Accept': 'application/json',
  },
  // Add retry configuration
  retry: 3,
  retryDelay: 1000,
  // Validate status codes
  validateStatus: function (status) {
    return status >= 200 && status < 300;
  }
});

// Add authorization header to every request if token exists with crash safety
API.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 [API] Request with auth token:', config.method?.toUpperCase(), config.url);
      } else {
        console.log('🔓 [API] Request without auth token:', config.method?.toUpperCase(), config.url);
      }
      
      console.log('📤 [API] Request config:', {
        method: config.method,
        url: config.url,
        baseURL: config.baseURL,
        data: config.data ? 'present' : 'none',
        hasAuth: !!config.headers.Authorization
      });
      
      return config;
    } catch (error) {
      console.error('❌ [API] Error in request interceptor:', error);
      // Return config without token if AsyncStorage fails
      return config;
    }
  },
  (error) => {
    console.error('❌ [API] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling and token refresh with crash safety
API.interceptors.response.use(
  (response) => {
    try {
      console.log('✅ [API] Response success:', response.status, response.config?.url);
      
      // Check if response.data exists and is an object
      if (response.data && typeof response.data === 'object') {
        return response.data; // Return only the data part for JSON responses
      } else {
        // For non-JSON responses (like plain text), return the full response
        console.log('📄 [API] Non-JSON response detected, returning full response');
        return response;
      }
    } catch (error) {
      console.error('❌ [API] Error processing successful response:', error);
      return response; // Fallback to full response
    }
  },
  async (error) => {
    try {
      const originalRequest = error.config;
      
      // Enhanced error logging for network debugging
      console.error('❌ [API] Response error:', {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        dataType: typeof error.response?.data,
        rawResponse: error.response?.data,
        message: error.message,
        code: error.code,
        isNetworkError: error.message === 'Network Error',
        isTimeout: error.code === 'ECONNABORTED',
        stack: error.stack
      });
      
      // Handle network connectivity issues
      if (error.message === 'Network Error' || error.code === 'NETWORK_ERROR') {
        console.error('🌐 [API] Network connectivity issue detected');
        return Promise.reject({
          ...error,
          isNetworkError: true,
          userMessage: 'Network connection failed. Please check your internet connection and try again.'
        });
      }
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ [API] Request timeout detected');
        return Promise.reject({
          ...error,
          isTimeout: true,
          userMessage: 'Request timed out. Please try again.'
        });
      }
      
      // Handle 401 Unauthorized - attempt token refresh
      if (error.response?.status === 401 && !originalRequest?._retry) {
        originalRequest._retry = true;
      
        try {
          console.log('🔄 [API] Attempting token refresh for 401 error');
          
          // Get refresh token with error handling
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) {
            console.log('🚪 [API] No refresh token available, redirecting to login');
            // Clear all stored tokens safely
            try {
              await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
            } catch (clearError) {
              console.error('❌ [API] Error clearing tokens:', clearError);
            }
            throw new Error('No refresh token available');
          }
          
          // Attempt to refresh token
          const refreshResponse = await axios.post(`${API_BASE}/auth/refresh`, {
            refreshToken
          });
          
          if (refreshResponse.data?.success) {
            const { token: newToken, refreshToken: newRefreshToken } = refreshResponse.data.data || {};
            
            if (!newToken) {
              throw new Error('No new token received from refresh');
            }
            
            // Store new tokens safely
            try {
              await AsyncStorage.setItem('userToken', newToken);
              if (newRefreshToken) {
                await AsyncStorage.setItem('refreshToken', newRefreshToken);
              }
            } catch (storageError) {
              console.error('❌ [API] Error storing new tokens:', storageError);
              throw storageError;
            }
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            console.log('✅ [API] Token refreshed successfully, retrying original request');
            return API(originalRequest);
          } else {
            throw new Error('Token refresh failed - invalid response');
          }
        } catch (refreshError) {
          console.error('❌ [API] Token refresh failed:', refreshError);
          
          // Clear all stored tokens safely
          try {
            await AsyncStorage.multiRemove(['userToken', 'refreshToken', 'userData']);
          } catch (clearError) {
            console.error('❌ [API] Error clearing tokens after refresh failure:', clearError);
          }
          
          // Emit logout event if global event emitter is available
          if (global.eventEmitter) {
            try {
              global.eventEmitter.emit('LOGOUT_REQUIRED', { reason: 'token_refresh_failed' });
            } catch (emitError) {
              console.error('❌ [API] Error emitting logout event:', emitError);
            }
          }
          
          return Promise.reject({
            ...refreshError,
            isAuthError: true,
            userMessage: 'Session expired. Please log in again.'
          });
        }
      }
      
      // Add specific handling for common network issues
      if (error.message === 'Network Error') {
        console.error(' [API] Network Error - Check internet connection and backend availability');
      } else if (error.code === 'ECONNABORTED') {
        console.error(' [API] Request Timeout - Backend took too long to respond');
      }
      
      // For other errors, enhance with user-friendly messages
      const enhancedError = {
        ...error,
        userMessage: getUserFriendlyErrorMessage(error)
      };
      
      return Promise.reject(enhancedError);
    } catch (interceptorError) {
      console.error('❌ [API] Critical error in response interceptor:', interceptorError);
      return Promise.reject(error); // Return original error if interceptor fails
    }
  }
);

// Helper function to get user-friendly error messages
const getUserFriendlyErrorMessage = (error) => {
  if (error.response?.status === 400) {
    return error.response.data?.message || 'Invalid request. Please check your input and try again.';
  }
  if (error.response?.status === 403) {
    return 'Access denied. You do not have permission to perform this action.';
  }
  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }
  if (error.response?.status === 500) {
    return 'Server error. Please try again later.';
  }
  if (error.message === 'Network Error') {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  return error.response?.data?.message || 'An unexpected error occurred. Please try again.';
};

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
  },
  sendMessage(messageData) {
    return API.post('/bookings/send-message', messageData);
  }
};

// Wallet API
export const walletAPI = {
  getBalance: () => API.get('/wallet/balance'),
  createOrder: (amount, selectedPackage = null) => API.post('/wallet/create-order', { amount, selectedPackage }),
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
  checkActiveSession: () => API.get('/sessions/check-active'), // For rejoin functionality
};

// Free Chat API
export const freeChatAPI = {
  checkEligibility: () => API.get('/free-chat/eligibility'),
  requestFreeChat: () => API.post('/free-chat/request'),
  getFreeChatDetails: (freeChatId) => API.get(`/free-chat/${freeChatId}`),
  cancelFreeChat: (freeChatId) => API.delete(`/free-chat/${freeChatId}/cancel`),
  getHistory: () => API.get('/free-chat/history'),
  getGlobalSettings: () => API.get('/admin/free-chat/settings'),
  sendMessage: (messageData) => API.post('/free-chat/send-message', messageData),
};

// Ratings API
export const ratingsAPI = {
  submit: (bookingId, rating, comment) => API.post(`/ratings/submit`, { bookingId, rating, comment }),
  getAstrologerReviews: (astrologerId, params = {}) => API.get(`/ratings/astrologer/${astrologerId}`, { params }),
  getUserReviews: () => API.get(`/ratings/user`),
  updateReview: (reviewId, rating, comment) => API.put(`/ratings/${reviewId}`, { rating, comment }),
};

// Chat History API
export const chatHistoryAPI = {
  getChatHistory: (sessionId) => API.get(`/chat-history/${sessionId}`),
};

// Version API
export const versionAPI = {
  checkVersion: (versionData) => API.post(`/version/check`, versionData),
};

// Ledger API
export const ledgerAPI = {
  getMyTransactions: (params) => API.get('/ledger/my-transactions', { params }),
  getBalanceSummary: () => API.get('/ledger/balance-summary'),
  getLedgerEntry: (entryId) => API.get(`/ledger/entries/${entryId}`),
  getUserTransactions: (userId, params) => API.get(`/ledger/users/${userId}/transactions`, { params }),
};

// Blog API
export const blogAPI = {
  // Get published blogs with optional filters
  getBlogs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        status: 'published', // Only published blogs for users
        ...params
      });
      
      const response = await API.get(`/blogs?${queryParams}`);
      return response;
    } catch (error) {
      console.error('❌ [BLOG_API] Error fetching blogs:', error);
      throw error;
    }
  },

  // Get featured blogs
  getFeaturedBlogs: async (limit = 3) => {
    try {
      const url = `/blogs?featured=true&limit=${limit}&status=published&sortBy=publishedAt&sortOrder=desc`;
      console.log('📚 [BLOG_API] Fetching featured blogs from:', url);
      const response = await API.get(url);
      console.log('✅ [BLOG_API] Featured blogs response:', {
        success: response.success,
        count: response.count,
        total: response.total,
        dataLength: response.data?.length
      });
      return response;
    } catch (error) {
      console.error('❌ [BLOG_API] Error fetching featured blogs:', error);
      console.error('❌ [BLOG_API] Error details:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get single blog by slug or ID
  getBlog: async (identifier, incrementView = true) => {
    try {
      const response = await API.get(`/blogs/${identifier}?incrementView=${incrementView}`);
      return response;
    } catch (error) {
      console.error('❌ [BLOG_API] Error fetching blog:', error);
      throw error;
    }
  },

  // Search blogs
  searchBlogs: async (query, params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        search: query,
        status: 'published',
        ...params
      });
      
      const response = await API.get(`/blogs?${queryParams}`);
      return response;
    } catch (error) {
      console.error('❌ [BLOG_API] Error searching blogs:', error);
      throw error;
    }
  },

  // Get blogs by category
  getBlogsByCategory: async (category, params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        category,
        status: 'published',
        ...params
      });
      
      const response = await API.get(`/blogs?${queryParams}`);
      return response;
    } catch (error) {
      console.error('❌ [BLOG_API] Error fetching blogs by category:', error);
      throw error;
    }
  }
};

// Export API_BASE for direct URL construction when needed
export { API_BASE };

export default API;
