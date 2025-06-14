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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchAstrologers();
  }, []);

  const fetchAstrologers = async () => {
    try {
      // In a real app, this would call your backend API
      // const response = await axios.get(`${API_URL}/astrologers`);
      // setAstrologers(response.data);
      
      // Simulate API call with dummy data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dummyAstrologers = [
        {
          id: '1',
          name: 'Pandit Sharma',
          specialization: 'Vedic Astrology',
          experience: 15,
          rating: 4.8,
          price: 20,
          online: true,
          image: 'https://via.placeholder.com/100',
        },
        {
          id: '2',
          name: 'Jyotish Gupta',
          specialization: 'Numerology',
          experience: 10,
          rating: 4.5,
          price: 15,
          online: true,
          image: 'https://via.placeholder.com/100',
        },
        {
          id: '3',
          name: 'Astrologer Patel',
          specialization: 'Palmistry',
          experience: 20,
          rating: 4.9,
          price: 25,
          online: false,
          image: 'https://via.placeholder.com/100',
        },
        {
          id: '4',
          name: 'Dr. Joshi',
          specialization: 'Tarot Reading',
          experience: 8,
          rating: 4.3,
          price: 18,
          online: true,
          image: 'https://via.placeholder.com/100',
        },
        {
          id: '5',
          name: 'Guru Verma',
          specialization: 'Vastu Shastra',
          experience: 12,
          rating: 4.6,
          price: 22,
          online: false,
          image: 'https://via.placeholder.com/100',
        },
      ];
      
      setAstrologers(dummyAstrologers);
      setFeaturedAstrologers(dummyAstrologers.slice(0, 3));
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.log('Error fetching astrologers:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAstrologers();
  };

  const handleBooking = (astrologer) => {
    navigation.navigate('Bookings', { astrologer });
  };

  const renderAstrologerItem = ({ item }) => (
    <TouchableOpacity
      style={styles.astrologerCard}
      onPress={() => handleBooking(item)}
    >
      <View style={styles.onlineIndicator}>
        <View
          style={[
            styles.onlineDot,
            { backgroundColor: item.online ? '#4CAF50' : '#F44336' },
          ]}
        />
      </View>
      <Image source={{ uri: item.image }} style={styles.astrologerImage} />
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

  const renderFeaturedItem = ({ item }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleBooking(item)}
    >
      <Image source={{ uri: item.image }} style={styles.featuredImage} />
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
        <FlatList
          data={featuredAstrologers}
          renderItem={renderFeaturedItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredList}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Astrologers</Text>
        <FlatList
          data={astrologers}
          renderItem={renderAstrologerItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          contentContainerStyle={styles.astrologerList}
        />
      </View>
    </ScrollView>
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
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
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
