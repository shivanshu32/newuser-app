import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { bookingsAPI } from '../services/api';

/**
 * Button component for initiating real-time booking requests to astrologers
 * @param {Object} props
 * @param {Object} props.astrologer - Astrologer data
 * @param {string} props.type - Consultation type (chat, voice, video)
 * @param {Function} props.onBookingInitiated - Callback when booking is initiated
 * @param {Function} props.onBookingResponse - Callback when booking response is received
 */
const RealTimeBookingButton = ({ astrologer, type, onBookingInitiated, onBookingResponse }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, pending, accepted, rejected, expired
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const { socket } = useSocket();

  // Setup socket listeners for booking responses
  useEffect(() => {
    if (!socket?.connected || !currentBookingId) return;

    const handleBookingAccepted = (data) => {
      if (data.bookingId === currentBookingId) {
        setStatus('accepted');
        setLoading(false);
        if (onBookingResponse) {
          onBookingResponse('accepted', data);
        }
        Alert.alert(
          'Booking Accepted!',
          `${astrologer.name} has accepted your consultation request.`,
          [{ text: 'OK' }]
        );
      }
    };

    const handleBookingRejected = (data) => {
      if (data.bookingId === currentBookingId) {
        setStatus('rejected');
        setLoading(false);
        setCurrentBookingId(null);
        if (onBookingResponse) {
          onBookingResponse('rejected', data);
        }
        Alert.alert(
          'Booking Declined',
          `${astrologer.name} is not available for consultation right now.`,
          [{ text: 'OK', onPress: () => setStatus('idle') }]
        );
      }
    };

    const handleBookingExpired = (data) => {
      if (data.bookingId === currentBookingId) {
        setStatus('expired');
        setLoading(false);
        setCurrentBookingId(null);
        if (onBookingResponse) {
          onBookingResponse('expired', data);
        }
        Alert.alert(
          'Booking Expired',
          'The astrologer did not respond within the time limit.',
          [{ text: 'OK', onPress: () => setStatus('idle') }]
        );
      }
    };

    const handleBookingCancelled = (data) => {
      if (data.bookingId === currentBookingId) {
        setStatus('cancelled');
        setLoading(false);
        setCurrentBookingId(null);
        if (onBookingResponse) {
          onBookingResponse('cancelled', data);
        }
        Alert.alert(
          'Booking Cancelled',
          'The booking has been cancelled.',
          [{ text: 'OK', onPress: () => setStatus('idle') }]
        );
      }
    };

    // Listen for booking lifecycle events
    socket.on('booking_accepted', handleBookingAccepted);
    socket.on('booking_rejected', handleBookingRejected);
    socket.on('booking_expired', handleBookingExpired);
    socket.on('booking_cancelled', handleBookingCancelled);

    return () => {
      socket.off('booking_accepted', handleBookingAccepted);
      socket.off('booking_rejected', handleBookingRejected);
      socket.off('booking_expired', handleBookingExpired);
      socket.off('booking_cancelled', handleBookingCancelled);
    };
  }, [socket, currentBookingId, astrologer.name, onBookingResponse]);

  // Determine button text based on status
  const getButtonText = () => {
    switch (status) {
      case 'idle':
        return `Start Instant ${type.charAt(0).toUpperCase() + type.slice(1)}`;
      case 'pending':
        return 'Waiting for response...';
      case 'accepted':
        return 'Connecting...';
      case 'rejected':
        return 'Request declined';
      case 'expired':
        return 'Request expired';
      case 'cancelled':
        return 'Request cancelled';
      default:
        return 'Start Instant Consultation';
    }
  };

  // Get button color based on status
  const getButtonColor = () => {
    switch (status) {
      case 'idle':
        return '#FF5722';
      case 'pending':
        return '#FF9800';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
      case 'expired':
      case 'cancelled':
        return '#F44336';
      default:
        return '#FF5722';
    }
  };

  // Handle booking request
  const handleBookingRequest = async () => {
    if (status !== 'idle') return;

    try {
      setLoading(true);
      setStatus('pending');
      
      if (onBookingInitiated) {
        onBookingInitiated();
      }
      
      // Prepare booking data
      const bookingData = {
        astrologerId: astrologer._id,
        type,
        userMessage: `Instant ${type} consultation request`,
        // Schedule for immediate consultation (current time)
        scheduledTime: new Date().toISOString()
      };
      
      // Create booking via API
      const response = await bookingsAPI.create(bookingData);
      
      if (response.data && response.data.success) {
        const booking = response.data.data;
        setCurrentBookingId(booking._id);
        
        Alert.alert(
          'Booking Request Sent',
          `Your ${type} consultation request has been sent to ${astrologer.name}. Please wait for their response.`,
          [{ text: 'OK' }]
        );
      } else {
        throw new Error(response.data?.message || 'Failed to create booking');
      }
      
    } catch (error) {
      console.error('Booking request failed:', error);
      setLoading(false);
      setStatus('idle');
      
      Alert.alert(
        'Booking Failed',
        error.message || 'Failed to send booking request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle cancel request (for pending bookings)
  const handleCancelRequest = async () => {
    if (!currentBookingId) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this booking request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await bookingsAPI.cancel(currentBookingId, 'User cancelled');
              setStatus('idle');
              setCurrentBookingId(null);
              setLoading(false);
            } catch (error) {
              console.error('Failed to cancel booking:', error);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          }
        }
      ]
    );
  };

  const isDisabled = loading || ['rejected', 'expired', 'cancelled'].includes(status);
  const showCancelButton = status === 'pending' && currentBookingId;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: getButtonColor() },
          isDisabled && styles.disabledButton
        ]}
        onPress={handleBookingRequest}
        disabled={isDisabled}
      >
        {loading && status === 'pending' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        )}
      </TouchableOpacity>

      {showCancelButton && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelRequest}
        >
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </TouchableOpacity>
      )}


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  button: {
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF5722',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FF5722',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RealTimeBookingButton;
