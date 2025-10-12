import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useFocusEffect } from '@react-navigation/native';
import { bookingsAPI } from '../../services/api';

const BookingScreen = ({ route, navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuth();
  const { socket } = useSocket();
  
  // Check if we have an astrologer passed from the home screen
  const selectedAstrologer = route.params?.astrologer;

  // Filter bookings based on active tab
  const getFilteredBookings = () => {
    let filtered;
    switch (activeTab) {
      case 'active':
        filtered = bookings.filter(booking => 
          ['pending', 'confirmed', 'waiting_for_user', 'in-progress'].includes(booking.status)
        );
        break;
      case 'completed':
        filtered = bookings.filter(booking => 
          ['completed', 'no_show'].includes(booking.status)
        );
        break;
      case 'cancelled':
        filtered = bookings.filter(booking => 
          ['cancelled', 'rejected', 'expired'].includes(booking.status)
        );
        break;
      case 'all':
      default:
        filtered = bookings;
    }
    
    // Sort by most recent first (createdAt or scheduledAt)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.scheduledAt);
      const dateB = new Date(b.createdAt || b.scheduledAt);
      return dateB - dateA; // Most recent first
    });
  };

  const fetchBookings = async () => {
    try {
      console.log('🔄 Starting fetchBookings...');
      setLoading(true);
      
      // Call backend API to fetch user's bookings
      const response = await bookingsAPI.getAll();
      
      // The backend returns data in response.data format (not response.data.data)
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Bookings found in response.data:', response.data.length);
        setBookings(response.data);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        console.log('✅ Bookings found in response.data.data:', response.data.data.length);
        setBookings(response.data.data);
      } else {
        console.log('❌ No bookings array found, setting empty');
        console.log('📋 Response structure:', response);
        setBookings([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching bookings:', error);
      console.error('❌ Error details:', error.response?.data || error.message);
      setLoading(false);
      // In case of error, set empty bookings array
      setBookings([]);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, []);

  // Setup socket listeners for real-time booking updates
  useEffect(() => {
    if (!socket?.connected) return;

    const handleBookingUpdate = (data) => {
      console.log('Booking update received:', data);
      // Refresh bookings list when any booking event occurs
      fetchBookings();
    };

    // Listen for booking lifecycle events
    socket.on('booking_accepted', handleBookingUpdate);
    socket.on('booking_rejected', handleBookingUpdate);
    socket.on('booking_expired', handleBookingUpdate);
    socket.on('booking_cancelled', handleBookingUpdate);
    socket.on('booking_auto_cancelled', handleBookingUpdate);
    socket.on('session_started', handleBookingUpdate);
    socket.on('session_completed', handleBookingUpdate);
    socket.on('astrologer_joined_session', handleBookingUpdate);
    socket.on('no_show_detected', handleBookingUpdate);
    socket.on('booking_reminder', (data) => {
      Alert.alert(
        'Booking Reminder',
        `Your consultation with ${data.astrologerName} is starting in 2 minutes!`,
        [{ text: 'OK' }]
      );
    });

    return () => {
      socket.off('booking_accepted', handleBookingUpdate);
      socket.off('booking_rejected', handleBookingUpdate);
      socket.off('booking_expired', handleBookingUpdate);
      socket.off('booking_cancelled', handleBookingUpdate);
      socket.off('booking_auto_cancelled', handleBookingUpdate);
      socket.off('session_started', handleBookingUpdate);
      socket.off('session_completed', handleBookingUpdate);
      socket.off('astrologer_joined_session', handleBookingUpdate);
      socket.off('no_show_detected', handleBookingUpdate);
      socket.off('booking_reminder');
    };
  }, [socket]);

  // Refresh bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  useEffect(() => {
    // If we have a selected astrologer, show the booking modal
    if (selectedAstrologer) {
      showBookingOptions(selectedAstrologer);
    }
  }, [selectedAstrologer]);
  
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

  const handleViewChatHistory = (booking) => {
    console.log('📜 [BookingScreen] Viewing chat history for booking:', booking._id);
    console.log('📜 [BookingScreen] Session ID:', booking.sessionId);
    
    if (!booking.sessionId) {
      Alert.alert('Error', 'Chat history is not available for this consultation.');
      return;
    }
    
    navigation.navigate('ChatHistory', {
      sessionId: booking.sessionId,
      bookingId: booking._id,
      astrologerName: booking.astrologer?.displayName || booking.astrologer?.name || 'Unknown Astrologer'
    });
  };

  const handleBookingAction = async (booking) => {
    try {
      switch (booking.status) {
        case 'confirmed':
        case 'waiting_for_user':
          // User can join the session
          await handleJoinSession(booking);
          break;
        case 'in-progress':
          // Navigate to ongoing session
          navigateToSession(booking);
          break;
        case 'pending':
          // Show booking details or allow cancellation
          showBookingDetails(booking);
          break;
        case 'completed':
          // Navigate to rating screen if not rated
          if (!booking.rated) {
            navigation.navigate('Rating', { bookingId: booking._id });
          }
          break;
        default:
          showBookingDetails(booking);
          break;
      }
    } catch (error) {
      console.error('Error handling booking action:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleJoinSession = async (booking) => {
    try {
      console.log(' [BookingScreen] Joining session for booking:', booking._id);
      console.log(' [BookingScreen] Full booking object:', JSON.stringify(booking, null, 2));
      
      Alert.alert('DEBUG', 'Starting join session for booking: ' + booking._id);
      
      // Validate booking data
      if (!booking._id) {
        console.error(' [BookingScreen] ERROR: Missing booking._id');
        Alert.alert('Error', 'Invalid booking data. Missing booking ID.');
        return;
      }
      
      // Import socket service functions
      const { joinConsultationRoom } = require('../../services/socketService');
      
      // Prepare consultation data
      const consultationData = {
        bookingId: booking._id,
        sessionId: booking.sessionId,
        roomId: booking.roomId || `consultation:${booking._id}`,
        astrologerId: booking.astrologer?._id || booking.astrologer,
        consultationType: booking.type
      };
      
      console.log(' [BookingScreen] Consultation data to send:', JSON.stringify(consultationData, null, 2));
      
      Alert.alert('DEBUG', 'About to call joinConsultationRoom socket function');
      
      // Join the consultation room via socket
      await joinConsultationRoom(consultationData);
      
      console.log(' [BookingScreen] Successfully joined consultation room');
      Alert.alert('DEBUG', 'Socket join successful - about to navigate to ' + booking.type + ' screen');
      
      // Navigate to appropriate session screen with proper parameters
      if (booking.type === 'video') {
        // Video calls are no longer supported
        console.log('Video call booking - feature removed');
        Alert.alert('DEBUG', 'Video call feature removed');
      } else if (booking.type === 'voice') {
        // Voice calls are now handled by Exotel - no navigation needed
        console.log('Voice call booking - handled by Exotel');
        Alert.alert('DEBUG', 'Voice call handled by Exotel');
      } else if (booking.type === 'chat') {
        navigation.navigate('Chat', { 
          bookingId: booking._id,
          sessionId: booking.sessionId,
          roomId: booking.roomId || `consultation:${booking._id}`,
          astrologerId: booking.astrologer?._id || booking.astrologer,
          consultationType: 'chat'
        });
        Alert.alert('DEBUG', 'Navigation.navigate called for Chat');
      }
      
    } catch (error) {
      console.error(' [BookingScreen] Error joining session:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    }
  };

  const navigateToSession = (booking) => {
    if (booking.type === 'video') {
      // Video calls are no longer supported
      console.log('Video call booking - feature removed');
    } else if (booking.type === 'voice') {
      // Voice calls are now handled by Exotel - no navigation needed
      console.log('Voice call booking - handled by Exotel');
    } else if (booking.type === 'chat') {
      navigation.navigate('Chat', { 
        bookingId: booking._id,
        astrologer: booking.astrologer 
      });
    }
  };

  const showBookingDetails = (booking) => {
    const canCancel = ['pending', 'confirmed'].includes(booking.status);
    const actions = [{ text: 'Close', style: 'cancel' }];
    
    if (canCancel) {
      actions.unshift({
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: () => handleCancelBooking(booking)
      });
    }

    Alert.alert(
      'Booking Details',
      `Status: ${booking.status}\nType: ${booking.type}\nAstrologer: ${booking.astrologer?.name || 'Unknown'}\nScheduled: ${new Date(booking.scheduledAt).toLocaleString()}`,
      actions
    );
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsAPI.cancel(booking._id, 'User cancelled');
              Alert.alert('Success', 'Booking cancelled successfully');
              fetchBookings();
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF9800';
      case 'confirmed':
      case 'waiting_for_user':
        return '#4CAF50';
      case 'in-progress':
        return '#2196F3';
      case 'completed':
        return '#9C27B0';
      case 'cancelled':
      case 'rejected':
        return '#F44336';
      case 'expired':
        return '#795548';
      case 'no_show':
        return '#607D8B';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'hourglass-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'waiting_for_user':
        return 'person-outline';
      case 'in-progress':
        return 'play-circle-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'cancelled':
      case 'rejected':
        return 'close-circle-outline';
      case 'expired':
        return 'time-outline';
      case 'no_show':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getBookingTypeIcon = (type) => {
    switch (type) {
      case 'chat':
        return 'chatbubble-outline';
      case 'video':
        return 'videocam-outline';
      case 'voice':
        return 'call-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getActionButtonText = (booking) => {
    switch (booking.status) {
      case 'confirmed':
      case 'waiting_for_user':
        return 'Join Session';
      case 'in-progress':
        return 'Continue Session';
      case 'pending':
        return 'View Details';
      case 'completed':
        return booking.rated ? 'View Rating' : 'Rate Session';
      default:
        return 'View Details';
    }
  };

  const renderBookingItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const typeIcon = getBookingTypeIcon(item.type);
    
    // Enhanced date/time formatting with proper validation
    // Use scheduledAt if available (for future bookings), otherwise use createdAt (for instant bookings)
    const bookingDate = item.scheduledAt ? new Date(item.scheduledAt) : 
                       item.createdAt ? new Date(item.createdAt) : null;
    const isValidDate = bookingDate && !isNaN(bookingDate.getTime());
    
    // Format date with better Indian locale formatting
    const formatDate = () => {
      if (!isValidDate) return 'Date not set';
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if it's today, tomorrow, or yesterday
      if (bookingDate.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (bookingDate.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
      } else if (bookingDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return bookingDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: bookingDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
    };
    
    // Format time with proper Indian locale
    const formatTime = () => {
      if (!isValidDate) return 'Time not set';
      
      return bookingDate.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
    
    // Format duration properly
    const formatDuration = () => {
      if (!item.duration || item.duration <= 0) return null;
      
      const duration = parseInt(item.duration);
      // Duration is already in minutes, so only convert if >= 60 minutes
      if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }
      return `${duration} min`;
    };
    

    
    // Check if this booking can be joined (accepted by astrologer)
    const canJoin = ['confirmed', 'waiting_for_user'].includes(item.status);
    
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.astrologerInfo}>
            <Image 
              source={{ uri: item.astrologer?.imageUrl || item.astrologer?.profileImage || 'https://via.placeholder.com/50' }} 
              style={styles.astrologerImage} 
            />
            <View>
              <Text style={styles.astrologerName}>{item.astrologer?.displayName || item.astrologer?.name || 'Unknown Astrologer'}</Text>
              <View style={styles.bookingType}>
                <Ionicons name={typeIcon} size={14} color="#666" />
                <Text style={styles.bookingTypeText}>
                  {`${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Consultation`}
                </Text>
                {item.isFreeChat ? (
                  <View style={styles.freeChatBadge}>
                    <Text style={styles.freeChatBadgeText}>FREE</Text>
                  </View>
                ) : null}
                {item.isPrepaidOffer ? (
                  <View style={styles.prepaidBadge}>
                    <Text style={styles.prepaidBadgeText}>PREPAID</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ')}
            </Text>
          </View>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{formatDate()}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{formatTime()}</Text>
          </View>
          {formatDuration() ? (
            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{formatDuration()}</Text>
            </View>
          ) : null}
          {(item.totalAmount && item.totalAmount > 0) ? (
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={16} color="#666" />
              <Text style={styles.detailText}>₹{parseFloat(item.totalAmount).toFixed(0)}</Text>
            </View>
          ) : null}
        </View>
        
        {/* Join Button for accepted bookings */}
        {canJoin ? (
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => handleJoinSession(item)}
          >
            <Ionicons name="videocam" size={20} color="#fff" style={styles.joinButtonIcon} />
            <Text style={styles.joinButtonText}>Join Session</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        ) : item.status === 'completed' && item.type === 'chat' && item.sessionId ? (
          // Show Chat History button for completed chat consultations
          <View style={styles.completedChatActions}>
            <TouchableOpacity 
              style={styles.chatHistoryButton}
              onPress={() => handleViewChatHistory(item)}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#4A90E2" />
              <Text style={styles.chatHistoryButtonText}>View Chat History</Text>
            </TouchableOpacity>
            {!item.rated ? (
              <TouchableOpacity 
                style={styles.rateButton}
                onPress={() => {
                  // Validate booking before navigating to rating
                  if (!item._id) {
                    Alert.alert('Error', 'This booking cannot be rated at this time.');
                    return;
                  }
                  navigation.navigate('Rating', { bookingId: item._id });
                }}
              >
                <Ionicons name="star-outline" size={18} color="#FF9500" />
                <Text style={styles.rateButtonText}>Rate</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.actionContainer}>
            <Text style={styles.actionText}>
              {getActionButtonText(item)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </View>
        )}
      </View>
    );
  };

  const renderTabButton = (tabKey, title, count) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabKey && styles.activeTabButton]}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={[styles.tabText, activeTab === tabKey && styles.activeTabText]}>
        {title}
      </Text>
      {count > 0 ? (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{count}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const filteredBookings = getFilteredBookings();
  const allCount = bookings.length;
  const activeCount = bookings.filter(b => ['pending', 'confirmed', 'waiting_for_user', 'in-progress'].includes(b.status)).length;
  const completedCount = bookings.filter(b => ['completed', 'no_show'].includes(b.status)).length;
  const cancelledCount = bookings.filter(b => ['cancelled', 'rejected', 'expired'].includes(b.status)).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.contentWrapper}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Bookings</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('all', 'All', allCount)}
        {renderTabButton('active', 'Active', activeCount)}
        {renderTabButton('completed', 'Completed', completedCount)}
        {renderTabButton('cancelled', 'Cancelled', cancelledCount)}
      </View>

      {(loading && !refreshing) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item, index) => item._id || `booking-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeTab === 'all' ? 'No bookings yet' :
                 activeTab === 'active' ? 'No active bookings' :
                 activeTab === 'completed' ? 'No completed bookings' :
                 activeTab === 'cancelled' ? 'No cancelled bookings' : 'No bookings'}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeTab === 'all' ? 'Book a consultation to get started' :
                 activeTab === 'active' ? 'Book a consultation to get started' :
                 activeTab === 'completed' ? 'Completed sessions will appear here' :
                 activeTab === 'cancelled' ? 'Cancelled bookings will appear here' : 'Book a consultation to get started'}
              </Text>
            </View>
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500, // Responsive max width for tablets
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    padding: 16,
    paddingTop: 8, // SafeAreaView now handles safe area properly
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    padding: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#333',
    fontWeight: 'bold',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5722',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: {
    fontSize: 12,
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  listContainer: {
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
  freeChatBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  freeChatBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  prepaidBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  prepaidBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
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
    color: '#F97316',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonIcon: {
    marginRight: 8,
  },
  joinButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  completedChatActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
  },
  chatHistoryButton: {
    flex: 1,
    backgroundColor: '#f0f8ff',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  chatHistoryButtonText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '600',
    marginLeft: 6,
  },
  rateButton: {
    flex: 1,
    backgroundColor: '#fff8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  rateButtonText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
    marginLeft: 6,
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
});

export default BookingScreen;
