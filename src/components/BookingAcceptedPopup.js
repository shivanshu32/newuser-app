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
    console.log(' [BookingAcceptedPopup] handleJoinSession called - button pressed!');
    console.log(' [BookingAcceptedPopup] bookingData:', JSON.stringify(bookingData, null, 2));
    console.log(' [BookingAcceptedPopup] onJoinSession prop:', typeof onJoinSession);
    
    if (!bookingData) {
      console.error(' [BookingAcceptedPopup] No booking data available');
      Alert.alert('Error', 'Booking information not available');
      return;
    }

    console.log(' [BookingAcceptedPopup] Setting isJoining to true');
    setIsJoining(true);
    
    try {
      console.log(' [BookingAcceptedPopup] Starting join session process with data:', JSON.stringify(bookingData, null, 2));
      
      // Call the parent handler to join the session
      if (onJoinSession) {
        console.log(' [BookingAcceptedPopup] Calling onJoinSession prop function...');
        await onJoinSession(bookingData);
        console.log(' [BookingAcceptedPopup] onJoinSession completed successfully');
      } else {
        console.error(' [BookingAcceptedPopup] onJoinSession prop is not provided or is null');
        Alert.alert('Error', 'Join session handler not available. Please try again.');
        return;
      }
      
      console.log(' [BookingAcceptedPopup] Successfully joined session, closing popup');
      
      // Close the popup - navigation will be handled by the parent
      onClose();
      
    } catch (error) {
      console.error(' [BookingAcceptedPopup] Error joining session:', error);
      console.error(' [BookingAcceptedPopup] Error stack:', error.stack);
      Alert.alert('Error', `Failed to join session: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      console.log(' [BookingAcceptedPopup] Setting isJoining to false');
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

  // Check if this is a voice consultation
  const isVoiceConsultation = bookingData.type === 'voice';

  console.log(' [BookingAcceptedPopup] Rendering popup with visible:', visible);
  console.log(' [BookingAcceptedPopup] BookingData for rendering:', JSON.stringify(bookingData, null, 2));
  console.log(' [BookingAcceptedPopup] Popup dimensions - width:', width, 'calculated width:', width * 0.9);
  
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
              <Ionicons 
                name={isVoiceConsultation ? "call" : "checkmark-circle"} 
                size={50} 
                color={isVoiceConsultation ? "#2196F3" : "#4CAF50"} 
              />
            </View>
            <Text style={styles.title}>
              {isVoiceConsultation ? 'Voice Call Connecting!' : 'Booking Accepted!'}
            </Text>
            <Text style={styles.subtitle}>
              {isVoiceConsultation 
                ? 'Your voice consultation is being connected. Please keep your phone available.' 
                : `Your astrologer has accepted your ${bookingData.type} consultation request`
              }
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
                name={bookingData.type === 'video' ? 'videocam' : bookingData.type === 'voice' ? 'call' : 'chatbubble'} 
                size={20} 
                color="#666" 
              />
              <Text style={styles.detailText}>
                {bookingData.type === 'video' ? 'Video' : bookingData.type === 'voice' ? 'Voice' : 'Chat'} Consultation
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

          {/* Conditional Action Buttons */}
          {isVoiceConsultation ? (
            /* Voice Consultation - No Join Button, Only Informational */
            <View style={styles.voiceInfoContainer}>
              <View style={styles.voiceInfoBox}>
                <Ionicons name="information-circle" size={24} color="#2196F3" />
                <Text style={styles.voiceInfoText}>
                  You will receive a phone call shortly from our system. Please answer the call to connect with your astrologer.
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.button, styles.okButton]}
                onPress={handleDismiss}
              >
                <Text style={styles.okButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Chat/Video Consultation - Show Join Session Button */
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
                    <Ionicons 
                      name={bookingData.type === 'video' ? 'videocam' : 'chatbubble'} 
                      size={20} 
                      color="#fff" 
                      style={styles.buttonIcon} 
                    />
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
          )}

          {/* Info Text */}
          {!isVoiceConsultation && (
            <Text style={styles.infoText}>
              You can also join the session later from your Bookings screen
            </Text>
          )}
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
    minWidth: 300,
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
  // Voice consultation specific styles
  voiceInfoContainer: {
    marginBottom: 15,
  },
  voiceInfoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  voiceInfoText: {
    fontSize: 16,
    color: '#1976D2',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  okButton: {
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  okButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BookingAcceptedPopup;
