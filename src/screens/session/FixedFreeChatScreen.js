import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
  AppState,
  Image,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import useMessagePersistence from '../../hooks/useMessagePersistence';
import PrepaidOfferBottomSheet from '../../components/PrepaidOfferBottomSheet';
import prepaidOffersAPI from '../../services/prepaidOffersAPI';

const API_BASE_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1';

/**
 * FixedFreeChatScreen - Production-Ready Free Chat Implementation
 */
const FixedFreeChatScreen = React.memo(({ route, navigation }) => {
  console.log('🚀 FixedFreeChatScreen: Component mounting with params:', route.params);
  
  // Get safe area insets for proper Android navigation bar handling
  const insets = useSafeAreaInsets();
  console.log('🔍 [DEBUG] Raw route.params:', JSON.stringify(route.params, null, 2));
  
  // Memoize route parameters to prevent continuous re-mounting
  const stableParams = useMemo(() => {
    return route.params || {};
  }, [route.params?.freeChatId, route.params?.sessionId, route.params?.astrologerId]);
  
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
  } = stableParams;
  
  console.log('🔍 [DEBUG] Extracted parameters:');
  console.log('🔍 [DEBUG] freeChatId:', freeChatId);
  console.log('🔍 [DEBUG] sessionId:', sessionId);
  console.log('🔍 [DEBUG] astrologerId:', astrologerId);
  console.log('🔍 [DEBUG] isFreeChat:', isFreeChat);
  
  // Validate that we have either freeChatId or sessionId
  const effectiveFreeChatId = freeChatId || sessionId;
  if (!effectiveFreeChatId) {
    console.error('❌ [FREE_CHAT_INIT] Missing both freeChatId and sessionId:', { freeChatId, sessionId });
    console.error('❌ [FREE_CHAT_INIT] Full route params:', route.params);
    
    // Navigate back with error message
    Alert.alert(
      'Session Error',
      'Unable to join free chat session. Missing session information.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
    return null;
  }
  
  console.log('✅ [FREE_CHAT_INIT] Using effective freeChatId:', effectiveFreeChatId);
  
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
  
  // ===== MESSAGE PERSISTENCE HOOK =====
  const {
    messages: persistedMessages,
    isLoaded: persistenceLoaded,
    addMessage: addPersistedMessage,
    mergeBackendMessages: mergePersisted,
    getMessages: getPersistedMessages
  } = useMessagePersistence(effectiveFreeChatId);

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
  
  // Prepaid offer state
  const [showPrepaidOffer, setShowPrepaidOffer] = useState(false);
  const [prepaidOfferData, setPrepaidOfferData] = useState(null);
  // REMOVED: waitingForPrepaidOffer state - no longer needed since we removed waiting UI
  
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
  const messageHistoryRequestInProgressRef = useRef(false);
  const lastMessageHistoryRequestRef = useRef(0);
  const messageRecoveryCoordinatorRef = useRef(null);
  const pendingRecoveryRequestsRef = useRef(new Set());
  
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
            // CRITICAL FIX: Don't navigate back, let the session end handler show prepaid offer
            console.log('💰 [USER_END_SESSION] User ended session, waiting for prepaid offer instead of navigating');
          }
        }
      ]
    );
  }, [handleSessionEnd, navigation]);
  
  const handleTimerExpiry = useCallback(() => {
    console.log('⏰ [FREE_CHAT_TIMER] Timer expired - ending session');
    handleSessionEnd('timer_expired', 'system');
    
    // Create prepaid offer and show modal for immediate action
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('💰 [PREPAID_OFFER] Timer expired - creating prepaid offer and showing modal');
        createPrepaidOfferAndShowModal({
          reason: 'timer_expired',
          duration: sessionDuration,
          endedBy: 'system'
        });
      }
    }, 500);
  }, [handleSessionEnd, createPrepaidOfferAndShowModal, sessionDuration]);
  
  const handleAstrologerEndSession = useCallback((data) => {
    console.log('🛑 [FREE_CHAT_END] Session ended by astrologer:', data);
    handleSessionEnd('astrologer_ended', 'astrologer');
    
    // CRITICAL FIX: Don't show alert or navigate - let the main session end handler show prepaid offer
    console.log('💰 [FREE_CHAT_END] Astrologer ended session, waiting for prepaid offer instead of navigating');
  }, [handleSessionEnd]);

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
  // Use a ref to track timer expiry to prevent continuous re-mounting
  const timerExpiryHandledRef = useRef(false);
  
  useEffect(() => {
    // Monitor timer data for expiry - only trigger once when timer expires
    if (timerData.timeRemaining <= 0 && timerData.isActive && sessionActive && !sessionEnded && !timerExpiryHandledRef.current) {
      console.log('⏰ [FREE_CHAT_TIMER] Timer expired - triggering session end');
      timerExpiryHandledRef.current = true;
      
      // Call handleSessionEnd directly to avoid unstable dependency chain
      console.log('⏰ [FREE_CHAT_TIMER] Timer expired - ending session');
      
      // Update session end state directly
      if (mountedRef.current) {
        setSessionEnded(true);
        setSessionEndReason('timer_expired');
        setSessionActive(false);
        
        // Stop any running timers
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        
        // UPDATED: Immediate fallback to show prepaid offer bottom sheet
        console.log('💰 [TIMER_EXPIRED] Free chat timer expired, waiting for backend prepaid offer event');
        
        // Short timeout to wait for backend event, then show bottom sheet immediately
        setTimeout(() => {
          if (mountedRef.current && !showPrepaidOffer) {
            console.log('💰 [PREPAID_OFFER] Timeout reached - no backend offer received, creating manually and showing bottom sheet');
            createPrepaidOfferAndShowModal({
              reason: 'timer_expired_fallback',
              duration: sessionDuration,
              endedBy: 'system'
            });
          } else {
            console.log('💰 [PREPAID_OFFER] Backend offer already received and bottom sheet shown');
          }
        }, 2000); // Reduced timeout to 2 seconds for faster bottom sheet display
      }
    }
    
    // Reset the flag if timer becomes active again (for potential reconnection scenarios)
    if (timerData.timeRemaining > 0 && timerExpiryHandledRef.current) {
      timerExpiryHandledRef.current = false;
    }
  }, [timerData, sessionActive, sessionEnded, createPrepaidOfferAndShowModal, sessionDuration]);

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
        const statusResponse = await response.json();
        console.log('🔍 [FREE_CHAT_RECONNECT] Session status check result:', statusResponse);
        
        if (statusResponse.success && statusResponse.data) {
          const freeChatData = statusResponse.data;
          console.log('📊 [FREE_CHAT_RECONNECT] Free chat status:', freeChatData.status, 'Session status:', freeChatData.sessionStatus);
          
          // Check if session is still active
          if (freeChatData.status === 'completed' || freeChatData.status === 'expired' || 
              freeChatData.sessionStatus === 'completed' || freeChatData.sessionStatus === 'expired') {
            console.log('❌ [FREE_CHAT_RECONNECT] Session already ended, navigating back');
            // CRITICAL FIX: Session ended in background, show prepaid offer instead of navigating back
            console.log('💰 [BACKGROUND_END] Session ended in background, setting waiting state for prepaid offer');
            safeSetState(setWaitingForPrepaidOffer, true);
            
            // Create prepaid offer manually since session ended in background
            setTimeout(() => {
              if (mountedRef.current && !showPrepaidOffer) {
                createPrepaidOfferAndShowModal({
                  reason: 'background_ended',
                  duration: freeChatData.duration || sessionDuration,
                  endedBy: 'system'
                });
              }
            }, 1000);
            return;
          }
          
          // If session is still active, sync timer data
          if (freeChatData.isActive && freeChatData.remainingTime !== null) {
            console.log('⏰ [FREE_CHAT_RECONNECT] Syncing timer - remaining time:', freeChatData.remainingTime);
            safeSetState(setTimerData, {
              elapsed: freeChatData.duration - freeChatData.remainingTime,
              duration: freeChatData.duration,
              timeRemaining: freeChatData.remainingTime,
              isActive: true,
              startTime: freeChatData.startTime
            });
            
            // Save session state for timer sync
            if (freeChatData.startTime) {
              sessionStartTimeRef.current = new Date(freeChatData.startTime).getTime();
              sessionDurationRef.current = freeChatData.duration;
            }
          }
        } else {
          console.log('⚠️ [FREE_CHAT_RECONNECT] Invalid status response format, proceeding with reconnection');
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
      
      // Request missed messages after rejoining room
      // Wait a bit for room join to complete, then request message history
      setTimeout(() => {
        if (mountedRef.current && socketRef.current?.connected) {
          console.log('📨 [RECONNECT] Requesting missed messages after rejoin (delayed)');
          requestMissedMessages();
        }
      }, 1500); // Increased delay to avoid conflicts with room join message history
      
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
        console.log('💰 [RECONNECT_END] Session ended during reconnection, showing prepaid offer instead of navigating back');
        safeSetState(setWaitingForPrepaidOffer, true);
        
        // Create prepaid offer manually since session ended during reconnection
        setTimeout(() => {
          if (mountedRef.current && !showPrepaidOffer) {
            createPrepaidOfferAndShowModal({
              reason: 'reconnect_ended',
              duration: sessionDuration,
              endedBy: 'system'
            });
          }
        }, 1000);
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

  // ===== MESSAGE RECOVERY COORDINATOR =====
  const messageRecoveryCoordinator = useCallback(async (source = 'unknown', force = false) => {
    const requestId = `${source}_${Date.now()}`;
    console.log(`🎯 [FREE_CHAT_COORDINATOR] Request from ${source} (ID: ${requestId})`);
    
    // Check if coordinator is already running
    if (messageRecoveryCoordinatorRef.current && !force) {
      console.log(`🎯 [FREE_CHAT_COORDINATOR] Already running, queuing request from ${source}`);
      pendingRecoveryRequestsRef.current.add(source);
      return messageRecoveryCoordinatorRef.current;
    }
    
    // Enhanced rate limiting: 30 seconds for backgrounding scenarios
    const now = Date.now();
    const timeSinceLastRequest = now - lastMessageHistoryRequestRef.current;
    const minInterval = source.includes('background') || source.includes('foreground') ? 30000 : 5000;
    
    if (timeSinceLastRequest < minInterval && !force) {
      console.log(`🎯 [FREE_CHAT_COORDINATOR] Rate limiting: ${timeSinceLastRequest}ms < ${minInterval}ms, skipping ${source}`);
      return Promise.resolve();
    }
    
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log(`🎯 [FREE_CHAT_COORDINATOR] Socket not connected, cannot recover messages for ${source}`);
      return Promise.resolve();
    }
    
    // Create coordinator promise
    const coordinatorPromise = new Promise(async (resolve) => {
      try {
        console.log(`🎯 [FREE_CHAT_COORDINATOR] Starting message recovery for ${source}`);
        lastMessageHistoryRequestRef.current = now;
        
        const timeout = setTimeout(() => {
          console.log(`🎯 [FREE_CHAT_COORDINATOR] Timeout for ${source}`);
          resolve();
        }, 10000); // 10 second timeout
        
        const requestPayload = {
          freeChatId,
          sessionId,
          since: messages.length === 0 ? null : lastMessageTimestampRef.current,
          userId: authUser?.id
        };
        
        socket.emit('get_free_chat_message_history', requestPayload, (response) => {
          clearTimeout(timeout);
          console.log(`🎯 [FREE_CHAT_COORDINATOR] Response for ${source}:`, response);
          
          if (response?.success && response?.messages && Array.isArray(response.messages)) {
            processRecoveredMessages(response.messages, source);
          }
          
          resolve();
        });
        
      } catch (error) {
        console.error(`🎯 [FREE_CHAT_COORDINATOR] Error for ${source}:`, error);
        resolve();
      }
    });
    
    messageRecoveryCoordinatorRef.current = coordinatorPromise;
    
    // Wait for completion and process any pending requests
    await coordinatorPromise;
    messageRecoveryCoordinatorRef.current = null;
    
    // Process any pending requests
    if (pendingRecoveryRequestsRef.current.size > 0) {
      const pendingSources = Array.from(pendingRecoveryRequestsRef.current);
      pendingRecoveryRequestsRef.current.clear();
      console.log(`🎯 [FREE_CHAT_COORDINATOR] Processing ${pendingSources.length} pending requests:`, pendingSources);
      
      // Process the most recent pending request
      const latestSource = pendingSources[pendingSources.length - 1];
      setTimeout(() => {
        if (mountedRef.current) {
          messageRecoveryCoordinator(latestSource, false);
        }
      }, 1000);
    }
    
    return coordinatorPromise;
  }, [freeChatId, sessionId, authUser?.id, messages]);
  
  // Enhanced message processing with robust deduplication
  const processRecoveredMessages = useCallback((newMessages, source) => {
    console.log(`📨 [FREE_CHAT_PROCESS] Processing ${newMessages.length} messages from ${source}`);
    
    if (newMessages.length === 0) {
      console.log(`📨 [FREE_CHAT_PROCESS] No messages to process from ${source}`);
      return;
    }

    // Normalize message structure to ensure compatibility
    const normalizedMessages = newMessages.map(msg => ({
      id: msg.id || msg._id || generateMessageId(),
      text: msg.content || msg.text || msg.message || '',
      content: msg.content || msg.text || msg.message || '',
      sender: msg.senderType || msg.sender || (msg.senderId === authUser?.id ? 'user' : 'astrologer'),
      senderId: msg.senderId || msg.sender,
      senderType: msg.senderType || (msg.senderId === authUser?.id ? 'user' : 'astrologer'),
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
      status: msg.status || 'delivered'
    }));
    
    // Enhanced deduplication with 60-second tolerance for backgrounding scenarios
    const deduplicatedMessages = normalizedMessages.filter(serverMsg => {
      // Normalize message content from all possible field variations
      const serverContent = serverMsg.content || serverMsg.text || serverMsg.message || '';
      const serverSenderId = serverMsg.senderId || serverMsg.sender;
      const serverTimestamp = new Date(serverMsg.timestamp || serverMsg.createdAt).getTime();
      
      // Primary check: ID-based deduplication
      const existsByID = messages.find(existing => existing.id === serverMsg.id);
      if (existsByID) {
        console.log(`📨 [FREE_CHAT_DEDUP] Skipping duplicate by ID: ${serverMsg.id}`);
        return false;
      }
      
      // Secondary check: Content-based deduplication with extended tolerance
      const existsByContent = messages.find(existing => {
        const existingContent = existing.content || existing.text || existing.message || '';
        const existingSenderId = existing.senderId || existing.sender;
        const existingTimestamp = new Date(existing.timestamp || existing.createdAt).getTime();
        
        const contentMatch = existingContent === serverContent;
        const senderMatch = existingSenderId === serverSenderId || existing.senderType === serverMsg.senderType;
        
        // Extended tolerance: 60 seconds for backgrounding scenarios
        const timeDiff = Math.abs(existingTimestamp - serverTimestamp);
        const timestampMatch = timeDiff < 60000; // 60 seconds tolerance
        
        return contentMatch && senderMatch && timestampMatch;
      });
      
      if (existsByContent) {
        console.log(`📨 [FREE_CHAT_DEDUP] Skipping duplicate by content/sender/time: ${serverContent.substring(0, 30)}...`);
        return false;
      }
      
      return true; // Message is new
    });
          
    if (deduplicatedMessages.length > 0) {
      console.log(`📨 [FREE_CHAT_PROCESS] Adding ${deduplicatedMessages.length} new messages from ${source} (filtered from ${newMessages.length})`);
      
      safeSetState(setMessages, prev => {
        // Final deduplication check in state update with extended tolerance
        const finalFilteredMessages = deduplicatedMessages.filter(newMsg => {
          const newContent = newMsg.content || newMsg.text || newMsg.message || '';
          const newSenderId = newMsg.senderId || newMsg.sender;
          const newTimestamp = new Date(newMsg.timestamp || newMsg.createdAt).getTime();
          
          return !prev.find(existing => {
            const existingContent = existing.content || existing.text || existing.message || '';
            const existingSenderId = existing.senderId || existing.sender;
            const existingTimestamp = new Date(existing.timestamp || existing.createdAt).getTime();
            
            // ID match
            if (existing.id === newMsg.id) return true;
            
            // Content match with extended tolerance
            const contentMatch = existingContent === newContent;
            const senderMatch = existingSenderId === newSenderId;
            const timestampMatch = Math.abs(existingTimestamp - newTimestamp) < 60000; // 60 seconds
            
            return contentMatch && senderMatch && timestampMatch;
          });
        });
        
        if (finalFilteredMessages.length !== deduplicatedMessages.length) {
          console.log(`📨 [FREE_CHAT_DEDUP] Final state filter removed ${deduplicatedMessages.length - finalFilteredMessages.length} additional duplicates`);
        }
        
        const combined = [...prev, ...finalFilteredMessages];
        const sorted = combined.sort((a, b) => new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt));
        
        console.log(`📨 [FREE_CHAT_PROCESS] Total messages after merge: ${sorted.length}`);
        return sorted;
      });
      
      // Update last message timestamp
      const latestTimestamp = Math.max(...deduplicatedMessages.map(msg => new Date(msg.timestamp || msg.createdAt).getTime()));
      if (latestTimestamp > lastMessageTimestampRef.current) {
        lastMessageTimestampRef.current = latestTimestamp;
        console.log(`📨 [FREE_CHAT_PROCESS] Updated last message timestamp to: ${new Date(latestTimestamp).toISOString()}`);
      }
      
      // Auto-scroll to show new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      console.log(`📨 [FREE_CHAT_PROCESS] No new messages to add from ${source} (all already exist)`);
    }
  }, [messages, safeSetState, authUser?.id, generateMessageId]);
  
  // Legacy requestMissedMessages function - now uses coordinator
  const requestMissedMessages = useCallback(async (source = 'legacy') => {
    return messageRecoveryCoordinator(source);
  }, [messageRecoveryCoordinator]);
  
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
    if (data.senderRole === 'astrologer' && (data.freeChatId === freeChatId || data.bookingId === sessionId)) {
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
  }, [freeChatId, sessionId, safeSetState]);
  
  const handleTypingStopped = useCallback((data) => {
    console.log('✏️ [FREE_CHAT_TYPING] Received typing_stopped:', data);
    
    // Only handle typing from astrologer in this free chat session
    if (data.senderRole === 'astrologer' && (data.freeChatId === freeChatId || data.bookingId === sessionId)) {
      safeSetState(setAstrologerTyping, false);
      
      // Clear existing timeout
      if (astrologerTypingTimeoutRef.current) {
        clearTimeout(astrologerTypingTimeoutRef.current);
      }
    }
  }, [freeChatId, sessionId, safeSetState]);
  
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
    
    // Clear typing indicator when message is received from astrologer
    if (data.senderRole === 'astrologer' || data.senderType === 'astrologer') {
      console.log('✏️ [TYPING_CLEAR] Clearing astrologer typing indicator on message received');
      safeSetState(setAstrologerTyping, false);
      if (astrologerTypingTimeoutRef.current) {
        clearTimeout(astrologerTypingTimeoutRef.current);
        astrologerTypingTimeoutRef.current = null;
      }
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
    
    // CRITICAL FIX: If we're receiving timer updates, the socket must be connected
    // Update connection state to ensure UI shows correct status
    safeSetState(setConnected, true);
    safeSetState(setSessionActive, true);
    
    console.log('🔗 [FREE_CHAT_TIMER] Connection state synchronized - connected: true, sessionActive: true');
  }, [freeChatId, sessionDuration, safeSetState]);

  const handleSessionEnded = useCallback((data) => {
    console.log('🛑 [FREE_CHAT_SESSION] Session ended by backend:', data);
    
    // Validate this session end event is for current free chat session
    if (data.sessionId && data.sessionId !== sessionId) {
      console.log('⚠️ [FREE_CHAT_SESSION] Ignoring session end for different session:', data.sessionId);
      return;
    }
    
    // Determine who ended the session and why
    const endedBy = data.endedBy || 'system';
    const currentUserId = authUser?.id;
    
    console.log('🛑 [FREE_CHAT_SESSION] Session end details - endedBy:', endedBy, 'currentUser:', currentUserId);
    
    // Stop local timer and update session state
    safeSetState(setSessionActive, false);
    safeSetState(setSessionEnded, true);
    stopLocalTimer();
    
    // UPDATED: For free chat, ALWAYS show prepaid offer bottom sheet immediately
    const duration = data.duration || sessionDuration;
    
    console.log('💰 [FREE_CHAT_SESSION] Session ended, waiting for backend prepaid offer event');
    console.log('💰 [FREE_CHAT_SESSION] EndedBy:', endedBy, 'CurrentUser:', currentUserId, 'Duration:', duration);
    
    // Short timeout to wait for backend event, then show bottom sheet immediately
    setTimeout(() => {
      if (mountedRef.current && !showPrepaidOffer) {
        console.log('💰 [SESSION_END] No backend offer received, creating manually and showing bottom sheet');
        createPrepaidOfferAndShowModal({
          reason: endedBy === currentUserId ? 'user_ended' : (endedBy && endedBy !== currentUserId ? 'astrologer_ended' : 'timer_expired'),
          duration: duration,
          endedBy: endedBy || 'system'
        });
      } else {
        console.log('💰 [SESSION_END] Backend offer already received and bottom sheet shown');
      }
    }, 2000); // Reduced timeout to 2 seconds for faster bottom sheet display
  }, [sessionId, authUser?.id, formatTime, safeSetState, stopLocalTimer, createPrepaidOfferAndShowModal, navigation, sessionDuration]);

  // ===== AUTOMATIC PREPAID OFFER HANDLER =====
  const handlePrepaidOfferAvailable = useCallback((data) => {
    console.log('💰 [PREPAID_OFFER_AUTO] Received automatic prepaid offer from backend:', data);
    console.log('💰 [PREPAID_OFFER_AUTO] Current show offer state:', showPrepaidOffer);
    console.log('💰 [PREPAID_OFFER_AUTO] Offer data:', {
      offerId: data.offerId,
      astrologerId: data.astrologerId,
      basePrice: data.basePrice,
      totalAmount: data.totalAmount,
      duration: data.duration,
      isExisting: data.isExisting,
      isPaid: data.isPaid
    });
    
    try {
      // Backend event received - show bottom sheet immediately
      console.log('✅ [PREPAID_OFFER_AUTO] Backend event received - showing bottom sheet immediately');
      
      // Prepare astrologer data for the modal
      const astrologerData = {
        id: data.astrologerId,
        name: astrologer?.name || effectiveBookingDetails?.astrologer?.name || 'Astrologer',
        profileImage: astrologer?.profileImage || effectiveBookingDetails?.astrologer?.profileImage,
        specializations: astrologer?.specializations || effectiveBookingDetails?.astrologer?.specializations
      };
      
      // Set up the prepaid offer data and show the modal
      setPrepaidOfferData({
        astrologer: astrologerData,
        originalSessionId: sessionId || effectiveFreeChatId,
        sessionData: data,
        offerData: {
          offerId: data.offerId,
          basePrice: data.basePrice,
          totalAmount: data.totalAmount,
          duration: data.duration,
          isExisting: data.isExisting || false,
          isPaid: data.isPaid || false
        }
      });
      
      setShowPrepaidOffer(true);
      console.log('✅ [PREPAID_OFFER_AUTO] Prepaid offer modal shown for auto-generated offer');
      
    } catch (error) {
      console.error('❌ [PREPAID_OFFER_AUTO] Error handling automatic prepaid offer:', error);
      // Fallback: Navigate to home
      Alert.alert(
        'Prepaid Offer Available',
        'A prepaid offer has been created for you. Please check the home screen.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    }
  }, [astrologer, effectiveBookingDetails, sessionId, effectiveFreeChatId, navigation, safeSetState]);

  // ===== PREPAID OFFER FUNCTIONS =====
  const createPrepaidOfferAndShowModal = useCallback(async (sessionData) => {
    console.log('💰 [PREPAID_OFFER] Creating prepaid offer and showing modal for session:', sessionData);
    
    try {
      // Prepare astrologer data for the offer
      const astrologerData = {
        id: astrologerId,
        name: astrologer?.name || effectiveBookingDetails?.astrologer?.name || 'Astrologer',
        profileImage: astrologer?.profileImage || effectiveBookingDetails?.astrologer?.profileImage,
        specializations: astrologer?.specializations || effectiveBookingDetails?.astrologer?.specializations
      };
      
      console.log('💰 [PREPAID_OFFER] Creating offer with astrologer:', astrologerData.id, 'session:', sessionId || effectiveFreeChatId);
      
      // Create the offer automatically
      const response = await prepaidOffersAPI.createOffer(astrologerData.id, sessionId || effectiveFreeChatId);
      
      if (response.success) {
        console.log('✅ [PREPAID_OFFER] Offer created successfully, showing modal for immediate action');
        
        // Set up the prepaid offer data and show the modal immediately
        setPrepaidOfferData({
          astrologer: astrologerData,
          originalSessionId: sessionId || effectiveFreeChatId,
          sessionData,
          offerData: response.data // Include the created offer data
        });
        
        setShowPrepaidOffer(true); // Show bottom sheet immediately
      } else {
        console.log('❌ [PREPAID_OFFER] Failed to create offer:', response.message);
        // Show error and navigate to home
        Alert.alert(
          'Free Chat Ended',
          'Your free chat session has ended. Please check the home screen for any available offers.',
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (error) {
      console.error('❌ [PREPAID_OFFER] Error creating offer:', error);
      // Show error and navigate to home
      Alert.alert(
        'Free Chat Ended',
        'Your free chat session has ended. Please check the home screen for any available offers.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    }
  }, [astrologerId, astrologer, effectiveBookingDetails, sessionId, effectiveFreeChatId, navigation]);

  // Keep the old modal function for backward compatibility (if needed elsewhere)
  const showPrepaidOfferModal = useCallback((sessionData) => {
    console.log('💰 [PREPAID_OFFER] Showing prepaid offer modal for session:', sessionData);
    
    // Prepare astrologer data for the offer
    const astrologerData = {
      id: astrologerId,
      name: astrologer?.name || effectiveBookingDetails?.astrologer?.name || 'Astrologer',
      profileImage: astrologer?.profileImage || effectiveBookingDetails?.astrologer?.profileImage,
      specializations: astrologer?.specializations || effectiveBookingDetails?.astrologer?.specializations
    };
    
    setPrepaidOfferData({
      astrologer: astrologerData,
      originalSessionId: sessionId || effectiveFreeChatId,
      sessionData
    });
    
    setShowPrepaidOffer(true);
  }, [astrologerId, astrologer, effectiveBookingDetails, sessionId, effectiveFreeChatId]);

  const handleOfferCreated = useCallback((offerData) => {
    console.log('💰 [PREPAID_OFFER] Offer created successfully:', offerData);
    console.log('💰 [PREPAID_OFFER] Offer details:', {
      isExisting: offerData.isExisting,
      isPaid: offerData.isPaid,
      offerId: offerData.offerId
    });
    
    // Close the modal without showing alert since user is proceeding
    setShowPrepaidOffer(false);
    setPrepaidOfferData(null);
    
    // Check if this is an existing paid offer
    if (offerData.isExisting && offerData.isPaid) {
      console.log('💰 [PREPAID_OFFER] Existing offer is already paid, navigating to home to show offer');
      // Navigate to home where the user can see the paid offer
      navigation.navigate('Home');
    } else {
      console.log('💰 [PREPAID_OFFER] Navigating to payment screen for unpaid offer');
      // Navigate to payment screen for new or unpaid offers
      navigation.navigate('PrepaidOfferPayment', { 
        offerId: offerData.offerId 
      });
    }
  }, [navigation]);

  const handleOfferClosed = useCallback((showAlert = true) => {
    console.log('💰 [PREPAID_OFFER] Offer modal closed by user, showAlert:', showAlert);
    setShowPrepaidOffer(false);
    setPrepaidOfferData(null);
    
    // Only show alert if user actually cancelled/closed without proceeding
    if (showAlert) {
      Alert.alert(
        'Offer Saved',
        'Your prepaid offer has been saved! You can find it on the home screen whenever you\'re ready to proceed.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to home where user can see the offer
              navigation.navigate('Home');
            }
          }
        ]
      );
    } else {
      // User proceeded to pay, just navigate to home without alert
      navigation.navigate('Home');
    }
  }, [navigation]);

  const handleSessionResumed = useCallback((data) => {
    console.log('🔄 [FREE_CHAT_RESUMPTION] Session resumed event received:', data);
    
    // Validate this resumption event is for current free chat session
    if (data.freeChatId && data.freeChatId !== freeChatId) {
      console.log('⚠️ [FREE_CHAT_RESUMPTION] Ignoring session resumption for different free chat:', data.freeChatId);
      return;
    }
    
    // Update session state
    safeSetState(setSessionActive, true);
    safeSetState(setConnected, true);
    
    // Update timer with resumed state
    const timeRemaining = data.timeRemaining || 0;
    const elapsed = data.elapsedSeconds || 0;
    const duration = data.duration || sessionDuration;
    const startTime = data.startTime || Date.now();
    
    console.log('🔄 [FREE_CHAT_RESUMPTION] Resuming timer with:', {
      timeRemaining,
      elapsed,
      duration,
      startTime
    });
    
    // Save session state for future reconnections
    saveSessionState(startTime, duration);
    
    // Update timer data
    safeSetState(setTimerData, {
      elapsed: Math.max(0, elapsed),
      duration: duration,
      timeRemaining: Math.max(0, timeRemaining),
      isActive: timeRemaining > 0,
      startTime: startTime
    });
    
    // Start local timer with existing start time to maintain continuity
    if (timeRemaining > 0) {
      startLocalTimer(duration, startTime);
    }
    
    // Use coordinator for session resumption message recovery
    setTimeout(() => {
      if (mountedRef.current) {
        console.log('📨 [SESSION_RESUME] Requesting missed messages via coordinator');
        messageRecoveryCoordinator('session_resume');
      }
    }, 500);
    
    console.log('✅ [FREE_CHAT_RESUMPTION] Session successfully resumed');
  }, [freeChatId, sessionDuration, safeSetState, saveSessionState, startLocalTimer, requestMissedMessages]);

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
    
    // CRITICAL FIX: Join user notification room first to receive prepaid offer events
    console.log('🔔 [NOTIFICATION_ROOM] Joining user notification room for user:', authUser?.id);
    console.log('🔔 [NOTIFICATION_ROOM] Auth token status:', authUser?.token ? 'Present' : 'Missing');
    console.log('🔔 [NOTIFICATION_ROOM] Socket connected:', currentSocket.connected);
    
    currentSocket.emit('join_user_notification_room', {
      userId: authUser?.id,
      role: 'user'
    }, (notificationResponse) => {
      console.log('🔔 [NOTIFICATION_ROOM] Join response:', notificationResponse);
      if (notificationResponse?.success) {
        console.log('✅ [NOTIFICATION_ROOM] Successfully joined user notification room:', notificationResponse.roomName);
        console.log('✅ [NOTIFICATION_ROOM] Room membership verified:', notificationResponse.isInRoom);
        console.log('✅ [NOTIFICATION_ROOM] Room client count:', notificationResponse.clientCount);
        
        // Verify room membership after joining
        setTimeout(() => {
          currentSocket.emit('verify_room_membership', {
            userId: authUser?.id,
            role: 'user'
          }, (verifyResponse) => {
            console.log('🔍 [ROOM_VERIFY] Membership verification:', verifyResponse);
            if (!verifyResponse?.isInRoom) {
              console.error('❌ [ROOM_VERIFY] User not in notification room after join attempt!');
            }
          });
        }, 1000);
        
      } else {
        console.error('❌ [NOTIFICATION_ROOM] Failed to join user notification room:', notificationResponse);
        console.error('❌ [NOTIFICATION_ROOM] This will cause prepaid offer events to be missed!');
        
        // Try to rejoin after a delay
        setTimeout(() => {
          console.log('🔄 [NOTIFICATION_ROOM] Retrying room join...');
          currentSocket.emit('join_user_notification_room', {
            userId: authUser?.id,
            role: 'user'
          });
        }, 2000);
      }
    });
    
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
        
        // CRITICAL FIX: Ensure user is in notification room to receive prepaid offer events
        console.log('🔔 [NOTIFICATION_ROOM] Ensuring user is in notification room for prepaid offers');
        currentSocket.emit('join_user_notification_room', {
          userId: authUser?.id,
          role: 'user'
        }, (notificationResponse) => {
          console.log('🔔 [NOTIFICATION_ROOM] Join notification room response:', notificationResponse);
        });
        
        // Request message history after successful room join (for rejoin scenarios)
        setTimeout(() => {
          if (mountedRef.current && socketRef.current?.connected) {
            console.log('📨 [ROOM_JOIN] Requesting message history after room join via coordinator');
            messageRecoveryCoordinator('room_join');
          }
        }, 500); // Single request with reasonable delay
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
      'typing_started', 'typing_stopped',
      'session_started', 'session_timer', 'free_chat_session_ended', // Backend emits 'free_chat_session_ended'
      'free_chat_session_resumed', 'get_free_chat_message_history',
      'prepaid_offer_available', 'prepaid_offer_creation_failed' // CRITICAL FIX: Added new events
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
    socket.on('typing_started', handleTypingStarted);
    socket.on('typing_stopped', handleTypingStopped);
    
    // Free chat session events
    socket.on('session_started', handleSessionStarted);
    socket.on('session_timer', handleTimerUpdate);
    socket.on('free_chat_session_ended', handleSessionEnded); // Backend emits 'free_chat_session_ended'
    
    // Handle free chat session resumption (for rejoining)
    socket.on('free_chat_session_resumed', handleSessionResumed);
    
    // CRITICAL FIX: Listen for automatic prepaid offer from backend
    socket.on('prepaid_offer_available', handlePrepaidOfferAvailable);
    
    // CRITICAL FIX: Listen for prepaid offer creation failures
    socket.on('prepaid_offer_creation_failed', (data) => {
      console.log('❌ [PREPAID_OFFER_FAILED] Backend prepaid offer creation failed:', data);
      
      // Clear waiting state and show error
      safeSetState(setWaitingForPrepaidOffer, false);
      
      Alert.alert(
        'Free Chat Ended',
        data.message || 'Your free chat session has ended. Please check the home screen for any available offers.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    });
    
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
    
    // Clear own typing indicator when sending message
    safeSetState(setIsTyping, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Immediately notify astrologer that user stopped typing
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('typing_stopped', {
        freeChatId,
        sessionId,
        bookingId: sessionId,
        userId: authUser?.id,
        senderRole: 'user',
        roomId: getCurrentRoomId()
      });
    }
    
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
      
      // Emit typing indicator (backend expects 'typing_started/stopped')
      if (isCurrentlyTyping) {
        socket.emit('typing_started', {
          freeChatId,
          sessionId,
          bookingId: sessionId, // Use sessionId as bookingId for free chat
          userId: authUser?.id,
          senderRole: 'user',
          roomId: getCurrentRoomId()
        });
      } else {
        socket.emit('typing_stopped', {
          freeChatId,
          sessionId,
          bookingId: sessionId, // Use sessionId as bookingId for free chat
          userId: authUser?.id,
          senderRole: 'user',
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
              freeChatId,
              sessionId,
              bookingId: sessionId,
              userId: authUser?.id,
              senderRole: 'user',
              roomId: getCurrentRoomId()
            });
          }
          safeSetState(setIsTyping, false);
        }, 5000);
      }
    }
  }, [safeSetState, sessionActive, freeChatId, sessionId, authUser?.id, getCurrentRoomId]);
  
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
                // Emit correct event name that backend expects
                socket.emit('end_free_chat', {
                  sessionId,
                  freeChatId,
                  userId: authUser?.id,
                  astrologerId,
                  endedBy: 'user'
                });
                
                console.log('🛑 [FREE_CHAT_SESSION] End session request sent, waiting for confirmation...');
                // Don't navigate immediately - wait for backend confirmation
              } else {
                console.error('❌ [FREE_CHAT_SESSION] Socket not connected');
                Alert.alert('Error', 'Connection lost. Please try again.');
              }
              
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
          
          // Re-join free chat room if needed (this will handle message history internally)
          if (!initializationCompleteRef.current) {
            console.log('🔄 [APP-STATE] Re-joining free chat room after foreground');
            joinFreeChatRoom();
          }
          
          // Sync timer from session state even if connected
          syncTimerFromSession();
          
          // Request missed messages with delay to avoid conflicts with room join
          // Use coordinator for foreground message recovery
          setTimeout(() => {
            if (mountedRef.current && socketRef.current?.connected) {
              console.log('📨 [APP-STATE] Requesting missed messages after foreground via coordinator');
              messageRecoveryCoordinator('app_foreground');
            }
          }, 2000); // Increased delay to avoid conflicts with other systems
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
      messageHistoryRequestInProgressRef.current = false;
      lastMessageHistoryRequestRef.current = 0;
      
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

  // REMOVED: Back handler for waiting state - no longer needed since we removed waiting UI

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
    
    // Additional check to prevent multiple instances
    if (initializationCompleteRef.current) {
      console.log('⚠️ [INIT] Initialization already complete, skipping:', instanceId.current);
      return;
    }
    
    console.log('🚀 [FREE_CHAT_INIT] Starting component initialization for:', instanceId.current);
    console.log('🚀 [FREE_CHAT_INIT] FreeChatId:', freeChatId, 'SessionId:', sessionId);
    console.log('🚀 [FREE_CHAT_INIT] AstrologerId:', astrologerId);
    console.log('🚀 [FREE_CHAT_INIT] AuthUser:', !!authUser?.id);
    console.log('🚀 [FREE_CHAT_INIT] ContextSocket available:', !!contextSocket);
    
    // ===== MESSAGE PERSISTENCE =====
    // Log persistence status (non-blocking)
    if (persistenceLoaded && persistedMessages.length > 0) {
      console.log(`📦 [PERSISTENCE] Found ${persistedMessages.length} persisted messages for session:`, effectiveFreeChatId);
    }
    
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
              
              // Message history will be requested by room join callback
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
  }, [freeChatId, sessionId, astrologerId]); // Use stable route parameters only

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

  // REMOVED: Waiting screen UI - now relying solely on prepaid offer bottom sheet

  const getStatusInfo = () => {
    if (loading) {
      return { color: '#F59E0B', text: 'Connecting...' };
    }
    if (sessionEnded) {
      return { color: '#6B7280', text: 'Session ended' };
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
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#6B46C1" />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
          </View>
          
          <View style={styles.headerCenter}>
            <View style={styles.astrologerInfo}>
              <Image 
                source={{ 
                  uri: astrologer?.profileImage || 
                       bookingDetails?.astrologer?.profileImage || 
                       'https://via.placeholder.com/40x40.png?text=A' 
                }}
                style={styles.astrologerImage}
                defaultSource={{ uri: 'https://via.placeholder.com/40x40.png?text=A' }}
              />
              <View style={styles.astrologerDetails}>
                <Text style={styles.headerTitle}>
                  {astrologer?.name || bookingDetails?.astrologer?.name || 'Astrologer'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {consultationType === 'chat' ? 'Free Chat Consultation' : 'Free Consultation'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            {/* Connection Status - Just dot */}
            <View style={[
              styles.connectionDot, 
              { backgroundColor: connected ? '#4ADE80' : '#EF4444' }
            ]} />
            
            {/* Timer */}
            {sessionActive && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerText}>
                  {formatTime(timerData.elapsed || 0)}
                </Text>
              </View>
            )}
            
            {/* End Session Button - Icon only */}
            {sessionActive && !sessionEnded && (
              <TouchableOpacity style={styles.endSessionButton} onPress={handleUserEndSession}>
                <Ionicons name="stop-circle" size={20} color="#FF4444" />
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

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 10) }]}>
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

      {/* Prepaid Offer Bottom Sheet */}
      <PrepaidOfferBottomSheet
        visible={showPrepaidOffer}
        onClose={handleOfferClosed}
        astrologer={prepaidOfferData?.astrologer}
        originalSessionId={prepaidOfferData?.originalSessionId}
        offerData={prepaidOfferData?.offerData}
        onOfferCreated={handleOfferCreated}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B46C1',
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
    paddingTop: 10, // SafeAreaView now handles safe area properly
    paddingBottom: 15,
    paddingLeft: 5,
    paddingRight: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    minWidth: 0,
    alignItems: 'flex-start',
  },
  freeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  freeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  headerCenter: {
    flex: 1,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  astrologerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  astrologerDetails: {
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
    justifyContent: 'flex-end',
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  timerContainer: {
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 45,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  endSessionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  amountText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
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

export default FixedFreeChatScreen;
