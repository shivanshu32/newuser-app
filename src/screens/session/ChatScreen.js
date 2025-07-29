import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, sessionsAPI, chatHistoryAPI } from '../../services/api';
import io from 'socket.io-client';
import * as socketService from '../../services/socketService';

const ChatScreen = ({ route, navigation }) => {
  // Extract and validate bookingId from route params
  const routeParams = route.params || {};
  
  // Handle different ways bookingId might be passed
  // 1. Direct bookingId in route.params (from BookingScreen)
  // 2. Nested in booking._id (from consultation join flow)
  const bookingId = routeParams.bookingId || (routeParams.booking && routeParams.booking._id);
  
  // State variables
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [astrologer, setAstrologer] = useState(null);
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [isAstrologerTyping, setIsAstrologerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const { user: authUser } = useAuth();
  
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const timerRef = useRef(null);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchBookingDetails();
    
    return () => {
      // Clean up socket and timer on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchBookingDetails = async () => {
    try {
      // Validate bookingId before making API call
      if (!bookingId) {
        Alert.alert(
          'Error', 
          'No booking ID provided. Please go back and try again.'
        );
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // Fetch booking details from API
      const response = await bookingsAPI.getById(bookingId);
      const bookingData = response.data.data;
      
      setBooking(bookingData);
      setAstrologer(bookingData.astrologer);
      setUser(bookingData.user);
      
      // Initialize socket connection
      await initializeSocket(bookingData.astrologer._id);
      
      setLoading(false);
    } catch (error) {
      console.error('ChatScreen: Error fetching booking details:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load chat session. Please try again.');
    }
  };

  const fetchChatHistory = async (currentSessionId) => {
    try {
      console.log('🔍 [USER-CHAT] Fetching chat history for sessionId:', currentSessionId);
      
      if (!currentSessionId) {
        console.log('⚠️ [USER-CHAT] No sessionId provided, skipping chat history fetch');
        return;
      }

      const response = await chatHistoryAPI.getChatHistory(currentSessionId);
      const chatHistory = response.data || [];
      
      console.log('✅ [USER-CHAT] Chat history fetched:', chatHistory.length, 'messages');
      
      if (chatHistory.length > 0) {
        // Transform chat history to match the expected message format
        const transformedMessages = chatHistory.map(msg => ({
          id: msg.id || msg._id || Date.now().toString(),
          senderId: msg.senderId || msg.sender_id,
          senderName: msg.senderName || msg.sender_name || (msg.sender === 'user' ? 'User' : 'Astrologer'),
          text: msg.text || msg.message || msg.content,
          timestamp: msg.timestamp || msg.createdAt || msg.created_at,
          status: msg.status || 'sent', // Default status for historical messages
          sender: msg.sender // Keep original sender field for compatibility
        }));
        
        // Sort messages by timestamp (oldest first)
        transformedMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        console.log('📝 [USER-CHAT] Setting', transformedMessages.length, 'historical messages');
        setMessages(transformedMessages);
      } else {
        console.log('📝 [USER-CHAT] No chat history found, starting with empty messages');
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ [USER-CHAT] Failed to fetch chat history:', error);
      // Don't show alert for chat history errors, just log and continue
      // The session can still work with empty message history
      setMessages([]);
    }
  };

  const startSession = async () => {
    try {
      console.log('[USER-APP] ChatScreen: Starting session for bookingId:', bookingId);
      const response = await sessionsAPI.start(bookingId, 'chat');
      const sessionData = response.data.data;
      
      console.log('[USER-APP] ChatScreen: Session started successfully:', sessionData);
      console.log('[USER-APP] ChatScreen: Setting sessionId to:', sessionData._id);
      setSessionId(sessionData._id);
      setSessionActive(true);
      
      console.log('[USER-APP] ChatScreen: Returning sessionId:', sessionData._id);
      return sessionData._id;
    } catch (error) {
      console.error('[USER-APP] ChatScreen: Error starting session:', error);
      Alert.alert('Error', 'Failed to start session. Please try again.');
      return null;
    }
  };

  const initializeSocket = async (astrologerId) => {
    console.log('ChatScreen: Initializing socket with astrologerId:', astrologerId, 'bookingId:', bookingId);
    
    // Get the user token for authentication
    const userToken = await AsyncStorage.getItem('userToken');
    if (!userToken) {
      console.error('ChatScreen: No user token found for socket authentication');
      Alert.alert('Authentication Error', 'Unable to establish connection. Please try again.');
      return;
    }
    
    // Connect to the Socket.IO server
    // Local Development
    // const socketUrl = 'http://192.168.29.107:5000';
    
    // Production
    //const socketUrl = 'http://3.110.171.85';
    const socketUrl = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
    console.log('ChatScreen: Connecting to socket server at:', socketUrl);
    
    const socketOptions = {
      query: {
        userId: authUser.id,
        astrologerId,
        bookingId,
        sessionType: 'chat',
      },
      auth: {
        token: userToken,
        id: authUser.id,
        role: 'user'
      },
      path: '/ws', // Match the path used in astrologer-app
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling']
    };
    
    console.log('ChatScreen: Socket options:', JSON.stringify({
      ...socketOptions,
      auth: { ...socketOptions.auth, token: '***token-hidden***' } // Hide token in logs
    }));
    socketRef.current = io(socketUrl, socketOptions);
    
    // Debug socket connection events
    socketRef.current.on('connect_error', (error) => {
      console.error('ChatScreen: Socket connection error:', error.message);
    });
    
    socketRef.current.on('connect_timeout', () => {
      console.error('ChatScreen: Socket connection timeout');
    });
    
    // Set up socket event listeners
    socketRef.current.on('connect', async () => {
      console.log('ChatScreen: Socket connected successfully');
      setConnecting(false);
      
      // Join the room for this booking
      socketRef.current.emit('join_room', { bookingId }, async (response) => {
        if (response && response.success) {
          // Emit user joined consultation event
          socketRef.current.emit('user_joined_consultation', {
            bookingId,
            userId: authUser.id,
            astrologerId
          });
          
          // Also emit the alternate event name as a fallback
          socketRef.current.emit('join_consultation', {
            bookingId,
            userId: authUser.id,
            astrologerId
          });
          
          // Send a direct notification to the astrologer
          socketRef.current.emit('direct_astrologer_notification', {
            bookingId,
            userId: authUser.id,
            astrologerId,
            message: 'User has joined the consultation'
          });
          
          // Start session API call to create session and capture sessionId
          const sessionResponse = await startSession();
          if (sessionResponse) {
            console.log('[USER-APP] Session response received:', sessionResponse);
            // sessionId is already set in startSession function, no need to set it again
            console.log('[USER-APP] SessionId already set in startSession function');
            
            // Fetch existing chat history for this session
            await fetchChatHistory(sessionResponse);
            
            // Explicitly request timer start
            socketRef.current.emit('start_session_timer', { bookingId, sessionId: sessionResponse });
          }
        }
      });
    });
    
    socketRef.current.on('disconnect', () => {
      setConnecting(true);
    });
    
    // Listen for incoming messages
    socketRef.current.on('receive_message', (message) => {
      // Received message from server
      if (message.roomId === bookingId) {
        // Check if this is our own message (sent by current user)
        const isOwnMessage = message.sender === authUser.id || 
                           message.senderId === authUser.id || 
                           message.senderRole === 'user';
        
        // Skip adding our own messages as they're already added when sending
        if (isOwnMessage) {
          // Skip adding our own messages as they're already added when sending
          return;
        }
        
        // IMPORTANT: Always use the original message.id sent by the server
        // This ensures consistency between sender and receiver for read receipts
        if (!message.id) {
          console.error('[USER-APP] Received message without ID, generating one:', message);
        }
        
        const newMessage = {
          id: message.id, // Always use the original ID, no fallback to ensure consistency
          senderId: message.sender || message.senderId,
          sender: message.senderRole || 'astrologer', // For backward compatibility
          senderName: message.senderName || 'Astrologer',
          text: message.content || message.text,
          timestamp: message.timestamp || new Date().toISOString(),
          status: 'sent' // Initial status is 'sent'
        };
        
        // Add message from astrologer to state
        setMessages(prevMessages => [...prevMessages, newMessage]);
        
        // If the message is from the astrologer, mark it as read
        // Mark message as read
        socketRef.current.emit('message_read', {
          bookingId,
          messageId: newMessage.id
        });
      }
    });
    
    // Listen for typing indicators
    socketRef.current.on('typing_started', (data) => {
      // Received typing started event
      if (data.bookingId === bookingId) {
        setIsAstrologerTyping(true);
      }
    });
    
    socketRef.current.on('typing_stopped', (data) => {
      // Received typing stopped event
      if (data.bookingId === bookingId) {
        setIsAstrologerTyping(false);
      }
    });
    
    // Listen for message status updates (read receipts)
    socketRef.current.on('message_status_update', (data) => {
      // Received message status update
      if (data.bookingId === bookingId) {
        // Update message status to 'read' when receiving read receipt
        setMessages(prevMessages => {
          const updatedMessages = prevMessages.map(msg => {
            if (msg.id === data.messageId) {
              // Update message status to read
              return { ...msg, status: 'read' };
            }
            return msg;
          });
          return updatedMessages;
        });
      }
    });
    
    // Listen for session timer updates
    socketRef.current.on('session_timer', (data) => {
      // The server sends { sessionId, durationSeconds, durationMinutes, currentAmount, currency }
      setSessionTime(data.durationSeconds);
    });
    
    // Keep the old listener for backward compatibility
    socketRef.current.on('timer', (data) => {
      if (data.bookingId === bookingId) {
        setSessionTime(data.seconds);
      }
    });
    
    // Listen for session end event
    socketRef.current.on('session_end', (data) => {
      if (data.bookingId === bookingId) {
        handleSessionEnd(data);
      }
    });
    
    // Listen for consultation ended event
    socketRef.current.on('consultation_ended', (data) => {
      if (data.bookingId === bookingId) {
        handleSessionEnd(data);
      }
    });
    
    // Set session as active
    setSessionActive(true);
    
    // We'll rely on server timer events instead of local timer
    // The server will emit 'timer' events that we're already listening for
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    if (!sessionActive) {
      Alert.alert('Session not active', 'Please wait for the astrologer to start the session.');
      return;
    }
    
    // Generate a unique ID for the message
    const messageId = Date.now().toString();
    
    // Create the message object
    const newMessage = {
      id: messageId,
      senderId: authUser.id,  // Use consistent field name
      sender: 'user',     // Keep for backward compatibility
      senderName: authUser?.name || 'User',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      status: 'sending' // Initial status is 'sending'
    };
    
    // Add message to local state
    setMessages(prevMessages => [...prevMessages, newMessage]);
    
    // Clear input field
    setInputText('');
    
    // Send typing_stopped event when sending a message
    socketRef.current.emit('typing_stopped', { bookingId });
    
    try {
      // Send message via socket
      await socketService.sendChatMessage(
        bookingId,
        newMessage.text,
        authUser.id,
        authUser.name || 'User',
        messageId
      );
      
      // Update message status to 'sent'
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        )
      );
      // Message sent, update status to sent
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update message status to show error
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === messageId ? { ...msg, status: 'error' } : msg
        )
      );
      
      // Show error alert
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };
  
  // Handle text input changes with typing indicator
  const handleTextInputChange = (text) => {
    setInputText(text);
    
    // Only emit typing events if the session is active
    if (!sessionActive) return;
    
    // Send typing_started event with more complete payload
    // Emit typing started event
    socketRef.current.emit('typing_started', { 
      bookingId,
      roomId: bookingId,
      userId: 'user',
      senderRole: 'user'
    });
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set a new timeout to emit typing_stopped after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.emit('typing_stopped', { 
        bookingId,
        roomId: bookingId,
        userId: 'user',
        senderRole: 'user'
      });
    }, 1000);
  };

  const handleSessionEnd = (data) => {
    // Handle consultation ended event from astrologer
    console.log('Consultation ended by astrologer:', data);
    setSessionActive(false);
    setSessionActive(false);
    
    // Clean up any timers
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Show alert to user
    Alert.alert(
      'Consultation Ended',
      `The consultation has ended.\n\nSession Duration: ${data.sessionData?.duration || 0} minutes\nTotal Amount: ₹${data.sessionData?.totalAmount || 0}`,
      [
        {
          text: 'Rate Consultation',
          onPress: () => {
            navigation.navigate('Rating', {
              bookingId: data.bookingId,
              sessionId: data.sessionId,
              sessionData: data.sessionData
            });
          }
        }
      ],
      { cancelable: false }
    );
  };

  const endSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this chat session?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              console.log('[USER-APP] Attempting to end session. SessionId:', sessionId);
              console.log('[USER-APP] BookingId:', bookingId);
              
              // Call backend API to end the session with proper sessionId
              if (sessionId) {
                console.log('[USER-APP] Calling sessionsAPI.end with sessionId:', sessionId);
                await sessionsAPI.end(sessionId);
              } else {
                console.warn('[USER-APP] No sessionId available, cannot end session properly');
                Alert.alert('Error', 'Session ID not found. Please try again.');
                setLoading(false);
                return;
              }
              
              // Emit end_session event to socket (but don't disconnect immediately)
              // The backend will emit consultation_ended event to notify both parties
              if (socketRef.current) {
                socketRef.current.emit('end_session', { bookingId, sessionId });
                // Don't disconnect immediately - let the backend notify both parties first
                // The socket will be cleaned up when the component unmounts
              }
              
              // Clear timer
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              
              setLoading(false);
              
              // Navigate to rating screen
              navigation.replace('Rating', {
                astrologer,
                sessionType: 'chat',
                sessionDuration: sessionTime,
                bookingId,
                sessionId,
              });
            } catch (error) {
              console.error('Error ending session:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            }
          }
        }
      ]
    );
  };
  
  const renderMessage = ({ item }) => {
    // Check if message is from the current user (more reliable check)
    const isUser = item.senderId === authUser.id || item.sender === 'user';
    
    // Render status indicators for user messages
    const renderStatusIndicator = () => {
      if (!isUser) return null;
      
      // Render message with status
      
      switch (item.status) {
        case 'sending':
          return <Ionicons name="time-outline" size={12} color="#888" style={styles.statusIcon} />;
        case 'sent':
          return <Ionicons name="checkmark-outline" size={12} color="#888" style={styles.statusIcon} />;
        case 'read':
          return (
            <View style={styles.doubleTickContainer}>
              <Ionicons name="checkmark-outline" size={12} color="#4CAF50" style={styles.statusIcon} />
              <Ionicons name="checkmark-outline" size={12} color="#4CAF50" style={[styles.statusIcon, styles.secondTick]} />
            </View>
          );
        default:
          return <Ionicons name="checkmark-outline" size={12} color="#888" style={styles.statusIcon} />;
      }
    };
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.astrologerMessage]}>
        <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.astrologerMessageText]}>{item.text}</Text>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {renderStatusIndicator()}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Image source={{ uri: astrologer?.image }} style={styles.astrologerImage} />
          <View>
            <Text style={styles.astrologerName}>{astrologer?.name}</Text>
            <Text style={styles.sessionType}>Chat Consultation</Text>
          </View>
        </View>
        
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={16} color="#F97316" />
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
        </View>
      </View>
      
      {connecting ? (
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.connectingText}>Connecting to astrologer...</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
      
      {/* Typing indicator */}
      {isAstrologerTyping && (
        <View style={styles.typingIndicatorContainer}>
          <Text style={styles.typingIndicatorText}>Astrologer is typing...</Text>
        </View>
      )}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              value={inputText}
              onChangeText={handleTextInputChange}
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || !sessionActive}
            >
              <Ionicons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.endSessionButton}
            onPress={endSession}
            disabled={!sessionActive}
          >
            <Text style={styles.endSessionText}>End Consultation</Text>
          </TouchableOpacity>
        </>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  astrologerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginHorizontal: 10,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sessionType: {
    fontSize: 12,
    color: '#666',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  timerText: {
    color: '#8A2BE2',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  messageList: {
    padding: 15,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8A2BE2',
    borderBottomRightRadius: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  astrologerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
    fontWeight: '500',
  },
  astrologerMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    marginRight: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  statusIcon: {
    marginLeft: 2,
  },
  doubleTickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondTick: {
    marginLeft: -5,
  },
  typingIndicatorContainer: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  typingIndicatorText: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 12,
  },
  typingIndicator: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: '#8A2BE2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  endSessionButton: {
    backgroundColor: '#F44336',
    padding: 15,
    alignItems: 'center',
  },
  endSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatScreen;
