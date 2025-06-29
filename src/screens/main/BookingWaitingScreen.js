import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { socketService } from '../../services/socketService';
import { bookingsAPI } from '../../services/api';

const BookingWaitingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  console.log(' [BookingWaiting] Component mounting...');
  console.log(' [BookingWaiting] Route params:', JSON.stringify(route.params, null, 2));
  
  const { bookingId, astrologer, bookingType } = route.params || {};
  
  console.log(' [BookingWaiting] Extracted params:', {
    bookingId,
    astrologer: astrologer ? { id: astrologer._id, name: astrologer.displayName } : null,
    bookingType
  });
  
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [isLoading, setIsLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState('pending');

  useEffect(() => {
    console.log(' [BookingWaiting] useEffect running...');
    
    // Validate required params
    if (!bookingId || !astrologer) {
      console.error(' [BookingWaiting] Missing required params:', { bookingId, astrologer });
      Alert.alert(
        'Navigation Error',
        'Missing booking information. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }
    
    // Set up socket listeners for booking status updates
    const socket = socketService.getSocket();
    console.log(' [BookingWaiting] Socket connection:', socket ? 'connected' : 'not connected');
    
    if (socket) {
      console.log(' [BookingWaiting] Setting up socket listeners...');
      socket.on('booking_status_update', handleBookingStatusUpdate);
      socket.on('booking_auto_cancelled', handleBookingAutoCancelled);
      socket.on('booking_cancelled', handleBookingCancelled);
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
      }
    };
  }, [bookingId, astrologer, navigation]);

  console.log('🔍 [BookingWaiting] Render state:', {
    timeLeft,
    isLoading,
    bookingStatus
  });

  // Early return with loading state if missing critical data
  if (!bookingId || !astrologer) {
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
    console.log(' [BookingWaiting] Received booking status update:', data);
    
    if (data.bookingId === bookingId) {
      setBookingStatus(data.status);
      
      if (data.status === 'accepted') {
        Alert.alert(
          'Booking Accepted!',
          'Your booking has been accepted. You can now join the consultation.',
          [
            {
              text: 'Join Now',
              onPress: () => navigation.navigate('PendingConsultations')
            }
          ]
        );
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

      console.log(' [BookingWaiting] Cancelling booking:', bookingId);
      
      const response = await fetch(`${bookingsAPI.baseURL}/bookings/${bookingId}/cancel`, {
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
        throw new Error(data.message || 'Failed to cancel booking');
      }

      console.log(' [BookingWaiting] Booking cancelled successfully:', data);
      
      Alert.alert(
        'Booking Cancelled',
        'Your booking request has been cancelled successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error(' [BookingWaiting] Error cancelling booking:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to cancel booking. Please try again.'
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
    <View style={styles.container}>
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
    </View>
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
