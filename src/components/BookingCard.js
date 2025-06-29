import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const BookingCard = ({ consultation, onJoin, onDismiss, onCancel, onReschedule }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

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

  const getStatusColor = () => {
    if (isExpired) return '#F44336';
    
    switch (booking.status) {
      case 'pending':
        return '#FF9800';
      case 'confirmed':
      case 'waiting_for_user':
        return '#4CAF50';
      case 'in-progress':
        return '#2196F3';
      case 'completed':
        return '#9C27B0';
      case 'cancelled':
      case 'rejected':
        return '#F44336';
      case 'expired':
        return '#795548';
      case 'no_show':
        return '#607D8B';
      default:
        return '#666';
    }
  };

  const getStatusIcon = () => {
    if (isExpired) return 'time-outline';
    
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
    return ['confirmed', 'waiting_for_user', 'in-progress'].includes(booking.status) && !isExpired;
  };

  const canCancel = () => {
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
    if (!booking.scheduledAt) return 'Time not set';
    
    const date = new Date(booking.scheduledAt);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateStr;
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-IN', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
    
    const timeStr = date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return `${dateStr} at ${timeStr}`;
  };

  const getMainActionButton = () => {
    if (isExpired) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.expiredButton]} disabled>
          <Ionicons name="time-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Expired</Text>
        </TouchableOpacity>
      );
    }

    if (canJoin()) {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.joinButton]} onPress={handleJoinPress}>
          <Ionicons name="play-circle-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>
            {booking.status === 'in-progress' ? 'Continue' : 'Join Now'}
          </Text>
        </TouchableOpacity>
      );
    }

    if (booking.status === 'pending') {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.waitingButton]} disabled>
          <Ionicons name="hourglass-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Waiting for Astrologer</Text>
        </TouchableOpacity>
      );
    }

    if (booking.status === 'completed') {
      return (
        <TouchableOpacity style={[styles.actionButton, styles.completedButton]} disabled>
          <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
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
              <Ionicons name={getTypeIcon()} size={14} color="#666" />
              <Text style={styles.consultationTypeText}>{getTypeText()}</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon()} size={12} color="#fff" />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      {/* Booking details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{formatScheduledTime()}</Text>
        </View>
        
        {booking.duration && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{booking.duration} minutes</Text>
          </View>
        )}
        
        {booking.totalAmount && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>₹{booking.totalAmount}</Text>
          </View>
        )}

        {/* Countdown timer for pending bookings */}
        {booking.status === 'pending' && timeRemaining && (
          <View style={styles.countdownContainer}>
            <Ionicons name="timer-outline" size={16} color="#FF9800" />
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
              <Ionicons name="close-outline" size={16} color="#F44336" />
              <Text style={[styles.secondaryButtonText, { color: '#F44336' }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          
          {canReschedule() && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleReschedulePress}>
              <Ionicons name="calendar-outline" size={16} color="#2196F3" />
              <Text style={[styles.secondaryButtonText, { color: '#2196F3' }]}>Reschedule</Text>
            </TouchableOpacity>
          )}
          
          {['completed', 'cancelled', 'rejected', 'expired', 'no_show'].includes(booking.status) && (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleDismissPress}>
              <Ionicons name="trash-outline" size={16} color="#666" />
              <Text style={[styles.secondaryButtonText, { color: '#666' }]}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    color: '#333',
    marginBottom: 4,
  },
  consultationType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consultationTypeText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
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
    color: '#666',
    marginLeft: 8,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  countdownText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  messageContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  messageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
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
    backgroundColor: '#4CAF50',
  },
  waitingButton: {
    backgroundColor: '#FF9800',
  },
  completedButton: {
    backgroundColor: '#9C27B0',
  },
  expiredButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    gap: 4,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default BookingCard;
