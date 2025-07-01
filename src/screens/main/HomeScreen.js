import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import BookingCard from '../../components/BookingCard';
import { 
  getPendingConsultations, 
  removePendingConsultation,
  addPendingConsultation 
} from '../../utils/pendingConsultationsStore';
import { astrologersAPI, walletAPI } from '../../services/api';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [pendingConsultations, setPendingConsultations] = useState([]);
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Fetch all astrologers data with pagination
  const fetchAstrologers = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching all astrologers from real backend...');
      
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

  // Fetch pending consultations
  const fetchPendingConsultations = useCallback(async () => {
    try {
      setLoadingConsultations(true);
      const consultations = await getPendingConsultations();
      console.log('HomeScreen: Fetched consultations:', consultations);
      setPendingConsultations(consultations);
    } catch (error) {
      console.error('HomeScreen: Error fetching consultations:', error);
    } finally {
      setLoadingConsultations(false);
    }
  }, []);

  // Fetch wallet balance
  const fetchWalletBalance = useCallback(async () => {
    try {
      setLoadingWallet(true);
      console.log('🔄 Fetching wallet balance...');
      const response = await walletAPI.getBalance();
      console.log('💰 Wallet balance response:', response);
      
      if (response.success && response.data) {
        setWalletBalance(response.data.balance || 0);
        console.log('✅ Wallet balance updated:', response.data.balance);
      } else {
        console.warn('⚠️ Wallet API returned success: false or no data');
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error);
      // Don't show alert for wallet errors, just set balance to 0
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  // Handle join consultation
  const handleJoinConsultation = useCallback(async (booking) => {
    try {
      console.log('HomeScreen: Joining consultation:', booking);
      
      // Navigate based on consultation type
      if (booking.type === 'video') {
        navigation.navigate('VideoConsultation', {
          sessionId: booking.sessionId || booking._id,
          bookingId: booking._id,
          astrologerId: booking.astrologerId,
          userId: user._id || user.id
        });
      } else if (booking.type === 'voice') {
        // For voice calls, show info about Exotel call instead of navigating to WebRTC screen
        Alert.alert(
          'Voice Call Ready! 📞',
          'Your voice consultation is ready. You should receive a phone call shortly from our system. Please answer the call to connect with the astrologer.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Optionally remove from pending consultations since user is aware
                console.log('User acknowledged voice call readiness');
              }
            }
          ]
        );
        
        // Note: No navigation to VoiceCall screen - Exotel handles the actual call
        // The backend should have already initiated the Exotel call when astrologer accepted
      } else if (booking.type === 'chat') {
        navigation.navigate('EnhancedChat', {
          sessionId: booking.sessionId || booking._id,
          bookingId: booking._id,
          astrologerId: booking.astrologerId,
          userId: user._id || user.id
        });
      }
    } catch (error) {
      console.error('HomeScreen: Error joining consultation:', error);
      Alert.alert('Error', 'Failed to join consultation. Please try again.');
    }
  }, [navigation, user]);

  // Handle dismiss consultation
  const handleDismissConsultation = useCallback(async (bookingId) => {
    try {
      console.log('HomeScreen: Dismissing consultation:', bookingId);
      await removePendingConsultation(bookingId);
      await fetchPendingConsultations(); // Refresh the list
    } catch (error) {
      console.error('HomeScreen: Error dismissing consultation:', error);
      Alert.alert('Error', 'Failed to dismiss consultation. Please try again.');
    }
  }, [fetchPendingConsultations]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    await Promise.all([
      fetchAstrologers(),
      fetchPendingConsultations(),
      fetchWalletBalance()
    ]);
  }, [fetchAstrologers, fetchPendingConsultations, fetchWalletBalance]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  // Use focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
    }, [loadInitialData])
  );

  // Handle astrologer status updates
  const handleAstrologerStatusUpdate = useCallback((data) => {
    console.log('🔄 Astrologer status update received:', data);
    
    setAstrologers(prevAstrologers => 
      prevAstrologers.map(astrologer => 
        astrologer._id === data.astrologerId 
          ? { ...astrologer, status: data.status }
          : astrologer
      )
    );
  }, []);

  // Handle booking status updates (when astrologer accepts/rejects booking)
  const handleBookingStatusUpdate = useCallback(async (data) => {
    console.log('📢 Booking status update received:', data);
    
    if (data.status === 'accepted') {
      // For voice calls, show different message since Exotel will handle the call
      if (data.bookingType === 'voice') {
        Alert.alert(
          'Voice Call Accepted! 📞',
          `Your voice consultation with ${data.astrologerName} has been accepted! You will receive a phone call shortly from our system. Please answer the call to connect with the astrologer.`,
          [{ text: 'OK' }]
        );
        
        // Add to pending consultations for tracking
        const consultationData = {
          booking: {
            _id: data.bookingId,
            type: data.bookingType,
            astrologer: data.astrologer,
            userInfo: data.userInfo
          },
          sessionId: data.sessionId,
          astrologerId: data.astrologerId
        };
        
        await addPendingConsultation(consultationData);
        fetchPendingConsultations();
        
        // Note: Exotel call initiation is handled by backend automatically
        // User will receive actual phone call, no need to navigate to WebRTC screen
        return;
      }
      
      // For video and chat, show normal acceptance alert with navigation
      Alert.alert(
        'Booking Accepted! 🎉',
        `Your ${data.bookingType || 'consultation'} with ${data.astrologerName} has been accepted! Join now to start your session.`,
        [
          {
            text: 'Join Now',
            onPress: () => {
              // Navigate to appropriate consultation screen
              if (data.bookingType === 'video') {
                navigation.navigate('VideoConsultation', {
                  sessionId: data.sessionId,
                  bookingId: data.bookingId,
                  astrologerId: data.astrologerId,
                  userId: user._id || user.id
                });
              } else if (data.bookingType === 'chat') {
                navigation.navigate('EnhancedChat', {
                  sessionId: data.sessionId,
                  bookingId: data.bookingId,
                  astrologerId: data.astrologerId,
                  userId: user._id || user.id,
                  userInfo: data.userInfo
                });
              }
            }
          },
          {
            text: 'Later',
            style: 'cancel'
          }
        ]
      );
      
      // Add to pending consultations for later access
      const consultationData = {
        booking: {
          _id: data.bookingId,
          type: data.bookingType,
          astrologer: data.astrologer,
          userInfo: data.userInfo
        },
        sessionId: data.sessionId,
        astrologerId: data.astrologerId
      };
      
      // Store in pending consultations
      await addPendingConsultation(consultationData);
      
      // Refresh pending consultations display
      fetchPendingConsultations();
    } else if (data.status === 'rejected') {
      Alert.alert(
        'Booking Declined',
        `Your ${data.bookingType || 'consultation'} request was declined by the astrologer.`,
        [{ text: 'OK' }]
      );
    }
  }, [navigation, user, fetchPendingConsultations]);

  // Handle legacy booking accepted event for backward compatibility
  const handleBookingAccepted = useCallback(async (data) => {
    console.log('📢 Legacy booking accepted event received:', data);
    
    // Show notification alert
    Alert.alert(
      'Booking Accepted! 🎉',
      data.message || 'Your booking has been accepted! Join now to start your session.',
      [
        {
          text: 'Join Now',
          onPress: () => {
            // Navigate to appropriate consultation screen based on booking type
            // Since legacy event might not have type, we'll need to check the booking
            navigation.navigate('Home'); // Refresh home to show pending consultations
          }
        },
        {
          text: 'Later',
          style: 'cancel'
        }
      ]
    );
    
    // Refresh pending consultations
    fetchPendingConsultations();
  }, [navigation, fetchPendingConsultations]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (socket) {
      console.log('🔌 Setting up socket listeners in HomeScreen');
      
      // Listen for astrologer status updates
      socket.on('astrologer_status_updated', handleAstrologerStatusUpdate);
      
      // Listen for booking status updates (acceptance/rejection)
      socket.on('booking_status_update', handleBookingStatusUpdate);
      
      // Listen for legacy booking accepted event
      socket.on('booking_accepted', handleBookingAccepted);
      
      // Listen for booking rejected event
      socket.on('booking_rejected', (data) => {
        console.log('📢 Booking rejected event received:', data);
        Alert.alert(
          'Booking Declined',
          data.message || 'Your booking request was declined.',
          [{ text: 'OK' }]
        );
      });
      
      // Listen for Exotel voice call events
      socket.on('voice_call_initiated', (data) => {
        console.log('📞 Voice call initiated:', data);
        Alert.alert(
          'Voice Call Connecting! 📞',
          `Your call is being connected. You will receive a phone call shortly. Please answer to connect with ${data.astrologerName || 'the astrologer'}.`,
          [{ text: 'OK' }]
        );
      });
      
      socket.on('voice_call_failed', (data) => {
        console.log('❌ Voice call failed:', data);
        Alert.alert(
          'Voice Call Failed',
          data.message || 'Unable to initiate voice call. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      });
      
      // Cleanup listeners on unmount
      return () => {
        console.log('🔌 Cleaning up socket listeners in HomeScreen');
        socket.off('astrologer_status_updated', handleAstrologerStatusUpdate);
        socket.off('booking_status_update', handleBookingStatusUpdate);
        socket.off('booking_accepted', handleBookingAccepted);
        socket.off('booking_rejected');
        socket.off('voice_call_initiated');
        socket.off('voice_call_failed');
      };
    }
  }, [socket, handleAstrologerStatusUpdate, handleBookingStatusUpdate, handleBookingAccepted]);

  // Render booking card
  const renderBookingCard = ({ item }) => (
    <BookingCard
      booking={item}
      onJoin={() => handleJoinConsultation(item)}
      onDismiss={() => handleDismissConsultation(item._id)}
    />
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>
            Welcome back, {user?.name || 'User'}!
          </Text>
          <Text style={styles.subGreeting}>
            Find your perfect astrologer
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.walletContainer}
            onPress={() => navigation.navigate('Wallet')}
          >
            <View style={styles.walletContent}>
              <Ionicons name="wallet-outline" size={16} color="#F97316" />
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Wallet</Text>
                <Text style={styles.walletBalance}>
                  {loadingWallet ? '...' : `₹${walletBalance.toFixed(2)}`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-circle-outline" size={32} color="#F97316" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Render pending consultations section
  const renderPendingConsultations = () => {
    if (loadingConsultations && pendingConsultations.length === 0) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ready to Joinn</Text>
          <ActivityIndicator size="small" color="#F97316" style={styles.loadingIndicator} />
        </View>
      );
    }

    if (pendingConsultations.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ready to Join</Text>
        <FlatList
          data={pendingConsultations}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item._id || item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.consultationsList}
        />
      </View>
    );
  };

  // Render astrologer card
  const renderAstrologerCard = ({ item }) => (
    <TouchableOpacity
      style={styles.astrologerCard}
      onPress={() => navigation.navigate('AstrologerProfile', { astrologer: item })}
    >
      <Image
        source={{ 
          uri: item.imageUrl || item.profileImage || 'https://via.placeholder.com/80x80?text=No+Image' 
        }}
        style={styles.astrologerImage}
      />
      <View style={styles.astrologerInfo}>
        <Text style={styles.astrologerName}>{item.displayName || item.name}</Text>
        <Text style={styles.astrologerSpecialty}>
          {item.specialties?.join(', ') || item.specializations?.join(', ') || 'Astrologer'}
        </Text>
        <View style={styles.ratingContainer}>
          <FontAwesome name="star" size={14} color="#FFD700" />
          <Text style={styles.rating}>
            {item.rating?.average ? item.rating.average.toFixed(1) : '4.5'}
          </Text>
          <Text style={styles.experience}>• {item.experience || '5'}+ years</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{item.consultationPrices?.video || item.consultationPrices?.call || item.consultationPrices?.chat || '50'}/min</Text>
          <View style={[
            styles.statusDot, 
            { 
              backgroundColor: 
                item.status === 'online' ? '#4CAF50' : 
                item.status === 'busy' ? '#FF9800' : '#9E9E9E' 
            }
          ]} />
          <Text style={[
            styles.status, 
            { 
              color: 
                item.status === 'online' ? '#4CAF50' : 
                item.status === 'busy' ? '#FF9800' : '#9E9E9E' 
            }
          ]}>
            {item.status === 'online' ? 'Online' : 
             item.status === 'busy' ? 'Busy' : 'Offline'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Note: renderAstrologersSection removed - now handled in single FlatList

  // Render quick actions
  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Astrologers')}
        >
          <View style={styles.actionIcon}>
            <FontAwesome name="star" size={24} color="#F97316" />
          </View>
          <Text style={styles.actionTitle}>Find Astrologer</Text>
          <Text style={styles.actionSubtitle}>Browse experts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Wallet')}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="wallet-outline" size={24} color="#F97316" />
          </View>
          <Text style={styles.actionTitle}>My Wallet</Text>
          <Text style={styles.actionSubtitle}>Add money</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Bookings')}
        >
          <View style={styles.actionIcon}>
            <MaterialIcons name="history" size={24} color="#F97316" />
          </View>
          <Text style={styles.actionTitle}>My Bookings</Text>
          <Text style={styles.actionSubtitle}>View history</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Prepare data for single FlatList
  const getFlatListData = () => {
    const data = [
      { type: 'header', id: 'header' },
      { type: 'pendingConsultations', id: 'pendingConsultations' },
      { type: 'quickActions', id: 'quickActions' },
      { type: 'astrologersHeader', id: 'astrologersHeader' },
      ...astrologers.map((astrologer, index) => ({
        type: 'astrologer',
        id: `astrologer_${astrologer._id || astrologer.id || index}`,
        data: astrologer
      }))
    ];
    return data;
  };

  // Render different item types
  const renderFlatListItem = ({ item }) => {
    switch (item.type) {
      case 'header':
        return renderHeader();
      case 'pendingConsultations':
        return renderPendingConsultations();
      case 'quickActions':
        return renderQuickActions();
      case 'astrologersHeader':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Astrologers ({astrologers.length})</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Astrologers')}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>Detailed View</Text>
                <Ionicons name="chevron-forward" size={16} color="#F97316" />
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'astrologer':
        return renderAstrologerCard({ item: item.data });
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <FlatList
        data={getFlatListData()}
        keyExtractor={(item) => item.id}
        renderItem={renderFlatListItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContent}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flatListContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  walletContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletInfo: {
    marginLeft: 8,
  },
  walletLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: 'bold',
  },
  profileButton: {
    padding: 8,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  consultationsList: {
    paddingRight: 20,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    marginRight: 4,
  },
  astrologerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  astrologerInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  astrologerSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  experience: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F97316',
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HomeScreen;
