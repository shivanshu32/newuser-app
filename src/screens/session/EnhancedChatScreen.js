import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';
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
  StatusBar,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, freeChatAPI } from '../../services/api';
import ChatConnectionManager from '../../utils/ChatConnectionManager';

const EnhancedChatScreen = ({ route, navigation }) => {
  // Extract and validate bookingId from route params
  const routeParams = route.params || {};
  const bookingId = routeParams.bookingId || (routeParams.booking && routeParams.booking._id);
  const astrologerFromRoute = routeParams.astrologer;
  const userInfoFromRoute = routeParams.userInfo;
  const isFreeChat = routeParams.isFreeChat || false;
  const freeChatId = routeParams.freeChatId || bookingId;
  
  // State variables
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('initializing');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [astrologer, setAstrologer] = useState(astrologerFromRoute || null);
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [userInfo, setUserInfo] = useState(userInfoFromRoute || null);
  const [isAstrologerTyping, setIsAstrologerTyping] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  const { user: authUser } = useAuth();
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const connectionManagerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const timerRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };



  // Initialize component
  useEffect(() => {
    if (!bookingId) {
      Alert.alert('Error', 'No booking ID provided. Please go back and try again.');
      setLoading(false);
      return;
    }

    fetchBookingDetails();
    
    return () => {
      // Cleanup
      console.log('🔴 [USER-APP] EnhancedChatScreen: Cleaning up on unmount');
      
      // Note: We don't disconnect the ConnectionManager here to maintain
      // socket connection for consecutive bookings. The socket should only
      // disconnect when the user logs out or exits the app completely.
      console.log('🟡 [USER-APP] EnhancedChatScreen cleanup - keeping socket connected for consecutive bookings');
      
      // Stop all timers and intervals
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Fetch booking details and initialize connection
  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      
      let response, bookingData;
      
      if (isFreeChat) {
        console.log('🆓 EnhancedChatScreen: Fetching free chat details for ID:', freeChatId);
        response = await freeChatAPI.getFreeChatDetails(freeChatId);
        console.log('📦 EnhancedChatScreen: Free Chat API Response:', JSON.stringify(response, null, 2));
        bookingData = response.data;
        
        // For free chat, ensure we have astrologer data from route params or API response
        if (astrologerFromRoute) {
          console.log('🆓 EnhancedChatScreen: Using astrologer from route params:', astrologerFromRoute);
          bookingData.astrologer = astrologerFromRoute;
        } else if (bookingData && bookingData.astrologer) {
          console.log('🆓 EnhancedChatScreen: Using astrologer from API response:', bookingData.astrologer);
        } else {
          console.warn('🆓 EnhancedChatScreen: No astrologer data found in route params or API response');
        }
        
        // Set user data from route params or auth user
        if (routeParams.userProfile) {
          bookingData.user = routeParams.userProfile;
        } else if (authUser) {
          bookingData.user = authUser;
        }
        
        // Ensure we have session data for free chat
        if (routeParams.sessionId) {
          bookingData.sessionId = routeParams.sessionId;
        }
        
        console.log('🆓 EnhancedChatScreen: Final free chat booking data:', JSON.stringify(bookingData, null, 2));
      } else {
        console.log('💼 EnhancedChatScreen: Fetching regular booking details for ID:', bookingId);
        response = await bookingsAPI.getById(bookingId);
        console.log('📦 EnhancedChatScreen: Booking API Response:', JSON.stringify(response, null, 2));
        bookingData = response.data;
      }
      
      console.log('📋 EnhancedChatScreen: Final booking data:', JSON.stringify(bookingData, null, 2));
      
      if (!bookingData) {
        throw new Error('No booking data received from API');
      }
      
      setBooking(bookingData);
      
      // Handle different possible astrologer data structures
      let astrologerData = null;
      let astrologerId = null;
      
      if (bookingData.astrologer) {
        astrologerData = bookingData.astrologer;
        astrologerId = bookingData.astrologer._id || bookingData.astrologer.id || bookingData.astrologer;
      } else if (bookingData.astrologerId) {
        astrologerId = bookingData.astrologerId;
      } else if (routeParams.astrologerId) {
        astrologerId = routeParams.astrologerId;
      }
      
      console.log('👨‍⚕️ EnhancedChatScreen: Astrologer data:', astrologerData);
      console.log('🆔 EnhancedChatScreen: Astrologer ID:', astrologerId);
      
      if (!astrologerId) {
        throw new Error('No astrologer ID found in booking data or route params');
      }
      
      setAstrologer(astrologerData);
      setUser(bookingData.user);
      
      // For free chat sessions, activate the session immediately since they're already accepted
      if (isFreeChat) {
        console.log('🆓 EnhancedChatScreen: Activating free chat session immediately');
        setSessionActive(true);
        setConnectionStatus('session_active');
        if (routeParams.sessionId || bookingData.sessionId) {
          setSessionId(routeParams.sessionId || bookingData.sessionId);
        }
      }
      
      // Initialize connection manager with astrologer ID and free chat options
      await initializeConnectionManager(astrologerId, {
        isFreeChat,
        sessionId: routeParams.sessionId || bookingData.sessionId
      });
      
      setLoading(false);
      console.log('✅ EnhancedChatScreen: Booking details loaded successfully');
    } catch (error) {
      console.error('❌ EnhancedChatScreen: Error fetching booking details:', error);
      console.error('❌ EnhancedChatScreen: Error details:', {
        message: error.message,
        stack: error.stack,
        bookingId,
        routeParams
      });
      setLoading(false);
      Alert.alert('Error', `Failed to load chat session: ${error.message}`);
    }
  };

  // Initialize connection manager
  const initializeConnectionManager = (astrologerId, options = {}) => {
    try {
      console.log('🔍 EnhancedChatScreen: Initializing connection manager with astrologer ID:', astrologerId);
      console.log('🔍 EnhancedChatScreen: Connection options:', options);
      
      connectionManagerRef.current = new ChatConnectionManager();
      
      // Set booking details for connection manager
      connectionManagerRef.current.currentBookingId = bookingId;
      connectionManagerRef.current.currentUserId = authUser?.id;
      
      // Set up event listeners
      connectionManagerRef.current.onMessage(handleNewMessage);
      connectionManagerRef.current.onConnectionStatus(handleConnectionStatus);
      connectionManagerRef.current.onStatusUpdate(handleStatusUpdate);
      connectionManagerRef.current.onTyping(handleTypingStatus);
      
      // Set up additional event listeners for free chat
      if (options.isFreeChat) {
        console.log('🆓 EnhancedChatScreen: Setting up free chat event listeners');
        
        // Listen for free chat room joined event
        connectionManagerRef.current.socket?.on('free_chat_room_joined', (data) => {
          console.log('🆓 EnhancedChatScreen: Free chat room joined event received:', data);
          if (data.freeChatId === bookingId || data.freeChatId === options.sessionId) {
            console.log('🆓 EnhancedChatScreen: Successfully joined free chat room');
            setConnectionStatus('room_joined');
          }
        });
        
        // Listen for free chat timer started event
        connectionManagerRef.current.socket?.on('free_chat_timer_started', (data) => {
          console.log('🆓 EnhancedChatScreen: Free chat timer started event received:', data);
          if (data.freeChatId === bookingId || data.freeChatId === options.sessionId) {
            console.log('🆓 EnhancedChatScreen: Free chat timer started');
            setSessionActive(true);
            setConnectionStatus('session_active');
            setSessionTime(data.durationSeconds || 0);
          }
        });
      }
      
      // Initialize connection with options
      connectionManagerRef.current.initialize(astrologerId, options);
      
      setConnectionStatus('connecting');
      
      // For free chat, explicitly ensure we join the room
      if (options.isFreeChat) {
        console.log('🆓 EnhancedChatScreen: Explicitly joining free chat room after initialization');
        
        // Set a timeout to ensure the socket is connected before joining
        setTimeout(() => {
          if (connectionManagerRef.current && connectionManagerRef.current.socket?.connected) {
            console.log('🆓 EnhancedChatScreen: Emitting join_free_chat_room event directly');
            connectionManagerRef.current.socket.emit('join_free_chat_room', {
              freeChatId: bookingId,
              sessionId: options.sessionId || bookingId,
              userId: authUser?.id,
              userType: 'user'
            });
          } else {
            console.log('🆓 EnhancedChatScreen: Socket not connected yet, will rely on ChatConnectionManager.joinRoom');
          }
        }, 1000);
      }
    } catch (error) {
      console.error('🔍 EnhancedChatScreen: Failed to initialize connection manager:', error);
      setConnectionStatus('error');
      setConnectionMessage('Failed to initialize chat connection');
      console.error('EnhancedChatScreen: Error initializing connection manager:', error);
      Alert.alert('Connection Error', 'Failed to establish connection. Please try again.');
    }
  };



  // Handle status updates (timer, session end, etc.)
  const handleStatusUpdate = useCallback((data) => {
    console.log('🔴 [USER-APP] EnhancedChatScreen: Status update received:', data);
    
    if (data.type === 'timer') {
      console.log('🔴 [USER-APP] Timer update:', data.durationSeconds);
      setSessionTime(data.durationSeconds);
      
      // If we're receiving timer updates but session isn't active, activate it
      setSessionActive(prevActive => {
        if (!prevActive && data.durationSeconds > 0) {
          console.log('🔴 [USER-APP] Timer running but session not active - activating session');
          setConnectionStatus('session_active');
          setSessionId(data.sessionId || bookingId);
          return true;
        }
        return prevActive;
      });
    } else if (data.type === 'session_end') {
      console.log('🔴 [USER-APP] Session end received');
      handleSessionEnd(data);
    } else if (data.type === 'session_started') {
      console.log('🔴 [USER-APP] Session started, activating chat');
      console.log('🔴 [USER-APP] Session data:', data);
      
      setSessionActive(prevActive => {
        console.log('🔴 [USER-APP] Current sessionActive:', prevActive);
        setSessionId(data.data?.sessionId || data.sessionId || bookingId);
        setConnectionStatus('session_active');
        console.log('🔴 [USER-APP] Session activated via session_started event');
        return true;
      });
    } else if (data.type === 'astrologer_joined') {
      console.log('🔴 [USER-APP] Astrologer joined, session should be ready');
      setConnectionStatus('astrologer_joined');
      
      // If we already have timer updates, activate the session immediately
      setSessionActive(prevActive => {
        if (sessionTime > 0 && !prevActive) {
          console.log('🔴 [USER-APP] Astrologer joined and timer is running - activating session');
          setConnectionStatus('session_active');
          return true;
        }
        return prevActive;
      });
    } else if (data.type === 'consultation_ended') {
      console.log('🔴 [USER-APP] Consultation ended event received in handleStatusUpdate');
      console.log('🔴 [USER-APP] Session ended by:', data.endedBy);
      console.log('🔴 [USER-APP] Session data:', data.sessionData);
      
      // Clear session state
      setSessionActive(false);
      setConnectionStatus('session_ended');
      
      // Show alert with session summary and navigate back
      const sessionData = data.sessionData || {};
      const duration = sessionData.duration || 0;
      const totalAmount = sessionData.totalAmount || 0;
      
      Alert.alert(
        'Session Ended',
        `The consultation has been ended by ${data.endedBy}.\n\nDuration: ${duration} minutes\nTotal Amount: ₹${totalAmount}`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔴 [USER-APP] Navigating back after session end');
              // Navigate back to previous screen
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Home');
              }
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [bookingId, sessionTime]);

  // Handle new messages
  const handleNewMessage = useCallback((message) => {
    const startTime = Date.now();
    console.log('🔴 [USER-APP] Received message at:', startTime, message);
    
    // Use InteractionManager to ensure immediate UI update without blocking
    InteractionManager.runAfterInteractions(() => {
      setMessages(prevMessages => {
        // Ensure prevMessages is always an array
        const messages = prevMessages || [];
        
        // Enhanced deduplication logic
        // Check for exact ID match first
        const exactIdExists = messages.some(msg => msg.id === message.id);
        if (exactIdExists) {
          console.log('🔴 [USER-APP] Duplicate message ignored (exact ID):', message.id);
          return messages;
        }
        
        // Check for content-based duplication (same sender, content, and similar timestamp)
        // This handles cases where backend echo has different ID than optimistic UI
        const contentDuplicate = messages.some(msg => {
          const isSameSender = msg.senderId === message.senderId;
          const isSameContent = msg.content === message.content;
          const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - new Date(message.timestamp).getTime());
          const isSimilarTime = timeDiff < 5000; // Within 5 seconds
          
          return isSameSender && isSameContent && isSimilarTime;
        });
        
        if (contentDuplicate) {
          console.log('🔴 [USER-APP] Duplicate message ignored (content-based):', {
            content: message.content,
            senderId: message.senderId,
            timestamp: message.timestamp
          });
          return messages;
        }
        
        // Optimize: Only sort if message timestamp is older than the last message
        // Most messages arrive in chronological order, so avoid unnecessary sorting
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        let newMessages;
        
        if (!lastMessage || new Date(message.timestamp) >= new Date(lastMessage.timestamp)) {
          // Message is newer or equal, just append (most common case)
          newMessages = [...messages, message];
        } else {
          // Message is older, need to sort (rare case)
          newMessages = [...messages, message].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
          );
        }
        
        const endTime = Date.now();
        console.log('🔴 [USER-APP] Message processed in:', endTime - startTime, 'ms');
        console.log('🔴 [USER-APP] Messages state updated. Total messages:', newMessages.length);
        console.log('🔴 [USER-APP] Latest message content check:', {
          id: message.id,
          content: message.content,
          text: message.text,
          message: message.message
        });
        
        return newMessages;
      });
      
      // Immediate scroll after state update
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false }); // Use non-animated for faster response
      });
    });
    
    // Note: Removed duplicate setMessages call to prevent message duplication
    // The InteractionManager.runAfterInteractions call above handles the state update
  }, []);

  // Handle typing status
  const handleTypingStatus = useCallback((isTyping, data) => {
    console.log('🔴 [USER-APP] Typing status received:', { isTyping, data });
    console.log('🔴 [USER-APP] Data structure:', {
      senderId: data?.senderId,
      astrologerId: data?.astrologerId, 
      userId: data?.userId,
      senderRole: data?.senderRole
    });
    console.log('🔴 [USER-APP] Current user ID:', authUser?.id);
    
    // Only show typing indicator if it's from the astrologer (not from current user)
    // Backend sends userId (which is astrologerId when astrologer types) and senderRole
    const senderId = data?.senderId || data?.astrologerId || data?.userId;
    const isFromAstrologer = data?.senderRole === 'astrologer' || 
                            (senderId && senderId !== authUser?.id);
    
    if (isFromAstrologer) {
      console.log('🔴 [USER-APP] Setting astrologer typing status:', isTyping);
      setIsAstrologerTyping(isTyping);
    } else {
      console.log('🔴 [USER-APP] Ignoring typing status - from current user or invalid sender');
    }
  }, [authUser?.id]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || !connectionManagerRef.current) {
      return;
    }

    const tempMessage = {
      id: Date.now().toString(),
      content: messageText.trim(),
      text: messageText.trim(),
      message: messageText.trim(),
      sender: 'user',
      senderId: authUser?.id,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    console.log('🔴 [USER-APP] Sending message:', tempMessage);

    // Add message to UI immediately
    setMessages(prevMessages => [...prevMessages, tempMessage]);
    setMessageText('');

    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Send message via connection manager
      await connectionManagerRef.current.sendMessage({
        roomId: bookingId, // Backend expects roomId parameter
        content: tempMessage.content,
        text: tempMessage.text,
        message: tempMessage.message,
        bookingId: bookingId,
        sessionId: sessionId || bookingId,
        senderId: authUser?.id,
        senderName: authUser?.name || 'User',
        sender: 'user',
        messageId: tempMessage.id,
        timestamp: tempMessage.timestamp
      });

      // Update message status to sent
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      console.log('🔴 [USER-APP] Message sent successfully');
    } catch (error) {
      console.error('🔴 [USER-APP] Failed to send message:', error);
      
      // Update message status to failed
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  }, [messageText, authUser?.id, bookingId, sessionId]);

  // Handle typing input
  const handleTypingInput = useCallback((text) => {
    setMessageText(text);
    
    // Send typing indicator
    if (connectionManagerRef.current) {
      connectionManagerRef.current.sendTypingStatus(true);
      
      // Clear typing indicator after 2 seconds
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (connectionManagerRef.current) {
          connectionManagerRef.current.sendTypingStatus(false);
        }
      }, 2000);
    }
  }, []);

  // Handle connection status
  const handleConnectionStatus = useCallback((status) => {
    console.log('🔴 [USER-APP] Connection status:', status);
    setConnectionStatus(status.status);
    setConnectionMessage(status.message || '');
    setShowConnectionBanner(status.status !== 'connected');
  }, []);

  // Handle session end
  const handleSessionEnd = (data) => {
    console.log('Session ended:', data);
    setSessionActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    Alert.alert(
      'Session Ended',
      'The consultation session has ended.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Handle manual session end
  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this consultation session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            if (connectionManagerRef.current && connectionManagerRef.current.endSession) {
              console.log('🔴 [USER-APP] Ending session with sessionId:', sessionId || bookingId);
              connectionManagerRef.current.endSession(sessionId || bookingId);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };



  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting':
      case 'reconnecting': return '#FF9800';
      case 'error':
      case 'failed': return '#F44336';
      case 'queued': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  // Get connection status text
  const getConnectionStatusText = () => {
    // If session is active, show session status instead of connection status
    if (sessionActive) {
      return isFreeChat ? 'Free Chat Active' : 'In Session';
    }
    
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return connectionMessage || 'Reconnecting...';
      case 'error': return 'Connection Error';
      case 'failed': return 'Connection Failed';
      case 'queued': return 'Message Queued';
      case 'flushed': return 'Messages Sent';
      case 'disconnected': return loading ? 'Connecting...' : 'Disconnected';
      case 'initializing': return 'Initializing...';
      case 'session_active': return isFreeChat ? 'Free Chat Active' : 'Session Active';
      case 'astrologer_joined': return 'Astrologer Joined - Starting Session...';
      case 'joining': return isFreeChat ? 'Joining Free Chat...' : 'Joining Consultation...';
      case 'user_joined': return 'You Joined - Waiting for Astrologer';
      default: 
        console.log('EnhancedChatScreen: Unknown connection status:', connectionStatus);
        return loading ? 'Connecting...' : 'Waiting for Astrologer';
    }
  };



  // Render message item
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user' || item.senderId === authUser.id;
    const messageContent = item.content || item.text || item.message || 'Message content unavailable';
    
    console.log('🔴 [USER-APP] Rendering message:', {
      id: item.id,
      sender: item.sender,
      senderId: item.senderId,
      authUserId: authUser?.id,
      isUser: isUser,
      content: item.content,
      text: item.text,
      message: item.message,
      messageContent: messageContent
    });
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.astrologerMessage]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.astrologerBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.astrologerMessageText]}>
            {messageContent}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isUser ? styles.userMessageTime : styles.astrologerMessageTime]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isUser && (
              <View style={styles.messageStatus}>
                {item.status === 'sending' && <ActivityIndicator size="small" color="#666" />}
                {item.status === 'sent' && <Ionicons name="checkmark" size={12} color="#666" />}
                {item.status === 'read' && <Ionicons name="checkmark-done" size={12} color="#4CAF50" />}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (!isAstrologerTyping) return null;
    
    return (
      <View style={[styles.messageContainer, styles.astrologerMessage]}>
        <View style={[styles.messageBubble, styles.astrologerBubble, styles.typingBubble]}>
          <Text style={styles.typingText}>Astrologer is typing...</Text>
          <ActivityIndicator size="small" color="#666" style={styles.typingIndicator} />
        </View>
      </View>
    );
  };

  // Render connection banner
  const renderConnectionBanner = () => {
    if (!showConnectionBanner) return null;
    
    return (
      <View style={[styles.connectionBanner, { backgroundColor: getConnectionStatusColor() }]}>
        <Text style={styles.connectionBannerText}>
          {getConnectionStatusText()}
        </Text>
        {(connectionStatus === 'connecting' || connectionStatus === 'reconnecting') && (
          <ActivityIndicator size="small" color="#FFF" style={styles.bannerIndicator} />
        )}
      </View>
    );
  };

  // Debug logging for UI rendering
  console.log('🎨 [UI-DEBUG] EnhancedChatScreen render state:', {
    loading,
    astrologer: astrologer ? { id: astrologer.id, name: astrologer.name } : null,
    sessionActive,
    connectionStatus,
    isFreeChat,
    messagesCount: messages.length
  });

  if (loading) {
    console.log('🎨 [UI-DEBUG] Showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text style={styles.loadingText}>Loading chat session...</Text>
      </View>
    );
  }

  console.log('🎨 [UI-DEBUG] Rendering main chat interface');
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <StatusBar barStyle="light-content" backgroundColor="#6B46C1" />
      
      {/* Header */}
      <View style={styles.header}>
        {console.log('🎨 [UI-DEBUG] Rendering header with astrologer:', astrologer)}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Image 
            source={{ uri: astrologer?.profileImage || astrologer?.imageUrl || 'https://via.placeholder.com/40' }}
            style={styles.astrologerImage}
          />
          <View style={styles.headerText}>
            <Text style={styles.astrologerName}>
              {astrologer?.displayName || astrologer?.name || 'Astrologer'}
            </Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
              <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
            </View>
          </View>
        </View>
        
        {sessionActive && (
          <View style={styles.headerRight}>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
            </View>
            {sessionActive && (
              <TouchableOpacity 
                style={styles.endButton}
                onPress={handleEndSession}
              >
                <Text style={styles.endButtonText}>End</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Connection Banner */}
      {renderConnectionBanner()}

      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id?.toString() || item.timestamp}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderTypingIndicator}
        // Performance optimizations for instant message rendering
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
        windowSize={10}
        getItemLayout={undefined} // Let FlatList calculate automatically for variable heights
        // Disable virtualization for better real-time performance
        disableVirtualization={false}
        // Optimize for frequent updates
        legacyImplementation={false}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={messageText}
          onChangeText={handleTypingInput}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { opacity: messageText.trim() ? 1 : 0.5 }]}
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
        >
          <Ionicons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B46C1',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#6B46C1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  astrologerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#E0E0E0',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  endButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#6B46C1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connectionBannerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  bannerIndicator: {
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
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
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#6B46C1',
    borderBottomRightRadius: 4,
  },
  astrologerBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#FFF',
  },
  astrologerMessageText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
  },
  userMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  astrologerMessageTime: {
    color: '#999',
  },
  messageStatus: {
    marginLeft: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  typingIndicator: {
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#6B46C1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default EnhancedChatScreen;
