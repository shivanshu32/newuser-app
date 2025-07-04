import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image
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
  const [modalKey, setModalKey] = useState(0); // Force re-mount on data changes
  const [isModalReady, setIsModalReady] = useState(false);
  const navigation = useNavigation();

  // Debug component lifecycle
  useEffect(() => {
    console.log('🔄 [BookingAcceptedPopup] Component mounted/updated');
    console.log('🔄 [BookingAcceptedPopup] Props received:', {
      visible,
      hasOnClose: !!onClose,
      hasOnJoinSession: !!onJoinSession,
      bookingDataKeys: bookingData ? Object.keys(bookingData) : 'null',
      bookingData: bookingData
    });
    
    return () => {
      console.log('🔄 [BookingAcceptedPopup] Component cleanup/unmount');
    };
  }, [visible, bookingData, onClose, onJoinSession]);

  // Debug data validation and handle modal re-mounting
  useEffect(() => {
    if (visible) {
      console.log('🔍 [BookingAcceptedPopup] Modal becoming visible - validating data:');
      console.log('🔍 [BookingAcceptedPopup] bookingData type:', typeof bookingData);
      console.log('🔍 [BookingAcceptedPopup] bookingData value:', bookingData);
      
      if (!bookingData) {
        console.error('❌ [BookingAcceptedPopup] CRITICAL: bookingData is null/undefined when modal should be visible!');
        setIsModalReady(false);
      } else {
        console.log('✅ [BookingAcceptedPopup] bookingData validation passed');
        console.log('📊 [BookingAcceptedPopup] Data structure:', JSON.stringify(bookingData, null, 2));
        
        // Force modal re-mount with new key to prevent layout issues
        setModalKey(prev => prev + 1);
        
        // Small delay to ensure proper re-mounting
        setTimeout(() => {
          setIsModalReady(true);
          console.log('🔄 [BookingAcceptedPopup] Modal ready for display with key:', modalKey + 1);
        }, 100);
      }
    } else {
      setIsModalReady(false);
      console.log('🔍 [BookingAcceptedPopup] Modal hidden, resetting ready state');
    }
  }, [visible, bookingData]);

  // Reset joining state when modal becomes invisible
  useEffect(() => {
    if (!visible) {
      setIsJoining(false);
      console.log('🔄 [BookingAcceptedPopup] Modal hidden, resetting joining state');
    }
  }, [visible]);

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
  const isVoiceConsultation = bookingData?.type === 'voice';

  console.log('🎨 [BookingAcceptedPopup] Rendering popup with visible:', visible);
  console.log('🎨 [BookingAcceptedPopup] BookingData for rendering:', JSON.stringify(bookingData, null, 2));
  console.log('🎨 [BookingAcceptedPopup] Popup dimensions - width:', width, 'calculated width:', width * 0.9);
  console.log('🎨 [BookingAcceptedPopup] isVoiceConsultation:', isVoiceConsultation);
  console.log('🎨 [BookingAcceptedPopup] bookingData?.type:', bookingData?.type);
  
  // Debug layout calculations
  const calculatedWidth = width * 0.9;
  const minWidth = 300;
  const maxWidth = 400;
  const finalWidth = Math.max(minWidth, Math.min(calculatedWidth, maxWidth));
  
  console.log('📐 [BookingAcceptedPopup] Layout calculations:');
  console.log('📐   - Screen width:', width);
  console.log('📐   - Calculated width (90%):', calculatedWidth);
  console.log('📐   - Min width:', minWidth);
  console.log('📐   - Max width:', maxWidth);
  console.log('📐   - Final width:', finalWidth);
  
  // Validate critical data for rendering
  if (visible && !bookingData) {
    console.error('🚨 [BookingAcceptedPopup] CRITICAL RENDER ERROR: Modal is visible but bookingData is missing!');
    console.error('🚨 [BookingAcceptedPopup] This will cause layout issues - returning early');
    return null; // Prevent rendering with invalid data
  }

  // Don't render until modal is ready (prevents layout issues during rapid state changes)
  if (visible && !isModalReady) {
    console.log('⏳ [BookingAcceptedPopup] Modal not ready yet, waiting for proper initialization...');
    return null;
  }
  
  console.log('🎬 [BookingAcceptedPopup] About to render Modal with:');
  console.log('🎬   - visible:', visible);
  console.log('🎬   - bookingData present:', !!bookingData);
  console.log('🎬   - isVoiceConsultation:', isVoiceConsultation);
  console.log('🎬   - modalKey:', modalKey);
  console.log('🎬   - isModalReady:', isModalReady);
  
  return (
    <Modal
      key={modalKey} // Force re-mount on data changes
      visible={visible && isModalReady} // Only show when ready
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
      onShow={() => {
        console.log('📱 [BookingAcceptedPopup] Modal onShow callback triggered (key: ' + modalKey + ')');
        console.log('📱 [BookingAcceptedPopup] Modal is now visible on screen');
      }}
      onDismiss={() => {
        console.log('📱 [BookingAcceptedPopup] Modal onDismiss callback triggered');
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          {/* Header with Astrologer Profile */}
          <View style={styles.header}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <Ionicons 
                name={isVoiceConsultation ? "call" : "checkmark-circle"} 
                size={24} 
                color={isVoiceConsultation ? "#2196F3" : "#4CAF50"} 
              />
            </View>
            
            {/* Astrologer Profile Section */}
            <View style={styles.astrologerProfileSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri: bookingData.astrologerImageUrl || 'https://via.placeholder.com/80x80/E0E0E0/666666?text=A'
                  }}
                  style={styles.profileImage}
                  defaultSource={{ uri: 'https://via.placeholder.com/80x80/E0E0E0/666666?text=A' }}
                />
                {/* Online Status Indicator */}
                <View style={styles.onlineIndicator} />
              </View>
              
              <View style={styles.astrologerInfo}>
                <Text style={styles.astrologerName}>
                  {bookingData.astrologerDisplayName || bookingData.astrologerName || 'Professional Astrologer'}
                </Text>
                <Text style={styles.astrologerTitle}>Astrologer</Text>
              </View>
            </View>
            
            {/* Status Message */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>
                {isVoiceConsultation ? 'Voice Call Connecting!' : 'Booking Accepted!'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {isVoiceConsultation 
                  ? 'Your voice consultation is being connected. Please keep your phone available.' 
                  : `Your ${bookingData.type} consultation request has been accepted`
                }
              </Text>
            </View>
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
    borderRadius: 24,
    padding: 28,
    width: width * 0.9,
    minWidth: 320,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 25,
  },
  successIconContainer: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  astrologerProfileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#F97316',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
  },
  astrologerInfo: {
    alignItems: 'center',
  },
  astrologerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  astrologerTitle: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 15,
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
