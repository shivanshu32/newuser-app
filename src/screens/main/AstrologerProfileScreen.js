import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ToastAndroid,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSocket } from '../../context/SocketContext';
import { astrologersAPI, walletAPI, ratingsAPI } from '../../services/api';
import { initiateRealTimeBooking, listenForBookingStatusUpdates } from '../../services/socketService';
import { addPendingConsultation, getPendingConsultations } from '../../utils/pendingConsultationsStore';

const AstrologerProfileScreen = ({ route, navigation }) => {
  const { socket } = useSocket();
  const [astrologer, setAstrologer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null); // null, 'pending', 'accepted', 'rejected'
  const [currentBookingId, setCurrentBookingId] = useState(null);
  
  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  
  // Use refs for values that need to persist across renders and be immune to stale closures
  const currentBookingIdRef = useRef(null);
  const currentBookingTypeRef = useRef(null);
  const statusListenerCleanup = useRef(null);
  
  // State for consultation notification
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [consultationData, setConsultationData] = useState(null);
  
  // Get astrologer ID from navigation params - handle both astrologerId and astrologer object
  const { astrologerId, astrologer: passedAstrologer } = route.params || {};
  const actualAstrologerId = astrologerId || passedAstrologer?._id || passedAstrologer?.id;
  
  console.log('🔍 [USER-APP] AstrologerProfileScreen: Route params:', route.params);
  console.log('🔍 [USER-APP] AstrologerProfileScreen: Extracted astrologer ID:', actualAstrologerId);

  // Handle chat booking - navigate to PreChatForm for user info collection
  const handleBookChat = () => {
    if (!astrologer) {
      Alert.alert('Error', 'Astrologer information not available. Please try again.');
      return;
    }

    console.log('🚀 [USER-APP] AstrologerProfileScreen: Navigating to PreChatForm for chat booking');
    navigation.navigate('PreChatForm', {
      astrologer: astrologer,
      bookingType: 'chat'
    });
  };

  useEffect(() => {
    fetchAstrologerDetails();
    
    // Note: Removed setupBookingStatusListener() to prevent duplicate listeners
    // Global socketService handles booking_status_update events and shows popups
    
    // Set up socket listener for astrologer availability updates
    if (socket) {
      console.log('🔌 [AstrologerProfile] Setting up availability update listener');
      socket.on('astrologer_availability_updated', handleAstrologerAvailabilityUpdate);
    }
    
    // Note: We don't clean up the booking status listener here to maintain
    // persistent listening for consecutive bookings. The global listener in
    // socketService should handle booking status updates throughout the session.
    console.log('🟡 [USER-APP] AstrologerProfileScreen: Keeping booking status listener active for consecutive bookings');
    
    // Cleanup function
    return () => {
      if (socket) {
        console.log('🧹 [AstrologerProfile] Cleaning up availability update listener');
        socket.off('astrologer_availability_updated', handleAstrologerAvailabilityUpdate);
      }
    };
  }, [socket, handleAstrologerAvailabilityUpdate]);

  // Fetch reviews when astrologer is loaded
  useEffect(() => {
    if (astrologer && actualAstrologerId) {
      console.log('🔄 [USER-APP] AstrologerProfileScreen: Triggering reviews fetch for astrologer:', {
        astrologerId: actualAstrologerId,
        astrologerName: astrologer.name || astrologer.displayName,
        astrologerData: astrologer
      });
      fetchAstrologerReviews();
    } else {
      console.log('⏳ [USER-APP] AstrologerProfileScreen: Not fetching reviews yet - missing data:', {
        hasAstrologer: !!astrologer,
        astrologerId: actualAstrologerId
      });
    }
  }, [astrologer, actualAstrologerId]);
  
  // Add timeout for booking requests
  useEffect(() => {
    let timeoutId;
    
    if (bookingStatus === 'pending') {
      console.log('⏰ [USER-APP] AstrologerProfileScreen: Starting 2-minute timeout for booking request');
      
      // Set 2-minute timeout for booking request
      timeoutId = setTimeout(() => {
        console.log('⏰ [USER-APP] AstrologerProfileScreen: Booking request timed out');
        setBookingStatus(null);
        setCurrentBookingId(null);
        currentBookingIdRef.current = null;
        currentBookingTypeRef.current = null;
        
        Alert.alert(
          'Request Timeout',
          'The astrologer did not respond to your booking request. Please try again.',
          [{ text: 'OK' }]
        );
      }, 120000); // 2 minutes
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [bookingStatus]);
  
  // Reset booking state when booking status changes to accepted or rejected
  useEffect(() => {
    if (bookingStatus === 'accepted' || bookingStatus === 'rejected') {
      // Add a small delay to ensure all processing is complete
      const timer = setTimeout(() => {
        // Reset state variables
        setCurrentBookingId(null);
        setBookingStatus(null);
        
        // Reset ref variables
        currentBookingIdRef.current = null;
        currentBookingTypeRef.current = null;
        
        console.log('Reset booking state after status:', bookingStatus);
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, [bookingStatus]);
  
  // Handle astrologer availability updates (chat/call toggle)
  const handleAstrologerAvailabilityUpdate = useCallback((data) => {
    console.log('🔄 [AstrologerProfile] Astrologer availability update received:', data);
    console.log('🔄 [AstrologerProfile] Current astrologer ID:', actualAstrologerId);
    console.log('🔄 [AstrologerProfile] Update for astrologer ID:', data.astrologerId);
    
    // Only update if this is the same astrologer being viewed
    if (actualAstrologerId && actualAstrologerId === data.astrologerId) {
      console.log('✅ [AstrologerProfile] Updating availability for current astrologer:', {
        astrologerId: data.astrologerId,
        newOnlineStatus: data.onlineStatus,
        previousOnlineStatus: astrologer?.onlineStatus
      });
      
      setAstrologer(prevAstrologer => {
        if (!prevAstrologer) return prevAstrologer;
        
        const updatedAstrologer = {
          ...prevAstrologer,
          onlineStatus: data.onlineStatus
        };
        
        console.log('🔄 [AstrologerProfile] Astrologer state updated:', {
          before: prevAstrologer.onlineStatus,
          after: updatedAstrologer.onlineStatus
        });
        
        return updatedAstrologer;
      });
    } else {
      console.log('⚠️ [AstrologerProfile] Availability update ignored - different astrologer');
    }
  }, [actualAstrologerId]);

  // Set up listener for booking status updates
  const setupBookingStatusListener = async () => {
    try {
      console.log('🔧 [USER-APP] AstrologerProfileScreen: Setting up booking status listener...');
      const cleanup = await listenForBookingStatusUpdates(handleBookingStatusUpdate);
      statusListenerCleanup.current = cleanup;
      console.log('✅ [USER-APP] AstrologerProfileScreen: Booking status listener setup complete');
    } catch (error) {
      console.error('❌ [USER-APP] AstrologerProfileScreen: Failed to set up booking status listener:', error);
    }
  };
  
  // Handler for booking status updates
  const handleBookingStatusUpdate = useCallback(async (data) => {
    console.log('🔔 [USER-APP] AstrologerProfileScreen: *** RECEIVED BOOKING STATUS UPDATE ***');
    console.log('🔔 [USER-APP] AstrologerProfileScreen: Raw data received:', JSON.stringify(data, null, 2));
    console.log('📊 [USER-APP] AstrologerProfileScreen: Processing booking status update details:', {
      bookingId: data.bookingId,
      status: data.status,
      sessionId: data.sessionId,
      roomId: data.roomId,
      message: data.message,
      currentBookingId: currentBookingId,
      currentBookingStatus: bookingStatus,
      timestamp: new Date().toISOString()
    });
    
    // IMMEDIATELY dismiss the waiting popup regardless of booking ID match
    console.log('🚨 [USER-APP] AstrologerProfileScreen: IMMEDIATELY dismissing waiting popup');
    setBookingStatus(data.status);
    
    // Check ref first, then state for booking ID
    const effectiveBookingId = currentBookingIdRef.current || currentBookingId;
    
    console.log('🔍 [USER-APP] AstrologerProfileScreen: Booking ID comparison debug:', {
      receivedBookingId: data.bookingId,
      receivedBookingIdType: typeof data.bookingId,
      effectiveBookingId: effectiveBookingId,
      effectiveBookingIdType: typeof effectiveBookingId,
      currentBookingIdRef: currentBookingIdRef.current,
      currentBookingIdState: currentBookingId,
      stringComparison: data.bookingId === effectiveBookingId,
      stringifiedComparison: String(data.bookingId) === String(effectiveBookingId)
    });
    
    // Only process updates for the current booking - use string comparison to handle ObjectId vs string
    const bookingIdMatch = effectiveBookingId && (
      data.bookingId === effectiveBookingId || 
      String(data.bookingId) === String(effectiveBookingId)
    );
    
    if (bookingIdMatch) {
      console.log('✅ [USER-APP] AstrologerProfileScreen: Booking status update matches current booking');
      
      if (data.status === 'accepted') {
        console.log('🎉 [USER-APP] AstrologerProfileScreen: Booking accepted! Processing acceptance...');
        
        try {
          // Create a safe version of the astrologer object with fallbacks for all properties
          let astrologerId = astrologer?._id;
          if (!astrologerId) {
            astrologerId = data.astrologerId;
            if (!astrologerId) {
              console.error('No astrologer ID available in booking status update or astrologer data');
              throw new Error('No astrologer ID available');
            }
          }
          console.log('Using astrologer ID:', astrologerId);
          
          const safeAstrologer = {
            _id: astrologerId,
            displayName: astrologer?.displayName || 'Astrologer',
            imageUrl: astrologer?.imageUrl || null,
            rates: astrologer?.rates || { chat: 0, voice: 0, video: 0 }
          };
          
          // Use the ref value which is immune to stale closures
          const bookingType = currentBookingTypeRef.current || data.type || 'video'; // Default to video for video consultations
          console.log('Using booking type for consultation:', bookingType);
          
          // Store consultation data for later use with safe values
          const consultationData = {
            astrologer: safeAstrologer, // Move astrologer to top level for PendingConsultationsScreen
            booking: {
              _id: String(data.bookingId), // Ensure booking ID is a string
              astrologer: safeAstrologer, // Keep for backward compatibility
              type: bookingType,
              rate: safeAstrologer.rates[bookingType] || 0,
              status: 'accepted',
              createdAt: new Date().toISOString()
            },
            roomId: data.roomId,
            sessionId: String(data.sessionId), // Ensure session ID is a string
            acceptedAt: new Date().toISOString()
          };
          
          console.log('🔄 [USER-APP] AstrologerProfileScreen: Created consultation data for pending store:', {
            bookingId: consultationData.booking._id,
            astrologerName: consultationData.booking.astrologer.displayName,
            consultationType: consultationData.booking.type,
            sessionId: consultationData.sessionId,
            roomId: consultationData.roomId,
            fullData: JSON.stringify(consultationData, null, 2)
          });
          
          // Save consultation data to state or global for access when user decides to join
          global.pendingConsultation = consultationData;
          
          // Store the consultation in our global pending consultations store
          setConsultationData(consultationData);
          
          // Add to pending consultations store with validation
          console.log('📝 [USER-APP] AstrologerProfileScreen: About to call addPendingConsultation...');
          console.log('📝 [USER-APP] AstrologerProfileScreen: Consultation data validation:', {
            hasBooking: !!consultationData.booking,
            hasBookingId: !!consultationData.booking._id,
            hasAstrologer: !!consultationData.booking.astrologer,
            hasSessionId: !!consultationData.sessionId,
            hasRoomId: !!consultationData.roomId
          });
          
          const addResult = await addPendingConsultation(consultationData);
          console.log('✅ [USER-APP] AstrologerProfileScreen: addPendingConsultation result:', addResult);
          
          // Verify the consultation was added by checking the store
          const allPendingConsultations = await getPendingConsultations();
          console.log('🔍 [USER-APP] AstrologerProfileScreen: Verification - All pending consultations after add:', {
            count: allPendingConsultations.length,
            consultationIds: allPendingConsultations.map(c => c.booking._id),
            justAddedExists: allPendingConsultations.some(c => c.booking._id === consultationData.booking._id)
          });
          
        } catch (error) {
          console.error('❌ [USER-APP] AstrologerProfileScreen: Error creating consultation data:', error);
          console.error('❌ [USER-APP] AstrologerProfileScreen: Error stack:', error.stack);
        }
        
        // Use direct navigation as a reliable notification method
        try {
          console.log('🚀 [USER-APP] AstrologerProfileScreen: Starting navigation to Home...');
          
          // Show immediate alert with navigation
          Alert.alert(
            'Booking Accepted!',
            'Your consultation has been accepted. You will be redirected to the Home screen where you can join the session.',
            [
              {
                text: 'Go to Home',
                onPress: () => {
                  console.log('🚀 [USER-APP] AstrologerProfileScreen: User pressed Go to Home button');
                  
                  // Reset navigation stack and go to Home
                  navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: 'Main',
                        state: {
                          routes: [
                            { name: 'Home' },
                            { name: 'Bookings' },
                            { name: 'Wallet' },
                            { name: 'Profile' }
                          ],
                          index: 0, // Set Home as active tab
                        },
                      },
                    ],
                  });
                  
                  // Also show toast as confirmation
                  if (Platform.OS === 'android') {
                    ToastAndroid.showWithGravity(
                      'Check your booking card on Home screen!',
                      ToastAndroid.LONG,
                      ToastAndroid.CENTER
                    );
                  }
                }
              }
            ]
          );
          
        } catch (navErr) {
          console.error('Navigation error:', navErr);
          
          // Fallback navigation
          try {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'Main',
                  state: {
                    routes: [
                      { name: 'Home' },
                      { name: 'Bookings' },
                      { name: 'Wallet' },
                      { name: 'Profile' }
                    ],
                    index: 0, // Set Home as active tab
                  },
                },
              ],
            });
          } catch (fallbackErr) {
            console.error('Fallback navigation error:', fallbackErr);
          }
        }
        
        // Notify the user that they have a pending consultation
        global.pendingConsultationAdded = true;
        
        // Emit an event that can be listened to by the app's navigation container
        try {
          if (global.eventEmitter) {
            global.eventEmitter.emit('pendingConsultationAdded');
          }
        } catch (err) {
          console.error('Error emitting event:', err);
        }
        
        // Alert removed - users now get BookingAcceptedPopup instead
        console.log('✅ [USER-APP] AstrologerProfileScreen: Booking accepted - popup will be shown via BookingPopupContext');
      } else if (data.status === 'rejected') {
        console.log('❌ [USER-APP] AstrologerProfileScreen: Booking rejected');
        
        // Show rejection message
        try {
          Alert.alert(
            'Booking Rejected',
            data.message || 'Astrologer is not available right now.',
            [{ text: 'OK' }]
          );
        } catch (alertErr) {
          console.error('Error showing rejection alert:', alertErr);
        }
        
        // Reset booking state
        setCurrentBookingId(null);
        currentBookingIdRef.current = null;
        currentBookingTypeRef.current = null;
      }
    } else {
      console.log('⚠️ [USER-APP] AstrologerProfileScreen: Booking status update does not match current booking');
      console.log('⚠️ [USER-APP] AstrologerProfileScreen: However, still dismissing popup and processing as fallback');
      
      // Even if booking ID doesn't match, still process acceptance/rejection as fallback
      if (data.status === 'accepted') {
        console.log('🔄 [USER-APP] AstrologerProfileScreen: Processing acceptance as fallback...');
        
        // Alert removed - users now get BookingAcceptedPopup instead
        console.log('✅ [USER-APP] AstrologerProfileScreen: Fallback booking accepted - popup will be shown via BookingPopupContext');
        
        // Reset navigation stack and go to Home
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              state: {
                routes: [
                  { name: 'Home' },
                  { name: 'Bookings' },
                  { name: 'Wallet' },
                  { name: 'Profile' }
                ],
                index: 0, // Set Home as active tab
              },
            },
          ],
        });
      } else if (data.status === 'rejected') {
        console.log('❌ [USER-APP] AstrologerProfileScreen: Processing rejection as fallback...');
        
        // Show rejection message
        try {
          Alert.alert(
            'Booking Rejected',
            data.message || 'Astrologer is not available right now.',
            [{ text: 'OK' }]
          );
        } catch (alertErr) {
          console.error('Error showing fallback rejection alert:', alertErr);
        }
        
        // Reset booking state
        setCurrentBookingId(null);
        currentBookingIdRef.current = null;
        currentBookingTypeRef.current = null;
      }
    }
  }, [currentBookingId, bookingStatus, astrologer, navigation]);

  // Helper function to get status color based on onlineStatus
  const getStatusColor = (astrologer) => {
    if (!astrologer) return '#9E9E9E'; // Gray for unknown
    
    // Check if astrologer is busy (legacy status field)
    if (astrologer.status === 'busy') {
      return '#FF9800'; // Orange for busy
    }
    
    // Check onlineStatus for availability
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    return isOnline ? '#4CAF50' : '#9E9E9E'; // Green for online, Gray for offline
  };
  
  // Helper function to get status text based on onlineStatus
  const getStatusText = (astrologer) => {
    if (!astrologer) return 'Status Unknown';
    
    // Check if astrologer is busy (legacy status field)
    if (astrologer.status === 'busy') {
      return 'Currently Busy';
    }
    
    // Check onlineStatus for availability
    const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
    return isOnline ? 'Available now' : 'Currently Offline';
  };

  const fetchAstrologerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 [USER-APP] AstrologerProfileScreen: Fetching astrologer details for ID:', actualAstrologerId);
      
      const response = await astrologersAPI.getById(actualAstrologerId);
      
      console.log('✅ [USER-APP] AstrologerProfileScreen: Successfully fetched astrologer details:', response.data);
      // Extract the actual astrologer data from the nested response structure
      let astrologerData = null;
      
      // Handle different response structures
      if (response?.data?.data) {
        // Nested data.data structure
        astrologerData = response.data.data;
      } else if (response?.data) {
        // Direct data property
        astrologerData = response.data;
      } else if (response && typeof response === 'object' && response._id) {
        // Response is the astrologer object itself
        astrologerData = response;
      } else {
        throw new Error('Invalid response format');
      }
      
      // Set the extracted astrologer data
      setAstrologer(astrologerData);
    } catch (err) {
      setError('Failed to load astrologer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAstrologerReviews = async (page = 1, limit = 5) => {
    try {
      if (page === 1) {
        setReviewsLoading(true);
        setReviewsError(null);
        setReviews([]);
        setReviewsPage(1);
        setHasMoreReviews(true);
      } else {
        setLoadingMoreReviews(true);
      }
      
      console.log('📡 [USER-APP] AstrologerProfileScreen: Fetching reviews for astrologer ID:', actualAstrologerId, 'Page:', page, 'Limit:', limit);
      
      const response = await ratingsAPI.getAstrologerReviews(actualAstrologerId, { page, limit });
      
      console.log('✅ [USER-APP] AstrologerProfileScreen: Raw API response:', response);
      console.log('✅ [USER-APP] AstrologerProfileScreen: Response data:', response.data);
      
      // Handle different response structures
      let reviewsData = [];
      let total = 0;
      
      console.log('🔍 [USER-APP] Response structure check:', {
        hasResponseData: !!response.data,
        responseDataKeys: response.data ? Object.keys(response.data) : [],
        responseDataDataIsArray: response.data ? Array.isArray(response.data.data) : false,
        responseDataIsArray: Array.isArray(response.data),
        responseIsArray: Array.isArray(response)
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        reviewsData = response.data.data;
        total = response.data.total || response.data.count || reviewsData.length;
        console.log('🔍 [USER-APP] Using response.data.data structure, total:', total);
      } else if (response.data && Array.isArray(response.data)) {
        reviewsData = response.data;
        total = reviewsData.length;
        console.log('🔍 [USER-APP] Using response.data structure, total:', total);
      } else if (Array.isArray(response)) {
        reviewsData = response;
        total = reviewsData.length;
        console.log('🔍 [USER-APP] Using response structure, total:', total);
      }
      
      console.log('🔍 [USER-APP] Final values:', { reviewsData: reviewsData.length, total });
      
      console.log('✅ [USER-APP] AstrologerProfileScreen: Setting reviews state with:', reviewsData);
      console.log('✅ [USER-APP] AstrologerProfileScreen: Reviews count:', reviewsData.length, 'Total:', total);
      
      if (page === 1) {
        setReviews(reviewsData);
        setTotalReviews(total);
      } else {
        setReviews(prevReviews => [...prevReviews, ...reviewsData]);
      }
      
      // Check if there are more reviews to load
      const currentTotal = page === 1 ? reviewsData.length : reviews.length + reviewsData.length;
      // Show load more if we have more reviews than currently displayed OR if we got a full page of results
      const hasMore = total > currentTotal || (reviewsData.length === limit && total > limit);
      
      console.log('🔍 [USER-APP] AstrologerProfileScreen: Pagination check:', {
        currentTotal,
        total,
        reviewsDataLength: reviewsData.length,
        limit,
        hasMore,
        page,
        condition1: total > currentTotal,
        condition2: reviewsData.length === limit && total > limit
      });
      
      setHasMoreReviews(hasMore);
      
      if (page > 1) {
        setReviewsPage(page);
      }
      
    } catch (error) {
      console.error('❌ [USER-APP] AstrologerProfileScreen: Error fetching reviews:', error);
      console.error('❌ [USER-APP] AstrologerProfileScreen: Error response:', error.response);
      setReviewsError('Failed to load reviews');
    } finally {
      setReviewsLoading(false);
      setLoadingMoreReviews(false);
    }
  };

  const loadMoreReviews = async () => {
    if (!loadingMoreReviews && hasMoreReviews) {
      const nextPage = reviewsPage + 1;
      console.log('📡 [USER-APP] AstrologerProfileScreen: Loading more reviews - Page:', nextPage);
      await fetchAstrologerReviews(nextPage, 5);
    }
  };

  // Check wallet balance before booking (for voice/video consultations)
  const checkWalletBalance = async (consultationType) => {
    try {
      console.log('[AstrologerProfileScreen] Checking wallet balance for', consultationType, 'consultation...');
      
      // Fetch current wallet balance
      const balanceResponse = await walletAPI.getBalance();
      const currentBalance = balanceResponse.data?.balance || 0;
      
      console.log('[AstrologerProfileScreen] Current wallet balance:', currentBalance);
      
      // Get per-minute rate for the selected consultation type
      let perMinuteRate = 0;
      if (astrologer?.consultationPrices) {
        switch (consultationType) {
          case 'chat':
            perMinuteRate = astrologer.consultationPrices.chat || 20;
            break;
          case 'call':
          case 'voice':
            perMinuteRate = astrologer.consultationPrices.call || 30;
            break;
          case 'video':
            perMinuteRate = astrologer.consultationPrices.video || 40;
            break;
          default:
            perMinuteRate = 30; // Default fallback for voice
        }
      } else {
        // Fallback rates if consultationPrices not available
        perMinuteRate = consultationType === 'chat' ? 20 : consultationType === 'call' || consultationType === 'voice' ? 30 : 40;
      }
      
      // Calculate minimum required balance for 5 minutes
      const minimumRequiredBalance = perMinuteRate * 5;
      
      console.log('[AstrologerProfileScreen] Per-minute rate:', perMinuteRate);
      console.log('[AstrologerProfileScreen] Minimum required balance (5 mins):', minimumRequiredBalance);
      console.log('[AstrologerProfileScreen] Balance check:', currentBalance >= minimumRequiredBalance ? 'PASS' : 'FAIL');
      
      if (currentBalance < minimumRequiredBalance) {
        // Insufficient balance - show alert and redirect to wallet
        const shortfall = minimumRequiredBalance - currentBalance;
        
        Alert.alert(
          'Insufficient Wallet Balance',
          `You need at least ₹${minimumRequiredBalance} for a 5-minute ${consultationType} consultation (₹${perMinuteRate}/min).\n\nCurrent Balance: ₹${currentBalance.toFixed(2)}\nRequired: ₹${minimumRequiredBalance}\nShortfall: ₹${shortfall.toFixed(2)}\n\nPlease add funds to your wallet to continue.`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Add Funds',
              onPress: () => {
                // Navigate to wallet screen
                navigation.navigate('Main', { 
                  screen: 'Wallet',
                  params: { 
                    suggestedAmount: Math.ceil(shortfall / 100) * 100 // Round up to nearest 100
                  }
                });
              }
            }
          ]
        );
        
        return false; // Balance check failed
      }
      
      return true; // Balance check passed
      
    } catch (error) {
      console.error('[AstrologerProfileScreen] Error checking wallet balance:', error);
      
      // Show error alert but allow user to proceed (in case of API issues)
      Alert.alert(
        'Unable to Check Balance',
        'We could not verify your wallet balance. Please ensure you have sufficient funds before proceeding.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue Anyway',
            onPress: () => {
              return true;
            }
          }
        ]
      );
      
      return false; // Don't proceed if balance check fails
    }
  };

  // Handle real-time booking via socket
  const handleBookNow = async (type) => {
    console.log(`📞 [USER-APP] handleBookNow called for session type: ${type}`);
    
    // Track the current booking type
    currentBookingTypeRef.current = type;
    
    try {
      // If astrologer data isn't loaded yet, try fetching it again
      if (!astrologer) {
        console.log('No astrologer data, attempting to fetch details again');
        await fetchAstrologerDetails();
      }
      
      console.log('Current astrologer data:', JSON.stringify(astrologer));
      
      // Get the astrologer ID from the correct location in the object structure
      const astrologerId = astrologer?._id || astrologer?.id || (astrologer?.data && (astrologer.data._id || astrologer.data.id));
      console.log(`Resolved astrologerId: ${astrologerId}`);
      
      // Validate astrologer data is available after potential refetch
      if (!astrologer || !astrologerId) {
        console.error('Invalid astrologer data:', astrologer);
        Alert.alert(
          'Booking Error',
          'Astrologer information is not available. Please try again.'
        );
        return;
      }
      
      // Get the astrologer name for the confirmation dialog
      let astrologerName = 'the astrologer';
      
      if (astrologer) {
        if (typeof astrologer === 'object') {
          astrologerName = astrologer.name || astrologer.displayName || astrologer.fullName;
          
          // If name is still undefined, try to find it in nested properties
          if (!astrologerName && astrologer.data) {
            astrologerName = astrologer.data.name || astrologer.data.displayName || astrologer.data.fullName;
          }
          
          // If name is still undefined, use a generic name with ID
          if (!astrologerName) {
            astrologerName = `Astrologer #${astrologer._id || astrologer.id || 'Unknown'}`;
          }
        }
      }
      
      // Prepare for booking with resolved astrologer name
      
      // Check wallet balance before proceeding with booking
      const hasEnoughBalance = await checkWalletBalance(type);
      if (!hasEnoughBalance) {
        return; // Stop booking process if insufficient balance
      }
      
      // Show confirmation dialog before initiating booking
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Show confirmation dialog with correct astrologer name and session type
      Alert.alert(
        'Confirm Booking',
        `Schedule a ${type} session with ${astrologerName} at ${formattedTime}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                // Prepare booking data
                const bookingData = {
                  astrologerId: astrologerId,
                  type: type,
                  notes: `Instant ${type} consultation request`
                };
                
                console.log('Prepared booking data:', JSON.stringify(bookingData));
                console.log('Calling initiateRealTimeBooking...');
                
                // Store the booking type in ref for later use
                currentBookingTypeRef.current = type;
                console.log('Setting current booking type ref:', type);
                
                // Send booking request via socket
                const response = await initiateRealTimeBooking(bookingData);
                
                // Store the booking ID for tracking status updates
                if (response && response.bookingId) {
                  // Update both state and ref
                  setCurrentBookingId(response.bookingId);
                  currentBookingIdRef.current = response.bookingId;
                  
                  // For voice calls, redirect to Home screen immediately instead of showing waiting popup
                  if (type === 'voice') {
                    console.log(' [USER-APP] Voice call booking initiated, redirecting to Home screen');
                    
                    // Show success toast
                    if (Platform.OS === 'android') {
                      ToastAndroid.show(
                        `Voice call request sent to ${astrologerName}. Check Pending Bookings on Home screen.`,
                        ToastAndroid.LONG
                      );
                    } else {
                      Alert.alert(
                        'Request Sent',
                        `Voice call request sent to ${astrologerName}. Check Pending Bookings on Home screen.`
                      );
                    }
                    
                    // Navigate to Home screen
                    navigation.navigate('Home');
                    return;
                  }
                  
                  // For other booking types, show the waiting modal
                  setBookingStatus('pending');
                }
                
                // The actual status updates will be handled by the socket listener
              } catch (error) {
                console.error('Booking request error:', error);
                console.error('Error details:', error.stack || 'No stack trace available');
                
                // Check if it's a socket connection error
                if (error.message && error.message.includes('Socket not connected')) {
                  console.log('Socket connection issue detected');
                  Alert.alert(
                    'Connection Error',
                    'Unable to connect to the booking service. Please check your internet connection and try again.'
                  );
                } else if (error.message && error.message.includes('timed out')) {
                  console.log('Booking request timed out');
                  Alert.alert(
                    'Booking Timeout',
                    'The booking request timed out. The astrologer may be unavailable at the moment.'
                  );
                } else if (error.message && error.message.includes('chat consultations, please provide')) {
                  console.log('User info required for chat consultation');
                  Alert.alert(
                    'Information Required',
                    'For chat consultations, please provide your name, date of birth, and place of birth through the pre-chat form.'
                  );
                } else if (error.message && error.message.includes('validation')) {
                  console.log('Validation error detected');
                  Alert.alert(
                    'Validation Error',
                    error.message || 'Please check your booking details and try again.'
                  );
                } else {
                  Alert.alert(
                    'Booking Error',
                    error.message || 'Failed to send booking request. Please try again.'
                  );
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Booking preparation error:', error);
      
      Alert.alert(
        'Booking Error',
        error.message || 'Failed to prepare booking request. Please try again.'
      );
    }
  };
  
  // Legacy booking handlers - replaced with real-time booking
  const handleBookVoiceCall = () => {
    handleBookNow('voice');
  };

  const handleBookVideoCall = () => {
    // Video calls are no longer supported
    console.log('Video call booking - feature removed');
  };

  // Booking request pending modal
  const renderBookingPendingModal = () => {
    // Don't show modal for voice calls as they redirect to Home immediately
    const shouldShowModal = bookingStatus === 'pending' && currentBookingTypeRef.current !== 'voice';
    
    return (
      <Modal
        visible={shouldShowModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.modalText}>Waiting for astrologer response...</Text>
            <Text style={styles.modalSubText}>This request will expire in 2 minutes if not answered</Text>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setBookingStatus(null);
                setCurrentBookingId(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading astrologer profile...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAstrologerDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render no data state
  if (!astrologer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No astrologer data available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format languages as a comma-separated string
  const languagesText = Array.isArray(astrologer.languages) 
    ? astrologer.languages.join(', ') 
    : astrologer.languages || 'Not specified';

  // Format specialties as a comma-separated string
  const specialtiesText = Array.isArray(astrologer.specialties) 
    ? astrologer.specialties.join(', ') 
    : astrologer.specialties || 'Not specified';

  // Format rating
  let ratingText = 'Not rated yet';
  let ratingCount = 0;
  
  if (astrologer.rating) {
    if (typeof astrologer.rating === 'object' && astrologer.rating.average) {
      ratingText = astrologer.rating.average.toFixed(1);
      ratingCount = astrologer.rating.count || 0;
    } else if (typeof astrologer.rating === 'number') {
      ratingText = astrologer.rating.toFixed(1);
    }
  }

  // Render notification banner
  const renderNotificationBanner = () => {
    console.log('Rendering notification banner, showNotificationBanner:', showNotificationBanner);
    
    if (!showNotificationBanner) return null;
    
    return (
      <View style={styles.notificationBanner}>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>Booking Accepted!</Text>
          <Text style={styles.notificationText}>
            Your consultation is ready! Check the Home screen to join.
          </Text>
        </View>
        <View style={styles.notificationButtonsContainer}>
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => {
              setShowNotificationBanner(false);
              
              // Navigate to Home screen using reset to ensure proper navigation
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: 'Main',
                    state: {
                      routes: [
                        { name: 'Home' },
                        { name: 'Bookings' },
                        { name: 'Wallet' },
                        { name: 'Profile' }
                      ],
                      index: 0, // Set Home as active tab
                    },
                  },
                ],
              });
            }}
          >
            <Text style={styles.joinButtonText}>Go to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.laterButton}
            onPress={() => setShowNotificationBanner(false)}
          >
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header with back button */}
   
      
      {/* Notification UI removed in favor of Alert */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: astrologer.imageUrl || astrologer.profileImage }} 
              style={styles.profileImage}
              accessibilityLabel={`Profile picture of ${astrologer.displayName || astrologer.name}`}
            />
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(astrologer) },
              ]}
            />
          </View>
          
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{astrologer.displayName || astrologer.name}</Text>
            <Text style={styles.specialization}>{astrologer.specialization || astrologer.specialties?.[0] || 'Astrologer'}</Text>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{ratingText}</Text>
              {ratingCount > 0 && (
                <Text style={styles.ratingCount} numberOfLines={1} ellipsizeMode="tail">({ratingCount} reviews)</Text>
              )}
            </View>
            
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusText}>
                {getStatusText(astrologer)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{astrologer.experience || '0'}+</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ratingText}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(() => {
                console.log('🔍 [DEBUG] Astrologer consultations data:', {
                  totalConsultations: astrologer.totalConsultations,
                  consultationsCount: astrologer.consultationsCount,
                  astrologerObject: astrologer
                });
                return astrologer.totalConsultations || astrologer.consultationsCount || '0';
              })()}+
            </Text>
            <Text style={styles.statLabel}>Consultations</Text>
          </View>
        </View>

        {/* Booking Buttons */}
        <View style={styles.bookingSection}>
          <Text style={styles.bookingSectionTitle}>Book a Consultation</Text>
          {/* <Text style={styles.bookingSubtitle}>
            {astrologer.status === 'Online' 
              ? 'Astrologer is available now. Choose a consultation type:' 
              : 'Astrologer is currently offline. The astrologer will be notified once they come online.'}
          </Text> */}
          
          <View style={styles.bookingButtonsContainer}>
            {/* Chat Button - Show only if onlineStatus.chat === 1 and consultation price exists */}
            {(() => {
              const shouldShowChat = astrologer.onlineStatus?.chat === 1 && astrologer.consultationPrices?.chat;
              console.log('🔍 [AstrologerProfile] Chat button visibility check:', {
                onlineStatusChat: astrologer.onlineStatus?.chat,
                hasConsultationPrice: !!astrologer.consultationPrices?.chat,
                shouldShow: shouldShowChat
              });
              return shouldShowChat;
            })() && (
              <TouchableOpacity 
                style={[styles.bookingButton, styles.chatButton]} 
                onPress={handleBookChat}
                accessibilityLabel="Book Chat Consultation"
              >
                <Ionicons 
                  name="chatbubble" 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.bookingButtonText}>
                  Chat
                </Text>
                <Text style={styles.bookingButtonPrice}>
                  ₹{astrologer.consultationPrices?.chat || '20'}/min
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Voice Call Button - Show only if onlineStatus.call === 1 and consultation price exists */}
            {(() => {
              const shouldShowCall = astrologer.onlineStatus?.call === 1 && astrologer.consultationPrices?.call;
              console.log('🔍 [AstrologerProfile] Call button visibility check:', {
                onlineStatusCall: astrologer.onlineStatus?.call,
                hasConsultationPrice: !!astrologer.consultationPrices?.call,
                shouldShow: shouldShowCall
              });
              return shouldShowCall;
            })() && (
              <TouchableOpacity 
                style={[styles.bookingButton, styles.voiceButton]} 
                onPress={handleBookVoiceCall}
                accessibilityLabel="Book Voice Call Consultation"
              >
                <Ionicons 
                  name="call" 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.bookingButtonText}>
                  Voice Call
                </Text>
                <Text style={styles.bookingButtonPrice}>
                  ₹{astrologer.consultationPrices?.call || '30'}/min
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Video Call booking button temporarily hidden */}
            {/* <TouchableOpacity 
              style={[styles.bookingButton, styles.videoButton]} 
              onPress={handleBookVideoCall}
              accessibilityLabel="Book Video Call Consultation"
            >
              <Ionicons 
                name="videocam" 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.bookingButtonText}>
                Video Call
              </Text>
              <Text style={styles.bookingButtonPrice}>
                ₹{astrologer.consultationPrices?.video || '40'}/min
              </Text>
            </TouchableOpacity> */}
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsContainer}>
          {/* Bio/Description */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{astrologer.about || astrologer.bio || astrologer.description || 'No bio available'}</Text>
          </View>

          {/* Specialization */}
          {astrologer.specialization && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Specialization</Text>
              <Text style={styles.detailText}>{astrologer.specialization}</Text>
            </View>
          )}

          {/* Categories */}
          {Array.isArray(astrologer.categories) && astrologer.categories.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.tagsContainer}>
                {astrologer.categories.map((category, index) => (
                  <View key={`category-${index}`} style={styles.tagItem}>
                    <Text style={styles.tagText}>{category}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Languages */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.tagsContainer}>
              {Array.isArray(astrologer.languages) ? (
                astrologer.languages.map((language, index) => (
                  <View key={`language-${index}`} style={styles.tagItem}>
                    <Text style={styles.tagText}>{language}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.detailText}>{languagesText}</Text>
              )}
            </View>
          </View>

          {/* Experience */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <View style={styles.experienceContainer}>
              <Ionicons name="briefcase-outline" size={20} color="#F97316" />
              <Text style={styles.detailText}>{astrologer.experience || 'Not specified'} years of professional experience</Text>
            </View>
          </View>

          {/* Consultation Charges section removed */}
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <View style={styles.reviewsHeaderTop}>
              <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
              {reviews.length > 0 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllButtonText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#F97316" />
                </TouchableOpacity>
              )}
            </View>
            
            {reviews.length > 0 && (
              <View style={styles.ratingOverview}>
                <View style={styles.ratingOverviewLeft}>
                  <Text style={styles.overallRating}>{ratingText}</Text>
                  <View style={styles.overallStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= (astrologer.rating?.average || 0) ? "star" : "star-outline"}
                        size={18}
                        color="#FFD700"
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviews}>Based on {reviews.length} reviews</Text>
                </View>
                
                <View style={styles.ratingDistribution}>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.filter(r => r.rating === rating).length;
                    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <View key={rating} style={styles.ratingBar}>
                        <Text style={styles.ratingNumber}>{rating}</Text>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <View style={styles.barContainer}>
                          <View style={[styles.barFill, { width: `${percentage}%` }]} />
                        </View>
                        <Text style={styles.ratingCount}>{count}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
          
          {(() => {
            console.log('🎨 [USER-APP] AstrologerProfileScreen: Rendering reviews section with:', {
              reviewsLoading,
              reviewsError,
              reviewsLength: reviews.length,
              reviews: reviews
            });
            return null;
          })()}
          
          {reviewsLoading ? (
            <View style={styles.reviewsLoading}>
              <ActivityIndicator size="small" color="#F97316" />
              <Text style={styles.loadingText}>Loading reviews...</Text>
            </View>
          ) : reviewsError ? (
            <View style={styles.reviewsError}>
              <Text style={styles.errorText}>{reviewsError}</Text>
              <TouchableOpacity onPress={fetchAstrologerReviews} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons name="star-outline" size={48} color="#D1D5DB" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>Be the first to review this astrologer</Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              <View style={styles.reviewsListHeader}>
                <Text style={styles.recentReviewsTitle}>Recent Reviews</Text>
                <View style={styles.reviewsFilter}>
                  <Text style={styles.filterText}>Most Recent</Text>
                  <Ionicons name="chevron-down" size={14} color="#6B7280" />
                </View>
              </View>
              
              {reviews.map((review, index) => (
                <View key={review._id} style={[styles.reviewItem, index === reviews.length - 1 && styles.lastReviewItem]}>
                  <View style={styles.reviewCard}>
                    <View style={styles.reviewCardHeader}>
                      <View style={styles.reviewUserSection}>
                        <View style={styles.reviewAvatar}>
                          {review.user?.profileImage && review.user.profileImage !== 'default-user.png' ? (
                            <Image 
                              source={{ uri: review.user.profileImage }} 
                              style={styles.reviewAvatarImage}
                              defaultSource={{ uri: 'https://www.shutterstock.com/image-vector/default-avatar-profile-icon-social-600nw-1677509740.jpg' }}
                            />
                          ) : (
                            <View style={styles.reviewAvatarPlaceholder}>
                              <Text style={styles.reviewAvatarText}>
                                {review.user?.name ? review.user.name.charAt(0).toUpperCase() : 'U'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.reviewUserInfo}>
                          <View style={styles.reviewUserNameRow}>
                            <Text style={styles.reviewUserName}>
                              {review.user?.name || 'Anonymous User'}
                            </Text>
                            <View style={styles.reviewRatingBadge}>
                              <Ionicons name="star" size={12} color="#FFD700" />
                              <Text style={styles.reviewRatingBadgeText}>{review.rating}.0</Text>
                            </View>
                          </View>
                          <View style={styles.reviewMetadata}>
                            <Text style={styles.reviewDate}>
                              {(() => {
                                const reviewDate = new Date(review.createdAt);
                                const now = new Date();
                                const diffTime = Math.abs(now - reviewDate);
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays === 1) return 'Yesterday';
                                if (diffDays < 7) return `${diffDays} days ago`;
                                if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
                                if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
                                return `${Math.ceil(diffDays / 365)} years ago`;
                              })()}
                            </Text>
                            <View style={styles.reviewDot} />
                            <View style={styles.consultationTypeBadge}>
                              <Ionicons name="chatbubble" size={10} color="#6B7280" />
                              <Text style={styles.consultationTypeText}>Chat</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    {review.comment && review.comment.trim() !== '' ? (
                      <View style={styles.reviewCommentSection}>
                        <Text style={styles.reviewComment}>"{review.comment}"</Text>
                      </View>
                    ) : (
                      <View style={styles.reviewCommentSection}>
                        <Text style={styles.reviewNoComment}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          {' '}Rated {review.rating} stars without written feedback
                        </Text>
                      </View>
                    )}
                    
                    <View style={styles.reviewActions}>
                      <View style={styles.reviewVerified}>
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                        <Text style={styles.reviewVerifiedText}>Verified Purchase</Text>
                      </View>
                      <View style={styles.reviewHelpful}>
                        <TouchableOpacity style={styles.helpfulButton}>
                          <Ionicons name="thumbs-up-outline" size={14} color="#6B7280" />
                          <Text style={styles.helpfulText}>Helpful</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
              
              {hasMoreReviews && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={loadMoreReviews}
                  disabled={loadingMoreReviews}
                >
                  {loadingMoreReviews ? (
                    <View style={styles.loadMoreContent}>
                      <ActivityIndicator size="small" color="#F97316" />
                      <Text style={styles.loadMoreText}>Loading more reviews...</Text>
                    </View>
                  ) : (
                    <View style={styles.loadMoreContent}>
                      <Text style={styles.loadMoreText}>Load more reviews</Text>
                      <Text style={styles.loadMoreSubtext}>
                        Showing {reviews.length} of {totalReviews} reviews
                      </Text>
                    </View>
                  )}
                  {!loadingMoreReviews && (
                    <Ionicons name="chevron-down" size={20} color="#F97316" />
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Booking Buttons */}
        <View style={styles.bookingSection}>
          <Text style={styles.bookingSectionTitle}>Book a Consultation</Text>
          {/* <Text style={styles.bookingSubtitle}>
            {astrologer.status === 'Online' 
              ? 'Astrologer is available now. Choose a consultation type:' 
              : 'Astrologer is currently offline. The astrologer will be notified once they come online.'}
          </Text> */}
          
          <View style={styles.bookingButtonsContainer}>
            {/* Chat Button - Show only if onlineStatus.chat === 1 and consultation price exists */}
            {(() => {
              const shouldShowChat = astrologer.onlineStatus?.chat === 1 && astrologer.consultationPrices?.chat;
              console.log('🔍 [AstrologerProfile] Chat button visibility check:', {
                onlineStatusChat: astrologer.onlineStatus?.chat,
                hasConsultationPrice: !!astrologer.consultationPrices?.chat,
                shouldShow: shouldShowChat
              });
              return shouldShowChat;
            })() && (
              <TouchableOpacity 
                style={[styles.bookingButton, styles.chatButton]} 
                onPress={handleBookChat}
                accessibilityLabel="Book Chat Consultation"
              >
                <Ionicons 
                  name="chatbubble" 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.bookingButtonText}>
                  Chat
                </Text>
                <Text style={styles.bookingButtonPrice}>
                  ₹{astrologer.consultationPrices?.chat || '20'}/min
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Voice Call Button - Show only if onlineStatus.call === 1 and consultation price exists */}
            {(() => {
              const shouldShowCall = astrologer.onlineStatus?.call === 1 && astrologer.consultationPrices?.call;
              console.log('🔍 [AstrologerProfile] Call button visibility check:', {
                onlineStatusCall: astrologer.onlineStatus?.call,
                hasConsultationPrice: !!astrologer.consultationPrices?.call,
                shouldShow: shouldShowCall
              });
              return shouldShowCall;
            })() && (
              <TouchableOpacity 
                style={[styles.bookingButton, styles.voiceButton]} 
                onPress={handleBookVoiceCall}
                accessibilityLabel="Book Voice Call Consultation"
              >
                <Ionicons 
                  name="call" 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.bookingButtonText}>
                  Voice Call
                </Text>
                <Text style={styles.bookingButtonPrice}>
                  ₹{astrologer.consultationPrices?.call || '30'}/min
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Video Call booking button temporarily hidden */}
            {/* <TouchableOpacity 
              style={[styles.bookingButton, styles.videoButton]} 
              onPress={handleBookVideoCall}
              accessibilityLabel="Book Video Call Consultation"
            >
              <Ionicons 
                name="videocam" 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.bookingButtonText}>
                Video Call
              </Text>
              <Text style={styles.bookingButtonPrice}>
                ₹{astrologer.consultationPrices?.video || '40'}/min
              </Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </ScrollView>
      
      {/* Booking Pending Modal */}
      {renderBookingPendingModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalText: {
    fontSize: 16,
    marginVertical: 10,
    textAlign: 'center',
    color: '#333'
  },
  modalSubText: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666'
  },
  inPageNotification: {
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  notificationHeader: {
    backgroundColor: '#8A2BE2',
    padding: 10,
  },
  notificationHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationBody: {
    padding: 15,
  },
  notificationBodyText: {
    fontSize: 14,
    marginBottom: 15,
    color: '#333',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinNowButton: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  joinNowButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    color: '#4B5563',
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#4CAF50',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flex: 1,
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'red',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  statusTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  detailText: {
    fontSize: 16,
    color: '#4B5563',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4B5563',
    fontSize: 14,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chargesContainer: {
    marginTop: 8,
  },
  chargeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chargeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  voiceIconContainer: {
    backgroundColor: '#F97316',
  },
  videoIconContainer: {
    backgroundColor: '#10B981',
  },
  chargeContent: {
    flex: 1,
  },
  chargeLabel: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  chargeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  perMinText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6B7280',
  },
  bookingSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  bookingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  bookingButtonsContainer: {
    marginBottom: 8,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatButton: {
    backgroundColor: '#6366F1',
  },
  voiceButton: {
    backgroundColor: '#F97316',
  },
  videoButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  bookingButtonPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  
  // Reviews Section Styles
  reviewsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reviewsHeader: {
    marginBottom: 20,
  },
  reviewsHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3E2',
    borderRadius: 20,
  },
  viewAllButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    marginRight: 4,
  },
  ratingOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  ratingOverviewLeft: {
    alignItems: 'center',
    flex: 1,
  },
  overallRating: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  overallStars: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 8,
  },
  totalReviews: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  ratingDistribution: {
    flex: 1.5,
    marginLeft: 20,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    width: 12,
  },
  barContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
    width: 20,
    textAlign: 'right',
  },
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  reviewsError: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F97316',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  noReviews: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noReviewsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 12,
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  reviewsList: {
    marginTop: 20,
  },
  reviewsListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recentReviewsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewsFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
  },
  filterText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
  },
  reviewItem: {
    marginBottom: 16,
  },
  lastReviewItem: {
    marginBottom: 0,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reviewCardHeader: {
    marginBottom: 16,
  },
  reviewUserSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reviewAvatar: {
    marginRight: 12,
  },
  reviewAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  reviewAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  reviewUserInfo: {
    flex: 1,
  },
  reviewUserNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reviewUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  reviewRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewRatingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    marginLeft: 2,
  },
  reviewMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  reviewDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  consultationTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  consultationTypeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 2,
  },
  reviewCommentSection: {
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
  },
  reviewComment: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  reviewNoComment: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reviewVerified: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewVerifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewHelpful: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  helpfulText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  loadMoreContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
    marginLeft: 8,
  },
  loadMoreSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default AstrologerProfileScreen;
