import API from './api';

const poojaAPI = {
  // Get published poojas for home screen
  getPublishedPoojas: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        status: 'published',
        limit: params.limit || 10,
        page: params.page || 1,
        ...params
      });
      
      console.log('📿 [POOJA_API] Fetching published poojas');
      const response = await API.get(`/poojas?${queryParams}`);
      console.log('✅ [POOJA_API] Poojas fetched:', response.count);
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error fetching poojas:', error);
      throw error;
    }
  },
  
  // Get featured poojas
  getFeaturedPoojas: async () => {
    try {
      const url = '/poojas?status=published&featured=true&limit=5';
      console.log('🕊️ [POOJA_API] Fetching featured poojas from:', url);
      const response = await API.get(url);
      console.log('✅ [POOJA_API] Featured poojas response:', {
        success: response.success,
        count: response.count,
        total: response.total,
        dataLength: response.data?.length
      });
      console.log('🕊️ [POOJA_API] Pooja data:', response.data?.map(p => ({
        id: p._id,
        mainHeading: p.mainHeading,
        status: p.status,
        featured: p.featured
      })));
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error fetching featured poojas:', error);
      console.error('❌ [POOJA_API] Error details:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get single pooja by ID or slug
  getPoojaDetails: async (identifier) => {
    try {
      console.log('📿 [POOJA_API] Fetching pooja details:', identifier);
      const response = await API.get(`/poojas/${identifier}`);
      console.log('✅ [POOJA_API] Pooja details fetched');
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error fetching pooja details:', error);
      throw error;
    }
  },
  
  // Create order for pooja booking
  createPoojaOrder: async (poojaId, packageId, userDetails, specialRequests) => {
    try {
      console.log('📿 [POOJA_API] Creating pooja order:', { poojaId, packageId });
      const response = await API.post('/pooja-bookings/create-order', {
        poojaId,
        packageId,
        userDetails,
        specialRequests
      });
      console.log('✅ [POOJA_API] Order created:', response.data?.order?.id);
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error creating pooja order:', error);
      throw error;
    }
  },
  
  // Verify payment
  verifyPoojaPayment: async (paymentData) => {
    try {
      console.log('📿 [POOJA_API] Verifying pooja payment');
      const response = await API.post('/pooja-bookings/verify-payment', paymentData);
      console.log('✅ [POOJA_API] Payment verified');
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error verifying pooja payment:', error);
      throw error;
    }
  },
  
  // Get user's bookings
  getMyBookings: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params);
      console.log('📿 [POOJA_API] Fetching my bookings');
      const response = await API.get(`/pooja-bookings/my-bookings?${queryParams}`);
      console.log('✅ [POOJA_API] Bookings fetched:', response.count);
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error fetching my bookings:', error);
      throw error;
    }
  },
  
  // Get booking details
  getBookingDetails: async (bookingId) => {
    try {
      console.log('📿 [POOJA_API] Fetching booking details:', bookingId);
      const response = await API.get(`/pooja-bookings/${bookingId}`);
      console.log('✅ [POOJA_API] Booking details fetched');
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error fetching booking details:', error);
      throw error;
    }
  },
  
  // Cancel booking
  cancelBooking: async (bookingId, cancellationReason) => {
    try {
      console.log('📿 [POOJA_API] Cancelling booking:', bookingId);
      const response = await API.put(`/pooja-bookings/${bookingId}/cancel`, {
        cancellationReason
      });
      console.log('✅ [POOJA_API] Booking cancelled');
      return response;
    } catch (error) {
      console.error('❌ [POOJA_API] Error cancelling booking:', error);
      throw error;
    }
  }
};

export default poojaAPI;
