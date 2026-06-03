import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';
import AnimatedCard from '../../components/shop/AnimatedCard';
import analyticsService from '../../services/analyticsService';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadProduct();
    checkWishlist();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProduct(productId);
      setProduct(response.data);
      
      // Increment view count
      await productAPI.incrementViewCount(productId);
    } catch (error) {
      console.error('Error loading product:', error);
      Alert.alert('Error', 'Failed to load product details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const checkWishlist = async () => {
    try {
      const response = await productAPI.checkWishlist(productId);
      setInWishlist(response.data.inWishlist);
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const toggleWishlist = async () => {
    try {
      if (inWishlist) {
        await productAPI.removeFromWishlist(productId);
        setInWishlist(false);
        Alert.alert('Success', 'Removed from wishlist');
      } else {
        await productAPI.addToWishlist(productId);
        setInWishlist(true);
        Alert.alert('Success', 'Added to wishlist');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      Alert.alert('Error', 'Failed to update wishlist');
    }
  };

  const handleAddToCart = async () => {
    if (!product.inStock) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    try {
      setAddingToCart(true);
      await productAPI.addToCart(productId, selectedVariant?._id, quantity);
      
      // Track add_to_cart event (GA4 & Meta)
      try {
        const itemPrice = selectedVariant?.price || product.price;
        const itemValue = itemPrice * quantity;
        
        // GA4 add_to_cart
        await analyticsService.logEvent('add_to_cart', {
          currency: 'INR',
          value: itemValue,
          items: [{
            item_id: product._id,
            item_name: product.name,
            item_category: product.category,
            item_variant: selectedVariant?.name,
            price: itemPrice,
            quantity: quantity
          }]
        });
        
        // Meta AddToCart
        const { AppEventsLogger } = require('react-native-fbsdk-next');
        await AppEventsLogger.logEvent('AddToCart', {
          fb_content_type: 'product',
          fb_content_id: product._id,
          fb_content_name: product.name,
          fb_content_category: product.category,
          fb_currency: 'INR',
          fb_value: itemValue
        });
        
        console.log('📊 [TRACKING] Add to cart tracked:', product.name);
      } catch (trackingError) {
        console.error('❌ [TRACKING] Failed to track add to cart:', trackingError);
      }
      
      Alert.alert(
        'Added to Cart',
        'Product has been added to your cart',
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') }
        ]
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product.inStock) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    try {
      setAddingToCart(true);
      await productAPI.addToCart(productId, selectedVariant?._id, quantity);
      navigation.navigate('Cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to proceed');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <CosmicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FBBF24" />
        </View>
      </CosmicBackground>
    );
  }

  if (!product) return null;

  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant?.stock || product.stock;

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleWishlist} style={styles.headerButton}>
              <Ionicons
                name={inWishlist ? "heart" : "heart-outline"}
                size={24}
                color={inWishlist ? "#EF4444" : "#F3F4F6"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.headerButton}>
              <Ionicons name="cart-outline" size={24} color="#F3F4F6" />
            </TouchableOpacity>
          </View>
        </View>

      <ScrollView style={styles.content}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImage(index);
            }}
          >
            {product.images?.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image.url }}
                style={styles.productImage}
              />
            ))}
          </ScrollView>
          {product.images?.length > 1 && (
            <View style={styles.imageDots}>
              {product.images.map((_, index) => (
                <View
                  key={index}
                  style={[styles.dot, selectedImage === index && styles.dotActive]}
                />
              ))}
            </View>
          )}
          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.ratingRow}>
            <View style={styles.rating}>
              <Ionicons name="star" size={16} color="#FFA500" />
              <Text style={styles.ratingText}>{product.rating?.toFixed(1) || '0.0'}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ProductReviews', { productId })}>
              <Text style={styles.reviewsLink}>{product.reviewCount || 0} reviews</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.priceSection}>
            <Text style={styles.price}>₹{currentPrice}</Text>
            {product.compareAtPrice && product.compareAtPrice > currentPrice && (
              <Text style={styles.comparePrice}>₹{product.compareAtPrice}</Text>
            )}
          </View>

          {/* Stock Status */}
          <View style={styles.stockRow}>
            <Ionicons
              name={product.inStock ? "checkmark-circle" : "close-circle"}
              size={20}
              color={product.inStock ? "#10B981" : "#EF4444"}
            />
            <Text style={[styles.stockText, !product.inStock && styles.outOfStock]}>
              {product.inStock ? 'In Stock' : 'Out of Stock'}
            </Text>
            {product.isLowStock && product.inStock && (
              <Text style={styles.lowStockText}>Only {currentStock} left!</Text>
            )}
          </View>

          {/* Variants */}
          {product.hasVariants && product.variants?.length > 0 && (
            <View style={styles.variantsSection}>
              <Text style={styles.sectionTitle}>Select Variant</Text>
              <View style={styles.variantsList}>
                {product.variants.map((variant) => (
                  <TouchableOpacity
                    key={variant._id}
                    style={[
                      styles.variantChip,
                      selectedVariant?._id === variant._id && styles.variantChipSelected
                    ]}
                    onPress={() => setSelectedVariant(variant)}
                  >
                    <Text
                      style={[
                        styles.variantText,
                        selectedVariant?._id === variant._id && styles.variantTextSelected
                      ]}
                    >
                      {variant.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Ionicons name="add" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Product Type Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Ionicons
                name={product.productType === 'physical' ? 'cube' : 'document-text'}
                size={16}
                color="#FBBF24"
              />
              <Text style={styles.typeBadgeText}>
                {product.productType === 'physical' ? 'Physical Product' : 'Digital Service'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.addToCartButton, !product.inStock && styles.disabledButton]}
          onPress={handleAddToCart}
          disabled={addingToCart || !product.inStock}
        >
          {addingToCart ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cart-outline" size={20} color="#FFFFFF" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.buyNowButton, !product.inStock && styles.disabledButton]}
          onPress={handleBuyNow}
          disabled={addingToCart || !product.inStock}
        >
          <Text style={styles.buyNowText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
      </SafeAreaView>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  headerButton: {
    padding: 4
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12
  },
  content: {
    flex: 1
  },
  imageGallery: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  productImage: {
    width,
    height: width,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  imageDots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  dotActive: {
    backgroundColor: '#FBBF24'
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    right: 16
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  productName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 8
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A5B4FC'
  },
  reviewsLink: {
    fontSize: 14,
    color: '#FBBF24',
    textDecorationLine: 'underline'
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  comparePrice: {
    fontSize: 16,
    color: '#94A3B8',
    textDecorationLine: 'line-through'
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34D399'
  },
  outOfStock: {
    color: '#F87171'
  },
  lowStockText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '500'
  },
  variantsSection: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  variantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  variantChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  variantChipSelected: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.15)'
  },
  variantText: {
    fontSize: 14,
    color: '#F3F4F6'
  },
  variantTextSelected: {
    color: '#FBBF24',
    fontWeight: '500'
  },
  quantitySection: {
    marginBottom: 20
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    minWidth: 40,
    textAlign: 'center'
  },
  descriptionSection: {
    marginBottom: 20
  },
  description: {
    fontSize: 14,
    color: '#A5B4FC',
    lineHeight: 20
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 6
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '500'
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F97316'
  },
  addToCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  buyNowButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buyNowText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B0F2F'
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default ProductDetailScreen;
