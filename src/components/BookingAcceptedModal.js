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
import { colors, spacing, radius, shadows } from '../theme';

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
            <Ionicons name="checkmark-circle" size={60} color={colors.success} />
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
                  color={colors.textSecondary} 
                />
                <Text style={styles.consultationType}>
                  {getBookingTypeText()}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Message */}
          <Text style={styles.message}>
            {bookingType === 'voice' 
              ? 'Your voice consultation has been accepted! You will receive a phone call shortly from our system. Please answer the call to connect with the astrologer.'
              : `Your ${bookingType || 'consultation'} has been accepted! Join now to start your session.`
            }
          </Text>
          
          {/* Action Button - Only for non-voice consultations */}
          {bookingType !== 'voice' && (
            <TouchableOpacity 
              style={styles.joinButton}
              onPress={onJoinNow}
            >
              <Ionicons name="play-circle" size={20} color={colors.textInverse} />
              <Text style={styles.joinButtonText}>Join Now</Text>
            </TouchableOpacity>
          )}
          
          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
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
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: colors.shadow,
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
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 20,
  },
  astrologerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
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
    backgroundColor: colors.surfaceTertiary,
  },
  astrologerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  consultationTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultationType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: colors.success,
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
    color: colors.textInverse,
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
