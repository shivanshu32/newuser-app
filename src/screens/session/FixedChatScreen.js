import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  StatusBar,
  SafeAreaView,
  AppState,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, freeChatAPI } from '../../services/api';
import { getSocket } from '../../services/socketService';

// API Configuration
const API_BASE_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';

/**
 * FixedChatScreen - Production-ready chat implementation
 * 
 * Features:
 * - Real-time messaging with socket acknowledgments
 * - API fallback for message delivery
 * - Seamless reconnection without disrupting timer/chat
 * - Reliable missed message loading
 * - Glitch-free UI during reconnections
 */
const FixedChatScreen = ({ route, navigation }) => {
  // Extract route parameters
  const {
    bookingId,
    sessionId,
    astrologerId,
    consultationType = 'chat',
    isFreeChat = false,
    freeChatId,
    bookingDetails,
    userInfo
  } = route.params || {};

  // Core state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [sessionActive, setSessionActive] = useState(false);
  const [astrologerTyping, setAstrologerTyping] = useState(false);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timerData, setTimerData] = useState({
    elapsed: 0,
    isActive: false,
    amount: 0,
    currency: '₹'
  });

  // Session data
  const [sessionData, setSessionData] = useState({
    astrologer: null,
    user: null,
    booking: bookingDetails || null
  });

  // Refs
  const { user: authUser } = useAuth();
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const pendingMessagesRef = useRef(new Map());
  const lastMessageIdRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const timerRef = useRef(null);
  const sessionActivationTimeoutRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isInitializedRef = useRef(false);
  const roomJoinedRef = useRef(false);

  // Configuration
  const CONNECTION_CONFIG = {
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    messageTimeout: 10000,
    heartbeatInterval: 30000,
    typingTimeout: 3000
  };

  // Utility functions
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${++lastMessageIdRef.current}`;
  }, []);

  const getCurrentRoomId = useCallback(() => {
    if (isFreeChat) {
      return `free_chat:${freeChatId || bookingId}`;
    }
    // Return consultation:<bookingId> format - backend broadcasts to this room
    return `consultation:${bookingId}`;
  }, [isFreeChat, freeChatId, bookingId]);

  // Socket connection management
  const initializeSocket = useCallback(async () => {
    if (socketRef.current?.connected) {
      console.log('🔌 [FIXED-CHAT] Socket already connected');
      return;
    }

    console.log('🔌 [FIXED-CHAT] Initializing socket connection');
    try {
      socketRef.current = await getSocket();

      // Check if socket was successfully created
      if (!socketRef.current) {
        console.error('🚨 [FIXED-CHAT] Failed to get socket instance');
        setConnectionStatus('error');
        setTimeout(() => initializeSocket(), 2000); // Retry after 2 seconds
        return;
      }

      // Setup all socket event listeners first
      setupSocketListeners();
      
      // Connection event handlers
      socketRef.current.on('connect', () => {
        console.log('✅ [FIXED-CHAT] Socket connected');
        console.log('🔍 [FIXED-CHAT] Socket ID:', socketRef.current?.id);
        console.log('🔍 [FIXED-CHAT] Socket connected status:', socketRef.current?.connected);
        setConnectionStatus('connecting'); // Keep connecting until session is ready
        console.log('🔍 [FIXED-CHAT] About to call authenticateAndJoinRoom');
        authenticateAndJoinRoom();
        processMessageQueue();
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ [FIXED-CHAT] Socket disconnected:', reason);
        setConnectionStatus('disconnected');
        roomJoinedRef.current = false;
        // Schedule reconnect with timeout
        setTimeout(() => initializeSocket(), 2000);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🚨 [FIXED-CHAT] Connection error:', error);
        setConnectionStatus('error');
        // Schedule reconnect with timeout
        setTimeout(() => initializeSocket(), 2000);
      });

      if (!socketRef.current.connected) {
        socketRef.current.connect();
      }
    } catch (error) {
      console.error('🚨 [FIXED-CHAT] Socket initialization error:', error);
      setConnectionStatus('error');
      setTimeout(() => initializeSocket(), 2000);
    }
  }, []);

  // Setup socket event listeners
  const setupSocketListeners = useCallback(() => {
    if (!socketRef.current) {
      console.log('⚠️ [FIXED-CHAT] Cannot setup listeners - no socket ref');
      return;
    }

    console.log('🎧 [FIXED-CHAT] Setting up socket event listeners');
    
    // Message handlers
    socketRef.current.on('receive_message', handleIncomingMessage);
    socketRef.current.on('message_delivered', handleMessageDelivered);
    socketRef.current.on('typing_started', handleTypingStarted);
    socketRef.current.on('typing_stopped', handleTypingStopped);
    
    // Session handlers
    socketRef.current.on('session_timer_update', handleTimerUpdate);
    socketRef.current.on('session_started', handleSessionStarted);
    socketRef.current.on('session_ended', handleSessionEnded);
    
    // Booking and consultation handlers
    socketRef.current.on('booking_status_update', handleBookingStatusUpdate);
    socketRef.current.on('user_joined_consultation', handleUserJoinedConsultation);
    socketRef.current.on('astrologer_joined_consultation', handleAstrologerJoinedConsultation);
    
    // Missed messages
    socketRef.current.on('missed_messages', handleMissedMessages);
    
    console.log('✅ [FIXED-CHAT] All socket event listeners registered successfully');
    console.log('👤 [FIXED-CHAT] Listening for user_joined_consultation events...');
  }, [handleIncomingMessage, handleMessageDelivered, handleTypingStarted, handleTypingStopped, handleTimerUpdate, handleSessionStarted, handleSessionEnded, handleBookingStatusUpdate, handleUserJoinedConsultation, handleAstrologerJoinedConsultation, handleMissedMessages]);

  // Authentication and room joining
  const authenticateAndJoinRoom = useCallback(async () => {
    console.log('🔍 [FIXED-CHAT] authenticateAndJoinRoom called');
    console.log('🔍 [FIXED-CHAT] Socket connected:', socketRef.current?.connected);
    console.log('🔍 [FIXED-CHAT] Room already joined:', roomJoinedRef.current);
    
    if (!socketRef.current?.connected || roomJoinedRef.current) {
      console.log('⚠️ [FIXED-CHAT] Skipping room join - socket not connected or already joined');
      return;
    }

    try {
      console.log('🔍 [FIXED-CHAT] Getting user data from storage');
      const userData = await AsyncStorage.getItem('userData');
      const token = userData ? JSON.parse(userData).token : null;

      console.log('🔍 [FIXED-CHAT] Token found:', !!token);
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Authenticate socket
      console.log('🔐 [FIXED-CHAT] Authenticating socket');
      socketRef.current.emit('authenticate', { token, role: 'user' });

      // Join consultation room
      const roomId = getCurrentRoomId();
      console.log('🔍 [FIXED-CHAT] Room ID:', roomId);
      console.log('🔍 [FIXED-CHAT] Booking ID:', bookingId);
      console.log('🔍 [FIXED-CHAT] Session ID:', sessionId);
      console.log('🔍 [FIXED-CHAT] Astrologer ID:', astrologerId);
      
      const joinData = {
        roomId,
        bookingId,
        sessionId,
        astrologerId,
        userId: authUser?.id,
        consultationType,
        isFreeChat,
        timestamp: new Date().toISOString()
      };

      console.log('🏠 [FIXED-CHAT] Joining room:', joinData);

      socketRef.current.emit('join_consultation_room', joinData, (response) => {
        console.log('🏠 [FIXED-CHAT] Room join response:', response);
        if (response?.success) {
          console.log('✅ [FIXED-CHAT] Successfully joined room');
          roomJoinedRef.current = true;
          console.log('🔍 [FIXED-CHAT] roomJoinedRef.current set to:', roomJoinedRef.current);
          
          // Emit user_joined_consultation to notify backend
          socketRef.current.emit('user_joined_consultation', {
            bookingId,
            roomId: getCurrentRoomId(),
            astrologerId,
            consultationType,
            sessionId
          });
          
          // Request missed messages
          requestMissedMessages();
          
          // Don't set connected until session is properly activated by backend
          setConnectionStatus('connecting');
          
          // Set timeout fallback in case backend doesn't emit session_started
          if (sessionActivationTimeoutRef.current) {
            clearTimeout(sessionActivationTimeoutRef.current);
          }
          
          sessionActivationTimeoutRef.current = setTimeout(() => {
            console.log('⚠️ [FIXED-CHAT] Session activation timeout - activating as fallback');
            if (!sessionActive) {
              setConnectionStatus('connected');
              setSessionActive(true);
            }
          }, 10000); // 10 second timeout
          
          // Start session if not already active
          if (!sessionActive && response.sessionData) {
            setSessionActive(true);
            setSessionData(response.sessionData);
          }
        } else {
          console.error('❌ [FIXED-CHAT] Failed to join room:', response?.error);
          setConnectionStatus('error');
        }
      });

    } catch (error) {
      console.error('🚨 [FIXED-CHAT] Authentication error:', error);
      setConnectionStatus('error');
    }
  }, [sessionActive, authUser?.id, bookingId, sessionId, astrologerId, consultationType, isFreeChat, getCurrentRoomId]);

  // Message handling
  const handleIncomingMessage = useCallback((data) => {
    console.log('📨 [FIXED-CHAT] Incoming message:', data);

    // Validate message
    if (!data.id || !data.content || !data.sender) {
      console.warn('⚠️ [FIXED-CHAT] Invalid message received:', data);
      return;
    }

    // Add message to state with deduplication using functional update
    const normalizedMessage = {
      id: data.id,
      content: data.content,
      sender: data.sender,
      senderRole: data.senderRole || 'astrologer',
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'received'
    };

    setMessages(prev => {
      // Check for duplicates in the functional update
      const isDuplicate = prev.some(msg => msg.id === data.id);
      if (isDuplicate) {
        console.log('🔄 [FIXED-CHAT] Duplicate message ignored:', data.id);
        return prev; // Return unchanged state
      }
      
      console.log('✅ [FIXED-CHAT] Adding new message:', data.id);
      return [...prev, normalizedMessage];
    });

    // Send acknowledgment
    if (socketRef.current?.connected) {
      socketRef.current.emit('message_acknowledged', {
        messageId: data.id,
        roomId: getCurrentRoomId()
      });
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

  }, [getCurrentRoomId]);

  const handleMessageDelivered = useCallback((data) => {
    console.log('✅ [FIXED-CHAT] Message delivered:', data.messageId);
    
    // Update message status
    setMessages(prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: 'delivered' }
          : msg
      )
    );

    // Remove from pending messages
    pendingMessagesRef.current.delete(data.messageId);
  }, []);

  const handleMissedMessages = useCallback((data) => {
    console.log('📥 [FIXED-CHAT] Received missed messages:', data.messages?.length || 0);
    
    if (data.messages && Array.isArray(data.messages)) {
      const validMessages = data.messages
        .filter(msg => msg.id && msg.content && msg.sender)
        .map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          senderRole: msg.senderRole || (msg.sender === authUser?.id ? 'user' : 'astrologer'),
          timestamp: msg.timestamp || new Date().toISOString(),
          status: 'received'
        }));

      if (validMessages.length > 0) {
        setMessages(prev => {
          // Merge and deduplicate messages
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = validMessages.filter(m => !existingIds.has(m.id));
          
          // Sort by timestamp
          const allMessages = [...prev, ...newMessages].sort(
            (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
          );
          
          return allMessages;
        });
      }
    }
  }, [authUser?.id]);

  // Send message using simple socket emit like EnhancedChatScreen
  const sendMessage = useCallback(async () => {
    const content = inputText.trim();
    if (!content || !socketRef.current || !socketRef.current.connected || !sessionActive) {
      console.log('🔍 [FIXED-CHAT] Cannot send message - missing requirements:', {
        hasContent: !!content,
        hasSocket: !!socketRef.current,
        socketConnected: socketRef.current?.connected,
        sessionActive: sessionActive,
        roomJoined: roomJoinedRef.current
      });
      return;
    }

    console.log('📤 [FIXED-CHAT] Sending message:', content);

    // Create message object matching backend expectations
    const messageData = {
      id: generateMessageId(),
      content,
      text: content, // Backward compatibility
      message: content, // Backward compatibility
      sender: authUser?.id,
      senderRole: 'user',
      senderId: authUser?.id,
      senderName: authUser?.name || 'User',
      timestamp: new Date().toISOString(),
      roomId: bookingId, // Backend expects raw bookingId for message processing
      bookingId,
      sessionId,
      status: 'sending'
    };

    console.log('📤 [FIXED-CHAT] Message data:', {
      id: messageData.id,
      content: messageData.content,
      roomId: messageData.roomId,
      bookingId: messageData.bookingId,
      sessionId: messageData.sessionId,
      sender: messageData.sender
    });

    // Add message to UI immediately (optimistic update)
    setMessages(prev => [...prev, messageData]);
    setInputText('');

    try {
      // Send message via socket using simple emit like EnhancedChatScreen
      socketRef.current.emit('send_message', messageData);
      console.log('✅ [FIXED-CHAT] Message sent via socket:', messageData.id);
      
      // Update message status to sent
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageData.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );
    } catch (error) {
      console.error('❌ [FIXED-CHAT] Error sending message:', error);
      // Update message status to failed
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageData.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

  }, [inputText, authUser?.id, bookingId, sessionId, sessionActive, generateMessageId]);

  // Handle input text changes with typing indicators
  const handleInputChange = useCallback((text) => {
    setInputText(text);
    
    // Only send typing events if session is active and socket is connected
    if (!sessionActive || !socketRef.current?.connected || !roomJoinedRef.current) {
      return;
    }

    console.log('⌨️ [FIXED-CHAT] Sending typing_started event');
    
    // Send typing started event with raw bookingId to avoid ObjectId cast error
    socketRef.current.emit('typing_started', {
      roomId: getCurrentRoomId(), // This is consultation:<bookingId> for room joining
      bookingId, // Send raw bookingId for backend database queries
      sessionId,
      userId: authUser?.id,
      sender: authUser?.id,
      senderRole: 'user',
      timestamp: new Date().toISOString()
    });
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current?.connected && roomJoinedRef.current) {
        console.log('⌨️ [FIXED-CHAT] Sending typing_stopped event');
        socketRef.current.emit('typing_stopped', {
          roomId: getCurrentRoomId(), // This is consultation:<bookingId> for room joining
          bookingId, // Send raw bookingId for backend database queries
          sessionId,
          userId: authUser?.id,
          sender: authUser?.id,
          senderRole: 'user',
          timestamp: new Date().toISOString()
        });
      }
    }, 3000); // 3 seconds of inactivity
  }, [sessionActive, authUser?.id, bookingId, sessionId, getCurrentRoomId]);

  // API fallback for message sending
  const sendMessageViaAPI = useCallback(async (message) => {
    try {
      console.log('📡 [FIXED-CHAT] Sending via API fallback:', message.id);
      
      const endpoint = isFreeChat ? freeChatAPI.sendMessage : bookingsAPI.sendMessage;
      const payload = {
        content: message.content,
        roomId: message.roomId,
        bookingId: message.bookingId,
        sessionId: message.sessionId,
        messageId: message.id,
        timestamp: message.timestamp
      };

      const response = await endpoint(payload);
      
      if (response.success) {
        console.log('✅ [FIXED-CHAT] Message sent via API:', message.id);
        updateMessageStatus(message.id, 'sent');
        pendingMessagesRef.current.delete(message.id);
      } else {
        throw new Error(response.error || 'API send failed');
      }

    } catch (error) {
      console.error('🚨 [FIXED-CHAT] API fallback failed:', error);
      updateMessageStatus(message.id, 'failed');
    }
  }, [isFreeChat]);

  const updateMessageStatus = useCallback((messageId, status) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status }
          : msg
      )
    );
  }, []);

  // Typing indicators
  const handleTypingStarted = useCallback((data) => {
    if (data.sender !== authUser?.id) {
      setAstrologerTyping(true);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setAstrologerTyping(false);
      }, CONNECTION_CONFIG.typingTimeout);
    }
  }, [authUser?.id]);

  const handleTypingStopped = useCallback((data) => {
    if (data.sender !== authUser?.id) {
      setAstrologerTyping(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [authUser?.id]);

  // Timer management
  const handleTimerUpdate = useCallback((data) => {
    console.log('⏰ [FIXED-CHAT] Timer update:', data);
    
    if (data.bookingId === bookingId || data.sessionId === sessionId) {
      // CRITICAL FIX: Backend sends 'duration', not 'elapsedSeconds' or 'elapsed'
      const elapsedTime = data.duration || data.elapsedSeconds || data.elapsed || 0;
      console.log('⏰ [FIXED-CHAT] Setting timer elapsed time to:', elapsedTime);
      
      setTimerData({
        elapsed: elapsedTime,
        isActive: data.isActive !== false,
        amount: data.currentAmount || data.amount || 0,
        currency: data.currency || '₹'
      });
      
      // CRITICAL FIX: If we're receiving timer updates, the session is active
      // Update connection status to 'connected' to show green background
      if (connectionStatus !== 'connected') {
        console.log('✅ [FIXED-CHAT] Timer update received - setting status to connected');
        setConnectionStatus('connected');
        setSessionActive(true);
      }
    } else {
      console.log('⏰ [FIXED-CHAT] Timer update ignored - ID mismatch:', {
        dataBookingId: data.bookingId,
        dataSessionId: data.sessionId,
        localBookingId: bookingId,
        localSessionId: sessionId
      });
    }
  }, [bookingId, sessionId]);

  const handleSessionStarted = useCallback((data) => {
    console.log('🚀 [FIXED-CHAT] Session started:', data);
    console.log('🚀 [FIXED-CHAT] Backend confirms both parties joined - activating session');
    
    // Clear the session activation timeout since backend responded
    if (sessionActivationTimeoutRef.current) {
      clearTimeout(sessionActivationTimeoutRef.current);
      sessionActivationTimeoutRef.current = null;
    }
    
    // Only now set the session as active and connected
    setConnectionStatus('connected');
    setSessionActive(true);
    
    if (data.sessionData) {
      setSessionData(data.sessionData);
    }
    
    // Request timer sync from backend
    if (socketRef.current?.connected) {
      socketRef.current.emit('request_timer_sync', {
        bookingId,
        sessionId
      });
    }
  }, [bookingId, sessionId]);

  const handleSessionEnded = useCallback((data) => {
    console.log('🏁 [FIXED-CHAT] Session ended:', data);
    setSessionActive(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    Alert.alert(
      'Session Ended',
      data.reason || 'The consultation session has ended.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [navigation]);

  // Handle booking status updates
  const handleBookingStatusUpdate = useCallback((data) => {
    console.log('📋 [FIXED-CHAT] Booking status update:', data);
    
    if (data.status === 'accepted' && data.bookingId === bookingId) {
      console.log('✅ [FIXED-CHAT] Booking accepted - waiting for session_started event');
      // Don't immediately activate - wait for proper session_started event
      
      if (data.sessionId) {
        setSessionData({ sessionId: data.sessionId, roomId: data.roomId });
      }
    }
  }, [bookingId]);

  // Handle user joined consultation
  const handleUserJoinedConsultation = useCallback((data) => {
    console.log('👤 [FIXED-CHAT] User joined consultation event received!');
    console.log('👤 [FIXED-CHAT] Event data:', JSON.stringify(data, null, 2));
    console.log('👤 [FIXED-CHAT] Expected bookingId:', bookingId);
    console.log('👤 [FIXED-CHAT] Received bookingId:', data?.bookingId);
    
    if (data.bookingId === bookingId) {
      console.log('✅ [FIXED-CHAT] User joined - waiting for backend session activation');
      // Don't activate session yet - wait for session_started event from backend
    } else {
      console.log('⚠️ [FIXED-CHAT] BookingId mismatch, ignoring event');
    }
  }, [bookingId]);

  // Handle astrologer joined consultation
  const handleAstrologerJoinedConsultation = useCallback((data) => {
    console.log('🔮 [FIXED-CHAT] Astrologer joined consultation:', data);
    
    if (data.bookingId === bookingId) {
      console.log('✅ [FIXED-CHAT] Astrologer joined - waiting for backend session activation');
      // Don't activate session yet - wait for session_started event from backend
      
      // Start requesting timer updates
      if (socketRef.current?.connected) {
        console.log('⏰ [FIXED-CHAT] Requesting timer updates');
      }
    }
  }, [bookingId]);

  // End session handler
  const handleEndSession = useCallback(async () => {
    try {
      console.log('🛑 [FIXED-CHAT] Ending session:', { bookingId, sessionId });
      
      // Show confirmation dialog
      Alert.alert(
        'End Session',
        'Are you sure you want to end this consultation session?',
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
                // Call backend API to end session
                const token = await AsyncStorage.getItem('userToken');
                const response = await fetch(`${API_BASE_URL}/api/v1/sessions/end`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    sessionId: sessionId || bookingId,
                    bookingId: bookingId,
                    endedBy: 'user'
                  })
                });
                
                const result = await response.json();
                console.log('🛑 [FIXED-CHAT] End session response:', result);
                
                if (result.success) {
                  // Emit socket event for real-time notification
                  if (socketRef.current?.connected) {
                    socketRef.current.emit('end_session', {
                      sessionId: sessionId || bookingId,
                      bookingId: bookingId,
                      endedBy: 'user'
                    });
                  }
                  
                  // Navigate back
                  navigation.goBack();
                } else {
                  Alert.alert('Error', result.message || 'Failed to end session');
                }
              } catch (error) {
                console.error('🛑 [FIXED-CHAT] Error ending session:', error);
                Alert.alert('Error', 'Failed to end session. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('🛑 [FIXED-CHAT] Error in handleEndSession:', error);
    }
  }, [bookingId, sessionId, navigation]);

  // Reconnection logic
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(
      CONNECTION_CONFIG.reconnectDelay * Math.pow(2, (socketRef.current?.reconnectAttempts || 0)),
      CONNECTION_CONFIG.maxReconnectDelay
    );

    console.log(`🔄 [FIXED-CHAT] Scheduling reconnect in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current?.connected) {
        console.log('🔄 [FIXED-CHAT] Attempting reconnection');
        initializeSocket();
      }
    }, delay);
  }, [initializeSocket]);

  // Message queue processing
  const processMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;

    console.log(`📤 [FIXED-CHAT] Processing ${messageQueueRef.current.length} queued messages`);
    
    const queue = [...messageQueueRef.current];
    messageQueueRef.current = [];
    
    queue.forEach(message => {
      if (socketRef.current?.connected && roomJoinedRef.current) {
        socketRef.current.emit('send_message', message);
      } else {
        sendMessageViaAPI(message);
      }
    });
  }, [sendMessageViaAPI]);

  // Request missed messages
  const requestMissedMessages = useCallback(() => {
    if (!socketRef.current?.connected || !roomJoinedRef.current) return;

    console.log('📥 [FIXED-CHAT] Requesting missed messages');
    
    socketRef.current.emit('get_missed_messages', {
      roomId: getCurrentRoomId(),
      bookingId,
      sessionId,
      lastMessageTimestamp: messages.length > 0 
        ? messages[messages.length - 1].timestamp 
        : null
    });
  }, [getCurrentRoomId, bookingId, sessionId, messages]);

  // App state handling
  const handleAppStateChange = useCallback((nextAppState) => {
    console.log('📱 [FIXED-CHAT] App state changed:', appStateRef.current, '->', nextAppState);
    
    if (appStateRef.current === 'background' && nextAppState === 'active') {
      if (!socketRef.current?.connected) {
        initializeSocket();
      } else if (roomJoinedRef.current) {
        requestMissedMessages();
      }
    }
    
    appStateRef.current = nextAppState;
  }, [initializeSocket, requestMissedMessages]);

  // Initialization
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    console.log('🚀 [FIXED-CHAT] Initializing FixedChatScreen');
    isInitializedRef.current = true;
    
    initializeSocket();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    setTimeout(() => setLoading(false), 1000);
    
    return () => {
      subscription?.remove();
    };
  }, [initializeSocket, handleAppStateChange]);

  // Setup socket listeners after handlers are defined
  useEffect(() => {
    if (socketRef.current && isInitializedRef.current) {
      setupSocketListeners();
    }
  }, [setupSocketListeners]);

  // Cleanup
  useEffect(() => {
    return () => {
      console.log('🧹 [FIXED-CHAT] Cleaning up');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      if (socketRef.current?.connected && roomJoinedRef.current) {
        socketRef.current.emit('leave_consultation', {
          roomId: getCurrentRoomId(),
          bookingId,
          sessionId
        });
      }
      
      if (socketRef.current) {
        socketRef.current.off('receive_message', handleIncomingMessage);
        socketRef.current.off('message_delivered', handleMessageDelivered);
        socketRef.current.off('typing_started', handleTypingStarted);
        socketRef.current.off('typing_stopped', handleTypingStopped);
        socketRef.current.off('session_timer_update', handleTimerUpdate);
        socketRef.current.off('session_started', handleSessionStarted);
        socketRef.current.off('session_ended', handleSessionEnded);
        socketRef.current.off('missed_messages', handleMissedMessages);
      }
    };
  }, []);

  // Render message item
  const renderMessage = useCallback(({ item }) => {
    const isOwnMessage = item.sender === authUser?.id || item.senderRole === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {new Date(item.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </Text>
            {isOwnMessage && (
              <Ionicons
                name={
                  item.status === 'sending' ? 'time-outline' :
                  item.status === 'sent' ? 'checkmark' :
                  item.status === 'delivered' ? 'checkmark-done' :
                  'alert-circle-outline'
                }
                size={12}
                color={isOwnMessage ? '#FFFFFF' : '#666666'}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
  }, [authUser?.id]);

  // Connection status
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'disconnected': return '#F44336';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  // Memoized timer display
  const timerDisplay = useMemo(() => {
    const formattedTime = formatTime(timerData.elapsed);
    return {
      time: formattedTime,
      amount: `${timerData.currency}${timerData.amount.toFixed(2)}`,
      isActive: timerData.isActive
    };
  }, [timerData, formatTime]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#6B46C1" 
          translucent={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={styles.loadingText}>Connecting to consultation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#6B46C1" 
        translucent={false}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {sessionData.astrologer?.name || 'Astrologer'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {consultationType === 'chat' ? 'Chat Consultation' : 'Consultation'}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>{timerDisplay.time}</Text>
            <Text style={styles.amountText}>{timerDisplay.amount}</Text>
          </View>
          {sessionActive && (
            <TouchableOpacity 
              style={styles.endSessionButton} 
              onPress={handleEndSession}
              activeOpacity={0.7}
            >
              <Ionicons name="stop-circle" size={20} color="#FF4444" />
              <Text style={styles.endSessionText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Connection Status Banner */}
      {connectionStatus !== 'connected' && (
        <View style={[styles.statusBanner, { backgroundColor: getConnectionStatusColor() }]}>
          <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
        </View>
      )}

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Typing Indicator */}
        {astrologerTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Astrologer is typing...</Text>
          </View>
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={sessionActive && connectionStatus !== 'error'}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !sessionActive) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || !sessionActive}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B46C1',
    paddingTop: Platform.OS === 'ios' ? 10 : 25,
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  amountText: {
    fontSize: 12,
    color: '#E0E0E0',
    marginTop: 2,
  },
  endSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  endSessionText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageContainer: {
    marginVertical: 4,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: '#6B46C1',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#333333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 5,
  },
  ownMessageTime: {
    color: '#E0E0E0',
  },
  otherMessageTime: {
    color: '#999999',
  },
  statusIcon: {
    marginLeft: 2,
  },
  typingContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#666666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'android' ? 20 : 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

export default FixedChatScreen;
