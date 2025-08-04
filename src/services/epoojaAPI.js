import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// API URL Configuration (same as main api.js)
const getApiUrl = () => {
  const isDevelopment = __DEV__ || Constants.appOwnership === 'expo';
  
  if (isDevelopment) {
    // Production URL for development testing (same as main api.js)
    console.log('Using production backend for E-Pooja development');
    return 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
  } else {
    // Production - use same production URL as main API
    console.log('Using production APK URL for E-Pooja');
    return 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
  }
};

const API_URL = getApiUrl();
const API_BASE = `${API_URL}/api/v1`;

class EPoojaAPI {
  constructor() {
    this.baseURL = `${API_BASE}/epooja`;
  }

  async getAuthHeaders() {
    const token = await AsyncStorage.getItem('userToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const fullUrl = `${this.baseURL}${endpoint}`;
      console.log('🌐 E-Pooja API Request:', {
        fullUrl,
        baseURL: this.baseURL,
        endpoint,
        method: options.method || 'GET'
      });
      
      const headers = await this.getAuthHeaders();
      const response = await fetch(fullUrl, {
        headers,
        ...options,
      });

      console.log('📡 E-Pooja API Response Status:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ok: response.ok
      });

      const data = await response.json();
      console.log('📦 E-Pooja API Response Data:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  }

  // Get all e-pooja categories with filters
  async getCategories(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/categories${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Get specific e-pooja category details
  async getCategoryDetails(categoryId) {
    return this.makeRequest(`/categories/${categoryId}`);
  }

  // Get packages for a specific category
  async getCategoryPackages(categoryId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/categories/${categoryId}/packages${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Get all temple partners
  async getTemples(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/temples${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Get temple availability for specific date
  async getTempleAvailability(templeId, date) {
    return this.makeRequest(`/temples/${templeId}/availability?date=${date}`);
  }

  // Create new e-pooja booking (wallet-only payment)
  async createBooking(bookingData) {
    return this.makeRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  // Get user's e-pooja bookings
  async getUserBookings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/bookings${queryString ? `?${queryString}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Get specific booking details
  async getBookingDetails(bookingId) {
    return this.makeRequest(`/bookings/${bookingId}`);
  }

  // Cancel e-pooja booking (with wallet refund)
  async cancelBooking(bookingId, reason = '') {
    return this.makeRequest(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    });
  }

  // Submit review for completed e-pooja
  async submitReview(reviewData) {
    return this.makeRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  }

  // Get popular e-poojas for home screen
  async getPopularPoojas() {
    return this.makeRequest('/popular');
  }

  // Get package details for a specific category and temple
  async getPackages(categoryId, templeId) {
    return this.makeRequest(`/categories/${categoryId}/packages?temple_id=${templeId}`);
  }

  // Get user wallet balance
  async getWalletBalance() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/wallet/balance`, {
        headers,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get wallet balance');
      }

      return data;
    } catch (error) {
      console.error('Wallet Balance Error:', error);
      throw error;
    }
  }

  // Get wallet transactions
  async getWalletTransactions(params = {}) {
    try {
      const headers = await this.getAuthHeaders();
      const queryString = new URLSearchParams(params).toString();
      const endpoint = `${API_BASE_URL}/wallet/transactions${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(endpoint, { headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get transactions');
      }

      return data;
    } catch (error) {
      console.error('Wallet Transactions Error:', error);
      throw error;
    }
  }
}

export const epoojaAPI = new EPoojaAPI();
export default epoojaAPI;
