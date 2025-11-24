import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
const CACHE_KEY = 'banners_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Banner API Service
 * Handles fetching banners from backend with caching support
 */
const bannerAPI = {
  /**
   * Get active banners from API
   * Uses local cache to reduce API calls
   */
  getActiveBanners: async () => {
    try {
      // Try to get from cache first
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      
      if (cachedData) {
        const { banners, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        
        // Return cached data if still valid
        if (now - timestamp < CACHE_DURATION) {
          console.log('📱 [BANNERS] Using cached banners');
          return { success: true, data: banners, fromCache: true };
        }
      }

      // Fetch from API
      console.log('📱 [BANNERS] Fetching banners from API...');
      const response = await fetch(`${API_BASE_URL}/api/v1/banners`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        // Cache the banners
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            banners: data.data,
            timestamp: Date.now()
          })
        );
        
        console.log(`✅ [BANNERS] Fetched ${data.data.length} banners from API`);
        return { success: true, data: data.data, fromCache: false };
      }

      return { success: false, data: [], error: 'Invalid response format' };
    } catch (error) {
      console.error('❌ [BANNERS] Error fetching banners:', error);
      
      // Try to return cached data even if expired
      try {
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { banners } = JSON.parse(cachedData);
          console.log('⚠️ [BANNERS] Using expired cache due to API error');
          return { success: true, data: banners, fromCache: true, expired: true };
        }
      } catch (cacheError) {
        console.error('❌ [BANNERS] Cache retrieval failed:', cacheError);
      }

      return { success: false, data: [], error: error.message };
    }
  },

  /**
   * Track banner impression (view)
   */
  trackImpression: async (bannerId) => {
    try {
      // Fire and forget - don't wait for response
      fetch(`${API_BASE_URL}/api/v1/banners/${bannerId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'impression' })
      }).catch(err => {
        console.error('❌ [BANNERS] Error tracking impression:', err);
      });
    } catch (error) {
      console.error('❌ [BANNERS] Error tracking impression:', error);
    }
  },

  /**
   * Track banner click
   */
  trackClick: async (bannerId) => {
    try {
      // Fire and forget - don't wait for response
      fetch(`${API_BASE_URL}/api/v1/banners/${bannerId}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'click' })
      }).catch(err => {
        console.error('❌ [BANNERS] Error tracking click:', err);
      });
    } catch (error) {
      console.error('❌ [BANNERS] Error tracking click:', error);
    }
  },

  /**
   * Clear banner cache
   * Useful for forcing refresh
   */
  clearCache: async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('🗑️ [BANNERS] Cache cleared');
    } catch (error) {
      console.error('❌ [BANNERS] Error clearing cache:', error);
    }
  },

  /**
   * Refresh banners (clear cache and fetch new)
   */
  refreshBanners: async () => {
    await bannerAPI.clearCache();
    return await bannerAPI.getActiveBanners();
  }
};

export default bannerAPI;
