import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const { user } = useAuth();

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

  const handleBooking = (astrologer) => {
    navigation.navigate('Bookings', { astrologer });
  };

  const renderAstrologerItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={styles.astrologerCard}
      onPress={() => handleBooking(item)}
      accessible={true}
      accessibilityLabel={`${item.name}, ${item.specialization}, ${item.rating} stars, ${item.experience} years experience, ₹${item.price} per minute. ${item.online ? 'Online' : 'Offline'}`}
    >
      <View style={styles.onlineIndicator}>
        <View
          style={[
            styles.onlineDot,
            { backgroundColor: item.online ? '#4CAF50' : '#F44336' },
          ]}
        />
      </View>
      <Image 
        source={{ uri: item.image }} 
        style={styles.astrologerImage} 
        accessibilityLabel={`Profile picture of ${item.name}`}
      />
      <Text style={styles.astrologerName}>{item.name}</Text>
      <Text style={styles.astrologerSpecialization}>{item.specialization}</Text>
      <View style={styles.astrologerDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.detailText}>{item.rating}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.detailText}>{item.experience} yrs</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={14} color="#666" />
          <Text style={styles.detailText}>₹{item.price}/min</Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderFeaturedItem = ({ item }) => {
    return (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleBooking(item)}
      accessible={true}
      accessibilityLabel={`Featured astrologer ${item.name}, ${item.specialization}, ${item.rating} stars, ₹${item.price} per minute. ${item.online ? 'Online' : 'Offline'}`}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.featuredImage} 
        accessibilityLabel={`Profile picture of ${item.name}`}
      />
      <View style={styles.featuredContent}>
        <Text style={styles.featuredName}>{item.name}</Text>
        <Text style={styles.featuredSpecialization}>{item.specialization}</Text>
        <View style={styles.featuredDetails}>
          <View style={styles.featuredDetailItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.featuredDetailText}>{item.rating}</Text>
          </View>
          <View style={styles.featuredDetailItem}>
            <Ionicons name="cash-outline" size={14} color="#666" />
            <Text style={styles.featuredDetailText}>₹{item.price}/min</Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.featuredOnlineIndicator,
          { backgroundColor: item.online ? '#4CAF50' : '#F44336' },
        ]}
      />
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
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
          <Text style={styles.subGreeting}>Find your perfect astrologer</Text>
        </View>
        <View style={styles.walletContainer}>
          <Text style={styles.walletBalance}>₹{user?.walletBalance || 0}</Text>
          <Text style={styles.walletLabel}>Wallet</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Astrologers</Text>
        {loading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
            {[1, 2, 3].map(key => (
              <View key={`featured-skeleton-${key}`} style={{marginHorizontal: 5}}>
                {renderFeaturedSkeleton()}
              </View>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={featuredAstrologers}
            renderItem={renderFeaturedItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
            nestedScrollEnabled={true}
          />
        )}
      </View>

      <View style={styles.sectionTitleContainer}>
        <Text style={styles.sectionTitle}>All Astrologers</Text>
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
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.astrologerList}>
          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {[1, 2, 3, 4, 5, 6].map(key => (
              <View key={`astrologer-skeleton-${key}`} style={{width: '50%', padding: 5}}>
                {renderAstrologerSkeleton()}
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: '#E1E9EE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  skeletonText: {
    height: 10,
    backgroundColor: '#E1E9EE',
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
    color: '#333',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerLoader: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subGreeting: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  walletContainer: {
    alignItems: 'center',
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8A2BE2',
  },
  walletLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleContainer: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  featuredList: {
    paddingHorizontal: 15,
  },
  featuredCard: {
    width: 280,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
    flexDirection: 'row',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    marginLeft: 15,
    justifyContent: 'center',
  },
  featuredName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuredSpecialization: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  featuredDetails: {
    flexDirection: 'row',
    marginTop: 5,
  },
  featuredDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  featuredDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 3,
  },
  featuredOnlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    top: 10,
    right: 10,
  },
  astrologerList: {
    paddingHorizontal: 10,
  },
  astrologerCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  astrologerSpecialization: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  astrologerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    width: '100%',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 3,
  },
});

export default HomeScreen;
