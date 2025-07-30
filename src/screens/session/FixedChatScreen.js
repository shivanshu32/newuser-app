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
 * FixedChatScreen - Production-Ready Chat Implementation
 */
const FixedChatScreen = ({ route, navigation }) => {
  console.log('🚀 FixedChatScreen: Component mounting with params:', route.params);
  
  const {
    bookingId,
    sessionId,
    astrologerId,
    consultationType = 'chat',
    bookingDetails,
  } = route.params || {};
  
  const { user: authUser, refreshToken, getValidToken } = useAuth();

  // ===== STATE =====
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false); // User typing state
  const [astrologerTyping, setAstrologerTyping] = useState(false); // Astrologer typing state
  const [sessionActive, setSessionActive] = useState(false);
  const [timerData, setTimerData] = useState({
    elapsed: 0,
    duration: 0,
    isActive: false,
    startTime: null
  });
  
  // Component instance tracking for debugging
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));
  console.log(`🚀 FixedChatScreen: Component mounting with params (Instance: ${instanceId.current})`, { bookingId, sessionId, astrologerId });
  
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
  const sessionDurationRef = useRef(null);
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
    return `consultation:${bookingId}`;
  }, [bookingId]);

  const safeSetState = useCallback((setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);
  
  // Update ref to current function
  safeSetStateRef.current = safeSetState;

  // ===== SESSION PERSISTENCE =====
  const saveSessionState = useCallback((startTime, duration) => {
    console.log('💾 [SESSION] Saving session state - startTime:', startTime, 'duration:', duration);
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
      console.log('⚠️ [TIMER] No session start time available for sync');
      return;
    }
    
    const elapsed = calculateElapsedTime();
    console.log('🔄 [TIMER] Syncing timer from session - elapsed:', elapsed, 'duration:', sessionDurationRef.current, 'startTime:', sessionStartTimeRef.current);
    
    safeSetState(setTimerData, {
      elapsed,
      duration: sessionDurationRef.current,
      isActive: elapsed < sessionDurationRef.current,
      startTime: sessionStartTimeRef.current
    });
    
    // Restart local timer with existing startTime to maintain continuity
    if (elapsed < sessionDurationRef.current) {
      startLocalTimer(sessionDurationRef.current, sessionStartTimeRef.current);
    }
  }, [safeSetState, calculateElapsedTime, startLocalTimer]);
  
  // Update ref to current function
  syncTimerFromSessionRef.current = syncTimerFromSession;

  // Get socket from context
  const { socket: contextSocket, isConnected: socketConnected } = useSocket();
  
  // ===== SOCKET INITIALIZATION =====
  const initializeSocket = useCallback(async () => {
    console.log('🔌 [SOCKET] Initializing socket connection...');
    
    if (!contextSocket) {
      console.error('❌ [SOCKET] No socket available from context');
      throw new Error('No socket available from context');
    }
    
    // Clean up existing socket listeners if socket reference exists
    if (socketRef.current) {
      cleanupSocketListeners();
    }
    
    socketRef.current = contextSocket;
    console.log('🔗 [SOCKET] Using socket from context:', !!contextSocket, 'connected:', contextSocket.connected);
    
    // Set up socket event listeners
    setupSocketListeners();
    
    console.log('✅ [SOCKET] Socket initialized successfully');
  }, [contextSocket, setupSocketListeners, cleanupSocketListeners]);

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

    // Check if session is already ended before attempting reconnection
    try {
      console.log('🔍 [RECONNECT] Checking session status before reconnection...');
      
      // Get a valid token (refresh if needed)
      let tokenToUse = authUser?.token;
      
      // First attempt with current token
      let response = await fetch(`https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1/bookings/${bookingId}`, {
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
          console.log('✅ [RECONNECT] Token refreshed, retrying session status check');
          tokenToUse = refreshResult.token;
          
          // Retry with refreshed token
          response = await fetch(`https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1/bookings/${bookingId}`, {
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
        const bookingData = await response.json();
        console.log('🔍 [RECONNECT] Session status check result:', bookingData.status);
        
        if (bookingData.status === 'completed' || bookingData.status === 'cancelled') {
          console.log('❌ [RECONNECT] Session already ended, navigating back');
          Alert.alert(
            'Session Ended',
            'Your consultation session has ended while the app was in background.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      } else if (response.status === 401) {
        console.log('🔑 [RECONNECT] Token still expired after refresh attempt - proceeding with socket reconnection (socket auth may still work)');
        // Don't block reconnection due to expired token - socket authentication might still work
        // The socket connection uses a different authentication mechanism
      } else {
        console.log(`⚠️ [RECONNECT] Session status check failed with status ${response.status}, proceeding with reconnection`);
      }
    } catch (error) {
      console.log('⚠️ [RECONNECT] Could not check session status, proceeding with reconnection:', error.message);
      // Network errors or other issues - proceed with reconnection attempt
    }

    isReconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;
    
    console.log(`🔄 [RECONNECT] Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
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

      // Rejoin room
      joinConsultationRoom();
      
      // Sync timer from session state
      syncTimerFromSession();
      
      // Note: No need to manually request missed messages anymore
      // Backend automatically sends missed messages via 'missed_messages_recovery' event when rejoining room
      console.log('📨 [RECONNECT] Skipping manual missed message request - backend handles this automatically');
      
      console.log('✅ [RECONNECT] Successfully reconnected and synced');
      safeSetState(setConnected, true);
      reconnectAttemptsRef.current = 0;
      
      // Clear loading state after successful reconnection
      if (!loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Clearing loading after reconnection (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = true;
        safeSetState(setLoading, false);
      }
      
    } catch (error) {
      console.error('❌ [RECONNECT] Failed:', error);
      
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
  }, [safeSetState, syncTimerFromSession, initializeSocket, joinConsultationRoom, bookingId, authUser?.token, navigation]);
  
  // Update ref to current function
  handleReconnectionRef.current = handleReconnection;

  const requestMissedMessages = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log('📨 [MESSAGES] Socket not connected, skipping missed message request');
      return;
    }

    console.log('📨 [MESSAGES] Requesting missed messages since:', lastMessageTimestampRef.current);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️ [MESSAGES] Socket timeout for missed messages');
        resolve();
      }, 5000);
      
      socket.emit('get_missed_messages', {
        bookingId,
        sessionId,
        since: lastMessageTimestampRef.current,
        roomId: getCurrentRoomId()
      }, (response) => {
        clearTimeout(timeout);
        console.log('📨 [MESSAGES] Missed messages response:', response);
        
        if (response?.messages && Array.isArray(response.messages)) {
          console.log(`📨 [MESSAGES] Processing ${response.messages.length} messages from server`);
          
          // Enhanced deduplication logic to handle ID mismatches
          const newMessages = response.messages.filter(serverMsg => {
            // First check by exact ID match (for messages that haven't been locally modified)
            const existsByID = messages.find(existing => existing.id === serverMsg.id);
            if (existsByID) {
              console.log(`📨 [DEDUP] Skipping duplicate by ID: ${serverMsg.id}`);
              return false;
            }
            
            // Enhanced deduplication: Check by content, timestamp, and sender
            // This handles cases where local message ID != database message ID
            const existsByContent = messages.find(existing => {
              const contentMatch = existing.content === serverMsg.content;
              const senderMatch = existing.senderId === serverMsg.senderId || 
                                  existing.senderType === serverMsg.senderType;
              
              // Allow 5 second tolerance for timestamp comparison (network delays)
              const timeDiff = Math.abs(
                new Date(existing.timestamp).getTime() - 
                new Date(serverMsg.timestamp).getTime()
              );
              const timestampMatch = timeDiff < 5000; // 5 seconds tolerance
              
              return contentMatch && senderMatch && timestampMatch;
            });
            
            if (existsByContent) {
              console.log(`📨 [DEDUP] Skipping duplicate by content/sender/time: ${serverMsg.content.substring(0, 30)}...`);
              return false;
            }
            
            return true; // Message is new
          });
          
          if (newMessages.length > 0) {
            console.log(`📨 [MESSAGES] Adding ${newMessages.length} new missed messages (filtered from ${response.messages.length})`);
            
            safeSetState(setMessages, prev => {
              // Merge messages and sort by timestamp
              const combined = [...prev, ...newMessages];
              const sorted = combined.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
              
              console.log(`📨 [MESSAGES] Total messages after merge: ${sorted.length}`);
              return sorted;
            });
            
            // Update last message timestamp
            const latestTimestamp = Math.max(...newMessages.map(msg => new Date(msg.timestamp).getTime()));
            if (latestTimestamp > lastMessageTimestampRef.current) {
              lastMessageTimestampRef.current = latestTimestamp;
              console.log(`📨 [MESSAGES] Updated last message timestamp to: ${new Date(latestTimestamp).toISOString()}`);
            }
          } else {
            console.log(`📨 [MESSAGES] No new messages to add (all ${response.messages.length} messages already exist)`);
          }
        }
        resolve();
      });
    });
  }, [bookingId, sessionId, getCurrentRoomId, messages, safeSetState]);
  
  // Update ref to current function
  requestMissedMessagesRef.current = requestMissedMessages;

  // ===== TIMER MANAGEMENT =====
  const startLocalTimer = useCallback((duration = 0, existingStartTime = null) => {
    console.log('⏱️ [TIMER] Starting local timer with duration:', duration, 'existingStartTime:', existingStartTime);
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const startTime = existingStartTime || Date.now();
    const currentElapsed = existingStartTime ? Math.floor((Date.now() - existingStartTime) / 1000) : 0;
    
    // Save session state with proper startTime
    saveSessionState(startTime, duration);
    
    safeSetState(setTimerData, {
      elapsed: currentElapsed,
      duration,
      isActive: true,
      startTime
    });
    
    console.log('⏱️ [TIMER] Timer started with startTime:', startTime, 'currentElapsed:', currentElapsed);
    
    timerIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed < duration) {
        safeSetState(setTimerData, prev => ({
          ...prev,
          elapsed
        }));
      } else {
        // Timer completed
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
        safeSetState(setTimerData, prev => ({
          ...prev,
          elapsed: duration,
          isActive: false
        }));
      }
    }, 1000);
  }, [safeSetState]);

  const stopLocalTimer = useCallback(() => {
    console.log('⏱️ [TIMER] Stopping local timer');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    safeSetState(setTimerData, prev => ({ ...prev, isActive: false }));
  }, [safeSetState]);

  // ===== TYPING INDICATOR HANDLING =====
  const handleTypingStarted = useCallback((data) => {
    console.log('✏️ [TYPING] Received typing_started:', data);
    
    // Only handle typing from astrologer
    if (data.senderType === 'astrologer' && data.bookingId === bookingId) {
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
  }, [bookingId, safeSetState]);
  
  const handleTypingStopped = useCallback((data) => {
    console.log('✏️ [TYPING] Received typing_stopped:', data);
    
    // Only handle typing from astrologer
    if (data.senderType === 'astrologer' && data.bookingId === bookingId) {
      safeSetState(setAstrologerTyping, false);
      
      // Clear existing timeout
      if (astrologerTypingTimeoutRef.current) {
        clearTimeout(astrologerTypingTimeoutRef.current);
      }
    }
  }, [bookingId, safeSetState]);
  
  // Legacy handler for backward compatibility
  const handleTypingIndicator = useCallback((data) => {
    console.log('✏️ [TYPING] Received typing indicator (legacy):', data);
    
    // Only handle typing from astrologer
    if (data.senderType === 'astrologer' && data.bookingId === bookingId) {
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
  }, [bookingId, safeSetState]);
  
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
    console.log('📨 [MESSAGE] Received:', data);
    
    // Send read receipt for received message
    const socket = socketRef.current;
    if (socket?.connected && data.id) {
      socket.emit('message_read', {
        messageId: data.id,
        bookingId,
        sessionId,
        userId: authUser?.id,
        roomId: getCurrentRoomId()
      });
    }
    
    if (data.senderId === authUser?.id) {
      console.log('⚠️ [MESSAGE] Ignoring own message');
      return;
    }
    
    const newMessage = {
      id: data.id || generateMessageId(),
      content: data.content || data.text || data.message,
      senderId: data.senderId,
      senderType: data.senderType || 'astrologer',
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'received'
    };
    
    // Update last message timestamp for missed message tracking
    const messageTimestamp = new Date(newMessage.timestamp).getTime();
    if (messageTimestamp > lastMessageTimestampRef.current) {
      lastMessageTimestampRef.current = messageTimestamp;
    }
    
    safeSetState(setMessages, prev => {
      const exists = prev.find(msg => msg.id === newMessage.id);
      if (exists) {
        console.log('⚠️ [MESSAGE] Duplicate message ignored:', newMessage.id);
        return prev;
      }
      return [...prev, newMessage];
    });
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [authUser?.id, generateMessageId, safeSetState]);


  

  
  // ===== SESSION EVENT HANDLERS =====
  const handleSessionStarted = useCallback((data) => {
    console.log('🎯 [SESSION] Session started:', data);
    safeSetState(setSessionActive, true);
    safeSetState(setConnected, true);
    
    if (data.duration) {
      const duration = parseInt(data.duration, 10);
      console.log('⏱️ [SESSION] Starting timer with duration from session start:', duration);
      
      // Save session state for reconnection
      const startTime = Date.now();
      saveSessionState(startTime, duration);
      
      startLocalTimer(duration);
    } else {
      console.log('⚠️ [SESSION] No duration provided in session start data');
    }
  }, [safeSetState, startLocalTimer, saveSessionState]);
  
  const handleTimerUpdate = useCallback((data) => {
    console.log('⏱️ [TIMER] Update received:', data);
    console.log('⏱️ [TIMER] Current bookingId:', bookingId);
    console.log('⏱️ [TIMER] Data bookingId:', data.bookingId);
    
    // Validate the timer update is for this session
    if (data.bookingId !== bookingId) {
      console.log('⚠️ [TIMER] Ignoring timer update for different booking');
      return;
    }
    
    const duration = data.duration || data.elapsed || 0;
    const totalDuration = data.totalDuration || duration;
    console.log('⏱️ [TIMER] Activating timer with backend elapsed:', duration, 'totalDuration:', totalDuration);
    
    // Calculate proper startTime based on backend elapsed time
    const backendStartTime = Date.now() - (duration * 1000);
    saveSessionState(backendStartTime, totalDuration);
    
    console.log('⏱️ [TIMER] Setting timer data - isActive: true, elapsed:', duration, 'startTime:', backendStartTime);
    safeSetState(setTimerData, {
      elapsed: duration,
      duration: totalDuration,
      isActive: true,
      startTime: backendStartTime // Fix: Use calculated startTime instead of null
    });
    
    console.log('⏱️ [TIMER] New timer data:', {
      duration: totalDuration,
      elapsed: duration,
      isActive: true,
      startTime: backendStartTime
    });
    
    safeSetState(setSessionActive, true);
    
    // Start local timer with existing startTime to maintain continuity
    startLocalTimer(totalDuration, backendStartTime);
  }, [bookingId, safeSetState, startLocalTimer]);

  const handleSessionEnded = useCallback((data) => {
    console.log('🛑 [SESSION] Session ended:', data);
    
    // Validate this session end event is for current session
    if (data.bookingId && data.bookingId !== bookingId) {
      console.log('⚠️ [SESSION] Ignoring session end for different booking:', data.bookingId);
      return;
    }
    
    safeSetState(setSessionActive, false);
    safeSetState(setConnected, false);
    stopLocalTimer();
    
    // Clear any ongoing reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isReconnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    
    const endReason = data.endedBy === 'astrologer' ? 'The astrologer has ended the session.' : 'The session has ended.';
    
    Alert.alert(
      'Session Ended',
      endReason,
      [{ text: 'OK', onPress: () => {
        if (mountedRef.current) {
          navigation.goBack();
        }
      }}]
    );
  }, [safeSetState, stopLocalTimer, navigation, bookingId]);

  const joinConsultationRoom = useCallback(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket || initializationCompleteRef.current) {
      console.log('⚠️ [ROOM] Skipping room join - socket not available or already joined');
      console.log('⚠️ [ROOM] Socket available:', !!currentSocket);
      console.log('⚠️ [ROOM] Already joined:', initializationCompleteRef.current);
      return;
    }
    
    const roomId = getCurrentRoomId();
    console.log('🏠 [ROOM] Joining consultation room:', roomId);
    console.log('🏠 [ROOM] BookingId:', bookingId);
    console.log('🏠 [ROOM] SessionId:', sessionId);
    console.log('🏠 [ROOM] UserId:', authUser?.id);
    
    console.log('📤 [EMIT] Emitting join_consultation_room event...');
    currentSocket.emit('join_consultation_room', {
      bookingId,
      sessionId,
      userId: authUser?.id,
      userType: 'user',
      roomId
    }, (ack) => {
      console.log('🎯 [DEBUG] join_consultation_room acknowledgment:', JSON.stringify(ack, null, 2));
    });
    console.log('✅ [EMIT] join_consultation_room event emitted successfully');
    
    console.log('📤 [EMIT] Emitting user_joined_consultation event...');
    currentSocket.emit('user_joined_consultation', {
      bookingId,
      sessionId,
      userId: authUser?.id
    }, (ack) => {
      console.log('🎯 [DEBUG] user_joined_consultation acknowledgment:', JSON.stringify(ack, null, 2));
    });
    console.log('✅ [EMIT] user_joined_consultation event emitted successfully');
    
    initializationCompleteRef.current = true;
    console.log('🏠 [ROOM] Room join process completed');
  }, [getCurrentRoomId, bookingId, sessionId, authUser?.id]);

  const cleanupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    console.log('🧹 [SOCKET] Cleaning up event listeners');
    
    const events = [
      'connect', 'disconnect', 'connect_error',
      'receive_message', 'message_delivered', 'typing_indicator',
      'session_started', 'session_timer', 'session_timer_update', 'session_ended',
      'consultation_ended', 'missed_messages_recovery'
    ];
    
    events.forEach(event => {
      socket.off(event);
    });
  }, []);

  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) {
      console.log('⚠️ [SOCKET] No socket available for listener setup');
      return;
    }
    
    console.log('👂 [SOCKET] Setting up event listeners');
    
    // Clean up existing listeners first to prevent duplicates
    cleanupSocketListeners();
    
    socket.on('connect', () => {
      console.log(`🔗 [SOCKET] Connected to server (Instance: ${instanceId.current})`);
      safeSetState(setConnected, true);
      reconnectAttemptsRef.current = 0;
      
      // Clear loading state on successful connection
      if (!loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Clearing loading on connect (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = true;
        safeSetState(setLoading, false);
      }
      
      // Join consultation room after connection
      if (!initializationCompleteRef.current) {
        joinConsultationRoom();
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`🔌 [SOCKET] Disconnected from server (Instance: ${instanceId.current}):`, reason);
      safeSetState(setConnected, false);
      
      // Reset initialization flag to allow rejoining room on reconnect
      initializationCompleteRef.current = false;
      
      // Reset loading state on disconnect to show reconnecting state
      if (loadingStateSetRef.current && mountedRef.current) {
        console.log(`🎯 [LOADING] Setting loading on disconnect (Instance: ${instanceId.current})`);
        loadingStateSetRef.current = false;
        safeSetState(setLoading, true);
      }
      
      // Auto-reconnect for any disconnect reason except manual disconnects
      if (mountedRef.current && reason !== 'io client disconnect') {
        console.log('🔄 [RECONNECT] Starting auto-reconnection due to disconnect');
        setTimeout(() => {
          if (mountedRef.current && handleReconnectionRef.current) {
            handleReconnectionRef.current();
          }
        }, 1000); // Small delay to prevent rapid reconnection attempts
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ [SOCKET] Connection error:', error);
      safeSetState(setConnected, false);
    });
    
    socket.on('receive_message', (data) => {
      console.log('📨 [MESSAGE] Received via socket listener:', data);
      handleIncomingMessage(data);
    });
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('message_status_update', handleMessageRead);
    socket.on('typing_started', handleTypingStarted);
    socket.on('typing_stopped', handleTypingStopped);
    socket.on('session_started', handleSessionStarted);
    socket.on('session_timer_update', handleTimerUpdate);
    socket.on('session_ended', handleSessionEnded);
    
    // Global session end listener for consultation_ended events
    socket.on('consultation_ended', (data) => {
      console.log('🏁 [GLOBAL] Consultation ended event received:', data);
      if (data.bookingId === bookingId) {
        console.log('🏁 [GLOBAL] Consultation ended for current session, handling...');
        handleSessionEnded(data);
      }
    });
    socket.on('session_timer', (data) => {
      console.log('🎯 [DEBUG] Raw session_timer event received:', JSON.stringify(data, null, 2));
      handleTimerUpdate(data);
    });
    
    // Also listen for session_timer_update events (backend sends both)
    socket.on('session_timer_update', (data) => {
      console.log('🎯 [DEBUG] Raw session_timer_update event received:', JSON.stringify(data, null, 2));
      handleTimerUpdate(data);
    });
    
    // Handle automatic missed message recovery from backend
    socket.on('missed_messages_recovery', (data) => {
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
    
    console.log('✅ [SOCKET] Event listeners setup complete');
  }, [safeSetState, cleanupSocketListeners, joinConsultationRoom, handleIncomingMessage, handleMessageDelivered, handleTypingIndicator, handleSessionStarted, handleTimerUpdate, handleSessionEnded, bookingId, messages]);

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
          bookingId,
          sessionId,
          roomId: getCurrentRoomId(),
          timestamp: new Date().toISOString()
        };
        
        socket.emit('send_message', messagePayload, (acknowledgment) => {
          if (acknowledgment?.success) {
            console.log('✅ [MESSAGE] Socket send acknowledged');
            safeSetState(setMessages, prev => 
              prev.map(msg => 
                msg.id === messageId 
                  ? { ...msg, status: 'sent' }
                  : msg
              )
            );
          } else {
            console.warn('⚠️ [MESSAGE] Socket send not acknowledged');
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
  }, [messageText, sessionActive, generateMessageId, authUser?.id, bookingId, sessionId, getCurrentRoomId, safeSetState]);
  
  const handleInputChange = useCallback((text) => {
    safeSetState(setMessageText, text);
    
    const socket = socketRef.current;
    if (socket?.connected && sessionActive) {
      const isCurrentlyTyping = text.length > 0;
      
      // Emit typing indicator
      if (isCurrentlyTyping) {
        socket.emit('typing_started', {
          bookingId,
          sessionId,
          userId: authUser?.id,
          roomId: getCurrentRoomId()
        });
      } else {
        socket.emit('typing_stopped', {
          bookingId,
          sessionId,
          userId: authUser?.id,
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
            socketRef.current.emit('typing_stopped', {
              bookingId,
              sessionId,
              userId: authUser?.id,
              roomId: getCurrentRoomId()
            });
          }
          safeSetState(setIsTyping, false);
        }, 5000);
      }
    }
  }, [safeSetState, sessionActive, bookingId, sessionId, authUser?.id, getCurrentRoomId]);
  
  const endSession = useCallback(async () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this consultation session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🛑 [SESSION] Ending session...');
              
              const socket = socketRef.current;
              if (socket?.connected) {
                socket.emit('end_session', {
                  bookingId,
                  sessionId,
                  userId: authUser?.id,
                  endedBy: 'user'
                });
              }
              
              safeSetState(setSessionActive, false);
              stopLocalTimer();
              navigation.goBack();
              
            } catch (error) {
              console.error('❌ [SESSION] End session failed:', error);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            }
          }
        }
      ]
    );
  }, [bookingId, sessionId, authUser?.id, safeSetState, stopLocalTimer, navigation]);

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
          
          // Re-join room if needed
          if (!initializationCompleteRef.current) {
            console.log('🔄 [APP-STATE] Re-joining consultation room after foreground');
            joinConsultationRoom();
          }
          
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
    
    console.log('🚀 [INIT] Starting component initialization for:', instanceId.current);
    console.log('🚀 [INIT] BookingId:', bookingId, 'SessionId:', sessionId);
    console.log('🚀 [INIT] AuthUser:', !!authUser?.id);
    console.log('🚀 [INIT] ContextSocket available:', !!contextSocket);
    
    if (!bookingId) {
      console.error('❌ [INIT] Missing bookingId:', bookingId);
      return;
    }
    
    if (!authUser?.id) {
      console.error('❌ [INIT] Missing authUser.id, waiting for auth to load...');
      return;
    }
    
    if (!contextSocket) {
      console.log('⚠️ [INIT] No context socket available yet, waiting...');
      return;
    }
    
    // Mark socket as being initialized
    socketInitializedRef.current = true;
    mountingGuardRef.current = true;
    
    // Initialize socket connection
    const initTimer = setTimeout(() => {
      console.log('🚀 [INIT] Initializing socket after delay');
      initializeSocket().then(() => {
        if (mountedRef.current) {
          console.log(`✅ [INIT] Initialization complete (Instance: ${instanceId.current})`);
          
          // Join room after socket initialization
          setTimeout(() => {
            if (mountedRef.current && !initializationCompleteRef.current) {
              console.log('🚀 [INIT] Joining consultation room');
              joinConsultationRoom();
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
        console.error(`❌ [INIT] Initialization failed (Instance: ${instanceId.current}):`, error);
        mountingGuardRef.current = false;
        socketInitializedRef.current = false;
        
        // Show error state if initialization fails
        if (mountedRef.current) {
          safeSetState(setConnected, false);
          Alert.alert('Connection Error', 'Failed to connect to the consultation. Please try again.');
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
            {item.content}
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
            
            {sessionActive && (
              <TouchableOpacity style={styles.endSessionButton} onPress={endSession}>
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

        {astrologerTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Astrologer is typing...</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={handleInputChange}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={sessionActive && connected}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || !sessionActive) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || !sessionActive}
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

// Export the component directly to fix runtime error
export default FixedChatScreen;
