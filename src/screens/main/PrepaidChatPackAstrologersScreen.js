import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { astrologersAPI } from '../../services/api';
import prepaidRechargeCardsAPI from '../../services/prepaidRechargeCardsAPI';

const PrepaidChatPackAstrologersScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'online', 'offline'
  
  // Get prepaid chat pack params from navigation
  const purchaseId = route.params?.purchaseId;
  const durationMinutes = route.params?.durationMinutes;
  const cardName = route.params?.cardName;
  const astrologerAssignment = route.params?.astrologerAssignment || 'all';
  const assignedAstrologers = useMemo(
    () => route.params?.assignedAstrologers || [],
    [route.params?.assignedAstrologers]
  );

  // Fetch all astrologers data
  const fetchAstrologers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching astrologers for prepaid chat pack...');
      
      let allAstrologers = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const data = await astrologersAPI.getAll({ page: currentPage, limit: 50 });
        
        if (data.success && data.data) {
          allAstrologers = [...allAstrologers, ...data.data];
          hasMorePages = data.pagination?.next ? true : false;
          currentPage++;
        } else {
          hasMorePages = false;
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

  // Filter astrologers based on search query, filter type, and assignment
  const filteredAstrologers = useMemo(() => {
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
        if (astrologer.name?.toLowerCase().includes(query)) return true;
        if (astrologer.displayName?.toLowerCase().includes(query)) return true;
        if (Array.isArray(astrologer.specialties) && 
            astrologer.specialties.some(spec => spec.toLowerCase().includes(query))) {
          return true;
        }
        if (Array.isArray(astrologer.specialization) && 
            astrologer.specialization.some(spec => spec.toLowerCase().includes(query))) {
          return true;
        }
        return false;
      });
    }

    // Filter by assigned astrologers if applicable
    if (assignedAstrologers.length > 0 && astrologerAssignment !== 'all') {
      const allowedIds = assignedAstrologers.map(id => id.toString());
      filtered = filtered.filter(astrologer =>
        allowedIds.includes((astrologer._id || astrologer.id || '').toString())
      );
    }

    return filtered;
  }, [astrologers, searchQuery, filterType, assignedAstrologers, astrologerAssignment]);

  // Handle start chat with selected astrologer
  const handleStartChat = useCallback(async (astrologer) => {
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
              
              console.log('💳 Starting prepaid chat pack session:', {
                purchaseId,
                astrologerId: astrologer._id,
                durationMinutes
              });

              // Create session via API
              const response = await prepaidRechargeCardsAPI.startChatSession(
                purchaseId,
                astrologer._id
              );

              console.log('✅ Session created:', response.data);

              // Navigate to waiting screen for astrologer to accept
              navigation.navigate('BookingWaiting', {
                sessionId: response.data.sessionIdString || response.data.sessionId,
                bookingId: response.data.sessionId,
                astrologer: {
                  _id: astrologer._id,
                  id: astrologer._id,
                  name: astrologer.name || astrologer.displayName,
                  profileImage: astrologer.imageUrl || astrologer.profileImage
                },
                bookingType: 'chat',
                isPrepaidOffer: true,
                isPrepaidCard: true,
                durationMinutes: response.data.durationMinutes,
                purchaseId: purchaseId,
                cardName: cardName
              });
            } catch (error) {
              console.error('❌ Error starting chat:', error);
              Alert.alert('Error', error.message || 'Failed to start chat session');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [purchaseId, durationMinutes, cardName, navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAstrologers();
    setRefreshing(false);
  }, [fetchAstrologers]);

  useEffect(() => {
    fetchAstrologers();
  }, [fetchAstrologers]);

  // Get status color
  const getStatusColor = useCallback((astrologer) => {
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    
    if (isOnline) {
      if (astrologer.status === 'busy') return '#FF9800'; // Orange for busy
      return '#4CAF50'; // Green for online
    }
    return '#9E9E9E'; // Grey for offline
  }, []);

  // Get status text
  const getStatusText = useCallback((astrologer) => {
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    
    if (isOnline) {
      if (astrologer.status === 'busy') return 'Busy';
      return 'Available';
    }
    return 'Offline';
  }, []);

  // Render filter button
  const renderFilterButton = useCallback((type, label) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.filterButton,
        filterType === type && styles.activeFilterButton
      ]}
      onPress={() => setFilterType(type)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterType === type && styles.activeFilterButtonText
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  ), [filterType]);

  // Render astrologer card
  const renderAstrologerCard = useCallback(({ item: astrologer }) => {
    const statusColor = getStatusColor(astrologer);
    const statusText = getStatusText(astrologer);
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;

    return (
      <View style={styles.astrologerCard}>
        <View style={styles.cardHeader}>
          {/* Profile Image */}
          <View style={styles.imageSection}>
            <View style={[styles.astrologerImageContainer, { borderColor: statusColor }]}>
              <Image
                source={{ 
                  uri: astrologer.imageUrl || astrologer.profileImage || 'https://via.placeholder.com/80x80?text=No+Image' 
                }}
                style={styles.astrologerImage}
              />
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]} />
            </View>
          </View>

          {/* Astrologer Info */}
          <View style={styles.astrologerMainInfo}>
            <View style={styles.nameAndStatus}>
              <Text style={styles.astrologerName} numberOfLines={1}>
                {astrologer.displayName || astrologer.name}
              </Text>
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </View>

            {/* Rating */}
            {astrologer.rating > 0 && (
              <View style={styles.ratingSection}>
                <View style={styles.starContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.rating}>{astrologer.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.reviewCount}>
                  ({astrologer.totalReviews || 0} reviews)
                </Text>
              </View>
            )}

            {/* Specialties */}
            {astrologer.specialties && astrologer.specialties.length > 0 && (
              <Text style={styles.specialties} numberOfLines={1}>
                {astrologer.specialties.slice(0, 2).join(', ')}
              </Text>
            )}

            {/* Experience */}
            {astrologer.experience && (
              <Text style={styles.experience}>
                {astrologer.experience} years exp.
              </Text>
            )}
          </View>
        </View>

        {/* Start Chat Button */}
        <TouchableOpacity
          style={[
            styles.startChatBtn,
            !isOnline && styles.startChatBtnDisabled
          ]}
          onPress={() => handleStartChat(astrologer)}
          disabled={!isOnline}
          activeOpacity={0.8}
        >
          <Ionicons 
            name="chatbubble-ellipses" 
            size={18} 
            color="#fff" 
          />
          <Text style={styles.startChatBtnText}>
            {isOnline ? 'Start Chat' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [handleStartChat, getStatusColor, getStatusText]);

  // Render list header
  const renderListHeader = useCallback(() => (
    <View style={styles.listHeader}>
      <Text style={styles.resultsCount}>
        {filteredAstrologers.length} astrologer{filteredAstrologers.length !== 1 ? 's' : ''} available
      </Text>
      {astrologerAssignment !== 'all' && (
        <View style={styles.restrictionBadge}>
          <Ionicons name="information-circle" size={16} color="#8B5CF6" />
          <Text style={styles.restrictionText}>
            This pack is valid for selected astrologers only
          </Text>
        </View>
      )}
    </View>
  ), [filteredAstrologers.length, astrologerAssignment]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Select Astrologer</Text>
          <Text style={styles.headerSubtitle}>{cardName}</Text>
        </View>
      </View>

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

      {/* Astrologers List */}
      {loading && astrologers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading astrologers...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAstrologers}
          renderItem={renderAstrologerCard}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Astrologers Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try adjusting your search' : 'No astrologers available'}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F97316']}
              tintColor="#F97316"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  listHeader: {
    marginBottom: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  restrictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  restrictionText: {
    fontSize: 13,
    color: '#6B21A8',
    fontWeight: '500',
    flex: 1,
  },
  astrologerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    position: 'relative',
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
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  astrologerMainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 13,
    color: '#666',
  },
  specialties: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  experience: {
    fontSize: 13,
    color: '#F97316',
    fontWeight: '500',
  },
  startChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  startChatBtnDisabled: {
    backgroundColor: '#ccc',
  },
  startChatBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default PrepaidChatPackAstrologersScreen;
