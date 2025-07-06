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
import { astrologersAPI, walletAPI } from '../../services/api';
import BookingAcceptedModal from '../../components/BookingAcceptedModal';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [astrologers, setAstrologers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showBookingAcceptedModal, setShowBookingAcceptedModal] = useState(false);
  const [bookingAcceptedData, setBookingAcceptedData] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loadingPendingBookings, setLoadingPendingBookings] = useState(false);

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

  // Fetch user pending bookings
  const fetchUserPendingBookings = useCallback(async () => {
    if (!socket) {
      console.log('Socket not available for fetching pending bookings');
      return;
    }

    try {
      setLoadingPendingBookings(true);
      console.log('🔄 Fetching user pending bookings...');
      
      // Emit socket event to get user pending bookings
      socket.emit('get_user_pending_bookings', {}, (response) => {
        if (response && response.success) {
          console.log('✅ User pending bookings fetched:', response.pendingBookings);
          setPendingBookings(response.pendingBookings || []);
        } else {
          console.error('❌ Failed to fetch user pending bookings:', response?.message);
          setPendingBookings([]);
        }
        setLoadingPendingBookings(false);
      });
    } catch (error) {
      console.error('❌ Error fetching user pending bookings:', error);
      setPendingBookings([]);
      setLoadingPendingBookings(false);
    }
  }, [socket]);

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
      // Refresh the list by reloading initial data
      await loadInitialData();
    } catch (error) {
      console.error('HomeScreen: Error dismissing consultation:', error);
      Alert.alert('Error', 'Failed to dismiss consultation. Please try again.');
    }
  }, []);

  // Handle user pending booking updates
  const handleUserPendingBookingUpdates = useCallback((data) => {
    console.log('📢 User pending booking update received:', data);
    setPendingBookings(data.pendingBookings || []);
  }, []);

  // Handle join session from pending booking
  const handleJoinSession = useCallback(async (booking) => {
    try {
      console.log('HomeScreen: Joining session from pending booking:', booking);
      
      // Navigate based on consultation type
      if (booking.type === 'video') {
        navigation.navigate('VideoConsultation', {
          sessionId: booking.sessionId,
          bookingId: booking.bookingId,
          astrologerId: booking.astrologer._id,
          userId: user._id || user.id
        });
      } else if (booking.type === 'voice') {
        Alert.alert(
          'Voice Call Ready! 📞',
          'Your voice consultation is ready. You should receive a phone call shortly from our system. Please answer the call to connect with the astrologer.',
          [{ text: 'OK' }]
        );
      } else if (booking.type === 'chat') {
        navigation.navigate('EnhancedChat', {
          sessionId: booking.sessionId,
          bookingId: booking.bookingId,
          astrologerId: booking.astrologer._id,
          userId: user._id || user.id
        });
      }
    } catch (error) {
      console.error('HomeScreen: Error joining session:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    }
  }, [navigation, user]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    await Promise.all([
      fetchAstrologers(),
      fetchWalletBalance(),
      fetchUserPendingBookings()
    ]);
  }, [fetchAstrologers, fetchWalletBalance, fetchUserPendingBookings]);

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
      // Get astrologer details for proper display
      let astrologerInfo = {
        name: 'Professional Astrologer', // Default fallback
        image: null
      };
      
      console.log('🔍 [USER-APP] Booking accepted - retrieving astrologer details:', {
        astrologerId: data.astrologerId,
        astrologerName: data.astrologerName,
        localAstrologersCount: astrologers.length
      });
      
      // Try multiple sources to get astrologer details
      if (data.astrologerId) {
        try {
          // First check if astrologer is in local state
          const localAstrologer = astrologers.find(a => a._id === data.astrologerId);
          if (localAstrologer) {
            console.log('✅ [USER-APP] Found astrologer in local state:', localAstrologer.displayName);
            astrologerInfo.name = localAstrologer.displayName || localAstrologer.name || astrologerInfo.name;
            astrologerInfo.image = localAstrologer.imageUrl;
          } else {
            console.log('⚠️ [USER-APP] Astrologer not in local state, fetching from API');
            // Fetch from API if not in local state
            const astrologerResponse = await astrologersAPI.getById(data.astrologerId);
            if (astrologerResponse && astrologerResponse.data) {
              console.log('✅ [USER-APP] Fetched astrologer from API:', astrologerResponse.data.displayName);
              astrologerInfo.name = astrologerResponse.data.displayName || astrologerResponse.data.name || astrologerInfo.name;
              astrologerInfo.image = astrologerResponse.data.imageUrl;
            } else {
              console.log('❌ [USER-APP] Failed to fetch astrologer from API');
            }
          }
        } catch (error) {
          console.error('❌ [USER-APP] Error fetching astrologer details:', error);
          // Use fallback values
        }
      }
      
      // Final fallback: use data.astrologerName if we still don't have a proper name
      if (astrologerInfo.name === 'Professional Astrologer' && data.astrologerName) {
        console.log('🔄 [USER-APP] Using astrologerName from event data:', data.astrologerName);
        astrologerInfo.name = data.astrologerName;
      }
      
      console.log('📋 [USER-APP] Final astrologer info:', astrologerInfo);
      
      // For voice calls, show different message since Exotel will handle the call
      if (data.consultationType === 'voice' || data.bookingType === 'voice') {
        Alert.alert(
          'Voice Call Accepted! 📞',
          `Your voice consultation with ${astrologerInfo.name} has been accepted! You will receive a phone call shortly from our system. Please answer the call to connect with the astrologer.`,
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
        // Consultation data added to pending list
        
        // Note: Exotel call initiation is handled by backend automatically
        // User will receive actual phone call, no need to navigate to WebRTC screen
        return;
      }
      
      // For video and chat, show custom modal with astrologer details
      setBookingAcceptedData({
        astrologerName: astrologerInfo.name,
        astrologerImage: astrologerInfo.image,
        bookingType: data.consultationType || data.bookingType,
        sessionId: data.sessionId,
        bookingId: data.bookingId,
        astrologerId: data.astrologerId,
        userInfo: data.userInfo
      });
      setShowBookingAcceptedModal(true);
      
      // Add to pending consultations for later access
      const consultationData = {
        booking: {
          _id: data.bookingId,
          type: data.consultationType || data.bookingType,
          astrologer: data.astrologer,
          userInfo: data.userInfo
        },
        sessionId: data.sessionId,
        astrologerId: data.astrologerId
      };
      
      // Store in pending consultations
      await addPendingConsultation(consultationData);
      
      // Consultation data added to pending list
    } else if (data.status === 'rejected') {
      Alert.alert(
        'Booking Declined',
        `Your ${data.bookingType || 'consultation'} request was declined by the astrologer.`,
        [{ text: 'OK' }]
      );
    }
  }, [navigation, user]);

  // Handle custom booking accepted modal actions
  const handleJoinNow = useCallback(() => {
    if (!bookingAcceptedData) return;
    
    setShowBookingAcceptedModal(false);
    
    // Navigate to appropriate consultation screen
    if (bookingAcceptedData.bookingType === 'video') {
      navigation.navigate('VideoConsultation', {
        sessionId: bookingAcceptedData.sessionId,
        bookingId: bookingAcceptedData.bookingId,
        astrologerId: bookingAcceptedData.astrologerId,
        userId: user._id || user.id
      });
    } else if (bookingAcceptedData.bookingType === 'chat') {
      navigation.navigate('EnhancedChat', {
        sessionId: bookingAcceptedData.sessionId,
        bookingId: bookingAcceptedData.bookingId,
        astrologerId: bookingAcceptedData.astrologerId,
        userId: user._id || user.id,
        userInfo: bookingAcceptedData.userInfo
      });
    }
  }, [bookingAcceptedData, navigation, user]);
  
  const handleCloseModal = useCallback(() => {
    setShowBookingAcceptedModal(false);
    setBookingAcceptedData(null);
  }, []);

  // Handle legacy booking accepted event for backward compatibility
  const handleBookingAccepted = useCallback(async (data) => {
    console.log('📢 [USER-APP] Legacy booking accepted event received:', data);
    
    // Instead of showing a separate alert, use the modern BookingAcceptedModal
    // Try to get astrologer details for proper display
    let astrologerInfo = {
      name: 'Professional Astrologer', // Default fallback
      image: null
    };
    
    console.log('🔍 [USER-APP] Legacy booking - retrieving astrologer details:', {
      astrologerId: data.astrologerId,
      astrologerName: data.astrologerName,
      localAstrologersCount: astrologers.length
    });
    
    // Try multiple sources to get astrologer details
    if (data.astrologerId) {
      try {
        // First check if astrologer is in local state
        const localAstrologer = astrologers.find(a => a._id === data.astrologerId);
        if (localAstrologer) {
          console.log('✅ [USER-APP] Found astrologer in local state (legacy):', localAstrologer.displayName);
          astrologerInfo.name = localAstrologer.displayName || localAstrologer.name || astrologerInfo.name;
          astrologerInfo.image = localAstrologer.imageUrl;
        } else {
          console.log('⚠️ [USER-APP] Astrologer not in local state, fetching from API (legacy)');
          // Fetch from API if not in local state
          const astrologerResponse = await astrologersAPI.getById(data.astrologerId);
          if (astrologerResponse && astrologerResponse.data) {
            console.log('✅ [USER-APP] Fetched astrologer from API (legacy):', astrologerResponse.data.displayName);
            astrologerInfo.name = astrologerResponse.data.displayName || astrologerResponse.data.name || astrologerInfo.name;
            astrologerInfo.image = astrologerResponse.data.imageUrl;
          } else {
            console.log('❌ [USER-APP] Failed to fetch astrologer from API (legacy)');
          }
        }
      } catch (error) {
        console.error('❌ [USER-APP] Error fetching astrologer details for legacy booking:', error);
        // Use fallback values
      }
    }
    
    // Final fallback: use data.astrologerName if we still don't have a proper name
    if (astrologerInfo.name === 'Professional Astrologer' && data.astrologerName) {
      console.log('🔄 [USER-APP] Using astrologerName from legacy event data:', data.astrologerName);
      astrologerInfo.name = data.astrologerName;
    }
    
    console.log('📋 [USER-APP] Final astrologer info (legacy):', astrologerInfo);
    
    // Use the modern BookingAcceptedModal
    setBookingAcceptedData({
      astrologerName: astrologerInfo.name,
      astrologerImage: astrologerInfo.image,
      bookingType: data.consultationType || data.type || 'chat', // Default to chat if unknown
      sessionId: data.sessionId,
      bookingId: data.bookingId,
      astrologerId: data.astrologerId,
      userInfo: data.userInfo
    });
    setShowBookingAcceptedModal(true);
  }, [astrologers, navigation, user]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (socket) {
      console.log('🔌 Setting up socket listeners in HomeScreen');
      
      // Listen for astrologer status updates
      socket.on('astrologer_status_updated', handleAstrologerStatusUpdate);
      
      // Listen for booking status updates (acceptance/rejection)
      socket.on('booking_status_update', handleBookingStatusUpdate);
      
      // Listen for user pending booking updates
      socket.on('user_pending_bookings_updated', handleUserPendingBookingUpdates);
      
      // DISABLED: Legacy booking accepted event - now handled by modern BookingAcceptedPopup
      // socket.on('booking_accepted', handleBookingAccepted);
      
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
        socket.off('user_pending_bookings_updated', handleUserPendingBookingUpdates);
        // socket.off('booking_accepted', handleBookingAccepted); // Disabled - legacy listener
        socket.off('booking_rejected');
        socket.off('voice_call_initiated');
        socket.off('voice_call_failed');
      };
    }
  }, [socket, handleAstrologerStatusUpdate, handleBookingStatusUpdate, handleBookingAccepted, handleUserPendingBookingUpdates]);

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



  // Get status outline color based on astrologer status
  const getStatusOutlineColor = (status) => {
    switch (status) {
      case 'online':
        return '#4CAF50'; // Green
      case 'busy':
        return '#FFD700'; // Yellow
      case 'offline':
      default:
        return '#9E9E9E'; // Grey
    }
  };

  // Render astrologer card
  const renderAstrologerCard = ({ item }) => (
    <TouchableOpacity
      style={styles.astrologerCard}
      onPress={() => navigation.navigate('AstrologerProfile', { astrologer: item })}
    >
      <View style={[
        styles.astrologerImageContainer,
        {
          borderColor: getStatusOutlineColor(item.status),
        }
      ]}>
        <Image
          source={{ 
            uri: item.imageUrl || item.profileImage || 'https://via.placeholder.com/80x80?text=No+Image' 
          }}
          style={styles.astrologerImage}
        />
      </View>
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
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render pending booking card
  const renderPendingBookingCard = ({ item }) => {
    const booking = item.data;
    const isAccepted = booking.status === 'accepted';
    const isExpired = booking.status === 'expired' || booking.status === 'cancelled';
    
    // Don't render expired or cancelled bookings
    if (isExpired) {
      return null;
    }

    const getStatusMessage = () => {
      if (isAccepted) {
        return 'Booking Accepted - Ready to Join!';
      }
      return 'Waiting for astrologer response...';
    };

    const getStatusColor = () => {
      if (isAccepted) {
        return '#10B981'; // Green for accepted
      }
      return '#F59E0B'; // Orange for pending
    };

    const getConsultationTypeIcon = () => {
      switch (booking.type) {
        case 'video':
          return 'videocam';
        case 'voice':
          return 'call';
        case 'chat':
          return 'chatbubble';
        default:
          return 'help-circle';
      }
    };

    return (
      <View style={styles.pendingBookingCard}>
        <View style={styles.pendingBookingHeader}>
          <View style={styles.astrologerInfo}>
            <Image
              source={{
                uri: booking.astrologer?.image || 'https://via.placeholder.com/50x50.png?text=A'
              }}
              style={styles.pendingAstrologerImage}
            />
            <View style={styles.pendingAstrologerDetails}>
              <Text style={styles.pendingAstrologerName}>
                {booking.astrologer?.name || 'Professional Astrologer'}
              </Text>
              <View style={styles.consultationTypeContainer}>
                <Ionicons 
                  name={getConsultationTypeIcon()} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={styles.consultationType}>
                  {booking.type?.charAt(0).toUpperCase() + booking.type?.slice(1)} Consultation
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.pendingBookingStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusMessage, { color: getStatusColor() }]}>
            {getStatusMessage()}
          </Text>
        </View>

        {isAccepted && (
          <TouchableOpacity
            style={styles.joinSessionButton}
            onPress={() => handleJoinSession(booking)}
          >
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.joinSessionText}>Join Session</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Note: renderAstrologersSection removed - now handled in single FlatList



  // Prepare data for single FlatList
  const getFlatListData = () => {
    const data = [
      { type: 'header', id: 'header' }
    ];

    // Add pending bookings section if there are any
    const activePendingBookings = pendingBookings.filter(booking => 
      booking.status !== 'expired' && booking.status !== 'cancelled'
    );
    
    if (activePendingBookings.length > 0) {
      data.push({ type: 'pendingBookingsHeader', id: 'pendingBookingsHeader' });
      data.push(...activePendingBookings.map((booking, index) => ({
        type: 'pendingBooking',
        id: `pending_booking_${booking.bookingId || booking._id || index}`,
        data: booking
      })));
    }

    // Add astrologers section
    data.push({ type: 'astrologersHeader', id: 'astrologersHeader' });
    data.push(...astrologers.map((astrologer, index) => ({
      type: 'astrologer',
      id: `astrologer_${astrologer._id || astrologer.id || index}`,
      data: astrologer
    })));
    
    return data;
  };

  // Render different item types
  const renderFlatListItem = ({ item }) => {
    switch (item.type) {
      case 'header':
        return renderHeader();
      case 'pendingBookingsHeader':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Booking Requests ({pendingBookings.filter(b => b.status !== 'expired' && b.status !== 'cancelled').length})</Text>
              <View style={styles.pendingBookingsIndicator}>
                <View style={styles.pulsingDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
          </View>
        );
      case 'pendingBooking':
        return renderPendingBookingCard({ item });
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
      
      {/* DISABLED: Legacy BookingAcceptedModal - now using modern BookingAcceptedPopup */}
      {/*
      <BookingAcceptedModal
        visible={showBookingAcceptedModal}
        onClose={handleCloseModal}
        onJoinNow={handleJoinNow}
        astrologerName={bookingAcceptedData?.astrologerName}
        astrologerImage={bookingAcceptedData?.astrologerImage}
        bookingType={bookingAcceptedData?.bookingType}
      />
      */}
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
  astrologerImageContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
  // Pending Booking Styles
  pendingBookingsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
    opacity: 0.8,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  pendingBookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  pendingBookingHeader: {
    marginBottom: 12,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingAstrologerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  pendingAstrologerDetails: {
    flex: 1,
  },
  pendingAstrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  consultationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultationType: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  pendingBookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusMessage: {
    fontSize: 14,
    fontWeight: '500',
  },
  joinSessionButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  joinSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default HomeScreen;
