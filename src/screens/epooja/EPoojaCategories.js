import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { epoojaAPI } from '../../services/api';

const EPoojaCategories = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState(route.params?.filter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const filters = [
    { id: 'all', name: 'All Poojas', icon: 'apps' },
    { id: 'festival', name: 'Festival', icon: 'calendar' },
    { id: 'personal', name: 'Personal', icon: 'person' },
    { id: 'special', name: 'Special', icon: 'star' },
    { id: 'remedial', name: 'Remedial', icon: 'shield-checkmark' },
    { id: 'planetary', name: 'Planetary', icon: 'planet' }
  ];

  useEffect(() => {
    fetchCategories(true);
  }, [selectedFilter, searchQuery]);

  const fetchCategories = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const params = {
        page: reset ? 1 : page,
        limit: 20,
      };

      if (selectedFilter !== 'all') {
        params.category_type = selectedFilter;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await epoojaAPI.getCategories(params);
      
      if (response.success) {
        if (reset) {
          setCategories(response.data);
        } else {
          setCategories(prev => [...prev, ...response.data]);
        }
        
        setHasMore(response.pagination.page < response.pagination.pages);
        if (!reset) {
          setPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCategories(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchCategories(false);
    }
  };

  const handleFilterPress = (filterId) => {
    setSelectedFilter(filterId);
  };

  const renderFilterTab = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterTab,
        selectedFilter === item.id && styles.activeFilterTab
      ]}
      onPress={() => handleFilterPress(item.id)}
    >
      <Ionicons 
        name={item.icon} 
        size={16} 
        color={selectedFilter === item.id ? '#F97316' : '#6B7280'} 
      />
      <Text style={[
        styles.filterTabText,
        selectedFilter === item.id && styles.activeFilterTabText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderEPoojaCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => navigation.navigate('EPoojaDetails', { pooja: item })}
    >
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/300x200' }} 
        style={styles.categoryImage}
        resizeMode="cover"
      />
      
      {item.is_popular && (
        <View style={styles.popularBadge}>
          <Ionicons name="star" size={12} color="white" />
          <Text style={styles.popularText}>Popular</Text>
        </View>
      )}
      
      <View style={styles.categoryContent}>
        <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
        {item.sanskrit_name && (
          <Text style={styles.sanskritName} numberOfLines={1}>{item.sanskrit_name}</Text>
        )}
        
        <View style={styles.deityContainer}>
          <Ionicons name="flower" size={14} color="#F97316" />
          <Text style={styles.deityName}>{item.deity_name}</Text>
        </View>
        
        <Text style={styles.benefits} numberOfLines={3}>
          {item.benefits}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>₹{item.min_price || item.base_price}</Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>
              {item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '4.5'}
            </Text>
            <Text style={styles.reviewCount}>
              ({item.review_count || 0})
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#F97316" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Pooja Services</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search poojas..."
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
      </View>

      {/* Filter Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterTab,
              selectedFilter === filter.id && styles.activeFilterTab
            ]}
            onPress={() => handleFilterPress(filter.id)}
          >
            <Ionicons 
              name={filter.icon} 
              size={16} 
              color={selectedFilter === filter.id ? '#F97316' : '#6B7280'} 
            />
            <Text style={[
              styles.filterTabText,
              selectedFilter === filter.id && styles.activeFilterTabText
            ]}>
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Categories List */}
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading E-Poojas...</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderEPoojaCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.categoriesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#F97316']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  activeFilterTab: {
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeFilterTabText: {
    color: '#F97316',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  categoriesList: {
    padding: 20,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  categoryContent: {
    padding: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 18,
  },
  sanskritName: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '500',
    marginBottom: 6,
  },
  deityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deityName: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  benefits: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 15,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F97316',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 9,
    color: '#9CA3AF',
    marginLeft: 2,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default EPoojaCategories;
