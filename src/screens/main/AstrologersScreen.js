import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

const AstrologersScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'online', 'offline'
  const autoStartAttemptedRef = useRef(false);
  
  // Get prepaid recharge card params if navigated from home screen
  const isPrepaidRechargeCard = route.params?.isPrepaidRechargeCard || false;
  const purchaseId = route.params?.purchaseId;
  const durationMinutes = route.params?.durationMinutes;
  const cardName = route.params?.cardName;
  const astrologerAssignment = route.params?.astrologerAssignment || 'all';
  // Memoize array to prevent new reference on every render
  const assignedAstrologers = useMemo(
    () => route.params?.assignedAstrologers || [],
    [route.params?.assignedAstrologers]
  );

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

  // Filter astrologers based on search query and filter type using useMemo
  const filteredAstrologers = useMemo(() => {
    console.log('🔍 [FILTER] Starting filter with query:', searchQuery, 'filterType:', filterType);
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
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(astrologer => {
        // Check name
        if (astrologer.name?.toLowerCase().includes(query)) {
          return true;
        }
        // Check displayName
        if (astrologer.displayName?.toLowerCase().includes(query)) {
          return true;
        }
        // Check specialties array
        if (Array.isArray(astrologer.specialties) && astrologer.specialties.some(spec => 
          spec.toLowerCase().includes(query)
        )) {
          return true;
        }
        // Check specialization array (fallback)
        if (Array.isArray(astrologer.specialization) && astrologer.specialization.some(spec => 
          spec.toLowerCase().includes(query)
        )) {
          return true;
        }
        return false;
      });
    }

    // If this is a prepaid recharge card flow with restricted astrologers,
    // limit the list to only those astrologers allowed by the card
    if (isPrepaidRechargeCard && assignedAstrologers.length > 0 && astrologerAssignment !== 'all') {
      const allowedIds = assignedAstrologers.map(id => id.toString());
      filtered = filtered.filter(astrologer =>
        allowedIds.includes((astrologer._id || astrologer.id || '').toString())
      );
    }

    console.log('🔍 [FILTER] Filtered results:', filtered.length, 'out of', astrologers.length);
    return filtered;
  }, [astrologers, searchQuery, filterType, isPrepaidRechargeCard, assignedAstrologers, astrologerAssignment]);

  const handleAstrologerPress = useCallback(async (astrologer) => {
    // If this is a prepaid recharge card flow, start the chat session directly
    if (isPrepaidRechargeCard && purchaseId) {
      console.log('💳 [ASTROLOGERS_SCREEN] Starting prepaid recharge card chat with:', astrologer.name);
      
      Alert.alert(
        'Start Chat',
        `Start ${durationMinutes} minute chat with ${astrologer.name}?\n\nUsing: ${cardName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Chat',
            onPress: async () => {
              try {
                setLoading(true);
                
                // Import the API
                const prepaidRechargeCardsAPI = require('../../services/prepaidRechargeCardsAPI').default;
                
                // Create session
                const response = await prepaidRechargeCardsAPI.startChatSession(
                  purchaseId,
                  astrologer._id
                );

                console.log('✅ [ASTROLOGERS_SCREEN] Session created:', response.data);

                // Navigate to FixedChatScreen
                navigation.navigate('FixedChatScreen', {
                  sessionId: response.data.sessionId,
                  astrologerId: astrologer._id,
                  durationMinutes: response.data.durationMinutes,
                  isPrepaidCard: true,
                  purchaseId: purchaseId,
                  cardName: cardName,
                  consultationType: 'chat'
                });
              } catch (error) {
                console.error('❌ [ASTROLOGERS_SCREEN] Error starting chat:', error);
                Alert.alert('Error', error.message || 'Failed to start chat session');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } else {
      // Normal flow - navigate to profile
      navigation.navigate('AstrologerProfile', { astrologer });
    }
  }, [isPrepaidRechargeCard, purchaseId, durationMinutes, cardName, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAstrologers();
    setRefreshing(false);
  }, [fetchAstrologers]);

  useEffect(() => {
    fetchAstrologers();
  }, [fetchAstrologers]);

  // Auto-start flow for prepaid recharge cards that are restricted to a single astrologer
  useEffect(() => {
    if (!isPrepaidRechargeCard) return;
    if (astrologerAssignment === 'all') return;
    if (autoStartAttemptedRef.current) return;
    if (!filteredAstrologers || filteredAstrologers.length !== 1) return;

    const onlyAstrologer = filteredAstrologers[0];
    if (!onlyAstrologer || !purchaseId) return;

    console.log('💳 [ASTROLOGERS_SCREEN] Auto-starting prepaid recharge card chat with single allowed astrologer:', onlyAstrologer.name);
    autoStartAttemptedRef.current = true;
    handleAstrologerPress(onlyAstrologer);
  }, [
    isPrepaidRechargeCard,
    astrologerAssignment,
    filteredAstrologers,
    purchaseId,
    handleAstrologerPress
  ]);

  // Get status outline color based on astrologer onlineStatus
  const getStatusOutlineColor = useCallback((astrologer) => {
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
  }, []);

  // Get status text
  const getStatusText = useCallback((astrologer) => {
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    
    if (isOnline) {
      // Check if astrologer has legacy status field for busy state
      if (astrologer.status === 'busy') {
        return 'Busy';
      }
      return 'Available';
    }
    return 'Offline';
  }, []);

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

        {/* Prepaid card restriction badge */}
        {isPrepaidRechargeCard && astrologerAssignment !== 'all' && (
          <View style={styles.prepaidBadgeContainer}>
            <Text style={styles.prepaidBadgeTitle} numberOfLines={1}>
              {cardName || 'Prepaid Chat Pack'}
            </Text>
            <Text style={styles.prepaidBadgeText}>
              This prepaid chat pack is valid only for selected astrologers.
            </Text>
          </View>
        )}

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

  const renderFilterButton = useCallback((type, label) => (
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
  ), [filterType]);

  // Simple header for results count only
  const renderListHeader = useCallback(() => (
    <Text style={styles.resultsCount}>
      {filteredAstrologers.length} astrologer{filteredAstrologers.length !== 1 ? 's' : ''} found
    </Text>
  ), [filteredAstrologers.length]);

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

      {/* Prepaid card restriction badge */}
      {(isPrepaidRechargeCard && astrologerAssignment !== 'all') && (
        <View style={styles.prepaidBadgeContainer}>
          <Text style={styles.prepaidBadgeTitle} numberOfLines={1}>
            {cardName || 'Prepaid Chat Pack'}
          </Text>
          <Text style={styles.prepaidBadgeText}>
            This prepaid chat pack is valid only for selected astrologers.
          </Text>
        </View>
      )}

      {/* Search Bar - Outside FlatList */}
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

      {/* Filter Buttons - Outside FlatList */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All')}
        {renderFilterButton('online', 'Online')}
        {renderFilterButton('offline', 'Offline')}
      </View>

      {/* Astrologers List */}
      <FlatList
        data={filteredAstrologers}
        renderItem={renderAstrologerCard}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderListHeader}
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
    backgroundColor: '#F9FAFB',
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContainer: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
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
    marginHorizontal: 16,
    marginTop: 12,
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
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  astrologerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
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
  },
  astrologerImage: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  astrologerMainInfo: {
    flex: 1,
  },
  nameAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  astrologerSpecialty: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
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
  prepaidBadgeContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  prepaidBadgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  prepaidBadgeText: {
    fontSize: 12,
    color: '#6B7280',
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
