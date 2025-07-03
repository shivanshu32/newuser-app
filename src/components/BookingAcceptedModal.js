import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BookingAcceptedModal = ({ 
  visible, 
  onClose, 
  onJoinNow, 
  astrologerName, 
  astrologerImage, 
  bookingType 
}) => {
  const getBookingTypeIcon = () => {
    switch (bookingType) {
      case 'video':
        return 'videocam';
      case 'chat':
        return 'chatbubble';
      case 'voice':
        return 'call';
      default:
        return 'person';
    }
  };

  const getBookingTypeText = () => {
    switch (bookingType) {
      case 'video':
        return 'Video Consultation';
      case 'chat':
        return 'Chat Consultation';
      case 'voice':
        return 'Voice Consultation';
      default:
        return 'Consultation';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#10B981" />
          </View>
          
          {/* Title */}
          <Text style={styles.title}>Booking Accepted! 🎉</Text>
          
          {/* Astrologer Info */}
          <View style={styles.astrologerContainer}>
            <Image 
              source={{ 
                uri: astrologerImage || 'https://freesvg.org/img/abstract-user-flat-4.png' 
              }} 
              style={styles.astrologerImage}
              defaultSource={{ uri: 'https://freesvg.org/img/abstract-user-flat-4.png' }}
            />
            <View style={styles.astrologerInfo}>
              <Text style={styles.astrologerName}>
                {astrologerName || 'Professional Astrologer'}
              </Text>
              <View style={styles.consultationTypeContainer}>
                <Ionicons 
                  name={getBookingTypeIcon()} 
                  size={16} 
                  color="#6B7280" 
                />
                <Text style={styles.consultationType}>
                  {getBookingTypeText()}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Message */}
          <Text style={styles.message}>
            Your {bookingType || 'consultation'} has been accepted! Join now to start your session.
          </Text>
          
          {/* Action Button - Only Join Now */}
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={onJoinNow}
          >
            <Ionicons name="play-circle" size={20} color="#FFFFFF" />
            <Text style={styles.joinButtonText}>Join Now</Text>
          </TouchableOpacity>
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  astrologerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  astrologerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#E5E7EB',
  },
  astrologerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 18,
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
    marginLeft: 4,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
});

export default BookingAcceptedModal;
