import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SocketContext } from '../context/SocketContext';
import { colors, spacing, radius, shadows } from '../theme';

const BookingCard = ({ consultation, onJoin, onDismiss, onCancel, onReschedule }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [voiceCallStatus, setVoiceCallStatus] = useState(null);
  const [voiceCallMessage, setVoiceCallMessage] = useState('');
  const [callTimer, setCallTimer] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const { socket } = useContext(SocketContext);

  if (!consultation || !consultation.booking || !consultation.astrologer) {
    return null;
  }

  const { booking, astrologer } = consultation;
  const isVideoCall = booking.type === 'video';
  const isVoiceCall = booking.type === 'voice';
  const isChatCall = booking.type === 'chat';

  // Calculate time remaining for pending bookings
  useEffect(() => {
    if (booking.status === 'pending' && booking.expiresAt) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const expiry = new Date(booking.expiresAt).getTime();
        const remaining = expiry - now;

        if (remaining <= 0) {
          setIsExpired(true);
          setTimeRemaining(null);
        } else {
          setIsExpired(false);
          const minutes = Math.floor(remaining / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
      setIsExpired(false);
    }
  }, [booking.status, booking.expiresAt]);

  // Voice call status updates and call timer
  useEffect(() => {
    if (!socket || !isVoiceCall) return;

    const handleCallStatusUpdate = (data) => {
      if (data.bookingId === booking._id) {
        setVoiceCallStatus(data.status);
        setVoiceCallMessage(data.message);
        
        // Start call timer when call is connected
        if (data.status === 'call_connected' || data.status === 'user_connected') {
          setCallStartTime(new Date());
        }
        
        // Stop call timer when call ends
        if (data.status === 'call_ended' || data.status === 'failed') {
          setCallStartTime(null);
          setCallTimer(null);
        }
      }
    };

    const handleBookingStatusUpdate = (data) => {
      if (data.bookingId === booking._id && data.callStatus) {
        setVoiceCallStatus(data.callStatus);
      }
    };

    socket.on('call_status_update', handleCallStatusUpdate);
    socket.on('booking_status_update', handleBookingStatusUpdate);

    return () => {
      socket.off('call_status_update', handleCallStatusUpdate);
      socket.off('booking_status_update', handleBookingStatusUpdate);
    };
  }, [socket, isVoiceCall, booking._id]);

  // Call timer effect
  useEffect(() => {
    if (callStartTime && isVoiceCall) {
      const updateCallTimer = () => {
        const now = new Date();
        const elapsed = Math.floor((now - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setCallTimer(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };

      updateCallTimer();
      const interval = setInterval(updateCallTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setCallTimer(null);
    }
  }, [callStartTime, isVoiceCall]);

  const getStatusColor = () => {
    if (isExpired) return colors.error;

    if (isVoiceCall && voiceCallStatus) {
      switch (voiceCallStatus) {
        case 'validating_balance':
        case 'connecting_astrologer':
          return colors.warning;
        case 'call_connected':
        case 'user_connected':
        case 'astrologer_connected':
          return colors.success;
        case 'call_ended':
          return colors.secondary;
        case 'failed':
        case 'no_answer':
          return colors.error;
        default:
          return colors.info;
      }
    }

    switch (booking.status) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
      case 'waiting_for_user':
        return colors.success;
      case 'in-progress':
        return colors.info;
      case 'completed':
        return colors.secondary;
      case 'cancelled':
      case 'rejected':
        return colors.error;
      case 'expired':
        return colors.textMuted;
      case 'no_show':
        return colors.textSecondary;
      default:
        return colors.textMuted;
    }
  };

  const getStatusIcon = () => {
    if (isExpired) return 'time-outline';
    
    // Voice call specific status icons
    if (isVoiceCall && voiceCallStatus) {
      switch (voiceCallStatus) {
        case 'validating_balance':
          return 'wallet-outline';
        case 'connecting_astrologer':
          return 'call-outline';
        case 'call_connected':
        case 'user_connected':
        case 'astrologer_connected':
          return 'call';
        case 'call_ended':
          return 'checkmark-done-outline';
        case 'failed':
          return 'close-circle-outline';
        case 'no_answer':
          return 'call-outline';
        default:
          return 'call-outline';
      }
    }
    
    switch (booking.status) {
      case 'pending':
        return 'hourglass-outline';
      case 'confirmed':
        return 'checkmark-circle-outline';
      case 'waiting_for_user':
        return 'person-outline';
      case 'in-progress':
        return 'play-circle-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'cancelled':
      case 'rejected':
        return 'close-circle-outline';
      case 'expired':
        return 'time-outline';
      case 'no_show':
        return 'alert-circle-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    
    // Voice call specific status text with call timer
    if (isVoiceCall && voiceCallStatus) {
      const baseText = (() => {
        switch (voiceCallStatus) {
          case 'validating_balance':
            return 'Validating Balance';
          case 'connecting_astrologer':
            return 'Connecting to Astrologer';
          case 'call_connected':
            return 'Call Connected';
          case 'user_connected':
            return 'User Connected';
          case 'astrologer_connected':
            return 'Astrologer Connected';
          case 'call_ended':
            return 'Call Ended';
          case 'failed':
            return 'Call Failed';
          case 'no_answer':
            return 'No Answer';
          default:
            return voiceCallStatus.charAt(0).toUpperCase() + voiceCallStatus.slice(1).replace('_', ' ');
        }
      })();
      
      // Add call timer if call is connected
      if (callTimer && ['call_connected', 'user_connected', 'astrologer_connected'].includes(voiceCallStatus)) {
        return `${baseText} (${callTimer})`;
      }
      
      return baseText;
    }
    
    return booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ');
  };

  const getTypeIcon = () => {
    if (isVideoCall) return 'videocam';
    if (isVoiceCall) return 'call';
    if (isChatCall) return 'chatbubble';
    return 'help-circle';
  };

  const getTypeText = () => {
    if (isVideoCall) return 'Video Call';
    if (isVoiceCall) return 'Voice Call';
    if (isChatCall) return 'Chat';
    return 'Consultation';
  };

  const canJoin = () => {
    // Voice consultations should not have join session button
    if (isVoiceCall) {
      return false;
    }
    return ['confirmed', 'waiting_for_user', 'in-progress'].includes(booking.status) && !isExpired;
  };

  const canCancel = () => {
    // Voice consultations should not have cancel button
    if (isVoiceCall) {
      return false;
    }
    return ['pending', 'confirmed'].includes(booking.status) && !isExpired;
  };

  const canReschedule = () => {
    return ['pending', 'confirmed'].includes(booking.status) && !isExpired;
  };

  const handleJoinPress = () => {
    if (canJoin() && onJoin) {
      onJoin(consultation);
    }
  };

  const handleCancelPress = () => {
    if (canCancel() && onCancel) {
      Alert.alert(
        'Cancel Booking',
        'Are you sure you want to cancel this booking?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: () => onCancel(consultation) }
        ]
      );
    }
  };

  const handleReschedulePress = () => {
    if (canReschedule() && onReschedule) {
      onReschedule(consultation);
    }
  };

  const handleDismissPress = () => {
    if (onDismiss) {
      onDismiss(consultation);
    }
  };

  const formatScheduledTime = () => {
    // Use scheduledAt if available (for future bookings), otherwise use createdAt (for instant bookings)
    const dateField = booking.scheduledAt || booking.createdAt;
    if (!dateField) return 'Time not set';
    
    const date = new Date(dateField);
    const isValidDate = !isNaN(date.getTime());
    
    if (!isValidDate) return 'Invalid date';
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr;
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateStr = 'Yesterday';
    } else {
      dateStr = date.toLocaleDateString('en-IN', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
    
    const timeStr = date.toLocaleTimeString('en-IN', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${dateStr} at ${timeStr}`;
  };
  

  const getMainActionButton = () => {
    if (isExpired) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.expiredButton]} disabled>
          <Ionicons name="time-outline" size={16} color={colors.textInverse} />
          <Text style={styles.actionButtonText}>Expired</Text>
        </TouchableOpacity>
      );
    }

    if (canJoin()) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.joinButton]} onPress={handleJoinPress}>
          <Ionicons name="play-circle-outline" size={16} color={colors.textInverse} />
          <Text style={styles.actionButtonText}>
            {booking.status === 'in-progress' ? 'Continue' : 'Join Now'}
          </Text>
        </TouchableOpacity>
      );
    }

    if (booking.status === 'pending') {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.waitingButton]} disabled>
          <Ionicons name="hourglass-outline" size={16} color={colors.textInverse} />
          <Text style={styles.actionButtonText}>Waiting for Astrologer</Text>
        </TouchableOpacity>
      );
    }

    if (booking.status === 'completed') {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.completedButton]} disabled>
          <Ionicons name="checkmark-done-outline" size={16} color={colors.textInverse} />
          <Text style={styles.actionButtonText}>Completed</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header with astrologer info and status */}
      <View style={styles.header}>
        <View style={styles.astrologerInfo}>
          <Image
            source={{ uri: astrologer.profileImage || 'https://via.placeholder.com/50' }}
            style={styles.astrologerImage}
          />
          <View style={styles.astrologerDetails}>
            <Text style={styles.astrologerName}>{astrologer.name}</Text>
            <View style={styles.consultationType}>
              <Ionicons name={getTypeIcon()} size={14} color={colors.textMuted} />
              <Text style={styles.consultationTypeText}>
                {isFreeChat() ? 'Free Chat' : getTypeText()}
              </Text>
              {isFreeChat() && (
                <View style={styles.freeChatBadge}>
                  <Text style={styles.freeChatBadgeText}>FREE</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon()} size={12} color={colors.textInverse} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      {/* Booking details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text style={styles.detailText}>{formatScheduledTime()}</Text>
        </View>
        
        {booking.totalAmount && booking.totalAmount > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.textMuted} />
            <Text style={styles.detailText}>₹{parseFloat(booking.totalAmount).toFixed(0)}</Text>
          </View>
        )}

        {/* Countdown timer for pending bookings */}
        {booking.status === 'pending' && timeRemaining && (
          <View style={styles.countdownContainer}>
            <Ionicons name="timer-outline" size={16} color={colors.warning} />
            <Text style={styles.countdownText}>
              Expires in {timeRemaining}
            </Text>
          </View>
        )}

        {/* User message if available */}
        {booking.userMessage && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Your message:</Text>
            <Text style={styles.messageText}>{booking.userMessage}</Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {getMainActionButton()}
        
        <View style={styles.secondaryActions}>
          {canCancel() && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleCancelPress}>
              <Ionicons name="close-outline" size={16} color={colors.error} />
              <Text style={[styles.secondaryButtonText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {canReschedule() && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleReschedulePress}>
              <Ionicons name="calendar-outline" size={16} color={colors.info} />
              <Text style={[styles.secondaryButtonText, { color: colors.info }]}>Reschedule</Text>
            </TouchableOpacity>
          )}
          
          {['completed', 'cancelled', 'rejected', 'expired', 'no_show'].includes(booking.status) && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleDismissPress}>
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.lg,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  astrologerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  astrologerDetails: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  consultationType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultationTypeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  freeChatBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginLeft: spacing.xs,
  },
  freeChatBadgeText: {
    fontSize: 10,
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 12,
    color: colors.textInverse,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningMuted,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  countdownText: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: 'bold',
    marginLeft: spacing.xs,
  },
  messageContainer: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  messageLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  joinButton: {
    backgroundColor: colors.success,
  },
  waitingButton: {
    backgroundColor: colors.warning,
  },
  completedButton: {
    backgroundColor: colors.secondary,
  },
  expiredButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BookingCard;
