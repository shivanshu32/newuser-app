import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, astrologersAPI } from '../../services/api';

const BookingScreen = ({ route, navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  // Check if we have an astrologer passed from the home screen
  const selectedAstrologer = route.params?.astrologer;

  useEffect(() => {
    fetchBookings();
    
    // If we have a selected astrologer, show the booking modal
    if (selectedAstrologer) {
      showBookingOptions(selectedAstrologer);
    }
  }, [selectedAstrologer]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Call backend API to fetch user's bookings
      const response = await bookingsAPI.getAll();
      
      if (response.data && response.data.bookings) {
        setBookings(response.data.bookings);
      } else {
        // Fallback to dummy bookings if no bookings found
        const dummyBookings = [
          {
            id: '1',
            astrologerId: '1',
            astrologerName: 'Pandit Sharma',
            astrologerImage: 'https://via.placeholder.com/100',
            type: 'chat',
            status: 'scheduled',
            scheduledTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
            duration: 0,
            amount: 0,
          },
          {
            id: '2',
            astrologerId: '2',
            astrologerName: 'Jyotish Gupta',
            astrologerImage: 'https://via.placeholder.com/100',
            type: 'video',
            status: 'completed',
            scheduledTime: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            duration: 15,
            amount: 225,
          },
          {
            id: '3',
            astrologerId: '3',
            astrologerName: 'Astrologer Patel',
            astrologerImage: 'https://via.placeholder.com/100',
            type: 'chat',
            status: 'cancelled',
            scheduledTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            duration: 0,
            amount: 0,
          },
        ];
        
        setBookings(dummyBookings);
      }
      
      setLoading(false);
    } catch (error) {
      console.log('Error fetching bookings:', error);
      setLoading(false);
    }
  };
  
  // Function to handle booking creation
  const createBooking = async (astrologer, type, scheduledTime) => {
    try {
      setLoading(true);
      
      const bookingData = {
        astrologerId: astrologer.id,
        type,
        scheduledTime,
      };
      
      // Call backend API to create booking
      const response = await bookingsAPI.create(bookingData);
      
      if (response.data && response.data.success) {
        Alert.alert(
          'Booking Successful',
          `Your ${type} session with ${astrologer.name} has been scheduled.`,
          [{ text: 'OK', onPress: () => fetchBookings() }]
        );
      } else {
        Alert.alert('Booking Failed', response.data?.message || 'Failed to create booking');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error creating booking:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    }
  };

  const showBookingOptions = (astrologer) => {
    Alert.alert(
      `Book ${astrologer.name}`,
      'Select session type:',
      [
        {
          text: 'Chat Session',
          onPress: () => scheduleSession(astrologer, 'chat')
        },
        {
          text: 'Voice Call',
          onPress: () => scheduleSession(astrologer, 'voice')
        },
        {
          text: 'Video Call',
          onPress: () => scheduleSession(astrologer, 'video')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const scheduleSession = (astrologer, type) => {
    // Get current time and calculate a time 1 hour from now for scheduling
    const now = new Date();
    const scheduledTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    
    // Format the time for display
    const formattedTime = scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Confirm booking with user
    Alert.alert(
      'Confirm Booking',
      `Schedule a ${type} session with ${astrologer.name} at ${formattedTime}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          onPress: () => createBooking(astrologer, type, scheduledTime.toISOString())
        }
      ]
    );
  };

  const handleBookingAction = (booking) => {
    if (booking.status === 'scheduled') {
      // Navigate to the appropriate screen based on booking type
      if (booking.type === 'chat') {
        navigation.navigate('Chat', { bookingId: booking.id });
      } else if (booking.type === 'video') {
        navigation.navigate('VideoCall', { bookingId: booking.id });
      }
    } else if (booking.status === 'completed' && !booking.rated) {
      // Navigate to rating screen if the booking is completed and not rated
      navigation.navigate('Rating', { bookingId: booking.id });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'cancelled':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getBookingTypeIcon = (type) => {
    switch (type) {
      case 'chat':
        return 'chatbubble-outline';
      case 'video':
        return 'videocam-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const renderBookingItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const typeIcon = getBookingTypeIcon(item.type);
    const scheduledDate = new Date(item.scheduledTime);
    
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => handleBookingAction(item)}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.astrologerInfo}>
            <Image source={{ uri: item.astrologerImage }} style={styles.astrologerImage} />
            <View>
              <Text style={styles.astrologerName}>{item.astrologerName}</Text>
              <View style={styles.bookingType}>
                <Ionicons name={typeIcon} size={14} color="#666" />
                <Text style={styles.bookingTypeText}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)} Consultation
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {scheduledDate.toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {item.duration > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.duration} mins</Text>
            </View>
          )}
          {item.amount > 0 && (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailText}>₹{item.amount}</Text>
            </View>
          )}
        </View>
        
        {item.status === 'scheduled' && (
          <View style={styles.actionContainer}>
            <Text style={styles.actionText}>
              {item.type === 'chat' ? 'Start Chat' : 'Join Video Call'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#8A2BE2" />
          </View>
        )}
        
        {item.status === 'completed' && !item.rated && (
          <View style={styles.actionContainer}>
            <Text style={styles.actionText}>Rate Consultation</Text>
            <Ionicons name="arrow-forward" size={16} color="#8A2BE2" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && bookings.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Bookings</Text>
      </View>
      
      {bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No bookings yet</Text>
          <Text style={styles.emptySubtext}>
            Your bookings will appear here once you schedule a consultation with an astrologer.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.emptyButtonText}>Find Astrologers</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookingList}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {loading && bookings.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#8A2BE2" />
        </View>
      )}
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  bookingList: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  astrologerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bookingType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bookingTypeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionText: {
    color: '#8A2BE2',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BookingScreen;
