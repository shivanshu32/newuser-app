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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { astrologersAPI, categoriesAPI } from '../../services/api';
import prepaidRechargeCardsAPI from '../../services/prepaidRechargeCardsAPI';

const PrepaidChatPackAstrologersScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [astrologers, setAstrologers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' or specific category
  
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

  // Fetch categories from backend
  const fetchCategories = useCallback(async () => {
    try {
      console.log('🔄 Fetching categories from backend...');
      const response = await categoriesAPI.getAll({ active: 'true' });
      if (response.success && response.data) {
        setCategories(response.data);
        console.log(`✅ Categories loaded: ${response.data.length}`);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      // Silently fail - categories are optional
    }
  }, []);

  // Build available categories list with 'all' option
  const availableCategories = useMemo(() => {
    return ['all', ...categories.map(cat => cat.name)];
  }, [categories]);

  // Filter astrologers based on search query, category, and assignment
  const filteredAstrologers = useMemo(() => {
    let filtered = astrologers;

    // Filter by category
    if (selectedCategory !== 'all') {
      console.log('🔍 [FILTER] Filtering by category:', selectedCategory);
      filtered = filtered.filter(astrologer => {
        // Check if astrologer has categoryRefs array (populated with category objects)
        if (Array.isArray(astrologer.categoryRefs) && astrologer.categoryRefs.length > 0) {
          const hasCategory = astrologer.categoryRefs.some(categoryRef => {
            // categoryRef is a populated object with { _id, name }
            const categoryName = categoryRef?.name || categoryRef;
            const match = categoryName && categoryName.trim().toLowerCase() === selectedCategory.toLowerCase();
            if (match) {
              console.log('✅ [FILTER] Match found:', astrologer.name, 'has category:', categoryName);
            }
            return match;
          });
          return hasCategory;
        }
        console.log('⚠️ [FILTER] No categoryRefs for:', astrologer.name);
        return false;
      });
      console.log('🔍 [FILTER] After category filter:', filtered.length, 'astrologers');
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
  }, [astrologers, searchQuery, selectedCategory, assignedAstrologers, astrologerAssignment]);

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
    await Promise.all([fetchAstrologers(), fetchCategories()]);
    setRefreshing(false);
  }, [fetchAstrologers, fetchCategories]);

  useEffect(() => {
    fetchAstrologers();
    fetchCategories();
  }, [fetchAstrologers, fetchCategories]);

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

  // Render category button
  const renderCategoryButton = useCallback((category) => {
    const isSelected = selectedCategory === category;
    const displayLabel = category === 'all' ? 'All' : category;
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          isSelected && styles.activeCategoryButton
        ]}
        onPress={() => setSelectedCategory(category)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.categoryButtonText,
            isSelected && styles.activeCategoryButtonText
          ]}
        >
          {displayLabel}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedCategory]);

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
            {/* Name Row */}
            <Text style={styles.astrologerName} numberOfLines={1}>
              {astrologer.displayName || astrologer.name}
            </Text>

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
            
            {/* Badges Row - Premium and Status */}
            <View style={styles.badgesRow}>
              {(astrologer.isPremium || astrologer.rating?.average >= 4.8) && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.premiumText}>PREMIUM</Text>
                </View>
              )}
              <View style={[styles.statusIndicator, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </View>
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

      {/* Category Filter Buttons - Horizontal ScrollView */}
      {availableCategories.length > 1 && (
        <View style={styles.categoryFilterSection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterContainer}
          >
            {availableCategories.map(renderCategoryButton)}
          </ScrollView>
        </View>
      )}

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
  categoryFilterSection: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  categoryFilterContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  activeCategoryButton: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeCategoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    position: 'relative',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginRight: 8,
  },
  premiumText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
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
  astrologerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
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
