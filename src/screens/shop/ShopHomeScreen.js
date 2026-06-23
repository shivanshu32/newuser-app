import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';
import AnimatedCard from '../../components/shop/AnimatedCard';
import MysticBadge from '../../components/shop/MysticBadge';
import { colors, spacing, radius, shadows } from '../../theme';

const ShopHomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, featuredRes, productsRes, cartRes] = await Promise.all([
        productAPI.getCategories(),
        productAPI.getFeaturedProducts(10),
        productAPI.getProducts({ limit: 10 }),
        productAPI.getCart()
      ]);

      setCategories(categoriesRes.data || []);
      setFeaturedProducts(featuredRes.data || []);
      setProducts(productsRes.data?.products || productsRes.data || []);
      setCartCount(cartRes.data?.totalItems || 0);
    } catch (error) {
      console.error('Error loading shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderCategory = ({ item, index }) => (
    <AnimatedCard
      style={styles.categoryCard}
      delay={index * 80}
      onPress={() => navigation.navigate('ProductList', { category: item._id, categoryName: item.name })}
    >
      {item.image?.url ? (
        <Image source={{ uri: item.image.url }} style={styles.categoryImage} />
      ) : (
        <View style={[styles.categoryImage, styles.categoryPlaceholder]}>
          <Ionicons name="planet-outline" size={32} color={colors.warning} />
        </View>
      )}
      <Text style={styles.categoryName}>{item.name}</Text>
    </AnimatedCard>
  );

  const renderProduct = ({ item, index }) => (
    <AnimatedCard
      style={styles.productCard}
      delay={index * 80}
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
    >
      <Image
        source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/150' }}
        style={styles.productImage}
      />
      {item.compareAtPrice && item.compareAtPrice > item.price && (
        <MysticBadge
          type="discount"
          label={`${Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)}% OFF`}
          style={styles.discountBadge}
        />
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.warning} />
          <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'}</Text>
          <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.price}</Text>
          {item.compareAtPrice && item.compareAtPrice > item.price && (
            <Text style={styles.comparePrice}>₹{item.compareAtPrice}</Text>
          )}
        </View>
      </View>
    </AnimatedCard>
  );

  if (loading) {
    return (
      <CosmicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.warning} />
        </View>
      </CosmicBackground>
    );
  }

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Shop</Text>
            <Text style={styles.headerSubtitle}>Spiritual Products & Services</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('ProductList', { search: true })}
            >
              <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate('Cart')}
            >
              <Ionicons name="cart-outline" size={24} color={colors.textPrimary} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.warning]} />
          }
        >
          {/* Categories Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          </View>

          {/* Featured Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProductList', { isFeatured: true })}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={featuredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          </View>

          {/* Products Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProductList')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.productsGrid}>
              {products.map((item, index) => (
                <AnimatedCard
                  key={item._id}
                  style={styles.gridProductCard}
                  delay={index * 80}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                >
                  <Image
                    source={{ uri: item.images?.[0]?.url || 'https://via.placeholder.com/150' }}
                    style={styles.gridProductImage}
                  />
                  {item.compareAtPrice && item.compareAtPrice > item.price && (
                    <MysticBadge
                      type="discount"
                      label={`${Math.round(((item.compareAtPrice - item.price) / item.compareAtPrice) * 100)}% OFF`}
                      style={styles.discountBadge}
                    />
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.ratingText}>{item.rating?.toFixed(1) || '0.0'}</Text>
                      <Text style={styles.reviewCount}>({item.reviewCount || 0})</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>₹{item.price}</Text>
                      {item.compareAtPrice && item.compareAtPrice > item.price && (
                        <Text style={styles.comparePrice}>₹{item.compareAtPrice}</Text>
                      )}
                    </View>
                  </View>
                </AnimatedCard>
              ))}
            </View>
          </View>

          {/* Wishlist & Orders */}
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Wishlist')}
              >
                <Ionicons name="heart-outline" size={24} color={colors.warning} />
                <Text style={styles.actionButtonText}>Wishlist</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('OrderHistory')}
              >
                <Ionicons name="receipt-outline" size={24} color={colors.warning} />
                <Text style={styles.actionButtonText}>My Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondaryLight,
    marginTop: 2
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12
  },
  iconButton: {
    padding: 8,
    position: 'relative'
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  cartBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5
  },
  seeAll: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '500'
  },
  categoriesList: {
    paddingRight: 16
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
    backgroundColor: 'transparent',
    borderWidth: 0
  },
  categoryImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  categoryPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  categoryName: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500'
  },
  productsList: {
    paddingRight: 16
  },
  productCard: {
    width: 160,
    marginRight: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  productImage: {
    width: '100%',
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  productInfo: {
    padding: 12
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  ratingText: {
    fontSize: 12,
    color: colors.secondaryLight,
    marginLeft: 4
  },
  reviewCount: {
    fontSize: 12,
    color: colors.textMuted,
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
    color: colors.warning
  },
  comparePrice: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'line-through'
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  gridProductCard: {
    width: '48%',
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  gridProductImage: {
    width: '100%',
    height: 160,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 20
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  actionButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500'
  }
});

export default ShopHomeScreen;
