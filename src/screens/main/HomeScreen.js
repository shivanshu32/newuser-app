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
  StatusBar,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { astrologersAPI, walletAPI, versionAPI, freeChatAPI, sessionsAPI } from '../../services/api';
import prepaidOffersAPI from '../../services/prepaidOffersAPI';
import BookingAcceptedModal from '../../components/BookingAcceptedModal';
import FreeChatCard from '../../components/FreeChatCard';
import PrepaidOfferCard from '../../components/PrepaidOfferCard';
import RejoinChatBottomSheet from '../../components/RejoinChatBottomSheet';
import BannerCarousel from '../../components/BannerCarousel';
import BlogSection from '../../components/BlogSection';
import EPoojaHomeSection from '../../components/epooja/EPoojaHomeSection';

// Hardcoded app version - update this when releasing new versions
import APP_CONFIG from '../../config/appConfig';

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
  const [freeChatEnabled, setFreeChatEnabled] = useState(true); // Global free chat toggle
  
  // Rejoin Chat Bottom Sheet State
  const [showRejoinBottomSheet, setShowRejoinBottomSheet] = useState(false);
  const [activeSessionData, setActiveSessionData] = useState(null);
  const [remainingTime, setRemainingTime] = useState(null);
  const [timerInterval, setTimerInterval] = useState(null);

  // Prepaid Offers State
  const [prepaidOffers, setPrepaidOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);



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
      
      const data = await walletAPI.getBalance();
      console.log('✅ Wallet balance fetched:', data);
      
      if (data.success) {
        setWalletBalance(data.data.balance);
      }
    } catch (error) {
      console.error('❌ Error fetching wallet balance:', error);
      // Don't show alert for wallet errors, just set balance to 0
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  }, []);

  // Fetch active prepaid offers
  const fetchPrepaidOffers = useCallback(async () => {
    try {
      setLoadingOffers(true);
      console.log('🔄 Fetching active prepaid offers...');
      
      const data = await prepaidOffersAPI.getActiveOffers();
      console.log('✅ Prepaid offers fetched:', data);
      
      if (data.success) {
        setPrepaidOffers(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching prepaid offers:', error);
      setPrepaidOffers([]);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  // Handle offer used (remove from list)
  // Refresh prepaid offers
  const refreshPrepaidOffers = useCallback(async () => {
    await fetchPrepaidOffers();
  }, [fetchPrepaidOffers]);

  // Handle when an offer is used/completed
  const handleOfferUsed = useCallback(() => {
    // Refresh prepaid offers to remove used offer
    refreshPrepaidOffers();
  }, [refreshPrepaidOffers]);

  // Check global free chat settings
  const checkFreeChatSettings = useCallback(async () => {
    try {
      console.log('🔄 Checking global free chat settings...');
      const response = await freeChatAPI.getGlobalSettings();
      console.log('⚙️ Free chat settings response:', response);
      
      if (response.success && response.data) {
        setFreeChatEnabled(response.data.enabled);
        console.log('✅ Free chat enabled:', response.data.enabled);
      } else {
        console.warn('⚠️ Free chat settings API returned success: false or no data');
        setFreeChatEnabled(true); // Default to enabled if API fails
      }
    } catch (error) {
      console.error('❌ Error fetching free chat settings:', error);
      setFreeChatEnabled(true); // Default to enabled if API fails
    }
  }, []);

  // Check for active session (for rejoin functionality)
  const checkActiveSession = useCallback(async () => {
    try {
      console.log('🔄 Checking for active session...');
      const response = await sessionsAPI.checkActiveSession();
      console.log('📋 Active session response:', response);
      
      if (response.success && response.hasActiveSession && response.data) {
        const sessionData = response.data;
        console.log('✅ Found active session:', sessionData);
        
        setActiveSessionData(sessionData);
        setShowRejoinBottomSheet(true);
        
        // Start timer for free chat sessions
        if (sessionData.isFreeChat && sessionData.remainingTime !== null) {
          setRemainingTime(sessionData.remainingTime);
          startRemainingTimeTimer(sessionData.remainingTime);
        }
      } else {
        console.log('ℹ️ No active session found');
        setActiveSessionData(null);
        setShowRejoinBottomSheet(false);
        clearRemainingTimeTimer();
      }
    } catch (error) {
      console.error('❌ Error checking active session:', error);
      // Don't show error to user, just hide the bottom sheet
      setActiveSessionData(null);
      setShowRejoinBottomSheet(false);
      clearRemainingTimeTimer();
    }
  }, []);

  // Start timer for remaining time countdown
  const startRemainingTimeTimer = useCallback((initialTime) => {
    // Clear existing timer
    clearRemainingTimeTimer();
    
    if (initialTime <= 0) {
      setRemainingTime(0);
      return;
    }
    
    let currentTime = initialTime;
    const interval = setInterval(() => {
      currentTime -= 1;
      setRemainingTime(currentTime);
      
      if (currentTime <= 0) {
        clearInterval(interval);
        setTimerInterval(null);
        // Hide bottom sheet when time expires
        setShowRejoinBottomSheet(false);
        setActiveSessionData(null);
        
        Toast.show({
          type: 'info',
          text1: 'Session Expired',
          text2: 'Your free chat session has ended.',
        });
      }
    }, 1000);
    
    setTimerInterval(interval);
  }, []);

  // Clear remaining time timer
  const clearRemainingTimeTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
  }, [timerInterval]);

  // Handle rejoin chat button press
  const handleRejoinChat = useCallback((sessionData) => {
    console.log('🔄 Rejoining chat session:', sessionData);
    
    // Hide bottom sheet
    setShowRejoinBottomSheet(false);
    clearRemainingTimeTimer();
    
    try {
      if (sessionData.isFreeChat) {
        // Navigate to free chat screen
        navigation.navigate('FixedFreeChatScreen', {
          sessionId: sessionData.sessionIdentifier,
          freeChatId: sessionData.freeChatId,
          astrologerId: sessionData.astrologer?.id,
          astrologerName: sessionData.astrologer?.name,
          rejoin: true
        });
      } else {
        // Navigate to enhanced chat screen for paid consultations
        navigation.navigate('EnhancedChat', {
          bookingId: sessionData.bookingId,
          sessionId: sessionData.sessionId,
          astrologerName: sessionData.astrologer?.name,
          rejoin: true
        });
      }
      
      Toast.show({
        type: 'success',
        text1: 'Rejoining Session',
        text2: 'Connecting you back to your consultation...',
      });
    } catch (error) {
      console.error('❌ Error rejoining session:', error);
      Alert.alert(
        'Navigation Error',
        'Unable to rejoin the session. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [navigation, clearRemainingTimeTimer]);

  // Handle bottom sheet close
  const handleBottomSheetClose = useCallback(() => {
    setShowRejoinBottomSheet(false);
    clearRemainingTimeTimer();
  }, [clearRemainingTimeTimer]);

  // Cleanup timer on component unmount
  useEffect(() => {
    return () => {
      clearRemainingTimeTimer();
    };
  }, [clearRemainingTimeTimer]);

  // Check app version and redirect to update screen if needed
  const checkAppVersion = useCallback(async () => {
    try {
      const currentVersion = APP_CONFIG.getCurrentVersion();
      console.log('🔄 Checking app version...', currentVersion);
      const response = await versionAPI.checkVersion(currentVersion);
      console.log('📱 Version check response:', response);
      
      if (response.success) {
        const { latestVersion, updateRequired } = response;
        
        if (updateRequired) {
          console.log('🚨 Update required! Current:', currentVersion, 'Latest:', latestVersion);
          // Navigate to update screen and prevent going back
          navigation.reset({
            index: 0,
            routes: [{
              name: 'UpdateScreen',
              params: {
                currentVersion: currentVersion,
                latestVersion: latestVersion
              }
            }]
          });
          return false; // Indicate update is required
        } else {
          console.log('✅ App version is up to date');
          return true; // Indicate app is up to date
        }
      } else {
        console.warn('⚠️ Version check failed, allowing app to continue');
        return true; // Allow app to continue if version check fails
      }
    } catch (error) {
      console.error('❌ Error checking app version:', error);
      // Don't block app if version check fails
      return true;
    }
  }, [navigation]);

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
         // console.log('✅ [FETCH_BOOKINGS] Raw response from backend:', JSON.stringify(response, null, 2));
         // console.log('✅ [FETCH_BOOKINGS] User pending bookings fetched:', response.pendingBookings);
          
          // Debug each booking's structure and status
          // (response.pendingBookings || []).forEach((booking, index) => {
          //   console.log(`📝 [BOOKING_DEBUG] Booking ${index + 1}:`, {
          //     id: booking._id || booking.bookingId,
          //     status: booking.status,
          //     callStatus: booking.callStatus,
          //     type: booking.type,
          //     astrologerName: booking.astrologer?.name,
          //     createdAt: booking.createdAt,
          //     fullBooking: JSON.stringify(booking, null, 2)
          //   });
          // });
          
          // Get only the most recent booking with valid status (accepted, pending, in-progress)
          let latestValidBooking = null;
          
          if (response.pendingBookings && response.pendingBookings.length > 0) {
            // Sort bookings by creation date (most recent first)
            const sortedBookings = [...response.pendingBookings].sort((a, b) => {
              const dateA = new Date(a.createdAt || a.timestamp || 0);
              const dateB = new Date(b.createdAt || b.timestamp || 0);
              return dateB - dateA; // Most recent first
            });
            
            console.log('📋 [LATEST_BOOKING] Sorted bookings by date:', sortedBookings.map(b => ({
              id: b.bookingId || b._id,
              status: b.status,
              createdAt: b.createdAt,
              type: b.type
            })));
            
            // Find the most recent booking
            const mostRecentBooking = sortedBookings[0];
            
            if (mostRecentBooking) {
              const mainStatus = mostRecentBooking.status;
              const callStatus = mostRecentBooking.callStatus;
              const bookingStatus = mostRecentBooking.bookingStatus;
              
              console.log('🔍 [LATEST_BOOKING] Checking most recent booking:', {
                id: mostRecentBooking.bookingId || mostRecentBooking._id,
                mainStatus,
                callStatus,
                bookingStatus,
                type: mostRecentBooking.type,
                createdAt: mostRecentBooking.createdAt
              });
              
              // Check if the most recent booking has a valid status
              const validStatuses = ['accepted', 'pending', 'in-progress'];
              const hasValidMainStatus = validStatuses.includes(mainStatus);
              const hasValidCallStatus = validStatuses.includes(callStatus);
              const hasValidBookingStatus = validStatuses.includes(bookingStatus);
              
              const hasValidStatus = hasValidMainStatus || hasValidCallStatus || hasValidBookingStatus;
              
              if (hasValidStatus) {
                latestValidBooking = mostRecentBooking;
                console.log('✅ [LATEST_BOOKING] Most recent booking has valid status - showing it:', {
                  bookingId: mostRecentBooking.bookingId || mostRecentBooking._id,
                  mainStatus,
                  callStatus,
                  bookingStatus,
                  type: mostRecentBooking.type,
                  validBy: {
                    mainStatus: hasValidMainStatus,
                    callStatus: hasValidCallStatus,
                    bookingStatus: hasValidBookingStatus
                  }
                });
              } else {
                console.log('🗑️ [LATEST_BOOKING] Most recent booking does not have valid status - hiding it:', {
                  bookingId: mostRecentBooking.bookingId || mostRecentBooking._id,
                  mainStatus,
                  callStatus,
                  bookingStatus,
                  type: mostRecentBooking.type,
                  reason: 'Latest booking status not in [accepted, pending, in-progress]'
                });
              }
            }
          }
          
          const validPendingBookings = latestValidBooking ? [latestValidBooking] : [];
          
          console.log('📋 [INITIAL_LOAD] Filtering results:', {
            totalReceived: response.pendingBookings?.length || 0,
            validAfterFilter: validPendingBookings.length,
            filteredOut: (response.pendingBookings?.length || 0) - validPendingBookings.length,
            finalBookings: validPendingBookings.map(b => ({
              id: b.bookingId || b._id,
              status: b.status,
              callStatus: b.callStatus,
              type: b.type
            }))
          });
          
          setPendingBookings(validPendingBookings);
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

  // Check app version on component mount
  useEffect(() => {
    const performVersionCheck = async () => {
      const isUpToDate = await checkAppVersion();
      if (isUpToDate) {
        // Only load data if app version is up to date
        console.log('✅ Version check passed, loading app data...');
        // The existing data loading will happen through other useEffects
      }
    };
    
    performVersionCheck();
  }, [checkAppVersion]);

  // Socket event listeners for real-time booking updates
  useEffect(() => {
    if (!socket) {
      console.log('🔌 [HOME] Socket not available for event listeners');
      return;
    }

    console.log('🔗 [HOME] Setting up socket event listeners for booking updates');

    // Handle booking status updates (accepted, rejected, completed)
    const handleBookingStatusUpdate = (data) => {
      console.log('📨 [HOME] Received booking status update:', data);
      
      // Refresh pending bookings to get latest status
      fetchUserPendingBookings();
      
      // Show notification for chat consultation acceptance
      if (data.status === 'accepted' && (data.consultationType === 'chat' || data.bookingType === 'chat')) {
        console.log('💬 [HOME] Chat consultation accepted, showing join notification');
        
        Alert.alert(
          'Chat Session Ready! 💬',
          `${data.astrologerName || 'The astrologer'} has accepted your chat consultation request. You can now join the session.`,
          [
            {
              text: 'Join Session',
              onPress: () => {
                console.log('🚀 [HOME] User tapped Join Session for chat');
                
                // Navigate to chat screen
                navigation.navigate('EnhancedChat', {
                  bookingId: data.bookingId,
                  sessionId: data.sessionId || data.bookingId,
                  astrologer: data.astrologer || { 
                    _id: data.astrologerId,
                    displayName: data.astrologerName 
                  },
                  userInfo: data.userInfo
                });
              }
            },
            {
              text: 'Later',
              style: 'cancel'
            }
          ]
        );
      }
    };

    // Handle booking auto-cancellation
    const handleBookingAutoCancelled = (data) => {
      console.log('⏰ [HOME] Received booking auto-cancelled event:', data);
      
      // Remove the cancelled booking from pending bookings
      setPendingBookings(prevBookings => 
        prevBookings.filter(booking => 
          (booking._id || booking.bookingId) !== data.bookingId
        )
      );
      
      // Show user-friendly notification
      Alert.alert(
        'Booking Auto-Cancelled ⏰',
        data.message || 'Your booking has been automatically cancelled due to timeout (15 minutes). Please try booking again.',
        [{ text: 'OK' }]
      );
    };

    // Handle consultation ended event
    const handleConsultationEnded = (data) => {
      console.log('🏁 [HOME] Consultation ended event received:', data);
      
      // Clear active session state to hide RejoinChatBottomSheet
      console.log('🧹 [HOME] Clearing active session state after consultation ended...');
      setActiveSessionData(null);
      setShowRejoinBottomSheet(false);
      setRemainingTime(null);
      
      // Clear timer if it exists
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      
      // Immediately refresh pending bookings to remove completed consultation
      console.log('🔄 [HOME] Refreshing pending bookings after consultation ended...');
      fetchUserPendingBookings().catch(error => {
        console.error('❌ [HOME] Error refreshing pending bookings after consultation ended:', error);
      });
      
      // Remove the completed booking from local state immediately for instant UI update
      if (data.bookingId) {
        setPendingBookings(prevBookings => {
          const filteredBookings = prevBookings.filter(booking => {
            const bookingId = booking._id || booking.bookingId;
            return bookingId !== data.bookingId;
          });
          
          console.log('🗑️ [HOME] Removed completed consultation from pending list:', {
            bookingId: data.bookingId,
            before: prevBookings.length,
            after: filteredBookings.length
          });
          
          return filteredBookings;
        });
        
        // Also clear active session if it matches the ended booking
        if (activeSessionData && 
            (activeSessionData.bookingId === data.bookingId || 
             activeSessionData.sessionId === data.sessionId)) {
          console.log('🧹 [HOME] Clearing active session data for ended consultation:', data.bookingId);
          setActiveSessionData(null);
          setShowRejoinBottomSheet(false);
        }
      }
    };

    // Set up event listeners
    socket.on('booking_status_update', handleBookingStatusUpdate);
    socket.on('booking_auto_cancelled', handleBookingAutoCancelled);
    socket.on('consultation_ended', handleConsultationEnded);

    // Cleanup function
    return () => {
      console.log('🧹 [HOME] Cleaning up socket event listeners');
      socket.off('booking_status_update', handleBookingStatusUpdate);
      socket.off('booking_auto_cancelled', handleBookingAutoCancelled);
      socket.off('consultation_ended', handleConsultationEnded);
    };
  }, [socket, navigation, fetchUserPendingBookings]);

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

  // Handle user pending booking updates (when existing bookings are cancelled)
  const handleUserPendingBookingUpdates = useCallback((data) => {
    console.log('📋 [BOOKING_UPDATE] User pending bookings updated event received:', data);
    
    if (data && data.pendingBookings) {
      console.log('✅ [BOOKING_UPDATE] Raw bookings from server:', {
        newCount: data.pendingBookings.length,
        previousCount: pendingBookings.length,
        rawBookings: data.pendingBookings.map(b => ({
          id: b.bookingId || b._id,
          status: b.status,
          callStatus: b.callStatus,
          type: b.type
        }))
      });
      
      // Get only the most recent booking with valid status (accepted, pending, in-progress)
      let latestValidBooking = null;
      
      if (data.pendingBookings && data.pendingBookings.length > 0) {
        // Sort bookings by creation date (most recent first)
        const sortedBookings = [...data.pendingBookings].sort((a, b) => {
          const dateA = new Date(a.createdAt || a.timestamp || 0);
          const dateB = new Date(b.createdAt || b.timestamp || 0);
          return dateB - dateA; // Most recent first
        });
        
        console.log('📋 [UPDATE_LATEST] Sorted bookings by date:', sortedBookings.map(b => ({
          id: b.bookingId || b._id,
          status: b.status,
          createdAt: b.createdAt,
          type: b.type
        })));
        
        // Find the most recent booking
        const mostRecentBooking = sortedBookings[0];
        
        if (mostRecentBooking) {
          const mainStatus = mostRecentBooking.status;
          const callStatus = mostRecentBooking.callStatus;
          const bookingStatus = mostRecentBooking.bookingStatus;
          
          console.log('🔍 [UPDATE_LATEST] Checking most recent booking:', {
            id: mostRecentBooking.bookingId || mostRecentBooking._id,
            mainStatus,
            callStatus,
            bookingStatus,
            type: mostRecentBooking.type,
            createdAt: mostRecentBooking.createdAt
          });
          
          // Check if the most recent booking has a valid status
          const validStatuses = ['accepted', 'pending', 'in-progress'];
          const hasValidMainStatus = validStatuses.includes(mainStatus);
          const hasValidCallStatus = validStatuses.includes(callStatus);
          const hasValidBookingStatus = validStatuses.includes(bookingStatus);
          
          const hasValidStatus = hasValidMainStatus || hasValidCallStatus || hasValidBookingStatus;
          
          if (hasValidStatus) {
            latestValidBooking = mostRecentBooking;
            console.log('✅ [UPDATE_LATEST] Most recent booking has valid status - showing it:', {
              bookingId: mostRecentBooking.bookingId || mostRecentBooking._id,
              mainStatus,
              callStatus,
              bookingStatus,
              type: mostRecentBooking.type,
              validBy: {
                mainStatus: hasValidMainStatus,
                callStatus: hasValidCallStatus,
                bookingStatus: hasValidBookingStatus
              }
            });
          } else {
            console.log('🗑️ [UPDATE_LATEST] Most recent booking does not have valid status - hiding it:', {
              bookingId: mostRecentBooking.bookingId || mostRecentBooking._id,
              mainStatus,
              callStatus,
              bookingStatus,
              type: mostRecentBooking.type,
              reason: 'Latest booking status not in [accepted, pending, in-progress]'
            });
          }
        }
      }
      
      const validPendingBookings = latestValidBooking ? [latestValidBooking] : [];
      
      console.log('📋 [UPDATE_FILTER] Filtering results:', {
        totalReceived: data.pendingBookings.length,
        validAfterFilter: validPendingBookings.length,
        filteredOut: data.pendingBookings.length - validPendingBookings.length,
        finalBookings: validPendingBookings.map(b => ({
          id: b.bookingId || b._id,
          status: b.status,
          callStatus: b.callStatus,
          type: b.type
        }))
      });
      
      // Check if bookings were cancelled (count decreased) - use filtered counts
      const cancelledCount = pendingBookings.length - validPendingBookings.length;
      
      // Update the pending bookings state with the filtered data
      setPendingBookings(validPendingBookings);
      
      // Show a toast notification if bookings were cancelled
      if (cancelledCount > 0) {
        Toast.show({
          type: 'info',
          text1: 'Bookings Updated',
          text2: `${cancelledCount} previous booking${cancelledCount > 1 ? 's' : ''} cancelled due to new booking request`,
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
        });
      }
    } else {
      console.warn('⚠️ Invalid pending bookings update data received:', data);
      // Fallback to empty array if data is invalid
      setPendingBookings([]);
    }
  }, [pendingBookings.length]);

  // Handle session end events to clean up pending bookings
  const handleSessionEnd = useCallback((data) => {
    console.log('📝 [HOME] Session ended:', data);
    
    // Update local state to remove the ended session for immediate UI feedback
    if (data.bookingId) {
      setPendingBookings(prevBookings => {
        const filteredBookings = prevBookings.filter(booking => 
          booking._id !== data.bookingId && booking.bookingId !== data.bookingId
        );
        
        console.log('📝 [HOME] Removed ended session from local state:', {
          bookingId: data.bookingId,
          before: prevBookings.length,
          after: filteredBookings.length
        });
        
        return filteredBookings;
      });
    }
    
    // Also refresh pending bookings via socket to ensure data consistency
    // This provides a backup in case the local state update missed anything
    if (socket && socket.connected) {
      console.log('📝 [HOME] Refreshing pending bookings after session end...');
      setTimeout(() => {
        fetchUserPendingBookings().catch(error => {
          console.error('❌ [HOME] Error refreshing pending bookings after session end:', error);
        });
      }, 1000); // Small delay to allow backend to process the session end
    }
  }, [socket, fetchUserPendingBookings]);

  // Handle call status updates from Exotel
  const handleCallStatusUpdate = useCallback((data) => {
    console.log('🔥 [DEBUG] call_status_update event received in user-app HomeScreen!');
    console.log('📞 [HOME] Received call_status_update:', JSON.stringify(data, null, 2));
    console.log('📞 [HOME] Event timestamp:', new Date().toISOString());
    
    if (!data) {
      console.error('📞 [HOME] Invalid call status update data');
      return;
    }
    
    // Prevent duplicate processing by checking if we already processed this exact event
    const eventKey = `${data.bookingId}_${data.status}_${data.timestamp}`;
    if (window.processedCallEvents && window.processedCallEvents.has(eventKey)) {
      console.log('🔄 [HOME] Skipping duplicate call status event:', eventKey);
      return;
    }
    
    // Track processed events to prevent duplicates
    if (!window.processedCallEvents) {
      window.processedCallEvents = new Set();
    }
    window.processedCallEvents.add(eventKey);
    
    // Clean up old events (keep only last 50)
    if (window.processedCallEvents.size > 50) {
      const eventsArray = Array.from(window.processedCallEvents);
      window.processedCallEvents = new Set(eventsArray.slice(-25));
    }
    
    // Show toast notification with improved error handling
    try {
      // Handle message-based notifications (from backend)
      if (data.message && data.title) {
        // Determine toast type based on notification type
        let toastType = 'info';
        if (data.notificationType === 'success') {
          toastType = 'success';
        } else if (data.notificationType === 'error') {
          toastType = 'error';
        }
        
        console.log('🍞 [TOAST] Showing toast notification:', {
          type: toastType,
          title: data.title,
          message: data.message
        });
        
        // Show toast notification
        Toast.show({
          type: toastType,
          text1: data.title || 'Call Update',
          text2: data.message,
          position: 'top',
          visibilityTime: 5000,
          autoHide: true,
          topOffset: 60,
        });
      } else {
        // Handle status-based notifications
        const { status, failureReason } = data;
        
        let toastConfig = null;
        
        // Show appropriate notification based on call status
        if (status === 'initiated') {
          toastConfig = {
            type: 'info',
            text1: 'Call Initiated',
            text2: 'Your call is being connected. Please wait for the incoming call.',
          };
        } else if (status === 'connected' || status === 'in-progress') {
          toastConfig = {
            type: 'success',
            text1: 'Call Connected',
            text2: 'Your call has been connected with the astrologer.',
          };
        } else if (status === 'completed') {
          toastConfig = {
            type: 'success',
            text1: 'Call Completed',
            text2: 'Your consultation has ended successfully.',
          };
        } else if (status === 'failed') {
          // Show failure notification with reason if available
          const failureMessage = failureReason 
            ? `Call failed: ${failureReason.replace(/-/g, ' ')}` 
            : 'Call failed to connect. Please try again later.';
          
          toastConfig = {
            type: 'error',
            text1: 'Call Failed',
            text2: failureMessage,
            visibilityTime: 6000,
          };
        }
        
        if (toastConfig) {
          console.log('🍞 [TOAST] Showing status-based toast:', toastConfig);
          Toast.show({
            ...toastConfig,
            position: 'top',
            visibilityTime: toastConfig.visibilityTime || 4000,
            autoHide: true,
            topOffset: 60,
          });
        }
      }
    } catch (toastError) {
      console.error('❌ [TOAST] Error showing toast notification:', toastError);
    }
    
    // Update pending bookings if this relates to a booking
    if (data.bookingId) {
      console.log('📋 [BOOKING_UPDATE] Updating pending bookings for:', data.bookingId);
      
      // Update local state to immediately reflect changes
      setPendingBookings(prevBookings => {
        console.log('📋 [BOOKING_UPDATE] Current bookings count:', prevBookings.length);
        
        const updatedBookings = prevBookings
          .map(booking => {
            const bookingId = booking._id || booking.bookingId;
            if (bookingId === data.bookingId || bookingId?.toString() === data.bookingId?.toString()) {
              console.log('📋 [BOOKING_UPDATE] Found matching booking to update:', {
                bookingId: bookingId,
                oldStatus: booking.status,
                newStatus: data.status
              });
              
              return {
                ...booking,
                status: data.status === 'connected' ? 'in-progress' : data.status,
                callStatus: data.status,
                lastUpdated: new Date()
              };
            }
            return booking;
          })
          .filter(booking => {
            // Remove failed, completed, expired, cancelled, or rejected bookings
            const shouldRemove = ['failed', 'completed', 'expired', 'cancelled', 'rejected'].includes(booking.status);
            if (shouldRemove) {
              console.log('🗑️ [CALL_STATUS] Removing booking from pending list:', {
                bookingId: booking.bookingId || booking._id,
                status: booking.status,
                reason: 'Call status update'
              });
            }
            return !shouldRemove;
          });
        
        console.log('📋 [BOOKING_UPDATE] Updated bookings count:', updatedBookings.length);
        console.log('📋 [BOOKING_UPDATE] Removed bookings:', prevBookings.length - updatedBookings.length);
        
        return updatedBookings;
      });
    }
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

  // Handle astrologer ready for session notification
  const handleAstrologerReadyForSession = useCallback((data) => {
    console.log('🔔 [SESSION_JOIN] Astrologer ready for session:', data);
    
    const { bookingId, sessionId, consultationType, astrologerName } = data;
    
    Alert.alert(
      'Astrologer Ready! ✨',
      `${astrologerName || 'The astrologer'} is ready to start your ${consultationType} consultation. Connecting you now...`,
      [{ text: 'OK' }]
    );
    
    // Navigate to appropriate session screen
    setTimeout(() => {
      if (consultationType === 'video') {
        navigation.navigate('VideoConsultation', {
          sessionId,
          bookingId,
          astrologerId: data.astrologerId,
          userId: user._id || user.id
        });
      } else if (consultationType === 'chat') {
        navigation.navigate('EnhancedChat', {
          sessionId,
          bookingId,
          astrologerId: data.astrologerId,
          userId: user._id || user.id
        });
      }
      // Voice calls are handled by Exotel, no navigation needed
    }, 1000);
  }, [navigation, user]);
  
  // Handle astrologer declined session notification
  const handleAstrologerDeclinedSession = useCallback((data) => {
    console.log('🔔 [SESSION_JOIN] Astrologer declined session:', data);
    
    const { reason, astrologerName } = data;
    
    Alert.alert(
      'Session Unavailable 😔',
      `${astrologerName || 'The astrologer'} is currently unavailable to join the session. ${reason || 'Please try again later.'}`
    );
  }, []);
  
  // Handle user session join confirmation
  const handleUserSessionJoinConfirmed = useCallback((data) => {
    console.log('🔔 [SESSION_JOIN] User session join confirmed:', data);
    
    // This confirms that the astrologer has been notified
    // The actual session start will be handled by astrologer_ready_for_session event
  }, []);

  // Handle join session from pending booking
  const handleJoinSession = useCallback(async (booking) => {
    try {
      console.log('🔔 [SESSION_JOIN] User attempting to join session:', booking);
      
      // First, notify the astrologer that user wants to join
      if (socket && socket.connected) {
        console.log('🔔 [SESSION_JOIN] Sending notification to astrologer...');
        
        // Emit notification to astrologer
        socket.emit('user_attempting_to_join_session', {
          bookingId: booking.bookingId,
          sessionId: booking.sessionId,
          consultationType: booking.type,
          astrologerId: booking.astrologer?._id || booking.astrologerId
        });
        
        // Show loading state to user
        Alert.alert(
          'Connecting... 🔄',
          'Notifying the astrologer that you\'re ready to join. Please wait a moment.',
          [{ text: 'OK' }]
        );
        
        // For voice calls, show specific message
        if (booking.type === 'voice') {
          setTimeout(() => {
            Alert.alert(
              'Voice Call Ready! 📞',
              'The astrologer has been notified. You should receive a phone call shortly from our system. Please answer the call to connect with the astrologer.',
              [{ text: 'OK' }]
            );
          }, 2000);
        } else {
          // For video and chat, wait for astrologer response before navigating
          console.log('🔔 [SESSION_JOIN] Waiting for astrologer response for', booking.type, 'consultation');
        }
        
      } else {
        console.error('🔔 [SESSION_JOIN] Socket not connected, falling back to direct navigation');
        
        // Fallback to direct navigation if socket is not available
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
      }
    } catch (error) {
      console.error('HomeScreen: Error joining session:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    }
  }, [navigation, user, socket]);

  // Handle cancel booking from pending booking
  const handleCancelBooking = useCallback(async (booking) => {
    try {
      console.log('🗑️ [CANCEL_BOOKING] User attempting to cancel booking:', booking);
      
      if (!socket) {
        console.error('❌ Cannot cancel booking - no socket connection');
        Alert.alert(
          'Connection Error',
          'Unable to cancel booking. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking? This action cannot be undone.',
        [
          {
            text: 'No',
            style: 'cancel'
          },
          {
            text: 'Yes, Cancel',
            style: 'destructive',
            onPress: async () => {
              try {
                // Extract required data from booking
                const astrologerId = booking.astrologer?._id || booking.astrologerId || booking.astrologer;
                const bookingId = booking.bookingId || booking._id;
                
                console.log('🗑️ [CANCEL_BOOKING] Cancelling via socket:', {
                  bookingId,
                  astrologerId,
                  bookingStructure: {
                    hasAstrologer: !!booking.astrologer,
                    astrologerType: typeof booking.astrologer,
                    hasAstrologerId: !!booking.astrologerId
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
                
                // Emit cancel booking event to backend via socket
                socket.emit('cancel_booking', {
                  bookingId,
                  astrologerId,
                  reason: 'Cancelled by user from pending bookings'
                });
                
                // Immediately remove from local state for instant UI feedback
                setPendingBookings(prevBookings => {
                  const filteredBookings = prevBookings.filter(b => {
                    const bId = b.bookingId || b._id;
                    const targetId = booking.bookingId || booking._id;
                    return bId !== targetId;
                  });
                  
                  console.log('✅ [CANCEL_BOOKING] Booking removed from local state:', {
                    before: prevBookings.length,
                    after: filteredBookings.length
                  });
                  
                  return filteredBookings;
                });
                
                // Show success message
                Alert.alert(
                  'Booking Cancelled ✅',
                  'Your booking request has been cancelled successfully. The astrologer has been notified.',
                  [{ text: 'OK' }]
                );
                
              } catch (error) {
                console.error('🗑️ [CANCEL_BOOKING] Error cancelling booking:', error);
                Alert.alert(
                  'Cancellation Failed',
                  error.message || 'Failed to cancel booking. Please try again or contact support.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('🗑️ [CANCEL_BOOKING] Error in handleCancelBooking:', error);
      Alert.alert(
        'Error',
        'Failed to initiate booking cancellation. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [socket]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    await Promise.all([
      fetchAstrologers(),
      fetchWalletBalance(),
      fetchUserPendingBookings(),
      fetchPrepaidOffers()
    ]);
  }, [fetchAstrologers, fetchWalletBalance, fetchUserPendingBookings, fetchPrepaidOffers]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  // Use focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [FOCUS_EFFECT] HomeScreen came into focus, refreshing data...');
      console.log('🔄 [FOCUS_EFFECT] Current pending bookings count:', pendingBookings.length);
      
      // Always refresh pending bookings when screen comes into focus
      // This ensures outdated consultations are removed after session ends
      const refreshData = async () => {
        try {
          console.log('🔄 [FOCUS_EFFECT] Starting data refresh...');
          
          // Refresh pending bookings first (most important for this fix)
          if (socket && socket.connected) {
            console.log('🔄 [FOCUS_EFFECT] Refreshing pending bookings via socket...');
            
            // Add timeout to handle socket response delays
            const refreshPromise = new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                console.log('⏰ [FOCUS_EFFECT] Socket response timeout, continuing with other data...');
                resolve();
              }, 3000); // 3 second timeout
              
              fetchUserPendingBookings()
                .then(() => {
                  clearTimeout(timeout);
                  resolve();
                })
                .catch((error) => {
                  clearTimeout(timeout);
                  console.error('❌ [FOCUS_EFFECT] Error fetching pending bookings:', error);
                  resolve(); // Don't reject, just continue
                });
            });
            
            await refreshPromise;
          } else {
            console.log('⚠️ [FOCUS_EFFECT] Socket not available, skipping pending bookings refresh');
          }
          
          // Then refresh other data (don't wait for pending bookings to complete)
          await Promise.all([
            fetchAstrologers().catch(error => {
              console.error('❌ [FOCUS_EFFECT] Error fetching astrologers:', error);
            }),
            fetchWalletBalance().catch(error => {
              console.error('❌ [FOCUS_EFFECT] Error fetching wallet balance:', error);
            }),
            fetchPrepaidOffers().catch(error => {
              console.error('❌ [FOCUS_EFFECT] Error fetching prepaid offers:', error);
            }),
            checkActiveSession().catch(error => {
              console.error('❌ [FOCUS_EFFECT] Error checking active session:', error);
            })
          ]);
          
          console.log('✅ [FOCUS_EFFECT] Data refresh completed successfully');
        } catch (error) {
          console.error('❌ [FOCUS_EFFECT] Error during data refresh:', error);
        }
      };
      
      refreshData();
    }, [fetchUserPendingBookings, fetchAstrologers, fetchWalletBalance, fetchPrepaidOffers, socket])
  );
  
  // Additional navigation listener to ensure pending bookings are refreshed
  // This provides a backup to useFocusEffect for more reliable data refresh
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🏠 [NAV_FOCUS] Home screen focused via navigation listener');
      console.log('🏠 [NAV_FOCUS] Socket connected:', socket?.connected);
      console.log('🏠 [NAV_FOCUS] Current pending bookings before refresh:', pendingBookings.length);
      
      // Force refresh pending bookings when navigating to Home screen
      if (socket && socket.connected) {
        console.log('🏠 [NAV_FOCUS] Force refreshing pending bookings...');
        
        // Add a small delay to ensure any ongoing socket operations complete
        setTimeout(() => {
          fetchUserPendingBookings().catch(error => {
            console.error('❌ [NAV_FOCUS] Error refreshing pending bookings:', error);
          });
        }, 100);
      } else {
        console.log('⚠️ [NAV_FOCUS] Socket not connected, cannot refresh pending bookings');
      }
    });
    
    return unsubscribe;
  }, [navigation, socket, fetchUserPendingBookings, pendingBookings.length]);

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

  // Handle astrologer availability updates (chat/call toggle)
  const handleAstrologerAvailabilityUpdate = useCallback((data) => {
    console.log('🔄 Astrologer availability update received:', data);
    
    setAstrologers(prevAstrologers => 
      prevAstrologers.map(astrologer => 
        astrologer._id === data.astrologerId 
          ? { ...astrologer, onlineStatus: data.onlineStatus }
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
        // Remove rejected, expired, cancelled, or failed bookings from pending list
        const shouldRemove = ['rejected', 'expired', 'cancelled', 'failed'].includes(booking.status);
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

  }, [bookingAcceptedData, navigation, user, astrologers]);



  // Socket listener setup useEffect
  useEffect(() => {
    console.log('🔥 [DEBUG] Socket setup useEffect triggered in user-app HomeScreen');
    console.log('🔥 [DEBUG] Socket state:', {
      socketExists: !!socket,
      socketConnected: socket?.connected,
      socketId: socket?.id,
      timestamp: new Date().toISOString()
    });
    
    if (socket && socket.connected) {
      console.log('🔥 [DEBUG] Socket is connected, setting up listeners...');
      
      // Remove any existing listeners first to avoid duplicates
      socket.off('astrologer_status_updated', handleAstrologerStatusUpdate);
      socket.off('astrologer_availability_updated', handleAstrologerAvailabilityUpdate);
      // Note: booking_status_update cleanup not needed (handled by global socketService)
      socket.off('user_pending_bookings_updated', handleUserPendingBookingUpdates);
      socket.off('session_end', handleSessionEnd);
      socket.off('session_ended', handleSessionEnd);
      socket.off('call_status_update', handleCallStatusUpdate);
      socket.off('astrologer_ready_for_session', handleAstrologerReadyForSession);
      socket.off('astrologer_declined_session', handleAstrologerDeclinedSession);
      socket.off('user_session_join_confirmed', handleUserSessionJoinConfirmed);
      console.log('🔥 [DEBUG] Cleaned up existing listeners');

      // Listen for astrologer status updates
      socket.on('astrologer_status_updated', handleAstrologerStatusUpdate);
      socket.on('astrologer_availability_updated', handleAstrologerAvailabilityUpdate);
      // Note: booking_status_update is handled by global socketService listener

      // Listen for user pending booking updates
      socket.on('user_pending_bookings_updated', handleUserPendingBookingUpdates);

      // Listen for session end events to clean up pending bookings
      socket.on('session_end', handleSessionEnd);
      socket.on('session_ended', handleSessionEnd);

      // Listen for call status updates from Exotel
      console.log('🔥 [DEBUG] Registering call_status_update listener in user-app HomeScreen');
      socket.on('call_status_update', handleCallStatusUpdate);
      console.log('🔥 [DEBUG] call_status_update listener registered successfully');
      
      // Listen for astrologer session join responses
      socket.on('astrologer_ready_for_session', handleAstrologerReadyForSession);
      socket.on('astrologer_declined_session', handleAstrologerDeclinedSession);
      socket.on('user_session_join_confirmed', handleUserSessionJoinConfirmed);
      console.log('🔔 [SESSION_JOIN] Session join notification listeners registered');
      
      // Add debugging for socket connection events
      socket.on('connect', () => {
        console.log('🔥 [DEBUG] Socket connected in user-app HomeScreen, ID:', socket.id);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('🔥 [DEBUG] Socket disconnected in user-app HomeScreen, reason:', reason);
      });
      
      // Debug room membership
      socket.on('room_joined', (data) => {
        console.log('🔥 [DEBUG] Joined room in user-app:', data);
      });
      
      socket.on('room_left', (data) => {
        console.log('🔥 [DEBUG] Left room in user-app:', data);
      });

      } else {
        // Wait for connection and then set up listeners
        console.log('🔥 [DEBUG] Socket not connected yet, waiting for connection...');
        console.log('🔥 [DEBUG] Socket details:', {
          socketExists: !!socket,
          socketConnected: socket?.connected,
          socketConnecting: socket?.connecting,
          socketDisconnected: socket?.disconnected,
          readyState: socket?.readyState
        });
        // Removed setupListeners reference as it was undefined
      }
      
      // Also listen for reconnection events
      // Removed setupListeners reference as it was undefined
      
      // DISABLED: Legacy booking accepted event - now handled by modern BookingAcceptedPopup
      // socket.on('booking_accepted', handleBookingAccepted);
      
      // Listen for booking rejected event
      if (socket) {
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
      
        // Listen for automatic voice consultation initiated events
        socket.on('voice_consultation_initiated', (data) => {
          console.log('📞 [VOICE_AUTO] Voice consultation initiated event received:', JSON.stringify(data, null, 2));
          
          const { bookingId, astrologer, type, rate, message, autoInitiated } = data;
          
          // Show notification alert for automatic voice consultation initiation
          Alert.alert(
            '📞 Voice Consultation Initiated',
            `${message}\n\nAstrologer: ${astrologer.name}\nRate: ₹${rate}/min\n\nYou will receive a phone call shortly. Please answer to connect with the astrologer.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('📞 [VOICE_AUTO] User acknowledged automatic voice consultation initiation');
                  // Refresh pending bookings to show the new consultation
                  fetchUserPendingBookings();
                }
              }
            ]
          );
        });
        
        // Listen for auto-cancelled booking events
        socket.on('booking_auto_cancelled', (data) => {
        console.log('🕐 [DEBUG] Booking auto-cancelled event received:', JSON.stringify(data, null, 2));
        console.log('🕐 [DEBUG] Event data bookingId:', data.bookingId);
        
        // Remove the auto-cancelled booking from pending bookings list for real-time UI update
        setPendingBookings(prevBookings => {
          console.log('🕐 [DEBUG] Current pending bookings before auto-cancel filtering:', prevBookings.length);
          
          const filteredBookings = prevBookings.filter(booking => {
            const bookingId = booking.bookingId || booking._id;
            const shouldRemove = bookingId === data.bookingId || bookingId?.toString() === data.bookingId?.toString();
            
            console.log('🕐 [DEBUG] Comparing booking for auto-cancel:', {
              bookingInList: bookingId,
              eventBookingId: data.bookingId,
              shouldRemove: shouldRemove
            });
            
            if (shouldRemove) {
              console.log('✅ [DEBUG] FOUND MATCH - Removing auto-cancelled booking from pending list:', {
                bookingId: bookingId,
                astrologerId: booking.astrologerId,
                bookingType: booking.type
              });
            }
            
            return !shouldRemove;
          });
          
          console.log('📊 [DEBUG] Pending bookings after auto-cancel removal:', {
            before: prevBookings.length,
            after: filteredBookings.length,
            removed: prevBookings.length - filteredBookings.length
          });
          
          return filteredBookings;
        });
        
        // Show auto-cancellation alert
        Alert.alert(
          'Booking Auto-Cancelled ⏰',
          data.message || 'Your booking request was automatically cancelled due to timeout (15+ minutes without response).',
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
      }
      
      // Cleanup listeners on unmount
      return () => {
        console.log('🔌 Cleaning up socket listeners in HomeScreen');
        if (socket) {
          socket.off('astrologer_status_updated', handleAstrologerStatusUpdate);
          socket.off('astrologer_availability_updated', handleAstrologerAvailabilityUpdate);
          // Note: booking_status_update cleanup not needed (handled by global socketService)
          socket.off('user_pending_bookings_updated', handleUserPendingBookingUpdates);
          socket.off('session_end', handleSessionEnd);
          socket.off('session_ended', handleSessionEnd);
          // Removed setupListeners references as they were undefined
          socket.off('booking_rejected');
          socket.off('booking_auto_cancelled');
          socket.off('voice_consultation_initiated');
          socket.off('voice_call_initiated');
          socket.off('voice_call_failed');
        }
      };
    
  }, [socket, handleAstrologerStatusUpdate, handleAstrologerAvailabilityUpdate, handleBookingStatusUpdate, handleUserPendingBookingUpdates, handleSessionEnd]);

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
            Welcome, {user?.name || 'User'}!
          </Text>
          {/* <Text style={styles.subGreeting}>
            Find your perfect astrologer
          </Text> */}
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
            onPress={() => navigation.navigate('AddUserProfile')}
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

  // Render horizontal astrologers section
  const renderAstrologersSection = (onlineAstrologers) => {
    return (
      <View style={styles.astrologersSection}>
        {/* Section Header */}
        <View style={styles.astrologersHeader}>
          <Text style={styles.sectionTitle}>All Astrologers ({onlineAstrologers.length})</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Astrologers')}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#F97316" />
          </TouchableOpacity>
        </View>
        
        {/* Horizontal Scrollable List */}
        <FlatList
          data={onlineAstrologers}
          renderItem={({ item, index }) => (
            <View style={{
              marginLeft: index === 0 ? 20 : 0,
              marginRight: index === onlineAstrologers.length - 1 ? 20 : 12
            }}>
              {renderHorizontalAstrologerCard(item)}
            </View>
          )}
          keyExtractor={(item) => item._id || item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    );
  };

  // Render horizontal astrologer card (optimized for horizontal scroll)
  const renderHorizontalAstrologerCard = (astrologer) => {
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

    return (
      <TouchableOpacity
        style={[
          styles.horizontalAstrologerCard,
          { 
            shadowColor: getStatusOutlineColor(astrologer),
            borderColor: getStatusOutlineColor(astrologer) + '20',
          }
        ]}
        onPress={() => navigation.navigate('AstrologerProfile', { astrologer })}
        activeOpacity={0.9}
      >
        {/* Premium Background Gradient */}
        <View style={styles.cardGradientOverlay} />
        
        {/* Top Badge for Premium Astrologers */}
        {(astrologer.isPremium || astrologer.rating?.average >= 4.8) && (
          <View style={styles.premiumBadge}>
          
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
        )}
        
        <View style={styles.horizontalImageContainer}>
          <View style={[
            styles.horizontalAstrologerImageContainer,
            {
              borderColor: getStatusOutlineColor(astrologer),
              shadowColor: getStatusOutlineColor(astrologer),
            }
          ]}>
            <Image
              source={{
                uri: astrologer.imageUrl || astrologer.profileImage || 'https://via.placeholder.com/80x80?text=No+Image'
              }}
              style={styles.horizontalAstrologerImage}
            />
            {/* Enhanced Status Badge */}
            <View style={[
              styles.horizontalStatusBadge,
              { backgroundColor: getStatusOutlineColor(astrologer) }
            ]}>
              <View style={styles.horizontalStatusDot} />
            </View>
            {/* Glow Effect for Online Status */}
            {getStatusText(astrologer) === 'Available' && (
              <View style={styles.onlineGlowEffect} />
            )}
          </View>
        </View>
        
        <View style={styles.horizontalAstrologerInfo}>
          <Text style={styles.horizontalAstrologerName} numberOfLines={1}>
            {astrologer.displayName || astrologer.name}
          </Text>
          
          {/* Specialization Pills */}
          <View style={styles.specializationContainer}>
            <Text style={styles.specializationText} numberOfLines={1}>
              {astrologer.specialties?.[0] || astrologer.specialization || 'Vedic Astrology'}
            </Text>
          </View>
          
          <Text style={styles.horizontalExperience}>
            {astrologer.experience || '8'}+ years exp
          </Text>
          
          {/* Rating and Price Row */}
          <View style={styles.ratingPriceRow}>
            {/* Rating Section */}
            <View style={styles.compactRatingContainer}>
              <View style={styles.starRatingWrapper}>
                <FontAwesome name="star" size={12} color="#FFD700" />
                <Text style={styles.horizontalRating}>
                  {astrologer.rating?.average ? astrologer.rating.average.toFixed(1) : (astrologer.rating && typeof astrologer.rating === 'number' ? astrologer.rating.toFixed(1) : '4.8')}
                </Text>
              </View>
            </View>
            
            {/* Price Section */}
            <View style={styles.compactPriceContainer}>
              <Text style={styles.compactPriceAmount}>
                ₹{astrologer.consultationPrices?.chat || astrologer.chatRate || '50'}
              </Text>
              <Text style={styles.compactPriceUnit}>/min</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
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
              {item.specialties?.join(', ') || item.specialization || 'Vedic Astrology, Numerology'}
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
    const isExpired = booking.status === 'expired' || booking.status === 'cancelled' || booking.status === 'failed';
    
    // Don't render expired, cancelled, or failed bookings
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
        
        {/* Booking Time and Status Section */}
        <View style={styles.bookingTimeStatusSection}>
          <View style={styles.bookingTimeContainer}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.bookingTimeLabel}>Booking Time:</Text>
            <Text style={styles.bookingTimeValue}>
              {booking.createdAt ? 
                new Date(booking.createdAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : 
                'N/A'
              }
            </Text>
          </View>
          
          <View style={styles.bookingStatusContainer}>
            <Ionicons name="information-circle-outline" size={16} color={getStatusColor()} />
            <Text style={styles.bookingStatusLabel}>Status:</Text>
            <Text style={[styles.bookingStatusValue, { color: getStatusColor() }]}>
              {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'Unknown'}
            </Text>
          </View>
        </View>
        
        <View style={styles.pendingBookingStatus}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusMessage, { color: getStatusColor() }]}>
            {getStatusMessage()}
          </Text>
        </View>

        <View style={styles.pendingBookingActions}>
          {/* Cancel Button - Show if booking is pending or accepted and session hasn't started, but NOT for voice consultations */}
          {booking.type !== 'voice' && (booking.status === 'pending' || (booking.status === 'accepted' && !booking.sessionStarted)) && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(booking)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {/* Join Session Button - Show if accepted and session hasn't started, but NOT for voice consultations */}
          {booking.type !== 'voice' && isAccepted && !booking.sessionStarted && (
            <TouchableOpacity
              style={styles.joinSessionButton}
              onPress={() => handleJoinSession(booking)}
            >
              <Ionicons name="play-circle" size={20} color="#fff" />
              <Text style={styles.joinSessionText}>Join Session</Text>
            </TouchableOpacity>
          )}
          
          {/* Rejoin Session Button - Show if session is active and user can rejoin, but NOT for voice consultations or completed sessions */}
          {booking.type !== 'voice' && booking.sessionStarted && booking.status === 'accepted' && booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.rejoinSessionButton}
              onPress={() => handleJoinSession(booking)}
            >
              <Ionicons name="refresh-circle" size={20} color="#fff" />
              <Text style={styles.rejoinSessionText}>Rejoin Session</Text>
            </TouchableOpacity>
          )}
          
          {/* Voice consultation info message */}
          {booking.type === 'voice' && isAccepted && (
            <View style={styles.voiceConsultationInfo}>
              <Ionicons name="call" size={20} color="#10B981" />
              <Text style={styles.voiceConsultationText}>
                You will receive a phone call shortly. Please answer to connect with the astrologer.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Note: renderAstrologersSection removed - now handled in single FlatList



  // Prepare data for single FlatList
  const getFlatListData = () => {
    const data = [
      { type: 'header', id: 'header' },
      { type: 'bannerCarousel', id: 'bannerCarousel' }
    ];
    
    // Only add free chat section if globally enabled
    if (freeChatEnabled) {
      data.push({ type: 'freeChat', id: 'freeChat' });
    }

    // Add prepaid offers section if there are any
    console.log('🏠 [HOME_SCREEN] Prepaid offers count:', prepaidOffers.length, prepaidOffers);
    if (prepaidOffers.length > 0) {
      console.log('🏠 [HOME_SCREEN] Adding prepaid offers to data array');
      data.push({ type: 'prepaidOffersHeader', id: 'prepaidOffersHeader' });
      data.push(...prepaidOffers.map((offer, index) => ({
        type: 'prepaidOffer',
        id: `prepaid_offer_${offer._id || offer.offerId || index}`,
        data: offer
      })));
    }

    // Add daily horoscope section
    data.push({ type: 'dailyHoroscope', id: 'dailyHoroscope' });

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

    // Add astrologers section - filter to show only online astrologers
    const onlineAstrologers = astrologers.filter(astrologer => {
      // Check if astrologer is online based on onlineStatus field
      const isOnline = astrologer.onlineStatus?.chat === 1 || astrologer.onlineStatus?.call === 1;
      return isOnline;
    });
    
    // Add astrologers section as a single horizontal scrollable component
    if (onlineAstrologers.length > 0) {
      data.push({ 
        type: 'astrologersSection', 
        id: 'astrologersSection',
        data: onlineAstrologers
      });
    }

    // Add e-pooja section - TEMPORARILY HIDDEN
    // data.push({ type: 'epoojaSection', id: 'epoojaSection' });

    // Add blog section
    data.push({ type: 'blogSection', id: 'blogSection' });
    
    return data;
  };

  // Handle banner press events
  const handleBannerPress = (index) => {
    console.log(`Banner ${index + 1} pressed`);
    // Add your banner press logic here
    // For example: navigation.navigate('BannerDetail', { bannerId: index });
  };

  // Render different item types
  const renderFlatListItem = ({ item }) => {
    console.log('🏠 [HOME_SCREEN] Rendering item type:', item.type, item.id);
    switch (item.type) {
      case 'header':
        return renderHeader();
      case 'bannerCarousel':
        return <BannerCarousel onBannerPress={handleBannerPress} />;
      case 'freeChat':
        return <FreeChatCard navigation={navigation} />;
      case 'prepaidOffersHeader':
        return (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <MaterialIcons name="local-fire-department" size={24} color="#FF6B35" />
              <Text style={styles.sectionHeaderTitle}>Special Offers</Text>
            </View>
            <Text style={styles.sectionHeaderSubtitle}>Limited time offers just for you</Text>
          </View>
        );
      case 'prepaidOffer':
        console.log('🏠 [HOME_SCREEN] Rendering PrepaidOfferCard with data:', item.data);
        return (
          <PrepaidOfferCard 
            offer={item.data} 
            onOfferUsed={handleOfferUsed}
            onRefresh={refreshPrepaidOffers}
            navigation={navigation}
          />
        );
      case 'dailyHoroscope':
        return (
          <View style={styles.horoscopeSection}>
            <TouchableOpacity
              style={styles.enhancedHoroscopeCard}
              onPress={() => navigation.navigate('DailyHoroscope')}
              activeOpacity={0.8}
            >
              <View style={styles.horoscopeCardBackground}>
                <View style={styles.horoscopeCardContent}>
                  <View style={styles.horoscopeLeftContent}>
                    <View style={styles.enhancedIconContainer}>
                      <Ionicons name="star" size={24} color="#FFD700" />
                      <View style={styles.iconGlow} />
                    </View>
                    <View style={styles.horoscopeTextContent}>
                      <Text style={styles.enhancedHoroscopeTitle}>Daily Horoscope</Text>
                      <Text style={styles.enhancedHoroscopeSubtitle}>Discover what the stars reveal for you today</Text>
                      <View style={styles.horoscopeBadge}>
                        <Text style={styles.badgeText}>FREE</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.horoscopeRightContent}>
                    <View style={styles.zodiacSymbols}>
                      <Text style={styles.zodiacSymbol}>♈</Text>
                      <Text style={styles.zodiacSymbol}>♉</Text>
                      <Text style={styles.zodiacSymbol}>♊</Text>
                    </View>
                    <View style={styles.arrowContainer}>
                      <Ionicons name="chevron-forward" size={18} color="#F97316" />
                    </View>
                  </View>
                </View>
                <View style={styles.cardShimmer} />
              </View>
            </TouchableOpacity>
          </View>
        );
      case 'blogSection':
        return <BlogSection navigation={navigation} />;
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
      case 'astrologersSection':
        return renderAstrologersSection(item.data);
      case 'epoojaSection':
        return <EPoojaHomeSection />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" translucent={false} />
      
      <View style={styles.contentWrapper}>
        <View style={styles.container}>
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
        </View>
      </View>

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
      
      {/* Rejoin Chat Bottom Sheet */}
      <RejoinChatBottomSheet
        visible={showRejoinBottomSheet}
        onClose={handleBottomSheetClose}
        sessionData={activeSessionData}
        onRejoinPress={handleRejoinChat}
        remainingTime={remainingTime}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#fff', // Match header background
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500, // Responsive max width for tablets
    alignSelf: 'center',
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 10, // SafeAreaView now handles safe area properly
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    minHeight: 80,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
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
  astrologersSection: {
    marginTop: 20,
    paddingTop: 8,
  },
  astrologersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  // Booking Time and Status Styles
  bookingTimeStatusSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bookingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingTimeLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 8,
  },
  bookingTimeValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  bookingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingStatusLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 8,
  },
  bookingStatusValue: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
  voiceConsultationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  voiceConsultationText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    lineHeight: 20,
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
  // Horizontal Astrologers List Styles
  horizontalAstrologersList: {
    paddingVertical: 8,
  },
  horizontalAstrologerCard: {
    width: 216,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  horizontalImageContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  horizontalAstrologerImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  horizontalAstrologerImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F3F4F6',
  },
  horizontalStatusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  horizontalStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  horizontalAstrologerInfo: {
    alignItems: 'center',
  },
  horizontalAstrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  horizontalRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  horizontalRating: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 2,
  },
  horizontalExperience: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  horizontalPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
    marginBottom: 6,
    textAlign: 'center',
  },
  horizontalStatusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  horizontalStatusText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Enhanced Premium UI Elements
  cardGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    zIndex: -1,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 10,
  },
  premiumText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFD700',
    marginLeft: 2,
    letterSpacing: 0.5,
  },
  onlineGlowEffect: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 42,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    zIndex: -1,
  },
  starRatingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  specializationContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
    alignSelf: 'center',
  },
  specializationText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  enhancedPriceContainer: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
    alignItems: 'center',
  },
  priceMainSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  enhancedPriceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.5,
  },
  enhancedPriceUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F97316',
    marginLeft: 2,
  },
  enhancedPriceLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  // Rating and Price Row Layout
  ratingPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  compactRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  compactPriceAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F97316',
    letterSpacing: 0.5,
  },
  compactPriceUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F97316',
    marginLeft: 1,
  },
  // Enhanced Daily Horoscope Card Styles
  horoscopeSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  enhancedHoroscopeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  horoscopeCardBackground: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
  },
  horoscopeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 100,
  },
  horoscopeLeftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  enhancedIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    opacity: 0.6,
  },
  horoscopeTextContent: {
    flex: 1,
  },
  enhancedHoroscopeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  enhancedHoroscopeSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 8,
  },
  horoscopeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  horoscopeRightContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  zodiacSymbols: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  zodiacSymbol: {
    fontSize: 16,
    color: '#F97316',
    marginHorizontal: 2,
    opacity: 0.7,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
    opacity: 0.3,
  },
  // Prepaid offers section styles
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  sectionHeaderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
  },
});

export default HomeScreen;
