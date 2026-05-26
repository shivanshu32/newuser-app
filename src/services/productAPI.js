import api from './api';

const productAPI = {
  // Get all products with filters
  getProducts: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.productType) params.append('productType', filters.productType);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.inStock) params.append('inStock', filters.inStock);
    if (filters.isFeatured) params.append('isFeatured', filters.isFeatured);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/products?${params.toString()}`);
    return response.data;
  },

  // Get featured products
  getFeaturedProducts: async (limit = 10) => {
    const response = await api.get(`/products/featured?limit=${limit}`);
    return response.data;
  },

  // Get single product
  getProduct: async (productId) => {
    const response = await api.get(`/products/${productId}`);
    return response.data;
  },

  // Increment product view count
  incrementViewCount: async (productId) => {
    const response = await api.post(`/products/${productId}/view`);
    return response.data;
  },

  // Get product categories
  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },

  // Cart operations
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToCart: async (productId, variantId = null, quantity = 1) => {
    const response = await api.post('/cart/add', {
      productId,
      variantId,
      quantity
    });
    return response.data;
  },

  updateCartItem: async (itemId, quantity) => {
    const response = await api.put('/cart/update', {
      itemId,
      quantity
    });
    return response.data;
  },

  removeFromCart: async (itemId) => {
    const response = await api.delete(`/cart/remove/${itemId}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await api.delete('/cart/clear');
    return response.data;
  },

  applyCoupon: async (couponCode) => {
    const response = await api.post('/cart/apply-coupon', { couponCode });
    return response.data;
  },

  // Wishlist operations
  getWishlist: async () => {
    const response = await api.get('/wishlist');
    return response.data;
  },

  addToWishlist: async (productId) => {
    const response = await api.post('/wishlist/add', { productId });
    return response.data;
  },

  removeFromWishlist: async (productId) => {
    const response = await api.delete(`/wishlist/remove/${productId}`);
    return response.data;
  },

  checkWishlist: async (productId) => {
    const response = await api.get(`/wishlist/check/${productId}`);
    return response.data;
  },

  // Address operations
  getAddresses: async () => {
    const response = await api.get('/addresses');
    return response.data;
  },

  getAddress: async (addressId) => {
    const response = await api.get(`/addresses/${addressId}`);
    return response.data;
  },

  createAddress: async (addressData) => {
    const response = await api.post('/addresses', addressData);
    return response.data;
  },

  updateAddress: async (addressId, addressData) => {
    const response = await api.put(`/addresses/${addressId}`, addressData);
    return response.data;
  },

  deleteAddress: async (addressId) => {
    const response = await api.delete(`/addresses/${addressId}`);
    return response.data;
  },

  setDefaultAddress: async (addressId) => {
    const response = await api.put(`/addresses/${addressId}/default`);
    return response.data;
  },

  // Order operations
  createOrder: async (orderData) => {
    const response = await api.post('/orders/create', orderData);
    return response.data;
  },

  createRazorpayOrder: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/create-razorpay-order`);
    return response.data;
  },

  processPayment: async (orderId, paymentData) => {
    const response = await api.post(`/orders/${orderId}/payment`, paymentData);
    return response.data;
  },

  getOrders: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/orders?${params.toString()}`);
    return response.data;
  },

  getOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  cancelOrder: async (orderId, reason) => {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  // Review operations
  getProductReviews: async (productId, filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.rating) params.append('rating', filters.rating);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const response = await api.get(`/reviews/product/${productId}?${params.toString()}`);
    return response.data;
  },

  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response.data;
  },

  updateReview: async (reviewId, reviewData) => {
    const response = await api.put(`/reviews/${reviewId}`, reviewData);
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  },

  markReviewHelpful: async (reviewId) => {
    const response = await api.post(`/reviews/${reviewId}/helpful`);
    return response.data;
  },

  getUserReviews: async () => {
    const response = await api.get('/reviews/my-reviews');
    return response.data;
  }
};

export default productAPI;
