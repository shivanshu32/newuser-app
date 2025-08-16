import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  const [sessionId, setSessionId] = useState(null);
  const [astrologer, setAstrologer] = useState(astrologerFromRoute || null);
  const [user, setUser] = useState(null);
  const [booking, setBooking] = useState(null);
  const [userInfo, setUserInfo] = useState(userInfoFromRoute || null);
  const [isAstrologerTyping, setIsAstrologerTyping] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);
  
  // Backend-managed timer state
  const [timerData, setTimerData] = useState({
    elapsedSeconds: 0,
    elapsedMinutes: 0,
    remainingSeconds: 0,
    remainingMinutes: 0,
    currentAmount: 0,
    currency: '₹',
    remainingBalance: 0,
    isActive: false,
    isCountdown: false, // Backend manages elapsed time
    formattedTime: '00:00'
  });
  
  const { user: authUser } = useAuth();
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const connectionManagerRef = useRef(null);
  const typingTimerRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const timerRef = useRef(null);
  const simpleTimerRef = useRef(null);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Simple timer increment function as fallback
  const startSimpleTimer = () => {
    if (simpleTimerRef.current) {
      clearInterval(simpleTimerRef.current);
    }
    
    simpleTimerRef.current = setInterval(() => {
      setTimerData(prev => ({
        ...prev,
        elapsedSeconds: prev.elapsedSeconds + 1,
        currentAmount: Math.floor((prev.elapsedSeconds + 1) / 60) * 2 // Assuming ₹2 per minute
      }));
    }, 1000);
  };

  const stopSimpleTimer = () => {
    if (simpleTimerRef.current) {
      clearInterval(simpleTimerRef.current);
      simpleTimerRef.current = null;
    }
  };

  // Start/stop simple timer when session becomes active/inactive
  useEffect(() => {
    if (sessionActive && timerData.isActive) {
      console.log('🔴 [USER-APP] Starting simple timer for active session');
      startSimpleTimer();
    } else {
      console.log('🔴 [USER-APP] Stopping simple timer');
      stopSimpleTimer();
    }

    return () => {
      stopSimpleTimer();
    };
  }, [sessionActive, timerData.isActive]); // 🔧 STABLE: Only essential state dependencies

  // Force activate session and timer on component mount as fallback
  useEffect(() => {
    const forceActivateTimer = setTimeout(() => {
      console.log('🔴 [USER-APP] Force activating session and timer after 3 seconds');
      console.log('🔴 [USER-APP] Current state:', { sessionActive, timerDataIsActive: timerData.isActive, connectionStatus });
      
      if (!sessionActive) {
        console.log('🔴 [USER-APP] Force setting sessionActive to true');
        setSessionActive(true);
      }
      
      if (!timerData.isActive) {
        console.log('🔴 [USER-APP] Force setting timerData.isActive to true');
        setTimerData(prev => ({
          ...prev,
          isActive: true,
          elapsedSeconds: 0,
          remainingSeconds: 1800,
          currentAmount: 0,
          isCountdown: false
        }));
      }
    }, 3000); // Force activate after 3 seconds

    return () => {
      clearTimeout(forceActivateTimer);
    };
  }, []); // Run only once on mount

  // Handle backend timer updates
  const handleBackendTimerUpdate = useCallback((timerUpdate) => {
    console.log('⏰ [USER-APP] Backend timer update received:', timerUpdate);
    
    // Update timer state with backend data
    setTimerData({
      elapsedSeconds: timerUpdate.durationSeconds || timerUpdate.seconds || 0,
      elapsedMinutes: Math.floor((timerUpdate.durationSeconds || timerUpdate.seconds || 0) / 60),
      remainingSeconds: timerUpdate.timeRemaining || 0,
      remainingMinutes: Math.floor((timerUpdate.timeRemaining || 0) / 60),
      currentAmount: timerUpdate.currentAmount || 0,
      currency: '₹',
      remainingBalance: timerUpdate.remainingBalance || 0,
      isActive: true,
      isCountdown: false,
      formattedTime: timerUpdate.formattedTime || formatTime(timerUpdate.durationSeconds || timerUpdate.seconds || 0)
    });
    
    // Ensure session is marked as active when receiving timer updates
    if (!sessionActive) {
      console.log('⏰ [USER-APP] Activating session based on backend timer update');
      setSessionActive(true);
    }
  }, []); // 🔧 STABLE: Removed sessionActive dependency to prevent re-renders

  // Handle session warnings from backend
  const handleSessionWarning = useCallback((warningData) => {
    console.log('⚠️ [USER-APP] Session warning from backend:', warningData);
    Alert.alert(
      'Session Warning',
      warningData.message || 'Your session will end soon due to insufficient balance.',
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  // Handle session end from backend
  const handleSessionEnd = useCallback((endData) => {
    console.log('🏁 [USER-APP] Session ended by backend:', endData);
    
    // Update timer state
    setTimerData(prev => ({ ...prev, isActive: false }));
    setSessionActive(false);
    
    // Trigger session end via socket (same as manual end)
    handleEndSession(endData.reason || 'time_expired');
  }, []);

  // Handle status updates from ChatConnectionManager (including timer events)
  const handleStatusUpdate = useCallback((statusData) => {
    console.log('📊 [USER-APP] Status update received from ChatConnectionManager:', statusData);
    
    if (statusData.type === 'timer') {
      // Handle backend timer updates
      handleBackendTimerUpdate(statusData);
    } else if (statusData.type === 'session_warning') {
      // Handle session warnings
      handleSessionWarning(statusData);
    } else if (statusData.type === 'session_end') {
      // Handle session end
      handleSessionEnd(statusData);
    } else {
      console.log('📊 [USER-APP] Unknown status update type:', statusData.type);
    }
  }, [handleBackendTimerUpdate, handleSessionWarning, handleSessionEnd]);

  const handleEndSession = (reason = 'user_ended') => {
    console.log('🔴 [USER-APP] Ending session with reason:', reason);
    
    // Update UI state
    setSessionActive(false);
    setTimerData(prev => ({ ...prev, isActive: false }));
    
    // Emit end session event to backend with null safety
    if (connectionManagerRef.current?.socket?.connected) {
      console.log('📡 [USER-APP] Emitting end_session event to backend');
      connectionManagerRef.current.socket.emit('end_session', {
        bookingId: bookingId || null,
        sessionId: sessionId || null,
        userId: authUser?.id || null,
        reason: reason || 'unknown',
        finalTimerData: timerData || {}
      });
    } else {
      console.warn('⚠️ [USER-APP] Cannot emit end_session - socket not connected');
    }
    
    // Show session end confirmation
    const duration = Math.ceil(timerData.elapsedSeconds / 60);
    const totalAmount = timerData.currentAmount;
    
    Alert.alert(
      'Session Ended',
      `The consultation has been ended.\n\nDuration: ${duration} minutes\nTotal Amount: ${timerData.currency}${totalAmount}`,
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
  };

  // Setup connection manager timer callbacks
  const setupTimerCallbacks = useCallback(() => {
    if (!connectionManagerRef.current) {
      console.log('⚠️ [USER-APP] Connection manager not available for timer callbacks');
      return;
    }

    console.log('🔗 [USER-APP] Setting up backend timer callbacks');
    
    // Add timer update callback
    if (connectionManagerRef.current.statusCallbacks) {
      connectionManagerRef.current.statusCallbacks.add(handleBackendTimerUpdate);
    }
    
    // Add session warning callback
    if (connectionManagerRef.current.warningCallbacks) {
      connectionManagerRef.current.warningCallbacks.add(handleSessionWarning);
    }
    
    // Add session end callback
    if (connectionManagerRef.current.endCallbacks) {
      connectionManagerRef.current.endCallbacks.add(handleSessionEnd);
    }
    
    console.log('✅ [USER-APP] Backend timer callbacks registered');
  }, [handleBackendTimerUpdate, handleSessionWarning, handleSessionEnd]);

  // Cleanup timer callbacks
  const cleanupTimerCallbacks = useCallback(() => {
    if (!connectionManagerRef.current) return;
    
    console.log('🧹 [USER-APP] Cleaning up backend timer callbacks');
    
    if (connectionManagerRef.current.statusCallbacks) {
      connectionManagerRef.current.statusCallbacks.delete(handleBackendTimerUpdate);
    }
    
    if (connectionManagerRef.current.warningCallbacks) {
      connectionManagerRef.current.warningCallbacks.delete(handleSessionWarning);
    }
    
    if (connectionManagerRef.current.endCallbacks) {
      connectionManagerRef.current.endCallbacks.delete(handleSessionEnd);
    }
  }, []); // 🔧 CRITICAL FIX: Removed callback dependencies to prevent rapid remounting

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
      
      // Cleanup backend timer callbacks
      cleanupTimerCallbacks();
      
      // Note: We don't disconnect the ConnectionManager here to maintain
      // socket connection for consecutive bookings. The socket should only
      // disconnect when the user logs out or exits the app completely.
      console.log('🟡 [USER-APP] EnhancedChatScreen cleanup - keeping socket connected for consecutive bookings');
      
      // Stop all timers and intervals
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []); // 🔧 CRITICAL FIX: Removed callback dependency to prevent rapid remounting

  // Setup backend timer callbacks when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log(' [USER-APP] Screen focused - setting up backend timer callbacks');
      
      // Setup timer callbacks to receive backend events
      setupTimerCallbacks();
      
      return () => {
        console.log(' [USER-APP] Screen unfocused');
        // Note: We don't cleanup callbacks here to maintain timer updates
        // even when screen is not focused
      };
    }, []) // 🔧 CRITICAL FIX: Removed callback dependency to prevent rapid remounting
  );

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
      
      // Initialize connection manager with astrologer ID and session options
      await initializeConnectionManager(astrologerId, {
        isFreeChat,
        // CRITICAL FIX: Pass the correct sessionId from booking data
        sessionId: routeParams.sessionId || bookingData.sessionId || bookingData._id
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
        // CRITICAL FIX: Use actual sessionId from booking data, not bookingId fallback
        sessionId: booking?.sessionId || sessionId || null, // Use proper sessionId from booking
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

  // Handle connection status changes
  const handleConnectionStatus = useCallback((status, message = '') => {
    console.log('🔴 [USER-APP] Connection status changed to:', status, message);
    setConnectionStatus(status);
    setConnectionMessage(message);
    
    if (status === 'connected') {
      setShowConnectionBanner(false);
      setConnectionRetryCount(0);
      
      // Final fallback: If connected but session not active, activate it
      if (!sessionActive) {
        console.log('🔴 [USER-APP] Connected but session not active - activating session and timer');
        setSessionActive(true);
        
        // Activate timer display if not already active
        if (!timerData.isActive) {
          setTimerData(prev => ({
            ...prev,
            isActive: true,
            elapsedSeconds: 0,
            remainingSeconds: 1800, // Default 30 minutes
            currentAmount: 0,
            isCountdown: false
          }));
        }
      }
    } else if (status === 'error' || status === 'failed') {
      setShowConnectionBanner(true);
    }
  }, [sessionActive, timerData.isActive]);



  // Handle manual session end (called from UI button)
  const handleManualEndSession = () => {
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
            console.log('🔴 [USER-APP] Manual session end requested');
            handleEndSession('user_ended_manual');
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
        
        {/* Debug logging for timer display */}
        {console.log('🎨 [TIMER-DEBUG] Timer display check:', {
          sessionActive,
          timerDataIsActive: timerData.isActive,
          timerDataElapsed: timerData.elapsedSeconds,
          connectionStatus,
          shouldShowTimer: sessionActive
        })}
        
        {/* Always show timer container for debugging */}
        <View style={styles.headerRight}>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              {sessionActive ? (
                timerData.isActive ? (
                  timerData.isCountdown 
                    ? formatTime(timerData.remainingSeconds) 
                    : formatTime(timerData.elapsedSeconds)
                ) : '00:00'
              ) : 'INACTIVE'}
            </Text>
            <Text style={styles.timerLabel}>
              {sessionActive ? (
                timerData.isActive ? (timerData.isCountdown ? 'remaining' : 'elapsed') : 'session'
              ) : 'not active'}
            </Text>
          </View>
          <View style={styles.billingContainer}>
            <Text style={styles.billingText}>
              {timerData.currency}{sessionActive && timerData.isActive ? timerData.currentAmount : 0}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.endButton}
            onPress={handleManualEndSession}
          >
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        </View>
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
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  timerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  billingContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  billingText: {
    fontSize: 12,
    fontWeight: '600',
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

// 🔧 CRITICAL FIX: Memoize component to prevent external remount triggers
// Custom comparison function to prevent remounts from parent re-renders
const arePropsEqual = (prevProps, nextProps) => {
  // Compare route params that matter for this component
  const prevParams = prevProps.route?.params || {};
  const nextParams = nextProps.route?.params || {};
  
  const criticalProps = ['bookingId', 'astrologerId', 'sessionId', 'isFreeChat', 'freeChatId'];
  
  for (const prop of criticalProps) {
    if (prevParams[prop] !== nextParams[prop]) {
      console.log('🚨 [USER-APP-MEMO-DEBUG] Props changed for:', prop, 'prev:', prevParams[prop], 'next:', nextParams[prop]);
      return false; // Props changed, allow re-render
    }
  }
  
  // Compare navigation object (but only key properties)
  if (prevProps.navigation?.isFocused?.() !== nextProps.navigation?.isFocused?.()) {
    console.log('🚨 [USER-APP-MEMO-DEBUG] Navigation focus changed');
    return false;
  }
  
  console.log('✅ [USER-APP-MEMO-DEBUG] Props are equal, preventing re-render');
  return true; // Props are equal, prevent re-render
};

export default React.memo(EnhancedChatScreen, arePropsEqual);
