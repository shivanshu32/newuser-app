import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [filteredAstrologers, setFilteredAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
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
  const assignedAstrologers = route.params?.assignedAstrologers || [];

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
  const filterAstrologers = () => {
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

    // If this is a prepaid recharge card flow with restricted astrologers,
    // limit the list to only those astrologers allowed by the card
    if (isPrepaidRechargeCard && assignedAstrologers.length > 0 && astrologerAssignment !== 'all') {
      const allowedIds = assignedAstrologers.map(id => id.toString());
      filtered = filtered.filter(astrologer =>
        allowedIds.includes((astrologer._id || astrologer.id || '').toString())
      );
    }

    setFilteredAstrologers(filtered);
  };

  useEffect(() => {
    fetchAstrologers();
  }, [fetchAstrologers]);

  useEffect(() => {
    filterAstrologers();
  }, [astrologers, searchQuery, filterType]);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAstrologers();
    setRefreshing(false);
  }, [fetchAstrologers]);

  const handleAstrologerPress = async (astrologer) => {
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
  // ...
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
