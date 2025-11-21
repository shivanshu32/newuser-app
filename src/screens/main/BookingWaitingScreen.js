import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSocket } from '../../context/SocketContext';
import { bookingsAPI, API_BASE } from '../../services/api';
import { useBookingPopup } from '../../context/BookingPopupContext';

const BookingWaitingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { socket } = useSocket();
  const { showBookingAcceptedPopup } = useBookingPopup();
  
  console.log(' [BookingWaiting] Component mounting...');
  console.log(' [BookingWaiting] Route params:', JSON.stringify(route.params, null, 2));
  
  const { 
    bookingId, 
    sessionId, 
    astrologer, 
    bookingType, 
    isPrepaidOffer,
    isPrepaidCard,
    sessionType,
    duration,
    totalAmount 
  } = route.params || {};
  
  // For prepaid offers, use sessionId as the identifier
  const waitingId = isPrepaidOffer ? sessionId : bookingId;
  
  console.log(' [BookingWaiting] Extracted params:', {
    bookingId,
    sessionId,
    waitingId,
    astrologer: astrologer ? { id: astrologer._id || astrologer.id, name: astrologer.displayName || astrologer.name } : null,
    bookingType,
    isPrepaidOffer,
    isPrepaidCard,
    sessionType
  });
  
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('pending');

  useEffect(() => {
    console.log(' [BookingWaiting] useEffect running...');
    
    // Validate required params
    if (!waitingId || !astrologer) {
      console.error(' [BookingWaiting] Missing required params:', { waitingId, astrologer, isPrepaidOffer });
      Alert.alert(
        'Navigation Error',
        'Missing booking information. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    // Set up socket listeners for booking status updates
    console.log(' [BookingWaiting] Socket connection:', socket ? 'connected' : 'not connected');
    
    if (socket) {
      console.log(' [BookingWaiting] Setting up socket listeners...');
      console.log(' [BookingWaiting] Socket ID:', socket.id);
      console.log(' [BookingWaiting] Socket connected:', socket.connected);
      console.log(' [BookingWaiting] isPrepaidOffer:', isPrepaidOffer);
      
      socket.on('booking_status_update', handleBookingStatusUpdate);
      socket.on('booking_auto_cancelled', handleBookingAutoCancelled);
      socket.on('booking_cancelled', handleBookingCancelled);
      
      // Add prepaid offer/card specific listeners
      if (isPrepaidOffer || isPrepaidCard) {
        console.log('🎯 [BookingWaiting] Setting up prepaid listeners for sessionId:', sessionId, { isPrepaidOffer, isPrepaidCard });
        socket.on('prepaid_chat_accepted', handlePrepaidChatAccepted);
        socket.on('prepaid_chat_rejected', handlePrepaidChatRejected);
        socket.on('prepaid_chat_timeout', handlePrepaidChatTimeout);
        socket.on('prepaid_chat_cancelled', handlePrepaidChatCancelled);
        
        // Test socket connection by emitting a test event
        socket.emit('test_connection', { 
          sessionId: sessionId, 
          userId: waitingId,
          message: 'BookingWaitingScreen connected and listening for prepaid events'
        }, (response) => {
          console.log('🔍 [BookingWaiting] Test connection response:', response);
        });
      }
    } else {
      console.error(' [BookingWaiting] No socket connection available');
    }

    // Start countdown timer
    console.log(' [BookingWaiting] Starting countdown timer...');
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-cancellation will be handled by backend
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log(' [BookingWaiting] Cleanup running...');
      clearInterval(timer);
      if (socket) {
        socket.off('booking_status_update', handleBookingStatusUpdate);
        socket.off('booking_auto_cancelled', handleBookingAutoCancelled);
        socket.off('booking_cancelled', handleBookingCancelled);
        
        // Remove prepaid offer/card specific listeners
        if (isPrepaidOffer || isPrepaidCard) {
          socket.off('prepaid_chat_accepted', handlePrepaidChatAccepted);
          socket.off('prepaid_chat_rejected', handlePrepaidChatRejected);
          socket.off('prepaid_chat_timeout', handlePrepaidChatTimeout);
          socket.off('prepaid_chat_cancelled', handlePrepaidChatCancelled);
        }
      }
    };
  }, [waitingId, astrologer, navigation, isPrepaidOffer, isPrepaidCard]);

  console.log('🔍 [BookingWaiting] Render state:', {
    timeLeft,
    isLoading,
    bookingStatus
  });

  // Early return with loading state if missing critical data
  if (!waitingId || !astrologer) {
    console.log('🔍 [BookingWaiting] Missing critical data, showing loading...');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#8E8E93' }}>
            Loading booking information...
          </Text>
        </View>
      </View>
    );
  }

  console.log('🔍 [BookingWaiting] About to render main UI...');

  const handleBookingStatusUpdate = (data) => {
    console.log('📨 [BookingWaiting] Received booking status update:', data);
    console.log('📨 [BookingWaiting] Current bookingId:', bookingId);
    console.log('📨 [BookingWaiting] Data bookingId:', data.bookingId);
    console.log('📨 [BookingWaiting] BookingId match:', data.bookingId === bookingId);
    
    // Check if this update is for our current waiting session
    const isOurSession = isPrepaidOffer ? (data.sessionId === sessionId) : (data.bookingId === bookingId);
    
    if (isOurSession) {
      console.log('✅ [BookingWaiting] Session matches - processing status update');
      setBookingStatus(data.status);
      
      if (data.status === 'accepted') {
        console.log('🎉 [BookingWaiting] Booking accepted - global socketService will handle popup');
        console.log('🎉 [BookingWaiting] BookingWaitingScreen only handles navigation/state updates');
        
        // Note: Popup is now handled globally by socketService to ensure it works
        // regardless of which screen the user is on. BookingWaitingScreen only
        // handles local state updates and navigation if needed.
        
        // Update local state to reflect acceptance
        console.log('✅ [BookingWaiting] Booking acceptance handled by global event system');
        
        // Optional: Navigate away from waiting screen since booking is accepted
        // navigation.goBack(); // Uncomment if you want to auto-navigate
      } else if (data.status === 'rejected') {
        Alert.alert(
          'Booking Rejected',
          'Unfortunately, the astrologer is not available at the moment. Please try again later or choose a different astrologer.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    }
  };

  const handleBookingAutoCancelled = (data) => {
    console.log(' [BookingWaiting] Received auto-cancellation:', data);
    
    if (data.bookingId === bookingId) {
      Alert.alert(
        'Booking Timed Out',
        'Your booking request has been automatically cancelled as the astrologer did not respond within 2 minutes. Please try again or choose a different astrologer.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const handleBookingCancelled = (data) => {
    console.log(' [BookingWaiting] Received cancellation confirmation:', data);
    navigation.goBack();
  };

  // Prepaid offer specific handlers
  const handlePrepaidChatAccepted = (data) => {
    console.log('🎉 [BookingWaiting] Prepaid chat accepted:', data);
    console.log('🎉 [BookingWaiting] Current sessionId:', sessionId);
    console.log('🎉 [BookingWaiting] Data sessionId:', data.sessionId);
    console.log('🎉 [BookingWaiting] SessionId match:', data.sessionId === sessionId);
    console.log('🎉 [BookingWaiting] Data sessionIdentifier:', data.sessionIdentifier);
    console.log('🎉 [BookingWaiting] SessionIdentifier match:', data.sessionIdentifier === sessionId);
    
    // Check both sessionId and sessionIdentifier for compatibility
    const isOurSession = (data.sessionId === sessionId) || (data.sessionIdentifier === sessionId);
    
    if (isOurSession) {
      console.log('✅ [BookingWaiting] Our prepaid session was accepted - navigating to chat');
      setBookingStatus('accepted');
      
      // Navigate to EnhancedChatScreen for prepaid offers (uses consultation room system)
      const navigationParams = {
        bookingId: data.sessionId || data.sessionIdentifier, // Use sessionId as bookingId for prepaid offers
        sessionId: data.sessionId || data.sessionIdentifier,
        astrologer: astrologer,
        sessionType: 'prepaid_offer',
        duration: (data.sessionDuration || 300), // 5 minutes in seconds
        isPrepaid: true,
        isPrepaidOffer: true,
        bookingType: 'chat',
        consultationType: 'chat'
      };
      
      console.log('🚀 [BookingWaiting] Navigation params:', navigationParams);
      
      navigation.replace('EnhancedChat', navigationParams);
    } else {
      console.log('❌ [BookingWaiting] Prepaid session acceptance not for our session');
      console.log('❌ [BookingWaiting] Expected:', sessionId);
      console.log('❌ [BookingWaiting] Received sessionId:', data.sessionId);
      console.log('❌ [BookingWaiting] Received sessionIdentifier:', data.sessionIdentifier);
    }
  };

  const handlePrepaidChatRejected = (data) => {
    console.log('❌ [BookingWaiting] Prepaid chat rejected:', data);
    
    if (data.sessionId === sessionId) {
      console.log('❌ [BookingWaiting] Our prepaid session was rejected');
      setBookingStatus('rejected');
      
      Alert.alert(
        'Session Unavailable',
        'The astrologer is currently unavailable for your prepaid chat session. Please try again later.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const handlePrepaidChatTimeout = (data) => {
    console.log('⏰ [BookingWaiting] Prepaid chat timed out:', data);
    
    if (data.sessionId === sessionId || data.sessionIdentifier === sessionId) {
      console.log('⏰ [BookingWaiting] Our prepaid session timed out');
      setBookingStatus('timeout');
      
      const sessionTypeText = isPrepaidCard ? 'prepaid card' : 'prepaid offer';
      Alert.alert(
        'Request Timed Out',
        `The astrologer did not respond in time. Your ${sessionTypeText} is still available - you can try again with the same or a different astrologer.`,
        [
          {
            text: 'Try Again',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const handlePrepaidChatCancelled = (data) => {
    console.log('🚫 [BookingWaiting] Prepaid chat cancelled:', data);
    
    // Check if this cancellation is for our session
    const isOurSession = (data.sessionId === bookingId) || (data.sessionIdentifier === sessionId);
    
    if (isOurSession) {
      console.log('✅ [BookingWaiting] Our prepaid session cancellation confirmed');
      setBookingStatus('cancelled');
      
      // If we have a message from backend, show it
      if (data.message && data.canRetry) {
        Alert.alert(
          'Session Cancelled',
          data.message,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        // Just navigate back without alert since we already showed one
        navigation.goBack();
      }
    }
  };

  const handleCancelBooking = async () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking request?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: confirmCancelBooking
        }
      ]
    );
  };

  const confirmCancelBooking = async () => {
    setIsLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Use different endpoints based on session type
      let cancelUrl;
      let cancelId;
      let cancelType;
      
      if (isPrepaidOffer || isPrepaidCard) {
        // For prepaid offers/cards, use session cancellation endpoint
        // bookingId param contains the session MongoDB ObjectId
        cancelId = bookingId;
        cancelUrl = `${API_BASE}/prepaid-offers/sessions/${cancelId}/cancel`;
        cancelType = isPrepaidCard ? 'prepaid card session' : 'prepaid offer session';
        console.log('🔄 [BookingWaiting] Cancelling prepaid session:', {
          cancelId,
          isPrepaidCard,
          isPrepaidOffer,
          sessionId,
          bookingId,
          cancelUrl
        });
      } else {
        // For normal bookings, use booking cancellation endpoint
        cancelId = bookingId;
        cancelUrl = `${API_BASE}/bookings/${cancelId}/cancel`;
        cancelType = 'booking';
        console.log('🔄 [BookingWaiting] Cancelling booking:', { cancelId, cancelUrl });
      }
      
      const response = await fetch(cancelUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'User cancelled while waiting'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to cancel ${cancelType}`);
      }

      console.log(`✅ [BookingWaiting] ${cancelType} cancelled successfully:`, data);
      
      // Show appropriate message based on session type
      const alertTitle = (isPrepaidOffer || isPrepaidCard) ? 'Session Cancelled' : 'Booking Cancelled';
      const alertMessage = (isPrepaidOffer || isPrepaidCard)
        ? data.data?.message || `Your ${cancelType} request has been cancelled. Your ${isPrepaidCard ? 'prepaid card' : 'prepaid offer'} is still available.`
        : 'Your booking request has been cancelled successfully.';
      
      Alert.alert(
        alertTitle,
        alertMessage,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('❌ [BookingWaiting] Error cancelling:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to cancel. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (bookingStatus) {
      case 'pending': return '#FF9500';
      case 'accepted': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'cancelled': return '#8E8E93';
      default: return '#FF9500';
    }
  };

  const getStatusText = () => {
    switch (bookingStatus) {
      case 'pending': return 'Waiting for astrologer response...';
      case 'accepted': return 'Booking accepted!';
      case 'rejected': return 'Booking rejected';
      case 'cancelled': return 'Booking cancelled';
      default: return 'Processing...';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}> Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.astrologerCard}>
          <Image 
            source={{ uri: astrologer.profileImage || 'https://via.placeholder.com/80' }}
            style={styles.astrologerImage}
          />
          <Text style={styles.astrologerName}>{astrologer.displayName}</Text>
          <Text style={styles.consultationType}>
            {bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Consultation
          </Text>
        </View>

        <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
          <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
          
          {bookingStatus === 'pending' && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerLabel}>Time remaining:</Text>
              <Text style={[styles.timerText, { color: timeLeft <= 30 ? '#FF3B30' : '#FF9500' }]}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          )}
        </View>

        {bookingStatus === 'pending' && (
          <View style={styles.actionsContainer}>
            <Text style={styles.waitingMessage}>
              We've sent your booking request to {astrologer.displayName}. 
              They have 2 minutes to respond.
            </Text>
            
            <TouchableOpacity 
              style={[styles.cancelButton, isLoading && styles.disabledButton]}
              onPress={handleCancelBooking}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {bookingStatus === 'accepted' && (
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => navigation.navigate('PendingConsultations')}
          >
            <Text style={styles.joinButtonText}>Join Consultation</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  astrologerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  astrologerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: 16,
    color: '#8E8E93',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    alignItems: 'center',
  },
  waitingMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BookingWaitingScreen;
