import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';

const WishlistScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState(null);
  const [removingItem, setRemovingItem] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadWishlist();
    }, [])
  );

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getWishlist();
      setWishlist(response.data);
    } catch (error) {
      console.error('Error loading wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId) => {
    try {
      setRemovingItem(productId);
      await productAPI.removeFromWishlist(productId);
      await loadWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      Alert.alert('Error', 'Failed to remove item from wishlist');
    } finally {
      setRemovingItem(null);
    }
  };

  const addToCart = async (product) => {
    try {
      await productAPI.addToCart(product._id, null, 1);
      Alert.alert(
        'Added to Cart',
        'Product has been added to your cart',
        [
          { text: 'Continue', style: 'cancel' },
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') }
        ]
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to add to cart');
    }
  };

  const renderProduct = ({ item }) => {
    const product = item.product;
    if (!product) return null;

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          style={styles.productContent}
          onPress={() => navigation.navigate('ProductDetail', { productId: product._id })}
        >
          <Image
            source={{ uri: product.images?.[0]?.url || 'https://via.placeholder.com/100' }}
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#FBBF24" />
              <Text style={styles.ratingText}>{product.rating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.reviewCount}>({product.reviewCount || 0})</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.price}>₹{product.price}</Text>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <Text style={styles.comparePrice}>₹{product.compareAtPrice}</Text>
              )}
            </View>
            {!product.inStock && (
              <Text style={styles.outOfStock}>Out of Stock</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromWishlist(product._id)}
            disabled={removingItem === product._id}
          >
            {removingItem === product._id ? (
              <ActivityIndicator size="small" color="#F87171" />
            ) : (
              <Ionicons name="trash-outline" size={20} color="#F87171" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.addToCartButton, !product.inStock && styles.disabledButton]}
            onPress={() => addToCart(product)}
            disabled={!product.inStock}
          >
            <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color="#94A3B8" />
      <Text style={styles.emptyText}>Your wishlist is empty</Text>
      <Text style={styles.emptySubtext}>Save products you like to buy them later</Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('ShopHome')}
      >
        <Text style={styles.shopButtonText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <CosmicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FBBF24" />
        </View>
      </CosmicBackground>
    );
  }

  const products = wishlist?.products || [];

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Wishlist</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color="#F3F4F6" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={products.length === 0 ? styles.emptyList : styles.list}
        />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  cartButton: {
    padding: 4
  },
  list: {
    padding: 16
  },
  emptyList: {
    flexGrow: 1
  },
  productCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  productContent: {
    flexDirection: 'row',
    marginBottom: 12
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between'
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6',
    marginBottom: 4
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  ratingText: {
    fontSize: 12,
    color: '#A5B4FC',
    marginLeft: 4
  },
  reviewCount: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  comparePrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through'
  },
  outOfStock: {
    fontSize: 12,
    color: '#F87171',
    fontWeight: '500',
    marginTop: 4
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(248,113,113,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F97316'
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  disabledButton: {
    opacity: 0.5
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F97316',
    borderRadius: 12
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default WishlistScreen;
