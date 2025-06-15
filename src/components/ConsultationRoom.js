import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { 
  joinConsultationRoom, 
  leaveConsultationRoom, 
  listenForParticipantEvents, 
  listenForTimerUpdates, 
  listenForStatusUpdates 
} from '../services/socketService';

/**
 * Consultation room component for users
 * @param {Object} props
 * @param {Object} props.booking - Booking data
 * @param {String} props.roomId - Room ID for the consultation
 * @param {String} props.sessionId - Session ID
 * @param {Function} props.onSessionEnd - Callback when session ends
 */
const ConsultationRoom = ({ booking, roomId, sessionId, onSessionEnd }) => {
  const [status, setStatus] = useState('connecting'); // connecting, connected, disconnected, completed
  const [astrologerPresent, setAstrologerPresent] = useState(false);
  const [timer, setTimer] = useState({
    durationSeconds: 0,
    durationMinutes: 0,
    currentAmount: 0,
    currency: 'INR'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format currency for display
  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR'
    }).format(amount);
  };

  // Handle participant joined event
  const handleParticipantJoined = useCallback((data) => {
    if (data.role === 'astrologer') {
      setAstrologerPresent(true);
      setStatus('connected');
    }
  }, []);

  // Handle participant left event
  const handleParticipantLeft = useCallback((data) => {
    if (data.role === 'astrologer') {
      setAstrologerPresent(false);
      setStatus('disconnected');
      
      Alert.alert(
        'Astrologer Disconnected',
        'The astrologer has disconnected from the session. They may reconnect shortly.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Handle timer updates
  const handleTimerUpdate = useCallback((data) => {
    setTimer({
      durationSeconds: data.durationSeconds,
      durationMinutes: data.durationMinutes,
      currentAmount: data.currentAmount,
      currency: data.currency
    });
  }, []);

  // Handle status updates
  const handleStatusUpdate = useCallback((data) => {
    setStatus(data.status);
    
    if (data.status === 'completed') {
      Alert.alert(
        'Session Completed',
        `Your consultation has ended. Total duration: ${formatTime(data.durationSeconds)}. Amount: ${formatCurrency(data.currentAmount, data.currency)}`,
        [{ text: 'OK', onPress: () => onSessionEnd && onSessionEnd(data) }]
      );
    }
  }, [onSessionEnd]);

  // End consultation
  const endConsultation = async () => {
    try {
      await leaveConsultationRoom(booking._id, roomId);
      
      if (onSessionEnd) {
        onSessionEnd({
          status: 'completed',
          message: 'You ended the consultation',
          durationSeconds: timer.durationSeconds,
          currentAmount: timer.currentAmount
        });
      }
    } catch (error) {
      console.error('Error ending consultation:', error);
      setError('Failed to end consultation');
    }
  };

  // Confirm before ending consultation
  const confirmEndConsultation = () => {
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: endConsultation }
      ]
    );
  };

  // Join consultation room on component mount
  useEffect(() => {
    const setupConsultation = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Join consultation room
        await joinConsultationRoom(booking._id, roomId);
        
        // Set up event listeners
        const participantCleanup = await listenForParticipantEvents(
          handleParticipantJoined,
          handleParticipantLeft
        );
        
        const timerCleanup = await listenForTimerUpdates(handleTimerUpdate);
        const statusCleanup = await listenForStatusUpdates(handleStatusUpdate);
        
        setLoading(false);
        
        // Clean up listeners on unmount
        return () => {
          if (participantCleanup) participantCleanup();
          if (timerCleanup) timerCleanup();
          if (statusCleanup) statusCleanup();
        };
      } catch (error) {
        console.error('Error setting up consultation:', error);
        setLoading(false);
        setError('Failed to join consultation room');
      }
    };
    
    setupConsultation();
    
    // Leave consultation room on component unmount
    return () => {
      leaveConsultationRoom(booking._id, roomId).catch(console.error);
    };
  }, [booking._id, roomId, handleParticipantJoined, handleParticipantLeft, handleTimerUpdate, handleStatusUpdate]);

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#673AB7" />
        <Text style={styles.loadingText}>Joining consultation room...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={onSessionEnd}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with status and timer */}
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, styles[`${status}Indicator`]]} />
          <Text style={styles.statusText}>
            {status === 'connecting' && 'Connecting...'}
            {status === 'connected' && 'Connected'}
            {status === 'disconnected' && 'Astrologer Disconnected'}
            {status === 'completed' && 'Session Completed'}
          </Text>
        </View>
        
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Duration</Text>
          <Text style={styles.timerText}>{formatTime(timer.durationSeconds)}</Text>
        </View>
      </View>
      
      {/* Billing information */}
      <View style={styles.billingContainer}>
        <Text style={styles.billingLabel}>Current Billing</Text>
        <Text style={styles.billingAmount}>
          {formatCurrency(timer.currentAmount, timer.currency)}
        </Text>
        <Text style={styles.billingRate}>
          ({formatCurrency(booking.rate, timer.currency)}/minute)
        </Text>
      </View>
      
      {/* Main consultation content area */}
      <View style={styles.contentArea}>
        {/* This is where chat, voice, or video UI would be rendered */}
        {/* For now, just showing a placeholder */}
        <Text style={styles.placeholderText}>
          {!astrologerPresent ? 
            'Waiting for astrologer to join...' : 
            `${booking.type.toUpperCase()} consultation in progress`
          }
        </Text>
      </View>
      
      {/* Action buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.endButton]} 
          onPress={confirmEndConsultation}
        >
          <Text style={styles.buttonText}>End Consultation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#673AB7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  connectingIndicator: {
    backgroundColor: '#FFA000',
  },
  connectedIndicator: {
    backgroundColor: '#4CAF50',
  },
  disconnectedIndicator: {
    backgroundColor: '#F44336',
  },
  completedIndicator: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 12,
    color: '#757575',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  billingContainer: {
    padding: 16,
    backgroundColor: '#673AB7',
    alignItems: 'center',
  },
  billingLabel: {
    fontSize: 14,
    color: '#E1BEE7',
    marginBottom: 4,
  },
  billingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  billingRate: {
    fontSize: 12,
    color: '#E1BEE7',
  },
  contentArea: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  button: {
    backgroundColor: '#673AB7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ConsultationRoom;
