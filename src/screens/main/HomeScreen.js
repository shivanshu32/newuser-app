import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const HomeScreen = ({ navigation }) => {
  const [astrologers, setAstrologers] = useState([]);
  const [featuredAstrologers, setFeaturedAstrologers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { user, updateUser } = useAuth();

  // Function to fetch user's wallet balance
  const fetchWalletBalance = async () => {
    try {
      // Only attempt to fetch if user is logged in
      if (user && user._id) {
        const API_URL = `http://192.168.29.107:5000/api/v1/wallet/balance`;
        
        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
          },
        });

        const result = await response.json();

        if (response.ok && result.data && result.data.balance !== undefined) {
          // Update user wallet balance in auth context
          await updateUser({ walletBalance: result.data.balance });
        }
      }
    } catch (err) {
      console.error('Error fetching wallet balance:', err);
      // We don't set an error state here to avoid disrupting the main screen
    }
  };

  // Refresh wallet balance when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchWalletBalance();
      return () => {}; // cleanup function
    }, [])
  );

  const handleLoadMore = () => {
    if (!loadingMore && !refreshing && hasMoreData) {
      fetchAstrologers(page + 1, true);
    }
  };

  useEffect(() => {
    fetchAstrologers(1, false);
  }, []);

  const fetchAstrologers = async (pageNumber = 1, isLoadingMore = false) => {
    try {
      if (pageNumber === 1) {
        setLoading(true);
        setError(null);
      } else if (isLoadingMore) {
        setLoadingMore(true);
      }
      
      const API_URL = `http://192.168.29.107:5000/api/v1/astrologers?page=${pageNumber}&limit=10`;
      
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch astrologers');
      }

      const fetchedAstrologers = result.data.map(astrologer => {
        // Handle rating which might be an object with average and count properties
        let rating;
        if (astrologer.rating && typeof astrologer.rating === 'object' && astrologer.rating.average) {
          rating = astrologer.rating.average.toFixed(1);
        } else if (typeof astrologer.rating === 'number') {
          rating = astrologer.rating.toFixed(1);
        } else {
          rating = '4.5';
        }
        
        return {
          id: astrologer._id,
          name: astrologer.displayName || astrologer.name,
          image: astrologer.imageUrl || astrologer.profileImage,
          experience: astrologer.experience || '5+ years',
          languages: astrologer.languages || ['Hindi', 'English'],
          price: astrologer.price || '₹20/min',
          rating: rating,
          status: astrologer.status || 'Online'
        };
      });

      // Set all astrologers - filter out duplicates when loading more
      setAstrologers(prevAstrologers => {
        if (isLoadingMore) {
          // Create a Set of existing IDs for O(1) lookup
          const existingIds = new Set(prevAstrologers.map(a => a.id));
          
          // Filter out any astrologers that already exist in the list
          const uniqueNewAstrologers = fetchedAstrologers.filter(a => !existingIds.has(a.id));
          
          return [...prevAstrologers, ...uniqueNewAstrologers];
        } else {
          return fetchedAstrologers;
        }
      });

      // Set featured astrologers (first 5)
      if (pageNumber === 1) {
        setFeaturedAstrologers(fetchedAstrologers.slice(0, 5));
      }

      // Set total count from API response
      if (result.total) {
        setTotalCount(result.total);
      }

      setPage(pageNumber);
      
      // Check if there are more astrologers to load
      // Compare current total loaded astrologers against total count
      const currentTotal = isLoadingMore ? 
        astrologers.length + fetchedAstrologers.length : 
        fetchedAstrologers.length;
      
      setHasMoreData(currentTotal < result.total);
    } catch (err) {
      console.error('Error fetching astrologers:', err);
      setError('Failed to load astrologers. Please try again.');
    } finally {
      setLoading(false);
      if (isLoadingMore) {
        setLoadingMore(false);
      }
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMoreData(true);
    fetchAstrologers(1, false);
  };

  const handleAstrologerPress = (astrologer) => {
    navigation.navigate('AstrologerProfile', { astrologerId: astrologer.id });
  };

  const renderAstrologerItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={styles.astrologerCard}
      onPress={() => handleAstrologerPress(item)}
      accessible={true}
      accessibilityLabel={`${item.name}, ${item.specialization}, ${item.rating} stars, ${item.experience} years experience, ₹${item.price} per minute. ${item.status === 'online' ? 'Online' : 'Offline'}`}
    >
      {item.status === 'online' && (
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      <Image 
        source={{ uri: item.image }} 
        style={styles.astrologerImage} 
        accessibilityLabel={`Profile picture of ${item.name}`}
      />
      <View style={styles.astrologerInfo}>
        <Text style={styles.astrologerName}>{item.name}</Text>
        <Text style={styles.astrologerSpecialization}>{item.specialization || 'Astrologer'}</Text>
        <View style={styles.astrologerDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.detailText}>{item.rating}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.detailText}>{item.experience}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color="#F97316" />
            <Text style={styles.detailText}>₹{item.price}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderFeaturedItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleAstrologerPress(item)}
      accessible={true}
      accessibilityLabel={`Featured astrologer ${item.name}, ${item.specialization || 'Astrologer'}, ${item.rating} stars, ₹${item.price} per minute. ${item.status === 'online' ? 'Online' : 'Offline'}`}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.featuredImage} 
        accessibilityLabel={`Profile picture of ${item.name}`}
      />
      <View style={styles.featuredContent}>
        <Text style={styles.featuredName}>{item.name}</Text>
        <Text style={styles.featuredSpecialization}>{item.specialization || 'Astrologer'}</Text>
        <View style={styles.featuredDetails}>
          <View style={styles.featuredDetailItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.featuredDetailText}>{item.rating}</Text>
          </View>
          <View style={styles.featuredDetailItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.featuredDetailText}>{item.experience}</Text>
          </View>
          <View style={styles.featuredDetailItem}>
            <Ionicons name="cash-outline" size={14} color="#F97316" />
            <Text style={styles.featuredDetailText}>₹{item.price}</Text>
          </View>
        </View>
      </View>
      {item.status === 'online' && (
        <View style={styles.featuredLiveIndicator}>
          <Text style={styles.featuredLiveText}>LIVE</Text>
        </View>
      )}
    </TouchableOpacity>
    );
  };

  // Loading skeleton for astrologer cards
  const renderAstrologerSkeleton = () => (
    <View style={styles.astrologerCard}>
      <View style={[styles.astrologerImage, styles.skeleton]} />
      <View style={[styles.skeletonText, { width: '70%', marginTop: 10 }]} />
      <View style={[styles.skeletonText, { width: '50%', marginTop: 5 }]} />
      <View style={styles.astrologerDetails}>
        <View style={[styles.skeletonText, { width: '20%' }]} />
        <View style={[styles.skeletonText, { width: '20%' }]} />
        <View style={[styles.skeletonText, { width: '20%' }]} />
      </View>
    </View>
  );

  // Loading skeleton for featured astrologers
  const renderFeaturedSkeleton = () => (
    <View style={styles.featuredCard}>
      <View style={[styles.featuredImage, styles.skeleton]} />
      <View style={styles.featuredContent}>
        <View style={[styles.skeletonText, { width: '80%' }]} />
        <View style={[styles.skeletonText, { width: '60%', marginTop: 5 }]} />
        <View style={styles.featuredDetails}>
          <View style={[styles.skeletonText, { width: '30%', marginTop: 5 }]} />
        </View>
      </View>
    </View>
  );

  // Header component for the main FlatList
  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
            <Text style={styles.subGreeting}>Find your perfect astrologer</Text>
          </View>
          <TouchableOpacity 
            style={styles.walletContainer}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={styles.walletIconContainer}>
              <Ionicons name="wallet-outline" size={18} color="#F97316" />
            </View>
            <View>
              <Text style={styles.walletBalance}>₹{user?.walletBalance || 0}</Text>
              <Text style={styles.walletLabel}>Wallet</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Search for astrologers...</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Astrologers</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllButton}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
            {[1, 2, 3].map(key => (
              <View key={`featured-skeleton-${key}`} style={{marginHorizontal: 5}}>
                {renderFeaturedSkeleton()}
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.featuredList}
          >
            {featuredAstrologers.map(item => renderFeaturedItem({item}))}
          </ScrollView>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Astrologers</Text>
        <TouchableOpacity>
          <Text style={styles.viewAllButton}>View All</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Error display component
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchAstrologers(1, false)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main loading skeleton
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {loading && !astrologers.length ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ marginTop: 16, color: '#6B7280' }}>Loading astrologers...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#F97316" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchAstrologers(1, false)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={astrologers}
            renderItem={renderAstrologerItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.astrologerListContent}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={() => (
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#FF6B00" />
                  <Text style={styles.footerText}>Loading more astrologers...</Text>
                </View>
              ) : null
            )}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={['#F97316']} 
                tintColor="#F97316"
              />
            }
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        data={astrologers}
        keyExtractor={(item) => item.id}
        renderItem={renderAstrologerItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.astrologerListContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListFooterComponent={() => (
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#FF6B00" />
              <Text style={styles.footerText}>Loading more astrologers...</Text>
            </View>
          ) : null
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  skeletonText: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subGreeting: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  walletContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  walletIconContainer: {
    marginRight: 8,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
  },
  walletLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  viewAllButton: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '500',
  },
  featuredList: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  featuredCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    flexDirection: 'row',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  featuredImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  featuredContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  featuredName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  featuredSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  featuredDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  featuredDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  featuredDetailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  featuredLiveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredLiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  astrologerListContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  astrologerCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
  },
  astrologerInfo: {
    alignItems: 'center',
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  astrologerSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  astrologerDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
});

export default HomeScreen;
