import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { astrologersAPI } from '../../services/api';

const AstrologersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [astrologers, setAstrologers] = useState([]);
  const [filteredAstrologers, setFilteredAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'online', 'offline'

  // Fetch all astrologers data with pagination
  const fetchAstrologers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching all astrologers from backend...');
      
      let allAstrologers = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      // Fetch all pages of astrologers
      while (hasMorePages) {
        const data = await astrologersAPI.getAll({ page: currentPage, limit: 50 });
        console.log(`✅ Page ${currentPage} fetched:`, data.data?.length || 0, 'astrologers');
        
        if (data.success && data.data) {
          allAstrologers = [...allAstrologers, ...data.data];
          
          // Check if there are more pages
          hasMorePages = data.pagination?.next ? true : false;
          currentPage++;
        } else {
          hasMorePages = false;
          console.warn('⚠️ API returned success: false or no data');
        }
      }
      
      setAstrologers(allAstrologers);
      setFilteredAstrologers(allAstrologers);
      console.log(`📊 Total astrologers loaded: ${allAstrologers.length}`);
      
    } catch (error) {
      console.error('❌ Error fetching astrologers:', error);
      Alert.alert(
        'Connection Error',
        'Unable to load astrologers. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter astrologers based on search query and filter type
  const filterAstrologers = useCallback(() => {
    let filtered = astrologers;

    // Filter by online status
    if (filterType === 'online') {
      filtered = filtered.filter(astrologer => 
        astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1
      );
    } else if (filterType === 'offline') {
      filtered = filtered.filter(astrologer => 
        astrologer.onlineStatus?.chat !== 1 && astrologer.onlineStatus?.call !== 1
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(astrologer =>
        astrologer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(astrologer.specialization) && astrologer.specialization.some(spec => 
          spec.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      );
    }

    setFilteredAstrologers(filtered);
  }, [astrologers, searchQuery, filterType]);

  useEffect(() => {
    fetchAstrologers();
  }, [fetchAstrologers]);

  useEffect(() => {
    filterAstrologers();
  }, [filterAstrologers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAstrologers();
    setRefreshing(false);
  }, [fetchAstrologers]);

  const handleAstrologerPress = (astrologer) => {
    navigation.navigate('AstrologerProfile', { astrologer });
  };

  // Get status outline color based on astrologer onlineStatus
  const getStatusOutlineColor = (astrologer) => {
    // Check if astrologer is online based on onlineStatus field
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    
    if (isOnline) {
      // Check if astrologer has legacy status field for busy state
      if (astrologer.status === 'busy') {
        return '#FF9800'; // Orange for busy
      }
      return '#4CAF50'; // Green for online
    }
    return '#9E9E9E'; // Grey for offline
  };

  // Get status text
  const getStatusText = (astrologer) => {
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    
    if (isOnline) {
      // Check if astrologer has legacy status field for busy state
      if (astrologer.status === 'busy') {
        return 'Busy';
      }
      return 'Available';
    }
    return 'Offline';
  };

  const renderAstrologerCard = ({ item: astrologer }) => {
    return (
      <TouchableOpacity
        style={styles.astrologerCard}
        onPress={() => handleAstrologerPress(astrologer)}
        activeOpacity={0.8}
      >
        {/* Header Section with Image and Status */}
        <View style={styles.cardHeader}>
          <View style={styles.imageSection}>
            <View style={[
              styles.astrologerImageContainer,
              {
                borderColor: getStatusOutlineColor(astrologer),
              }
            ]}>
              <Image
                source={{ 
                  uri: astrologer.imageUrl || astrologer.profileImage || 'https://via.placeholder.com/80x80?text=No+Image' 
                }}
                style={styles.astrologerImage}
              />
              {/* Status Badge */}
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusOutlineColor(astrologer) }
              ]}>
                <View style={styles.statusDot} />
              </View>
            </View>
          </View>
          
          <View style={styles.astrologerMainInfo}>
            <View style={styles.nameAndStatus}>
              <Text style={styles.astrologerName} numberOfLines={1}>
                {astrologer.displayName || astrologer.name}
              </Text>
              <View style={[
                styles.statusChip,
                { backgroundColor: getStatusOutlineColor(astrologer) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusOutlineColor(astrologer) }
                ]}>
                  {getStatusText(astrologer)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.astrologerSpecialty} numberOfLines={2}>
              {astrologer.specialties?.join(', ') || (Array.isArray(astrologer.specialization) ? astrologer.specialization.join(', ') : '') || 'Vedic Astrology, Numerology'}
            </Text>
            
            {/* Enhanced Rating Section */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingContainer}>
                <View style={styles.starContainer}>
                  <FontAwesome name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>
                    {astrologer.rating?.average ? astrologer.rating.average.toFixed(1) : (astrologer.rating && typeof astrologer.rating === 'number' ? astrologer.rating.toFixed(1) : '4.8')}
                  </Text>
                </View>
                <Text style={styles.reviewCount}>
                  ({astrologer.rating?.count || astrologer.totalReviews || '150'} reviews)
                </Text>
              </View>
              <Text style={styles.experience}>{astrologer.experience || '8'}+ years exp</Text>
            </View>
          </View>
        </View>

        {/* Price and Quick Actions Section */}
        <View style={styles.cardFooter}>
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Chat starting from</Text>
            <Text style={styles.price}>
              ₹{astrologer.consultationPrices?.chat || astrologer.chatRate || '50'}/min
            </Text>
          </View>
          
          {/* Quick Action Buttons - Dynamic visibility based on onlineStatus */}
          <View style={styles.quickActions}>
            {/* Show Chat button only if onlineStatus.chat === 1 and consultationPrices.chat exists */}
            {astrologer.onlineStatus?.chat === 1 && (astrologer.consultationPrices?.chat || astrologer.chatRate) && (
              <TouchableOpacity 
                style={[styles.quickActionBtn, styles.chatBtn]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAstrologerPress(astrologer);
                }}
              >
                <Ionicons name="chatbubble" size={16} color="#10B981" />
              </TouchableOpacity>
            )}
            {/* Show Call button only if onlineStatus.call === 1 and consultationPrices.call exists */}
            {astrologer.onlineStatus?.call === 1 && (astrologer.consultationPrices?.call || astrologer.callRate) && (
              <TouchableOpacity 
                style={[styles.quickActionBtn, styles.callBtn]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAstrologerPress(astrologer);
                }}
              >
                <Ionicons name="call" size={16} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (type, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && styles.activeFilterButton
      ]}
      onPress={() => setFilterType(type)}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search astrologers..."
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

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('online', 'Online')}
        {renderFilterButton('offline', 'Offline')}
      </View>

      {/* Results Count */}
      <Text style={styles.resultsCount}>
        {filteredAstrologers.length} astrologer{filteredAstrologers.length !== 1 ? 's' : ''} found
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.contentWrapper}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Astrologers</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading astrologers...</Text>
        </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.contentWrapper}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Astrologers</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Astrologers List */}
      <FlatList
        data={filteredAstrologers}
        renderItem={renderAstrologerCard}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F97316']}
            tintColor="#F97316"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No astrologers found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search terms' : 'No astrologers available at the moment'}
            </Text>
          </View>
        )}
      />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500, // Responsive max width for tablets
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8, // SafeAreaView now handles safe area properly
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    paddingBottom: 20,
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#F97316',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  resultsCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  astrologerCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 12,
  },
  imageSection: {
    marginRight: 12,
  },
  astrologerImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    padding: 2,
    position: 'relative',
  },
  astrologerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
    backgroundColor: '#F3F4F6',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  astrologerMainInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameAndStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  astrologerSpecialty: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  experience: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatBtn: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  callBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default AstrologersScreen;
