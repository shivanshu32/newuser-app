import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { colors } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';
import SkeletonLoader from '../../components/shop/SkeletonLoader';
import AnimatedCard from '../../components/shop/AnimatedCard';
import MysticBadge from '../../components/shop/MysticBadge';

const ProductListScreen = ({ route, navigation }) => {
  const { category, categoryName, productType, isFeatured, search: showSearch } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    inStock: false,
    sort: '-createdAt'
  });

  useEffect(() => {
    loadProducts(true);
  }, [category, productType, isFeatured, searchQuery]);

  const loadProducts = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const currentPage = reset ? 1 : page;
      const response = await productAPI.getProducts({
        category,
        productType,
        isFeatured,
        search: searchQuery,
        ...filters,
        page: currentPage,
        limit: 20
      });

      if (reset) {
        setProducts(response.data);
      } else {
        setProducts(prev => [...prev, ...response.data]);
      }

      setHasMore(currentPage < response.pages);
      if (!reset) setPage(currentPage + 1);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadProducts(false);
    }
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadProducts(true);
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      inStock: false,
      sort: '-createdAt'
    });
    setShowFilters(false);
    loadProducts(true);
  };

  const renderProduct = ({ item, index }) => (
    <AnimatedCard
      style={styles.productCard}
      delay={index * 60}
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
      {!item.inStock && (
        <MysticBadge
          type="outOfStock"
          label="Out of Stock"
          style={styles.outOfStockBadge}
        />
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={1}>
          {item.shortDescription || item.description}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color="#FBBF24" />
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

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.resultCount}>
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyText}>No products found</Text>
      <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
    </View>
  );

  if (loading) {
    return (
      <CosmicBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {categoryName || (productType === 'physical' ? 'Physical Products' : productType === 'digital' ? 'Digital Services' : 'Products')}
            </Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.list}>
            <SkeletonLoader variant="productCard" count={6} />
          </View>
        </SafeAreaView>
      </CosmicBackground>
    );
  }

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {categoryName || (productType === 'physical' ? 'Physical Products' : productType === 'digital' ? 'Digital Services' : 'Products')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color="#F3F4F6" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={products.length === 0 ? styles.emptyList : styles.list}
        />

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  value={filters.minPrice}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, minPrice: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, maxPrice: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Availability</Text>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFilters(prev => ({ ...prev, inStock: !prev.inStock }))}
              >
                <View style={[styles.checkbox, filters.inStock && styles.checkboxChecked]}>
                  {filters.inStock && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>In Stock Only</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              {[
                { label: 'Newest First', value: '-createdAt' },
                { label: 'Price: Low to High', value: 'price' },
                { label: 'Price: High to Low', value: '-price' },
                { label: 'Most Popular', value: '-salesCount' },
                { label: 'Top Rated', value: '-rating' }
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioRow}
                  onPress={() => setFilters(prev => ({ ...prev, sort: option.value }))}
                >
                  <View style={[styles.radio, filters.sort === option.value && styles.radioSelected]}>
                    {filters.sort === option.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  placeholder: {
    width: 32
  },
  topBar: {
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
    color: '#F3F4F6',
    flex: 1,
    textAlign: 'center'
  },
  cartButton: {
    padding: 4
  },
  header: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F3F4F6'
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  resultCount: {
    fontSize: 14,
    color: '#A5B4FC'
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8
  },
  filterButtonText: {
    fontSize: 14,
    color: '#FBBF24',
    fontWeight: '500'
  },
  list: {
    padding: 16
  },
  emptyList: {
    flexGrow: 1
  },
  productCard: {
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 12,
    left: 12
  },
  productInfo: {
    padding: 16
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  productDescription: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  ratingText: {
    fontSize: 14,
    color: '#A5B4FC',
    marginLeft: 4
  },
  reviewCount: {
    fontSize: 14,
    color: '#94A3B8',
    marginLeft: 4
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  comparePrice: {
    fontSize: 14,
    color: '#94A3B8',
    textDecorationLine: 'line-through'
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0f1229',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingTop: 20
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  priceInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  priceSeparator: {
    fontSize: 16,
    color: '#94A3B8'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24'
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#F3F4F6'
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioSelected: {
    borderColor: '#FBBF24'
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FBBF24'
  },
  radioLabel: {
    fontSize: 14,
    color: '#F3F4F6'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
    alignItems: 'center'
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBBF24'
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    alignItems: 'center'
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B0F2F'
  }
});

export default ProductListScreen;
