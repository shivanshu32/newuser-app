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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, sessionsAPI } from '../../services/api';
import io from 'socket.io-client';

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
  const [astrologer, setAstrologer] = useState(null);
  const { user } = useAuth();
  
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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
      
      // Call backend API to get booking details
      const response = await bookingsAPI.getById(bookingId);
      
      // The API returns the booking directly in response.data, not in response.data.booking
      if (!response.data || !response.data.success) {
        throw new Error('Booking not found in response');
      }
      
      // Extract booking data directly from response.data
      const booking = response.data.data;
      const { astrologer } = booking;
      
      setAstrologer(astrologer);
      setLoading(false);
      
      // Start the session
      await startSession();
      
      // Initialize socket connection
      try {
        await initializeSocket(astrologer.id);
      } catch (error) {
        console.error('ChatScreen: Error initializing socket:', error);
        Alert.alert('Connection Error', 'Failed to connect to the consultation. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      
      // Show more specific error message
      if (error.response?.status === 404) {
        Alert.alert(
          'Booking Not Found', 
          'The consultation you are trying to join could not be found. The astrologer may still be preparing for the session. Please try again in a moment.'
        );
      } else {
        Alert.alert('Error', 'Failed to load booking details. Please try again.');
      }
    }
  };
  
  const startSession = async () => {
    try {
      // Call backend API to start the session
      const response = await sessionsAPI.start(bookingId, 'chat');
      
      if (!response.data || !response.data.success) {
        throw new Error('Failed to start session');
      }
      
      const { sessionId } = response.data;
      
      // Store the sessionId for later use (ending the session)
      setSessionActive(true);
      return sessionId;
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start chat session. Please try again.');
      navigation.goBack();
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
    const socketUrl = 'http://192.168.29.107:5000';
    console.log('ChatScreen: Connecting to socket server at:', socketUrl);
    
    const socketOptions = {
      query: {
        userId: user.id,
        astrologerId,
        bookingId,
        sessionType: 'chat',
      },
      auth: {
        token: userToken,
        id: user.id,
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
    socketRef.current.on('connect', () => {
      console.log('ChatScreen: Socket connected successfully');
      setConnecting(false);
      
      // Join a room specific to this booking
      console.log('ChatScreen: Joining room for booking:', bookingId);
      socketRef.current.emit('join_room', { bookingId }, (response) => {
        if (response && response.success) {
          console.log('ChatScreen: Successfully joined room for booking:', bookingId);
          
          // After joining the room, emit event to notify astrologer that user has joined
          socketRef.current.emit('user_joined_consultation', {
            bookingId,
            userId: user.id,
            astrologerId
          }, (response) => {
            console.log('ChatScreen: user_joined_consultation event acknowledgement:', response);
          });
          
          // Also emit the alternate event name as a fallback
          socketRef.current.emit('join_consultation', {
            bookingId,
            userId: user.id,
            astrologerId
          }, (response) => {
            console.log('ChatScreen: join_consultation event acknowledgement:', response);
          });
          
          // Send a direct notification to the astrologer as a test
          socketRef.current.emit('direct_astrologer_notification', {
            bookingId,
            userId: user.id,
            astrologerId,
            message: 'User has joined the consultation'
          }, (response) => {
            console.log('ChatScreen: direct_astrologer_notification event acknowledgement:', response);
          });
        } else {
          console.error('ChatScreen: Failed to join room:', response?.error || 'Unknown error');
        }
        // Add acknowledgement callback
        console.log('ChatScreen: join_consultation event acknowledgement:', response || 'No response');
      });
      
      // Direct message to specific astrologer socket
      console.log('ChatScreen: Emitting direct_astrologer_notification to astrologerId:', astrologerId);
      socketRef.current.emit('direct_astrologer_notification', {
        astrologerId: astrologerId,
        message: 'User has joined the consultation',
        bookingId: bookingId,
        roomId: routeParams.roomId || `consultation:${bookingId}`,
        sessionId: routeParams.sessionId
      });
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnecting(true);
    });
    
    // Listen for incoming messages
    socketRef.current.on('message', (message) => {
      setMessages(prevMessages => [...prevMessages, {
        id: message.id || Date.now().toString(),
        sender: 'astrologer',
        text: message.text,
        timestamp: message.timestamp || new Date().toISOString(),
      }]);
    });
    
    // Listen for session timer updates
    socketRef.current.on('timer', (data) => {
      setSessionTime(data.seconds);
    });
    
    // Listen for session end event
    socketRef.current.on('session_end', (data) => {
      handleSessionEnd(data);
    });
    
    // Fallback in case socket connection fails
    setTimeout(() => {
      if (connecting) {
        // Simulate connection if real socket fails
        setConnecting(false);
        setSessionActive(true);
        
        // Simulate receiving a welcome message
        const welcomeMessage = {
          id: Date.now().toString(),
          sender: 'astrologer',
          text: `Hello! I'm ${astrologer?.name || 'your astrologer'}. How can I help you today?`,
          timestamp: new Date().toISOString(),
        };
        
        setMessages([welcomeMessage]);
        
        // Start local session timer as fallback
        timerRef.current = setInterval(() => {
          setSessionTime(prevTime => prevTime + 1);
        }, 1000);
      }
    }, 5000);
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    
    if (!sessionActive) {
      Alert.alert('Session not active', 'Please wait for the astrologer to start the session.');
      return;
    }
    
    const newMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prevMessages => [...prevMessages, newMessage]);
    setInputText('');
    
    // In a real app, send message via socket
    socketRef.current.emit('send_message', {
      text: inputText.trim(),
      bookingId,
    });
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
              
              // Call backend API to end the session
              const activeSessionResponse = await sessionsAPI.getActive();
              
              if (activeSessionResponse.data && activeSessionResponse.data.session) {
                const { sessionId } = activeSessionResponse.data.session;
                await sessionsAPI.end(sessionId);
              }
              
              // Disconnect socket
              if (socketRef.current) {
                socketRef.current.disconnect();
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
  
  const handleSessionEnd = (data) => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Show session ended alert
    Alert.alert(
      'Session Ended',
      `Your session has ended. Duration: ${formatTime(data.duration || sessionTime)}`,
      [
        {
          text: 'Rate & Review',
          onPress: () => {
            navigation.replace('Rating', {
              astrologer,
              bookingId,
              astrologerId: astrologer?.id,
              sessionType: 'chat',
              duration: sessionTime,
              charges,
            });
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.astrologerMessage]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.messageTime}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
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
          <Ionicons name="time-outline" size={16} color="#8A2BE2" />
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
        </View>
      </View>
      
      {connecting ? (
        <View style={styles.connectingContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
          <Text style={styles.connectingText}>Connecting to astrologer...</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || !sessionActive}
            >
              <Ionicons name="send" size={20} color="#fff" />
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
  messagesList: {
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
  },
  astrologerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8A2BE2',
    borderBottomRightRadius: 0,
  },
  astrologerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    color: props => (props.sender === 'user' ? '#fff' : '#333'),
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#8A2BE2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
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
