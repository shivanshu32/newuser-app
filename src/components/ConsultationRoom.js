import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  TextInput, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { colors, spacing, radius, shadows } from '../theme';
import { 
  joinConsultationRoom, 
  leaveConsultationRoom, 
  listenForParticipantEvents, 
  listenForTimerUpdates, 
  listenForStatusUpdates,
  sendChatMessage,
  listenForChatMessages
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
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Ref for FlatList to auto-scroll to bottom on new messages
  const flatListRef = useRef(null);

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

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      
      // Send message via socket
      await sendChatMessage(roomId, messageInput.trim());
      
      // Add message to local state
      const newMessage = {
        content: messageInput.trim(),
        senderRole: 'user',
        sender: 'me', // We don't need the actual ID for display purposes
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Message Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Handle receiving a message
  const handleMessageReceived = useCallback((messageData) => {
    console.log('Message received:', messageData);
    
    // Only add messages from the other participant
    if (messageData.senderRole !== 'user') {
      setMessages(prevMessages => [...prevMessages, messageData]);
    }
  }, []);
  
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
        const chatCleanup = await listenForChatMessages(handleMessageReceived);
        
        setLoading(false);
        
        // Clean up listeners on unmount
        return () => {
          if (participantCleanup) participantCleanup();
          if (timerCleanup) timerCleanup();
          if (statusCleanup) statusCleanup();
          if (chatCleanup) chatCleanup();
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
  }, [booking._id, roomId, handleParticipantJoined, handleParticipantLeft, handleTimerUpdate, handleStatusUpdate, handleMessageReceived]);

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        {!astrologerPresent ? (
          <View style={styles.waitingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.waitingText}>Waiting for astrologer to join...</Text>
          </View>
        ) : (
          <View style={styles.chatContainer}>
            {/* Chat messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => `msg-${index}-${item.timestamp}`}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View style={[
                  styles.messageContainer,
                  item.senderRole === 'user' ? styles.userMessage : styles.astrologerMessage
                ]}>
                  <Text style={styles.messageText}>{item.content}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyChat}>No messages yet. Start your consultation by sending a message.</Text>
              }
            />
            
            {/* Message input */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={100}
              style={styles.inputContainer}
            >
              <TextInput
                style={styles.input}
                placeholder="Type your message..."
                value={messageInput}
                onChangeText={setMessageInput}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, sendingMessage || !messageInput.trim() ? styles.sendButtonDisabled : null]}
                onPress={handleSendMessage}
                disabled={sendingMessage || !messageInput.trim()}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        )}
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
    backgroundColor: colors.surfaceSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surfaceSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    backgroundColor: colors.warning,
  },
  connectedIndicator: {
    backgroundColor: colors.success,
  },
  disconnectedIndicator: {
    backgroundColor: colors.error,
  },
  completedIndicator: {
    backgroundColor: colors.textMuted,
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
    color: colors.textMuted,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  billingContainer: {
    padding: spacing.lg,
    backgroundColor: colors.secondary,
    alignItems: 'center',
  },
  billingLabel: {
    fontSize: 14,
    color: colors.secondaryMuted,
    marginBottom: 4,
  },
  billingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textInverse,
    marginBottom: 4,
  },
  billingRate: {
    fontSize: 12,
    color: colors.secondaryMuted,
  },
  contentArea: {
    flex: 1,
    padding: 0,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  chatContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  messagesList: {
    flex: 1,
    padding: 10,
  },
  messagesContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.secondary,
  },
  astrologerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
  },
  messageText: {
    fontSize: 16,
    color: colors.textInverse,
  },
  messageTime: {
    fontSize: 12,
    color: colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  emptyChat: {
    textAlign: 'center',
    color: colors.textMuted,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    width: 60,
    height: 40,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.secondaryMuted,
  },
  sendButtonText: {
    color: colors.textInverse,
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.textInverse,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ConsultationRoom;
