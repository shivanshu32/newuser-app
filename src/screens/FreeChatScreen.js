import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const FreeChatScreen = ({ route, navigation }) => {
  const { sessionId, astrologer, freeChatId, userProfile } = route.params;
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    console.log('🔗 [USER-APP] Joining free chat room:', { freeChatId, sessionId, userId: user?.id });
    
    // Join the free chat room with proper parameters
    socket.emit('join_free_chat_room', {
      freeChatId,
      sessionId,
      userId: user?.id,
      userType: 'user'
    });

    // Socket event listeners
    const handleSessionStarted = (data) => {
      console.log('🚀 Free chat session started:', data);
      setSessionStarted(true);
      setTimeRemaining(data.duration || 180);
    };
    
    const handleRoomJoined = (data) => {
      console.log('🏠 [USER-APP] Successfully joined free chat room:', data);
      setSessionStarted(true);
    };
    
    const handleTimerStarted = (data) => {
      console.log('⏰ [USER-APP] Free chat timer started:', data);
      setSessionStarted(true);
      setTimeRemaining(data.timeRemaining || data.duration || 180);
    };

    const handleSessionResumed = (data) => {
      console.log('🔄 Free chat session resumed:', data);
      setSessionStarted(true);
      setTimeRemaining(data.timeRemaining || 180);
      
      // Request message history for reconnection
      socket.emit('get_free_chat_message_history', {
        sessionId: data.sessionId,
        freeChatId: data.freeChatId
      });
    };

    const handleMessageHistory = (data) => {
      console.log('📜 Received message history:', data);
      if (data.messages && data.messages.length > 0) {
        const formattedMessages = data.messages.map(msg => ({
          id: msg.id || msg.messageId || Date.now().toString(),
          content: msg.content || msg.text || msg.message,
          sender: msg.senderRole || msg.sender,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        
        // Auto scroll to bottom after loading history
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };

    const handleTimerUpdate = (data) => {
      setTimeRemaining(data.timeRemaining);
    };

    const handleMessage = (data) => {
      const newMessage = {
        id: data.messageId || Date.now().toString(),
        content: data.content,
        sender: data.senderRole,
        timestamp: new Date(data.timestamp),
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Auto scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    const handleSessionEnded = (data) => {
      console.log('🛑 Free chat session ended:', data);
      setSessionEnded(true);
      
      Alert.alert(
        'Session Completed',
        `Your free chat session has ended. Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    };

    const handleTyping = (data) => {
      if (data.senderRole !== 'user') {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const handleError = (data) => {
      console.error('Free chat error:', data);
      Alert.alert('Error', data.message);
    };

    // Register listeners
    socket.on('free_chat_session_started', handleSessionStarted);
    socket.on('free_chat_room_joined', handleRoomJoined);
    socket.on('free_chat_timer_started', handleTimerStarted);
    socket.on('free_chat_session_resumed', handleSessionResumed);
    socket.on('free_chat_message_history', handleMessageHistory);
    socket.on('free_chat_timer_update', handleTimerUpdate);
    socket.on('free_chat_message', handleMessage);
    socket.on('free_chat_session_ended', handleSessionEnded);
    socket.on('free_chat_typing', handleTyping);
    socket.on('session_error', handleError);

    return () => {
      // Cleanup listeners
      socket.off('free_chat_session_started', handleSessionStarted);
      socket.off('free_chat_room_joined', handleRoomJoined);
      socket.off('free_chat_timer_started', handleTimerStarted);
      socket.off('free_chat_session_resumed', handleSessionResumed);
      socket.off('free_chat_message_history', handleMessageHistory);
      socket.off('free_chat_timer_update', handleTimerUpdate);
      socket.off('free_chat_message', handleMessage);
      socket.off('free_chat_session_ended', handleSessionEnded);
      socket.off('free_chat_typing', handleTyping);
      socket.off('session_error', handleError);
    };
  }, [socket, sessionId, navigation]);

  const sendMessage = () => {
    if (!inputText.trim() || !socket || sessionEnded) return;

    const messageData = {
      sessionId,
      content: inputText.trim(),
    };

    socket.emit('free_chat_message', messageData);
    setInputText('');
  };

  const endSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this free chat session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            if (socket) {
              socket.emit('end_free_chat', { sessionId });
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.astrologerMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.astrologerBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.astrologerMessageText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.astrologerTimestamp]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      
      <View style={styles.headerInfo}>
        <Text style={styles.astrologerName}>{astrologer?.name || 'Astrologer'}</Text>
        <View style={styles.timerContainer}>
          <MaterialIcons name="timer" size={16} color="#4CAF50" />
          <Text style={styles.timerText}>{formatTime(timeRemaining)} remaining</Text>
        </View>
      </View>
      
      <TouchableOpacity onPress={endSession} style={styles.endButton}>
        <MaterialIcons name="call-end" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {renderHeader()}
        
        {/* User Profile Display */}
        <View style={styles.profileContainer}>
          <Text style={styles.profileTitle}>Your Profile Information</Text>
          <View style={styles.profileInfo}>
            <Text style={styles.profileText}>Name: {userProfile?.name}</Text>
            <Text style={styles.profileText}>
              Birth Date: {userProfile?.birthDate ? new Date(userProfile.birthDate).toLocaleDateString() : 'Not provided'}
            </Text>
            <Text style={styles.profileText}>
              Birth Time: {userProfile?.birthTime ? new Date(userProfile.birthTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not provided'}
            </Text>
            <Text style={styles.profileText}>Birth Location: {userProfile?.birthLocation || 'Not provided'}</Text>
          </View>
        </View>

        {!sessionStarted ? (
          <View style={styles.waitingContainer}>
            <MaterialIcons name="hourglass-empty" size={48} color="#F97316" />
            <Text style={styles.waitingText}>Starting your free chat session...</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
            />
            
            {isTyping && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>Astrologer is typing...</Text>
              </View>
            )}
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                multiline
                maxLength={500}
                editable={!sessionEnded}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || sessionEnded) && styles.sendButtonDisabled]} 
                onPress={sendMessage}
                disabled={!inputText.trim() || sessionEnded}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  timerText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  endButton: {
    backgroundColor: '#f44336',
    borderRadius: 20,
    padding: 8,
  },
  profileContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  profileInfo: {
    gap: 8,
  },
  profileText: {
    fontSize: 14,
    color: '#666',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  astrologerMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#F97316',
    borderBottomRightRadius: 4,
  },
  astrologerBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  astrologerMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  astrologerTimestamp: {
    color: '#999',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#F97316',
    borderRadius: 20,
    padding: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default FreeChatScreen;
