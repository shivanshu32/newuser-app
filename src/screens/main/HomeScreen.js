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
  Modal,
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
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
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

  // Handle session end events to clean up pending bookings
  const handleSessionEnd = useCallback((data) => {
    console.log('🔚 Session end event received:', data);
    
    // Remove the booking from pending bookings when session ends
    if (data.bookingId || data.sessionId) {
      setPendingBookings(prevBookings => {
        const filteredBookings = prevBookings.filter(booking => {
          const shouldRemove = booking.bookingId === data.bookingId || 
                              booking._id === data.bookingId ||
                              booking.sessionId === data.sessionId;
          
          if (shouldRemove) {
            console.log('✅ Removing completed booking from pending list:', {
              bookingId: booking.bookingId || booking._id,
              sessionId: booking.sessionId
            });
          }
          
          return !shouldRemove;
        });
        
        console.log('📊 Pending bookings after session end cleanup:', {
          before: prevBookings.length,
          after: filteredBookings.length,
          removed: prevBookings.length - filteredBookings.length
        });
        
        return filteredBookings;
      });
    }
  }, []);

  // Handle cancel booking request
  const handleCancelBooking = useCallback((booking) => {
    console.log('🚫 Cancel booking requested:', booking);
    setBookingToCancel(booking);
    setShowCancelConfirmModal(true);
  }, []);

  // Confirm cancel booking
  const confirmCancelBooking = useCallback(async () => {
    if (!bookingToCancel || !socket) {
      console.error('❌ Cannot cancel booking - missing booking data or socket connection');
      return;
    }

    try {
      // Extract astrologer ID from the booking object structure
      const astrologerId = bookingToCancel.astrologer?._id || bookingToCancel.astrologerId || bookingToCancel.astrologer;
      const bookingId = bookingToCancel.bookingId || bookingToCancel._id;
      
      console.log('🚫 Confirming booking cancellation:', {
        bookingId,
        astrologerId,
        bookingStructure: {
          hasAstrologer: !!bookingToCancel.astrologer,
          astrologerType: typeof bookingToCancel.astrologer,
          hasAstrologerId: !!bookingToCancel.astrologerId
        }
      });
      
      if (!astrologerId) {
        console.error('❌ Cannot cancel booking: astrologerId not found in booking object');
        Alert.alert(
          'Error',
          'Unable to cancel booking. Please try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Emit cancel booking event to backend
      socket.emit('cancel_booking', {
        bookingId,
        astrologerId,
        reason: 'user_cancelled'
      });

      // Immediately remove from local state for instant UI feedback
      setPendingBookings(prevBookings => {
        const filteredBookings = prevBookings.filter(booking => {
          const bookingId = booking.bookingId || booking._id;
          const targetId = bookingToCancel.bookingId || bookingToCancel._id;
          return bookingId !== targetId;
        });
        
        console.log('✅ Booking removed from local state:', {
          before: prevBookings.length,
          after: filteredBookings.length
        });
        
        return filteredBookings;
      });

      // Close modal and reset state
      setShowCancelConfirmModal(false);
      setBookingToCancel(null);

      // Show success message
      Alert.alert(
        'Booking Cancelled',
        'Your booking request has been cancelled successfully. The astrologer has been notified.',
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      Alert.alert(
        'Error',
        'Failed to cancel booking. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [bookingToCancel, socket]);

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
    console.log('🔥🔥🔥 [HOMESCREEN] BOOKING STATUS UPDATE RECEIVED 🔥🔥🔥');
    console.log('📢 [DEBUG] Booking status update received:', JSON.stringify(data, null, 2));
    
    // Handle rejection first (before filtering out from state)
    if (data.status === 'rejected') {
      console.log('🔴 [DEBUG] Processing booking rejection:', data.bookingId);
      
      // Show rejection alert using backend message or fallback
      const rejectionMessage = data.message || 'Your consultation request was declined by the astrologer.';
      Alert.alert(
        'Booking Declined',
        rejectionMessage,
        [{ text: 'OK' }]
      );
    }
    
    // Update pending bookings state in real-time
    setPendingBookings(prevBookings => {
      console.log('📢 [DEBUG] Updating pending bookings, current count:', prevBookings.length);
      
      const updatedBookings = prevBookings.map(booking => {
        if (booking.bookingId === data.bookingId || booking._id === data.bookingId) {
          console.log('✅ [DEBUG] Found matching booking to update:', {
            bookingId: data.bookingId,
            oldStatus: booking.status,
            newStatus: data.status
          });
          
          return {
            ...booking,
            status: data.status,
            sessionId: data.sessionId || booking.sessionId,
            // Keep astrologer info for accepted bookings
            astrologer: booking.astrologer || data.astrologer
          };
        }
        return booking;
      }).filter(booking => {
        // Remove rejected, expired, or cancelled bookings from pending list
        const shouldRemove = ['rejected', 'expired', 'cancelled'].includes(booking.status);
        if (shouldRemove) {
          console.log('🗑️ [DEBUG] Removing booking from pending list:', {
            bookingId: booking.bookingId || booking._id,
            status: booking.status
          });
        }
        return !shouldRemove;
      });
      
      console.log('📊 [DEBUG] Pending bookings after update:', {
        before: prevBookings.length,
        after: updatedBookings.length,
        removed: prevBookings.length - updatedBookings.length
      });
      
      return updatedBookings;
    });
    
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
    console.log('🔌 [DEBUG] Socket useEffect triggered, socket available:', !!socket);
    console.log('🔌 [DEBUG] Socket connection state:', socket?.connected);
    
    if (socket) {
      const setupListeners = () => {
        console.log('🔌 Setting up socket listeners in HomeScreen (connected:', socket.connected, ')');
        
        // Remove any existing listeners first to avoid duplicates
        socket.off('astrologer_status_updated', handleAstrologerStatusUpdate);
        socket.off('booking_status_update', handleBookingStatusUpdate);
        socket.off('user_pending_bookings_updated', handleUserPendingBookingUpdates);
        socket.off('session_end', handleSessionEnd);
        socket.off('session_ended', handleSessionEnd);
        
        // Listen for astrologer status updates
        socket.on('astrologer_status_updated', handleAstrologerStatusUpdate);
        
        // Listen for booking status updates (acceptance/rejection)
        socket.on('booking_status_update', handleBookingStatusUpdate);
        
        // Listen for user pending booking updates
        socket.on('user_pending_bookings_updated', handleUserPendingBookingUpdates);
        
        // Listen for session end events to clean up pending bookings
        socket.on('session_end', handleSessionEnd);
        socket.on('session_ended', handleSessionEnd);
      };
      
      // Set up listeners immediately if already connected
      if (socket.connected) {
        setupListeners();
      } else {
        // Wait for connection and then set up listeners
        console.log('🔌 Socket not connected yet, waiting for connection...');
        socket.on('connect', setupListeners);
      }
      
      // Also listen for reconnection events
      socket.on('reconnect', setupListeners);
      
      // DISABLED: Legacy booking accepted event - now handled by modern BookingAcceptedPopup
      // socket.on('booking_accepted', handleBookingAccepted);
      
      // Listen for booking rejected event
      socket.on('booking_rejected', (data) => {
        console.log('📢 [DEBUG] Booking rejected event received:', JSON.stringify(data, null, 2));
        console.log('📢 [DEBUG] Event data bookingId:', data.bookingId);
        console.log('📢 [DEBUG] Event data type:', typeof data.bookingId);
        
        // Remove the rejected booking from pending bookings list for real-time UI update
        setPendingBookings(prevBookings => {
          console.log('📢 [DEBUG] Current pending bookings before filtering:', prevBookings.length);
          console.log('📢 [DEBUG] Pending bookings details:', prevBookings.map(b => ({
            id: b._id,
            bookingId: b.bookingId,
            astrologerId: b.astrologerId,
            status: b.status
          })));
          
          const filteredBookings = prevBookings.filter(booking => {
            const bookingId = booking.bookingId || booking._id;
            const shouldRemove = bookingId === data.bookingId || bookingId?.toString() === data.bookingId?.toString();
            
            console.log('📢 [DEBUG] Comparing booking:', {
              bookingInList: bookingId,
              bookingInListType: typeof bookingId,
              eventBookingId: data.bookingId,
              eventBookingIdType: typeof data.bookingId,
              shouldRemove: shouldRemove
            });
            
            if (shouldRemove) {
              console.log('✅ [DEBUG] FOUND MATCH - Removing rejected booking from pending list:', {
                bookingId: bookingId,
                astrologerId: booking.astrologerId,
                bookingType: booking.type
              });
            }
            
            return !shouldRemove;
          });
          
          console.log('📊 [DEBUG] Pending bookings after rejection removal:', {
            before: prevBookings.length,
            after: filteredBookings.length,
            removed: prevBookings.length - filteredBookings.length
          });
          
          if (prevBookings.length === filteredBookings.length) {
            console.warn('⚠️ [DEBUG] WARNING: No booking was removed! Possible ID mismatch.');
          }
          
          return filteredBookings;
        });
        
        // Show rejection alert
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
        socket.off('session_end', handleSessionEnd);
        socket.off('session_ended', handleSessionEnd);
        socket.off('connect', setupListeners);
        socket.off('reconnect', setupListeners);
        socket.off('booking_rejected');
        socket.off('voice_call_initiated');
        socket.off('voice_call_failed');
      };
    }
  }, [socket, handleAstrologerStatusUpdate, handleBookingStatusUpdate, handleUserPendingBookingUpdates, handleSessionEnd]);

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

  // Render astrologer card
  const renderAstrologerCard = ({ item }) => {
    // Determine status based on onlineStatus field
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

    const getStatusGradient = (astrologer) => {
      const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
      
      if (isOnline) {
        // Check if astrologer has legacy status field for busy state
        if (astrologer.status === 'busy') {
          return ['#F59E0B', '#D97706']; // Orange for busy
        }
        return ['#10B981', '#059669']; // Green for online
      }
      return ['#9CA3AF', '#6B7280']; // Grey for offline
    };

    return (
      <TouchableOpacity
        style={styles.astrologerCard}
        onPress={() => navigation.navigate('AstrologerProfile', { astrologer: item })}
        activeOpacity={0.8}
      >
        {/* Header Section with Image and Status */}
        <View style={styles.cardHeader}>
          <View style={styles.imageSection}>
            <View style={[
              styles.astrologerImageContainer,
              {
                borderColor: getStatusOutlineColor(item),
              }
            ]}>
              <Image
                source={{ 
                  uri: item.imageUrl || item.profileImage || 'https://via.placeholder.com/80x80?text=No+Image' 
                }}
                style={styles.astrologerImage}
              />
              {/* Status Badge */}
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusOutlineColor(item) }
              ]}>
                <View style={styles.statusDot} />
              </View>
            </View>
          </View>
          
          <View style={styles.astrologerMainInfo}>
            <View style={styles.nameAndStatus}>
              <Text style={styles.astrologerName} numberOfLines={1}>
                {item.displayName || item.name}
              </Text>
              <View style={[
                styles.statusChip,
                { backgroundColor: getStatusOutlineColor(item) + '20' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusOutlineColor(item) }
                ]}>
                  {getStatusText(item)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.astrologerSpecialty} numberOfLines={2}>
              {item.specialties?.join(', ') || item.specializations?.join(', ') || 'Vedic Astrology, Numerology'}
            </Text>
            
            {/* Enhanced Rating Section */}
            <View style={styles.ratingSection}>
              <View style={styles.ratingContainer}>
                <View style={styles.starContainer}>
                  <FontAwesome name="star" size={16} color="#FFD700" />
                  <Text style={styles.rating}>
                    {item.rating?.average ? item.rating.average.toFixed(1) : '4.8'}
                  </Text>
                </View>
                <Text style={styles.reviewCount}>
                  ({item.rating?.count || '150'} reviews)
                </Text>
              </View>
              <Text style={styles.experience}>{item.experience || '8'}+ years exp</Text>
            </View>
          </View>
        </View>

        {/* Price and Quick Actions Section */}
        <View style={styles.cardFooter}>
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Chat starting from</Text>
            <Text style={styles.price}>
              ₹{item.consultationPrices?.chat || '50'}/min
            </Text>
          </View>
          
          {/* Quick Action Buttons - Dynamic visibility based on onlineStatus */}
          <View style={styles.quickActions}>
            {/* Show Chat button only if onlineStatus.chat === 1 and consultationPrices.chat exists */}
            {item.onlineStatus?.chat === 1 && item.consultationPrices?.chat && (
              <TouchableOpacity 
                style={[styles.quickActionBtn, styles.chatBtn]}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('AstrologerProfile', { astrologer: item });
                }}
              >
                <Ionicons name="chatbubble" size={16} color="#10B981" />
              </TouchableOpacity>
            )}
            {/* Show Call button only if onlineStatus.call === 1 and consultationPrices.call exists */}
            {item.onlineStatus?.call === 1 && item.consultationPrices?.call && (
              <TouchableOpacity 
                style={[styles.quickActionBtn, styles.callBtn]}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('AstrologerProfile', { astrologer: item });
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

        <View style={styles.pendingBookingActions}>
          {/* Cancel Button - Show if booking is pending or accepted and session hasn't started */}
          {(booking.status === 'pending' || (booking.status === 'accepted' && !booking.sessionStarted)) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(booking)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {/* Join Session Button - Show if accepted and session hasn't started */}
          {isAccepted && !booking.sessionStarted && (
            <TouchableOpacity
              style={styles.joinSessionButton}
              onPress={() => handleJoinSession(booking)}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.joinSessionText}>Join Session</Text>
            </TouchableOpacity>
          )}
          
          {/* Rejoin Session Button - Show if session is active and user can rejoin */}
          {booking.sessionStarted && booking.status === 'accepted' && (
            <TouchableOpacity
              style={styles.rejoinSessionButton}
              onPress={() => handleJoinSession(booking)}
            >
              <Ionicons name="refresh-circle" size={20} color="#fff" />
              <Text style={styles.rejoinSessionText}>Rejoin Session</Text>
            </TouchableOpacity>
          )}
        </View>
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
      
      {/* Cancel Booking Confirmation Modal */}
      <Modal
        visible={showCancelConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelConfirmModal}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color="#EF4444" />
              <Text style={styles.modalTitle}>Cancel Booking Request?</Text>
            </View>
            
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this booking? The astrologer will be notified immediately.
            </Text>
            
            {bookingToCancel && (
              <View style={styles.bookingDetailsInModal}>
                <Text style={styles.bookingDetailText}>
                  Astrologer: {bookingToCancel.astrologer?.name || 'Professional Astrologer'}
                </Text>
                <Text style={styles.bookingDetailText}>
                  Type: {bookingToCancel.type?.charAt(0).toUpperCase() + bookingToCancel.type?.slice(1)} Consultation
                </Text>
              </View>
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCancelConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Dismiss</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmCancelBooking}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageSection: {
    marginRight: 16,
  },
  astrologerImageContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  astrologerImage: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  astrologerMainInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameAndStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  astrologerSpecialty: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  ratingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  rating: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 4,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  experience: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F97316',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chatBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  callBtn: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  videoBtn: {
    backgroundColor: '#F3E8FF',
    borderColor: '#8B5CF6',
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
  // Cancel Booking Styles
  pendingBookingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    flex: 1,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rejoinSessionButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  rejoinSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cancelConfirmModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  bookingDetailsInModal: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default HomeScreen;
