import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const API_BASE_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1';

/**
 * FixedFreeChatScreen - Production-Ready Free Chat Implementation
 */
const FixedFreeChatScreen = ({ route, navigation }) => {
  console.log('🚀 FixedFreeChatScreen: Component mounting with params:', route.params);
  console.log('🔍 [DEBUG] Raw route.params:', JSON.stringify(route.params, null, 2));
  
  const {
    freeChatId,
    sessionId,
    astrologerId,
    userProfile,
    bookingDetails, // May be undefined for free chat
    astrologer, // May be passed directly
    isFreeChat = true, // Default to true for this screen
    sessionDuration = 180, // 3 minutes default for free chat
    consultationType = 'chat', // Default to 'chat' for free chat sessions
  } = route.params || {};
  
  console.log('🔍 [DEBUG] Extracted parameters:');
  console.log('🔍 [DEBUG] freeChatId:', freeChatId);
  console.log('🔍 [DEBUG] sessionId:', sessionId);
  console.log('🔍 [DEBUG] astrologerId:', astrologerId);
  console.log('🔍 [DEBUG] isFreeChat:', isFreeChat);
  
  // Create fallback booking details for free chat if not provided
  const effectiveBookingDetails = bookingDetails || {
    id: freeChatId || sessionId,
    _id: freeChatId || sessionId,
    type: 'chat',
    rate: 0,
    notes: 'Free 3-minute chat consultation',
    isFreeChat: true,
    user: userProfile || authUser,
    astrologer: astrologer || { id: astrologerId },
    sessionDuration: sessionDuration,
    createdAt: new Date().toISOString()
  };
  
  const { user: authUser, refreshToken, getValidToken } = useAuth();

  // ===== STATE =====
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false); // User typing state
  const [astrologerTyping, setAstrologerTyping] = useState(false); // Astrologer typing state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [sessionEndReason, setSessionEndReason] = useState(null); // 'timer_expired', 'user_ended', 'astrologer_ended'
  const [timerData, setTimerData] = useState({
    elapsed: 0,
    duration: sessionDuration,
    timeRemaining: sessionDuration,
    isActive: false,
    startTime: null
  });
  
  // Component instance tracking for debugging
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  console.log(`🚀 FixedFreeChatScreen: Component mounting with params (Instance: ${instanceId.current})`, { freeChatId, sessionId, astrologerId });
  
  // ===== REFS =====
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const mountedRef = useRef(true);
  const socketInitializedRef = useRef(false);
  const mountingGuardRef = useRef(false);
  const initializationCompleteRef = useRef(false);
  const loadingStateSetRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const astrologerTypingTimeoutRef = useRef(null);
  const lastMessageTimestampRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const sessionStartTimeRef = useRef(null);
  const sessionDurationRef = useRef(sessionDuration);
  const maxReconnectAttempts = 5;
  const isReconnectingRef = useRef(false);
  
  // Callback function refs to prevent stale closures
  const handleReconnectionRef = useRef(null);
  const syncTimerFromSessionRef = useRef(null);
  const requestMissedMessagesRef = useRef(null);
  const safeSetStateRef = useRef(null);

  // ===== UTILITY FUNCTIONS =====
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getCurrentRoomId = useCallback(() => {
    // Free chat messages should use free_chat:freeChatId format, not consultation:sessionId
    return `free_chat:${freeChatId}`;
  }, [freeChatId]);

  const safeSetState = useCallback((setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);
  
  // Update ref to current function
  safeSetStateRef.current = safeSetState;

  // ===== SESSION END HANDLING =====
  const handleSessionEnd = useCallback((reason, initiatedBy = 'system') => {
    console.log('🛑 [FREE_CHAT_END] Session ending - Reason:', reason, 'Initiated by:', initiatedBy);
    
    // Update session end state
    safeSetState(setSessionEnded, true);
    safeSetState(setSessionEndReason, reason);
    safeSetState(setSessionActive, false);
    
    // Stop any running timers
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Emit socket event if not already ended by backend
    if (reason !== 'timer_expired' && socketRef.current?.connected) {
      socketRef.current.emit('end_free_chat_session', {
        freeChatId,
        sessionId,
        userId: authUser?.id,
        astrologerId,
        endedBy: initiatedBy,
        reason
      });
    }
    
    console.log('✅ [FREE_CHAT_END] Session ended successfully');
  }, [freeChatId, sessionId, authUser?.id, astrologerId, safeSetState]);
  
  const handleUserEndSession = useCallback(() => {
    Alert.alert(
      'End Free Chat',
      'Are you sure you want to end this free chat session?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => {
            handleSessionEnd('user_ended', 'user');
            // Navigate back after a short delay to show the end message
            setTimeout(() => {
              if (mountedRef.current) {
                navigation.goBack();
              }
            }, 2000);
          }
        }
      ]
    );
  }, [handleSessionEnd, navigation]);
  
  const handleTimerExpiry = useCallback(() => {
    console.log('⏰ [FREE_CHAT_TIMER] Timer expired - ending session');
    handleSessionEnd('timer_expired', 'system');
    
    // Show timer expiry message and navigate back
    setTimeout(() => {
      if (mountedRef.current) {
        Alert.alert(
          'Time Up!',
          'Your free 3-minute chat session has ended. Thank you for using our service!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ],
          { cancelable: false }
        );
      }
    }, 500);
  }, [handleSessionEnd, navigation]);
  
  const handleAstrologerEndSession = useCallback((data) => {
    console.log('🛑 [FREE_CHAT_END] Session ended by astrologer:', data);
    handleSessionEnd('astrologer_ended', 'astrologer');
    
    // Show astrologer end message
    setTimeout(() => {
      if (mountedRef.current) {
        Alert.alert(
          'Session Ended',
          'The astrologer has ended the free chat session. Thank you for using our service!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ],
          { cancelable: false }
        );
      }
    }, 500);
  }, [handleSessionEnd, navigation]);

  // ===== SESSION PERSISTENCE =====
  const saveSessionState = useCallback((startTime, duration) => {
    console.log('💾 [FREE_CHAT] Saving session state - startTime:', startTime, 'duration:', duration);
    sessionStartTimeRef.current = startTime;
    sessionDurationRef.current = duration;
  }, []);

  const calculateElapsedTime = useCallback(() => {
    if (!sessionStartTimeRef.current) return 0;
    const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000);
    return Math.min(elapsed, sessionDurationRef.current);
  }, []);

  const syncTimerFromSession = useCallback(() => {
    if (!sessionStartTimeRef.current) {
      console.log('⚠️ [FREE_CHAT_TIMER] No session start time available for sync');
      return;
    }
    
    const elapsed = calculateElapsedTime();
    const timeRemaining = Math.max(0, sessionDurationRef.current - elapsed);
    console.log('🔄 [FREE_CHAT_TIMER] Syncing timer from session - elapsed:', elapsed, 'timeRemaining:', timeRemaining, 'duration:', sessionDurationRef.current);
    
    safeSetState(setTimerData, {
      elapsed,
      duration: sessionDurationRef.current,
      timeRemaining,
      isActive: timeRemaining > 0,
      startTime: sessionStartTimeRef.current
    });
    
    // Restart local timer with existing startTime to maintain continuity
    if (timeRemaining > 0) {
      startLocalTimer(sessionDurationRef.current, sessionStartTimeRef.current);
    }
  }, [safeSetState, calculateElapsedTime]);
  
  // Update ref to current function
  syncTimerFromSessionRef.current = syncTimerFromSession;
  
  // ===== TIMER EXPIRY MONITORING =====
  useEffect(() => {
    // Monitor timer data for expiry
    if (timerData.timeRemaining <= 0 && timerData.isActive && sessionActive && !sessionEnded) {
      console.log('⏰ [FREE_CHAT_TIMER] Timer expired - triggering session end');
      handleTimerExpiry();
    }
  }, [timerData.timeRemaining, timerData.isActive, sessionActive, sessionEnded, handleTimerExpiry]);

  // Get socket from context
  const { socket: contextSocket, isConnected: socketConnected } = useSocket();
  
  // ===== SOCKET INITIALIZATION =====
  const initializeSocket = useCallback(async () => {
    console.log('🔌 [FREE_CHAT_SOCKET] Initializing socket connection...');
    
    if (!contextSocket) {
      console.error('❌ [FREE_CHAT_SOCKET] No socket available from context');
      throw new Error('No socket available from context');
    }
    
    // Clean up existing socket listeners if socket reference exists
    if (socketRef.current) {
      cleanupSocketListeners();
    }
    
    socketRef.current = contextSocket;
    console.log('🔗 [FREE_CHAT_SOCKET] Using socket from context:', !!contextSocket, 'connected:', contextSocket.connected);
    
    // Set up socket event listeners
    setupSocketListeners();
    
    console.log('✅ [FREE_CHAT_SOCKET] Socket initialized successfully');
  }, [contextSocket]);

  // ===== AUTO-RECONNECTION =====
  const handleReconnection = useCallback(async () => {
    if (isReconnectingRef.current) {
      console.log('🔄 [RECONNECT] Already reconnecting, skipping...');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('❌ [RECONNECT] Max attempts reached, stopping reconnection');
      safeSetState(setConnected, false);
      return;
    }

    // Check if free chat session is still active before attempting reconnection
    try {
      console.log('🔍 [FREE_CHAT_RECONNECT] Checking session status before reconnection...');
      
      // Get a valid token (refresh if needed)
      let tokenToUse = authUser?.token;
      
      // First attempt with current token - check free chat status
      let response = await fetch(`${API_BASE_URL}/free-chat/${freeChatId}/status`, {
        headers: {
          'Authorization': `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If token expired, try to refresh and retry
      if (response.status === 401 && refreshToken) {
        console.log('🔑 [RECONNECT] Token expired, attempting refresh...');
        const refreshResult = await refreshToken();
        
        if (refreshResult.success) {
          console.log('✅ [FREE_CHAT_RECONNECT] Token refreshed, retrying session status check');
          tokenToUse = refreshResult.token;
          
          // Retry with refreshed token
          response = await fetch(`${API_BASE_URL}/free-chat/${freeChatId}/status`, {
            headers: {
              'Authorization': `Bearer ${tokenToUse}`,
              'Content-Type': 'application/json'
            }
          });
        } else {
          console.log('❌ [RECONNECT] Token refresh failed, proceeding with socket reconnection');
          if (refreshResult.shouldLogout) {
            Alert.alert(
              'Session Expired',
              'Your login session has expired. Please login again.',
              [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
            return;
          }
        }
      }
      
      if (response.ok) {
        const freeChatData = await response.json();
        console.log('🔍 [FREE_CHAT_RECONNECT] Session status check result:', freeChatData.status);
        
        if (freeChatData.status === 'completed' || freeChatData.status === 'expired') {
          console.log('❌ [FREE_CHAT_RECONNECT] Session already ended, navigating back');
          Alert.alert(
            'Free Chat Ended',
            'Your free chat session has ended while the app was in background.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      } else if (response.status === 401) {
        console.log('🔑 [FREE_CHAT_RECONNECT] Token still expired after refresh attempt - proceeding with socket reconnection (socket auth may still work)');
        // Don't block reconnection due to expired token - socket authentication might still work
        // The socket connection uses a different authentication mechanism
      } else {
        console.log(`⚠️ [FREE_CHAT_RECONNECT] Session status check failed with status ${response.status}, proceeding with reconnection`);
      }
    } catch (error) {
      console.log('⚠️ [FREE_CHAT_RECONNECT] Could not check session status, proceeding with reconnection:', error.message);
      // Network errors or other issues - proceed with reconnection attempt
    }

    isReconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;
    
    console.log(`🔄 [FREE_CHAT_RECONNECT] Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
    safeSetState(setConnected, false);
    
    // Set loading state during reconnection
    if (loadingStateSetRef.current && mountedRef.current) {
      console.log(`🎯 [LOADING] Setting loading during reconnection (Instance: ${instanceId.current})`);
      loadingStateSetRef.current = false;
      safeSetState(setLoading, true);
    }

    try {
      // Reset socket state
      socketInitializedRef.current = false;
      initializationCompleteRef.current = false;

      // Initialize socket with proper cleanup
      await initializeSocket();
      
      // Wait for SocketContext to establish connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log('⚠️ [RECONNECT] Connection timeout - proceeding anyway');
          resolve(); // Don't reject, just proceed
        }, 5000); // Reduced timeout
        
        const checkConnection = () => {
          // Check both socket reference and context connection state
          const isConnected = socketConnected || socketRef.current?.connected || contextSocket?.connected;
          console.log('🔍 [RECONNECT] Connection check - socketConnected:', socketConnected, 'socketRef.connected:', socketRef.current?.connected, 'contextSocket.connected:', contextSocket?.connected);
          
          if (isConnected) {
            console.log('✅ [RECONNECT] Connection detected, proceeding');
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkConnection, 200);
          }
        };
        checkConnection();
      });

      // Rejoin free chat room
      joinFreeChatRoom();
      
      // Sync timer from session state
      syncTimerFromSession();
      
      // Note: No need to manually request missed messages anymore
      // Backend automatically sends missed messages via 'missed_messages_recovery' event when rejoining room
      console.log('📨 [RECONNECT] Skipping manual missed message request - backend handles this automatically');
      
      console.log('✅ [FREE_CHAT_RECONNECT] Successfully reconnected and synced');
      safeSetState(setConnected, true);
      reconnectAttemptsRef.current = 0;
      
      // Clear loading state after successful reconnection
      if (!loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Clearing loading after reconnection (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = true;
        safeSetState(setLoading, false);
      }
      
    } catch (error) {
      console.error('❌ [FREE_CHAT_RECONNECT] Failed:', error);
      
      // Check if the error is due to session being ended
      if (error.message.includes('session') || error.message.includes('ended') || error.message.includes('completed')) {
        console.log('❌ [RECONNECT] Session ended during reconnection, navigating back');
        Alert.alert(
          'Session Ended',
          'Your consultation session has ended.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Exponential backoff for retry
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
      console.log(`🔄 [RECONNECT] Retrying in ${delay}ms`);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          handleReconnection();
        }
      }, delay);
    } finally {
      isReconnectingRef.current = false;
    }
  }, [safeSetState, syncTimerFromSession, initializeSocket, freeChatId, authUser?.token, navigation]);
  
  // Update ref to current function
  handleReconnectionRef.current = handleReconnection;

  const requestMissedMessages = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log('📨 [FREE_CHAT_MESSAGES] Socket not connected, skipping missed message request');
      return;
    }

    console.log('📨 [FREE_CHAT_MESSAGES] Requesting missed messages since:', lastMessageTimestampRef.current);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️ [FREE_CHAT_MESSAGES] Socket timeout for missed messages');
        resolve();
      }, 5000);
      
      socket.emit('get_free_chat_message_history', {
        freeChatId,
        sessionId,
        since: lastMessageTimestampRef.current
      }, (response) => {
        clearTimeout(timeout);
        console.log('📨 [FREE_CHAT_MESSAGES] Missed messages response:', response);
        
        if (response?.messages && Array.isArray(response.messages)) {
          const newMessages = response.messages.filter(msg => 
            !messages.find(existing => existing.id === msg.id)
          );
          
          if (newMessages.length > 0) {
            console.log(`📨 [FREE_CHAT_MESSAGES] Adding ${newMessages.length} missed messages`);
            safeSetState(setMessages, prev => {
              const combined = [...prev, ...newMessages];
              return combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            });
            
            // Update last message timestamp
            const latestTimestamp = Math.max(...newMessages.map(msg => new Date(msg.timestamp).getTime()));
            lastMessageTimestampRef.current = latestTimestamp;
          }
        }
        resolve();
      });
    });
  }, [freeChatId, sessionId, messages, safeSetState]);
  
  // Update ref to current function
  requestMissedMessagesRef.current = requestMissedMessages;

  // ===== TIMER MANAGEMENT =====
  const startLocalTimer = useCallback((duration = sessionDuration, existingStartTime = null) => {
    console.log('⏱️ [FREE_CHAT_TIMER] Starting local timer with duration:', duration, 'existingStartTime:', existingStartTime);
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const startTime = existingStartTime || Date.now();
    const currentElapsed = existingStartTime ? Math.floor((Date.now() - existingStartTime) / 1000) : 0;
    const currentTimeRemaining = Math.max(0, duration - currentElapsed);
    
    // Save session state with proper startTime
    saveSessionState(startTime, duration);
    
    safeSetState(setTimerData, {
      elapsed: currentElapsed,
      duration,
      timeRemaining: currentTimeRemaining,
      isActive: currentTimeRemaining > 0,
      startTime
    });
    
    console.log('⏱️ [FREE_CHAT_TIMER] Timer started with startTime:', startTime, 'currentElapsed:', currentElapsed, 'timeRemaining:', currentTimeRemaining);
    
    if (currentTimeRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const timeRemaining = Math.max(0, duration - elapsed);
        
        safeSetState(setTimerData, prev => ({
          ...prev,
          elapsed,
          timeRemaining,
          isActive: timeRemaining > 0
        }));
        
        if (timeRemaining <= 0) {
          // Timer completed - session will be ended by backend
          console.log('⏰ [FREE_CHAT_TIMER] Timer expired');
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          safeSetState(setSessionActive, false);
        }
      }, 1000);
    }
  }, [sessionDuration, safeSetState, saveSessionState]);

  const stopLocalTimer = useCallback(() => {
    console.log('⏱️ [FREE_CHAT_TIMER] Stopping local timer');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    safeSetState(setTimerData, prev => ({ ...prev, isActive: false }));
  }, [safeSetState]);

  // ===== TYPING INDICATOR HANDLING =====
  const handleTypingStarted = useCallback((data) => {
    console.log('✏️ [FREE_CHAT_TYPING] Received typing_started:', data);
    
    // Only handle typing from astrologer in this free chat session
    if (data.senderType === 'astrologer' && data.freeChatId === freeChatId) {
      safeSetState(setAstrologerTyping, true);
      
      // Clear existing timeout
      if (astrologerTypingTimeoutRef.current) {
        clearTimeout(astrologerTypingTimeoutRef.current);
      }
      
      // Auto-clear typing indicator after 5 seconds
      astrologerTypingTimeoutRef.current = setTimeout(() => {
        safeSetState(setAstrologerTyping, false);
      }, 5000);
    }
  }, [freeChatId, safeSetState]);
  
  const handleTypingStopped = useCallback((data) => {
    console.log('✏️ [FREE_CHAT_TYPING] Received typing_stopped:', data);
    
    // Only handle typing from astrologer in this free chat session
    if (data.senderType === 'astrologer' && data.freeChatId === freeChatId) {
      safeSetState(setAstrologerTyping, false);
      
      // Clear existing timeout
      if (astrologerTypingTimeoutRef.current) {
        clearTimeout(astrologerTypingTimeoutRef.current);
      }
    }
  }, [freeChatId, safeSetState]);
  
  // Legacy handler for backward compatibility
  const handleTypingIndicator = useCallback((data) => {
    console.log('✏️ [FREE_CHAT_TYPING] Received typing indicator (legacy):', data);
    
    // Only handle typing from astrologer in this free chat session
    if (data.senderType === 'astrologer' && data.freeChatId === freeChatId) {
      safeSetState(setAstrologerTyping, data.isTyping);
      
      // Clear existing timeout
      if (astrologerTypingTimeoutRef.current) {
        clearTimeout(astrologerTypingTimeoutRef.current);
      }
      
      // Auto-clear typing indicator after 5 seconds if still showing
      if (data.isTyping) {
        astrologerTypingTimeoutRef.current = setTimeout(() => {
          safeSetState(setAstrologerTyping, false);
        }, 5000);
      }
    }
  }, [freeChatId, safeSetState]);
  
  const handleMessageDelivered = useCallback((data) => {
    console.log('✓ [READ_RECEIPT] Message delivered:', data);
    
    if (data.messageId) {
      safeSetState(setMessages, prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: 'delivered', deliveredAt: new Date() }
            : msg
        )
      );
    }
  }, [safeSetState]);
  
  const handleMessageRead = useCallback((data) => {
    console.log('✓✓ [READ_RECEIPT] Message read:', data);
    
    if (data.messageId) {
      safeSetState(setMessages, prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, status: 'read', readAt: new Date() }
            : msg
        )
      );
    }
  }, [safeSetState]);

  // ===== MESSAGE HANDLING =====
  const handleIncomingMessage = useCallback((data) => {
    console.log('📨 [FREE_CHAT_MESSAGE] Received:', data);
    console.log('📨 [DEBUG] Message content fields:', {
      content: data.content,
      text: data.text,
      message: data.message,
      senderId: data.senderId,
      senderRole: data.senderRole,
      senderType: data.senderType,
      freeChatId: data.freeChatId,
      messageId: data.messageId
    });
    
    // Validate message is for this free chat session
    if (data.freeChatId !== freeChatId) {
      console.log('⚠️ [FREE_CHAT_MESSAGE] Message not for this free chat session, ignoring');
      console.log('⚠️ [DEBUG] Expected freeChatId:', freeChatId, 'Received freeChatId:', data.freeChatId);
      return;
    }
    
    // Send read receipt for received message
    const socket = socketRef.current;
    if (socket?.connected && data.messageId) {
      socket.emit('message_read', {
        messageId: data.messageId,
        freeChatId,
        sessionId,
        userId: authUser?.id,
        readBy: 'user',
        timestamp: Date.now()
      });
    }
    
    if (data.senderId === authUser?.id || data.senderType === 'user') {
      console.log('⚠️ [FREE_CHAT_MESSAGE] Ignoring own message');
      return;
    }
    
    const extractedText = data.message || data.content || data.text;
    console.log('📨 [DEBUG] Extracted message text:', extractedText);
    console.log('📨 [DEBUG] Text extraction order - message:', data.message, 'content:', data.content, 'text:', data.text);
    
    const newMessage = {
      id: data.messageId || generateMessageId(),
      text: extractedText,
      sender: 'astrologer',
      senderId: data.senderId,
      senderType: data.senderType || 'astrologer',
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'delivered'
    };
    
    console.log('📨 [DEBUG] Final message object:', newMessage);
    
    // Update last message timestamp for missed message tracking
    const messageTimestamp = new Date(newMessage.timestamp).getTime();
    if (messageTimestamp > lastMessageTimestampRef.current) {
      lastMessageTimestampRef.current = messageTimestamp;
    }
    
    safeSetState(setMessages, prev => {
      const exists = prev.find(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('⚠️ [FREE_CHAT_MESSAGE] Duplicate message ignored:', newMessage.id);
        return prev;
      }
      return [...prev, newMessage].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [freeChatId, sessionId, authUser?.id, generateMessageId, safeSetState]);


  

  
  // ===== SESSION EVENT HANDLERS =====
  const handleSessionStarted = useCallback((data) => {
    console.log('🎯 [FREE_CHAT_SESSION] Session started:', data);
    
    // Validate session is for this free chat
    if (data.freeChatId !== freeChatId) {
      console.log('⚠️ [FREE_CHAT_SESSION] Session start not for this free chat, ignoring');
      return;
    }
    
    safeSetState(setSessionActive, true);
    safeSetState(setConnected, true);
    
    const duration = data.duration || sessionDuration;
    const startTime = data.startTime || Date.now();
    
    console.log('⏱️ [FREE_CHAT_SESSION] Starting timer with duration:', duration, 'startTime:', startTime);
    
    // Save session state for reconnection
    saveSessionState(startTime, duration);
    
    safeSetState(setTimerData, {
      elapsed: 0,
      duration: duration,
      timeRemaining: duration,
      isActive: true,
      startTime: startTime
    });
    
    startLocalTimer(duration, startTime);
  }, [freeChatId, sessionDuration, safeSetState, startLocalTimer, saveSessionState]);
  
  const handleTimerUpdate = useCallback((data) => {
    console.log('⏱️ [FREE_CHAT_TIMER] Update received:', data);
    
    // Validate the timer update is for this free chat session
    if (data.freeChatId !== freeChatId) {
      console.log('⚠️ [FREE_CHAT_TIMER] Ignoring timer update for different free chat session');
      return;
    }
    
    // Handle both elapsed time and time remaining formats
    const elapsed = data.elapsed || (sessionDuration - (data.timeRemaining || 0));
    const timeRemaining = data.timeRemaining || (sessionDuration - elapsed);
    const duration = data.duration || sessionDuration;
    
    console.log('⏱️ [FREE_CHAT_TIMER] Timer update - elapsed:', elapsed, 'timeRemaining:', timeRemaining, 'duration:', duration);
    
    // Always activate timer when receiving backend timer events
    safeSetState(setTimerData, prev => ({
      ...prev,
      elapsed: Math.max(0, elapsed),
      timeRemaining: Math.max(0, timeRemaining),
      duration: duration,
      isActive: timeRemaining > 0
    }));
    
    console.log('⏱️ [FREE_CHAT_TIMER] Timer data updated:', {
      elapsed: Math.max(0, elapsed),
      timeRemaining: Math.max(0, timeRemaining),
      duration: duration,
      isActive: timeRemaining > 0
    });
    
    safeSetState(setSessionActive, true);
  }, [freeChatId, sessionDuration, safeSetState]);

  const handleSessionEnded = useCallback((data) => {
    console.log('🛑 [FREE_CHAT_SESSION] Session ended by backend:', data);
    
    // Validate this session end event is for current free chat session
    if (data.freeChatId && data.freeChatId !== freeChatId) {
      console.log('⚠️ [FREE_CHAT_SESSION] Ignoring session end for different free chat:', data.freeChatId);
      return;
    }
    
    // Determine who ended the session and why
    const reason = data.reason || 'unknown';
    const endedBy = data.endedBy || 'system';
    
    console.log('🛑 [FREE_CHAT_SESSION] Session end details - reason:', reason, 'endedBy:', endedBy);
    
    // Update session end state using our new state management
    if (endedBy === 'astrologer') {
      handleAstrologerEndSession(data);
    } else if (reason === 'timer_expired' || reason === 'time_expired') {
      handleTimerExpiry();
    } else {
      // Generic session end
      handleSessionEnd(reason, endedBy);
      
      // Show generic end message
      setTimeout(() => {
        if (mountedRef.current) {
          const duration = data.duration || sessionDuration;
          const endReason = reason === 'time_expired' ? 'Your 3-minute free chat session has ended.' : 'The free chat session has ended.';
          
          Alert.alert(
            'Free Chat Ended',
            `${endReason}\nDuration: ${formatTime(duration)}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }, 500);
    }
  }, [freeChatId, sessionDuration, formatTime, handleSessionEnd, handleTimerExpiry, handleAstrologerEndSession, navigation]);

  const joinFreeChatRoom = useCallback(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket?.connected) {
      console.log('⚠️ [FREE_CHAT_ROOM] Socket not connected, cannot join room');
      return;
    }
    
    const roomId = getCurrentRoomId();
    console.log('🏠 [FREE_CHAT_ROOM] Joining free chat room:', roomId);
    console.log('🏠 [FREE_CHAT_ROOM] FreeChatId:', freeChatId);
    console.log('🏠 [FREE_CHAT_ROOM] SessionId:', sessionId);
    console.log('🏠 [FREE_CHAT_ROOM] UserId:', authUser?.id);
    
    console.log('📤 [EMIT] Emitting join_free_chat_room event...');
    currentSocket.emit('join_free_chat_room', {
      freeChatId,
      sessionId,
      userId: authUser?.id,
      astrologerId,
      roomId
    }, (response) => {
      console.log('🎯 [FREE_CHAT_ROOM] Join response:', response);
      
      if (response?.success) {
        console.log('✅ [FREE_CHAT_ROOM] Successfully joined room');
        safeSetState(setConnected, true);
        
        // Clear loading state after successful room join
        if (!loadingStateSetRef.current && mountedRef.current) {
          console.log(`🎯 [LOADING] Clearing loading after room join (Instance: ${instanceId.current})`);
          loadingStateSetRef.current = true;
          safeSetState(setLoading, false);
        }
      } else {
        console.error('❌ [FREE_CHAT_ROOM] Failed to join room:', response?.error);
        Alert.alert('Connection Error', 'Failed to join free chat session. Please try again.');
      }
    });
    
    console.log('✅ [EMIT] join_free_chat_room event emitted successfully');
  }, [freeChatId, sessionId, astrologerId, authUser?.id, getCurrentRoomId, safeSetState, instanceId]);

  const cleanupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    console.log('🧹 [FREE_CHAT_SOCKET] Cleaning up event listeners');
    
    const events = [
      'connect', 'disconnect', 'connect_error',
      'free_chat_message', 'free_chat_message_delivered', 'free_chat_message_read',
      'free_chat_typing_started', 'free_chat_typing_stopped',
      'session_started', 'session_timer', 'session_end', // Fixed: backend emits 'session_end'
      'free_chat_session_resumed', 'get_free_chat_message_history'
    ];
    
    events.forEach(event => {
      socket.off(event);
    });
  }, []);

  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      console.log('⚠️ [FREE_CHAT_SOCKET] No socket available for listener setup');
      return;
    }
    
    console.log('👂 [FREE_CHAT_SOCKET] Setting up event listeners');
    
    // Clean up existing listeners first to prevent duplicates
    cleanupSocketListeners();
    
    socket.on('connect', () => {
      console.log(`🔗 [FREE_CHAT_SOCKET] Connected to server (Instance: ${instanceId.current})`);
      safeSetState(setConnected, true);
      reconnectAttemptsRef.current = 0;
      
      // Clear loading state on successful connection
      if (!loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Clearing loading on connect (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = true;
        safeSetState(setLoading, false);
      }
      
      // Join free chat room after connection
      joinFreeChatRoom();
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [FREE_CHAT_SOCKET] Disconnected from server (Instance: ${instanceId.current}):`, reason);
      safeSetState(setConnected, false);
      
      // Reset loading state on disconnect to show reconnecting state
      if (loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Setting loading on disconnect (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = false;
        safeSetState(setLoading, true);
      }
      
      // Auto-reconnect for any disconnect reason except manual disconnects
      if (mountedRef.current && reason !== 'io client disconnect') {
        console.log('🔄 [FREE_CHAT_RECONNECT] Starting auto-reconnection due to disconnect');
        setTimeout(() => {
          if (mountedRef.current && handleReconnectionRef.current) {
            handleReconnectionRef.current();
          }
        }, 1000); // Small delay to prevent rapid reconnection attempts
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ [FREE_CHAT_SOCKET] Connection error:', error);
      safeSetState(setConnected, false);
    });
    
    // Free chat specific message events
    socket.on('free_chat_message', (data) => {
      console.log('📨 [FREE_CHAT_MESSAGE] Received via socket listener:', data);
      handleIncomingMessage(data);
    });
    socket.on('free_chat_message_delivered', handleMessageDelivered);
    socket.on('free_chat_message_read', handleMessageRead);
    socket.on('free_chat_typing_started', handleTypingStarted);
    socket.on('free_chat_typing_stopped', handleTypingStopped);
    
    // Free chat session events
    socket.on('session_started', handleSessionStarted);
    socket.on('session_timer', handleTimerUpdate);
    socket.on('session_end', handleSessionEnded); // Fixed: backend emits 'session_end', not 'session_ended'
    
    // Handle free chat message history recovery
    socket.on('get_free_chat_message_history', (data) => {
      console.log('📨 [AUTO_RECOVERY] Missed messages recovery received:', data);
      console.log('📨 [AUTO_RECOVERY] Current messages count:', messages.length);
      
      if (data.success && data.messages && Array.isArray(data.messages)) {
        console.log(`📨 [AUTO_RECOVERY] Processing ${data.messages.length} recovered messages`);
        
        // More robust deduplication using both ID and content+timestamp
        const newMessages = data.messages.filter(recoveredMsg => {
          const existingById = messages.find(existing => existing.id === recoveredMsg.id);
          if (existingById) {
            console.log(`📨 [AUTO_RECOVERY] Skipping duplicate by ID: ${recoveredMsg.id}`);
            return false;
          }
          
          // Also check for duplicates by content and timestamp (in case IDs differ)
          const existingByContent = messages.find(existing => 
            existing.content === recoveredMsg.content && 
            existing.senderId === recoveredMsg.senderId &&
            Math.abs(new Date(existing.timestamp).getTime() - new Date(recoveredMsg.timestamp).getTime()) < 1000 // Within 1 second
          );
          
          if (existingByContent) {
            console.log(`📨 [AUTO_RECOVERY] Skipping duplicate by content/timestamp: ${recoveredMsg.content.substring(0, 50)}...`);
            return false;
          }
          
          return true;
        });
        
        if (newMessages.length > 0) {
          console.log(`📨 [AUTO_RECOVERY] Adding ${newMessages.length} new recovered messages (filtered from ${data.messages.length})`);
          
          safeSetState(setMessages, prev => {
            // Double-check for duplicates in the state update as well
            const filteredNewMessages = newMessages.filter(newMsg => 
              !prev.find(existing => existing.id === newMsg.id)
            );
            
            if (filteredNewMessages.length !== newMessages.length) {
              console.log(`📨 [AUTO_RECOVERY] Final filter removed ${newMessages.length - filteredNewMessages.length} additional duplicates`);
            }
            
            const combined = [...prev, ...filteredNewMessages];
            return combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          });
          
          // Update last message timestamp
          const latestTimestamp = Math.max(...newMessages.map(msg => new Date(msg.timestamp).getTime()));
          if (latestTimestamp > lastMessageTimestampRef.current) {
            lastMessageTimestampRef.current = latestTimestamp;
            console.log(`📨 [AUTO_RECOVERY] Updated last message timestamp to:`, new Date(latestTimestamp));
          }
          
          // Scroll to bottom to show recovered messages
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          console.log('📨 [AUTO_RECOVERY] No new messages to add after deduplication (all already present)');
        }
      } else {
        console.log('📨 [AUTO_RECOVERY] Invalid or empty recovery data:', data);
      }
    });
    
    console.log('✅ [FREE_CHAT_SOCKET] Event listeners setup complete');
  }, [safeSetState, cleanupSocketListeners, joinFreeChatRoom, handleIncomingMessage, handleMessageDelivered, handleMessageRead, handleTypingStarted, handleTypingStopped, handleSessionStarted, handleTimerUpdate, handleSessionEnded, freeChatId, messages]);

  // ===== MESSAGE SENDING =====
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !sessionActive) {
      console.log('⚠️ [MESSAGE] Cannot send - empty text or session inactive');
      return;
    }
    
    const messageContent = messageText.trim();
    const messageId = generateMessageId();
    
    const optimisticMessage = {
      id: messageId,
      content: messageContent,
      senderId: authUser?.id,
      senderType: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    safeSetState(setMessages, prev => [...prev, optimisticMessage]);
    safeSetState(setMessageText, '');
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        console.log('📤 [MESSAGE] Sending via socket:', messageContent);
        
        const messagePayload = {
          id: messageId,
          content: messageContent,
          text: messageContent,
          message: messageContent,
          senderId: authUser?.id,
          senderType: 'user',
          freeChatId,
          sessionId,
          astrologerId,
          roomId: getCurrentRoomId(),
          timestamp: new Date().toISOString()
        };
        
        socket.emit('free_chat_message', messagePayload, (acknowledgment) => {
          console.log('🔥 [USER_APP_ACK] Backend acknowledgment received:', acknowledgment);
          if (acknowledgment?.success) {
            console.log('✅ [USER_APP_ACK] Message acknowledged successfully - updating status to SENT (single tick)');
            console.log('📝 [USER_APP_ACK] Message ID:', messageId, 'Backend Message ID:', acknowledgment.messageId);
            safeSetState(setMessages, prev => 
              prev.map(msg => 
                msg.id === messageId 
                  ? { ...msg, status: 'sent' }
                  : msg
              )
            );
          } else {
            console.warn('❌ [USER_APP_ACK] Message acknowledgment failed:', acknowledgment);
            safeSetState(setMessages, prev => 
              prev.map(msg => 
                msg.id === messageId 
                  ? { ...msg, status: 'failed' }
                  : msg
              )
            );
          }
        });
        
      } else {
        console.log('🔄 [MESSAGE] Socket not connected');
        safeSetState(setMessages, prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('❌ [MESSAGE] Send failed:', error);
      safeSetState(setMessages, prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
    }
  }, [messageText, sessionActive, generateMessageId, authUser?.id, freeChatId, sessionId, astrologerId, getCurrentRoomId, safeSetState]);
  
  const handleInputChange = useCallback((text) => {
    safeSetState(setMessageText, text);
    
    const socket = socketRef.current;
    if (socket?.connected && sessionActive) {
      const isCurrentlyTyping = text.length > 0;
      
      // Emit free chat typing indicator
      if (isCurrentlyTyping) {
        socket.emit('free_chat_typing_started', {
          freeChatId,
          sessionId,
          userId: authUser?.id,
          astrologerId,
          roomId: getCurrentRoomId()
        });
      } else {
        socket.emit('free_chat_typing_stopped', {
          freeChatId,
          sessionId,
          userId: authUser?.id,
          astrologerId,
          roomId: getCurrentRoomId()
        });
      }
      
      // Update local typing state
      safeSetState(setIsTyping, isCurrentlyTyping);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to auto-clear typing after 5 seconds of inactivity
      if (isCurrentlyTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          if (socketRef.current?.connected && sessionActive) {
            socketRef.current.emit('free_chat_typing_stopped', {
              freeChatId,
              sessionId,
              userId: authUser?.id,
              astrologerId,
              roomId: getCurrentRoomId()
            });
          }
          safeSetState(setIsTyping, false);
        }, 5000);
      }
    }
  }, [safeSetState, sessionActive, freeChatId, sessionId, astrologerId, authUser?.id, getCurrentRoomId]);
  
  const endSession = useCallback(async () => {
    Alert.alert(
      'End Free Chat',
      'Are you sure you want to end this free chat session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🛑 [FREE_CHAT_SESSION] Ending free chat session...');
              
              const socket = socketRef.current;
              if (socket?.connected) {
                socket.emit('end_free_chat_session', {
                  freeChatId,
                  sessionId,
                  userId: authUser?.id,
                  astrologerId,
                  endedBy: 'user'
                });
              }
              
              safeSetState(setSessionActive, false);
              stopLocalTimer();
              navigation.goBack();
              
            } catch (error) {
              console.error('❌ [FREE_CHAT_SESSION] End session failed:', error);
              Alert.alert('Error', 'Failed to end free chat session. Please try again.');
            }
          }
        }
      ]
    );
  }, [freeChatId, sessionId, astrologerId, authUser?.id, safeSetState, stopLocalTimer, navigation]);

  // ===== LIFECYCLE =====
  useEffect(() => {
    console.log('🔄 [LIFECYCLE] Component mounted');
    mountedRef.current = true;
    
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 [APP-STATE] Changed to:', nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 [APP-STATE] App foregrounded, checking connection...');
        
        // Reset reconnection attempts on app foreground
        reconnectAttemptsRef.current = 0;
        
        if (!socketRef.current?.connected) {
          console.log('🔄 [APP-STATE] Socket disconnected, triggering auto-reconnection...');
          handleReconnection();
        } else {
          console.log('✅ [APP-STATE] Socket still connected, syncing state...');
          
          // Re-join free chat room if needed
          joinFreeChatRoom();
          
          // Sync timer from session state even if connected
          syncTimerFromSession();
          // Request any missed messages
          requestMissedMessages();
        }
      }
      
      appStateRef.current = nextAppState;
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Improved loading state management
    const clearLoadingState = () => {
      if (!loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Clearing loading state (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = true;
        safeSetState(setLoading, false);
      }
    };
    
    // Clear loading after initialization or timeout
    setTimeout(clearLoadingState, 1000);
    
    return () => {
      console.log(`🧹 [LIFECYCLE] Component unmounting (Instance: ${instanceId.current})`);
      mountedRef.current = false;
      
      // Reset all refs for cleanup
      socketInitializedRef.current = false;
      mountingGuardRef.current = false;
      initializationCompleteRef.current = false;
      loadingStateSetRef.current = false;
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socketRef.current) {
        cleanupSocketListeners();
      }
      
      appStateSubscription?.remove();
    };
  }, []); // Remove all dependencies to prevent remounting

  // ===== MAIN COMPONENT INITIALIZATION =====
  useEffect(() => {
    // Skip initialization for duplicate mounts
    if (mountingGuardRef.current) {
      console.log('⚠️ [INIT] Skipping initialization for duplicate mount:', instanceId.current);
      return;
    }
    
    // Prevent duplicate initialization
    if (socketInitializedRef.current) {
      console.log('⚠️ [INIT] Socket already initialized, skipping duplicate initialization:', instanceId.current);
      return;
    }
    
    console.log('🚀 [FREE_CHAT_INIT] Starting component initialization for:', instanceId.current);
    console.log('🚀 [FREE_CHAT_INIT] FreeChatId:', freeChatId, 'SessionId:', sessionId);
    console.log('🚀 [FREE_CHAT_INIT] AstrologerId:', astrologerId);
    console.log('🚀 [FREE_CHAT_INIT] AuthUser:', !!authUser?.id);
    console.log('🚀 [FREE_CHAT_INIT] ContextSocket available:', !!contextSocket);
    
    if (!freeChatId) {
      console.error('❌ [FREE_CHAT_INIT] Missing freeChatId:', freeChatId);
      return;
    }
    
    if (!sessionId) {
      console.error('❌ [FREE_CHAT_INIT] Missing sessionId:', sessionId);
      return;
    }
    
    if (!authUser?.id) {
      console.error('❌ [FREE_CHAT_INIT] Missing authUser.id, waiting for auth to load...');
      return;
    }
    
    if (!contextSocket) {
      console.log('⚠️ [FREE_CHAT_INIT] No context socket available yet, waiting...');
      return;
    }
    
    // Mark socket as being initialized
    socketInitializedRef.current = true;
    mountingGuardRef.current = true;
    
    // Initialize socket connection
    const initTimer = setTimeout(() => {
      console.log('🚀 [FREE_CHAT_INIT] Initializing socket after delay');
      initializeSocket().then(() => {
        if (mountedRef.current) {
          console.log(`✅ [FREE_CHAT_INIT] Initialization complete (Instance: ${instanceId.current})`);
          
          // Join free chat room after socket initialization
          setTimeout(() => {
            if (mountedRef.current) {
              console.log('🚀 [FREE_CHAT_INIT] Joining free chat room');
              joinFreeChatRoom();
            }
          }, 500);
          
          // Clear loading state after successful initialization
          setTimeout(() => {
            if (!loadingStateSetRef.current && mountedRef.current) {
              console.log(`🎯 [LOADING] Clearing loading after init (Instance: ${instanceId.current})`);
              loadingStateSetRef.current = true;
              safeSetState(setLoading, false);
            }
          }, 1000);
        }
      }).catch(error => {
        console.error(`❌ [FREE_CHAT_INIT] Initialization failed (Instance: ${instanceId.current}):`, error);
        mountingGuardRef.current = false;
        socketInitializedRef.current = false;
        
        // Show error state if initialization fails
        if (mountedRef.current) {
          safeSetState(setConnected, false);
          Alert.alert('Connection Error', 'Failed to connect to the free chat session. Please try again.');
        }
      });
    }, 500);
    
    return () => {
      clearTimeout(initTimer);
      console.log('🚀 [CLEANUP] Component cleanup for:', instanceId.current);
      
      // Clean up socket listeners and connection
      if (socketRef.current) {
        console.log('🚀 [CLEANUP] Cleaning up socket listeners');
        cleanupSocketListeners();
        
        // Reset socket reference
        socketRef.current = null;
      }
      
      // Reset initialization flags for proper remount handling
      socketInitializedRef.current = false;
      mountingGuardRef.current = false;
      initializationCompleteRef.current = false;
      loadingStateSetRef.current = false;
      
      // Clear any active timers
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, []); // Empty dependency array to prevent remounting

  // ===== RENDER =====
  const renderMessage = useCallback(({ item }) => {
    const isOwnMessage = item.senderType === 'user';
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.text || item.content || item.message}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isOwnMessage && (
              <View style={styles.messageStatus}>
                {item.status === 'sending' && <ActivityIndicator size={10} color="#999" />}
                {item.status === 'sent' && <Ionicons name="checkmark" size={12} color="#4CAF50" />}
                {item.status === 'delivered' && (
                  <View style={styles.readReceiptContainer}>
                    <Ionicons name="checkmark" size={12} color="#4CAF50" />
                  </View>
                )}
                {item.status === 'read' && (
                  <View style={styles.readReceiptContainer}>
                    <Ionicons name="checkmark" size={12} color="#2196F3" style={styles.readTick1} />
                    <Ionicons name="checkmark" size={12} color="#2196F3" style={styles.readTick2} />
                  </View>
                )}
                {item.status === 'failed' && <Ionicons name="alert-circle" size={12} color="#FF6B6B" />}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B46C1" />
          <Text style={styles.loadingText}>Connecting to consultation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusInfo = () => {
    if (loading) {
      return { color: '#F59E0B', text: 'Connecting...' };
    }
    if (connected && sessionActive) {
      return { color: '#10B981', text: 'Connected' };
    }
    if (connected && !sessionActive) {
      return { color: '#F59E0B', text: 'Waiting for session to start...' };
    }
    if (!connected) {
      return { color: '#EF4444', text: 'Connection lost. Retrying...' };
    }
    return { color: '#6B7280', text: 'Initializing...' };
  };

  const statusInfo = getStatusInfo();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B46C1" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {bookingDetails?.astrologer?.name || 'Astrologer'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {consultationType === 'chat' ? 'Chat Consultation' : 'Consultation'}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            {/* Always show timer for testing - remove conditions temporarily */}
            {sessionActive && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {formatTime(timerData.elapsed || 0)}
                </Text>
              </View>
            )}
            
            {sessionActive && !sessionEnded && (
              <TouchableOpacity style={styles.endSessionButton} onPress={handleUserEndSession}>
                <Ionicons name="stop-circle" size={16} color="#FF4444" />
                <Text style={styles.endSessionText}>End</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.statusBanner, { backgroundColor: statusInfo.color }]}>
          <Text style={styles.statusText}>{statusInfo.text}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {astrologerTyping && !sessionEnded && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Astrologer is typing...</Text>
          </View>
        )}

        {/* End of Session Message */}
        {sessionEnded && (
          <View style={styles.sessionEndContainer}>
            <View style={styles.sessionEndMessage}>
              <Ionicons name="information-circle" size={24} color="#6B46C1" />
              <Text style={styles.sessionEndText}>
                This free chat session has ended. To continue, please start a new session.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.textInput,
              sessionEnded && styles.textInputDisabled
            ]}
            value={messageText}
            onChangeText={handleInputChange}
            placeholder={sessionEnded ? "Session ended" : "Type your message..."}
            placeholderTextColor={sessionEnded ? "#ccc" : "#999"}
            multiline
            maxLength={1000}
            editable={sessionActive && connected && !sessionEnded}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || !sessionActive || sessionEnded) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || !sessionActive || sessionEnded}
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
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  amountText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  endSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  endSessionText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusBanner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
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
  messageStatus: {
    marginLeft: 5,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  typingText: {
    color: '#6B7280',
    fontStyle: 'italic',
    fontSize: 14,
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
  sessionEndContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sessionEndMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6B46C1',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionEndText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  textInputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 70, 193, 0.2)',
  },
  typingText: {
    color: '#6B46C1',
    fontSize: 14,
    fontStyle: 'italic',
  },
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  readTick1: {
    position: 'absolute',
    left: 0,
  },
  readTick2: {
    position: 'absolute',
    left: 3,
  },
});

// Wrap component in React.memo to prevent unnecessary remounts
const MemoizedFixedFreeChatScreen = React.memo(FixedFreeChatScreen, (prevProps, nextProps) => {
  // Only re-render if essential route params change
  const prevParams = prevProps.route?.params || {};
  const nextParams = nextProps.route?.params || {};
  
  const isEqual = (
    prevParams.freeChatId === nextParams.freeChatId &&
    prevParams.sessionId === nextParams.sessionId &&
    prevParams.astrologerId === nextParams.astrologerId
  );
  
  console.log('🔍 [MEMO] Props comparison result:', isEqual ? 'EQUAL (no re-render)' : 'DIFFERENT (re-render)');
  
  return isEqual;
});

export default MemoizedFixedFreeChatScreen;
