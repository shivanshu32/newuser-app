import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { initiateRealTimeBooking } from '../services/socketService';

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
  const [status, setStatus] = useState('idle'); // idle, pending, accepted, rejected

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
        return 'Request rejected';
      default:
        return 'Start Instant Consultation';
    }
  };

  // Handle booking request
  const handleBookingRequest = async () => {
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
        notes: `Instant ${type} consultation request`
      };
      
      // Send booking request via socket
      const response = await initiateRealTimeBooking(bookingData);
      
      setLoading(false);
      setStatus(response.status);
      
      if (onBookingResponse) {
        onBookingResponse(response);
      }
      
      // Handle response based on status
      if (response.status === 'rejected') {
        Alert.alert(
          'Booking Rejected',
          response.message || 'Astrologer is not available right now.',
          [{ text: 'OK', onPress: () => setStatus('idle') }]
        );
      }
    } catch (error) {
      console.error('Booking request error:', error);
      setLoading(false);
      setStatus('idle');
      
      Alert.alert(
        'Booking Error',
        error.message || 'Failed to send booking request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Determine button style based on status
  const getButtonStyle = () => {
    switch (status) {
      case 'idle':
        return styles.button;
      case 'pending':
        return [styles.button, styles.pendingButton];
      case 'accepted':
        return [styles.button, styles.acceptedButton];
      case 'rejected':
        return [styles.button, styles.rejectedButton];
      default:
        return styles.button;
    }
  };

  // Determine if button should be disabled
  const isDisabled = status === 'pending' || status === 'accepted';

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={handleBookingRequest}
      disabled={isDisabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <View style={styles.buttonContent}>
          {status === 'pending' && (
            <ActivityIndicator size="small" color="#FFFFFF" style={styles.indicator} />
          )}
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pendingButton: {
    backgroundColor: '#FFA000',
  },
  acceptedButton: {
    backgroundColor: '#4CAF50',
  },
  rejectedButton: {
    backgroundColor: '#F44336',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  indicator: {
    marginRight: 8,
  },
});

export default RealTimeBookingButton;
