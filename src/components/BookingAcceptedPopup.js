import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

/**
 * Popup component shown when astrologer accepts a booking request
 * Provides options to join the consultation immediately or dismiss
 */
const BookingAcceptedPopup = ({ 
  visible, 
  onClose, 
  bookingData,
  onJoinSession 
}) => {
  const [isJoining, setIsJoining] = useState(false);
  const navigation = useNavigation();

  const handleJoinSession = async () => {
    if (!bookingData) {
      Alert.alert('Error', 'Booking information not available');
      return;
    }

    setIsJoining(true);
    
    try {
      console.log(' [BookingAcceptedPopup] Joining session with data:', bookingData);
      
      // Call the parent handler to join the session
      if (onJoinSession) {
        await onJoinSession(bookingData);
      }
      
      console.log(' [BookingAcceptedPopup] Successfully joined session');
      
      // Close the popup - navigation will be handled by the parent
      onClose();
      
    } catch (error) {
      console.error(' [BookingAcceptedPopup] Error joining session:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleDismiss = () => {
    console.log(' [BookingAcceptedPopup] User dismissed popup');
    onClose();
  };

  if (!visible || !bookingData) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
            </View>
            <Text style={styles.title}>Booking Accepted!</Text>
            <Text style={styles.subtitle}>
              Your astrologer has accepted your {bookingData.type} consultation request
            </Text>
          </View>

          {/* Booking Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="person" size={20} color="#666" />
              <Text style={styles.detailText}>
                Astrologer: {bookingData.astrologerName || 'Professional Astrologer'}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons 
                name={bookingData.type === 'video' ? 'videocam' : 'call'} 
                size={20} 
                color="#666" 
              />
              <Text style={styles.detailText}>
                {bookingData.type === 'video' ? 'Video' : 'Voice'} Consultation
              </Text>
            </View>
            
            {bookingData.rate && (
              <View style={styles.detailRow}>
                <Ionicons name="cash" size={20} color="#666" />
                <Text style={styles.detailText}>
                  ₹{bookingData.rate}/min
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.joinButton]}
              onPress={handleJoinSession}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="videocam" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.joinButtonText}>Join Session</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.dismissButton]}
              onPress={handleDismiss}
              disabled={isJoining}
            >
              <Text style={styles.dismissButtonText}>Join Later</Text>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            You can also join the session later from your Bookings screen
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  iconContainer: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  detailsContainer: {
    marginBottom: 25,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 15,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 8,
  },
  dismissButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default BookingAcceptedPopup;
