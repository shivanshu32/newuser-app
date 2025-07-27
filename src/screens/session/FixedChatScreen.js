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
import { getSocket } from '../../services/socketService';

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
  
  const { user: authUser } = useAuth();

  // ===== STATE MANAGEMENT =====
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [sessionActive, setSessionActive] = useState(false);
  const [astrologerTyping, setAstrologerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [timerData, setTimerData] = useState({
    elapsed: 0,
    duration: 0,
    isActive: false,
    startTime: null
  });

  // ===== REFS =====
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const lastMessageTimestampRef = useRef(0);
  const roomJoinedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const initializationCompleteRef = useRef(false);
  const socketInitializedRef = useRef(false);

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

  // ===== TIMER MANAGEMENT =====
  const startLocalTimer = useCallback((duration = 0) => {
    console.log('⏱️ [TIMER] Starting local timer with duration:', duration);
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    const startTime = Date.now();
    safeSetState(setTimerData, {
      elapsed: 0,
      duration,
      isActive: true,
      startTime
    });
    
    timerIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      safeSetState(setTimerData, prev => ({
        ...prev,
        elapsed
      }));
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

  // ===== MESSAGE HANDLING =====
  const handleIncomingMessage = useCallback((messageData) => {
    console.log('📨 [MESSAGE] Received:', messageData);
    
    if (!messageData || !messageData.content) {
      console.warn('⚠️ [MESSAGE] Invalid message data received');
      return;
    }
    
    const messageTime = new Date(messageData.timestamp || Date.now()).getTime();
    if (messageTime <= lastMessageTimestampRef.current) {
      console.log('🔄 [MESSAGE] Duplicate message ignored');
      return;
    }
    lastMessageTimestampRef.current = messageTime;
    
    const newMessage = {
      id: messageData.id || generateMessageId(),
      content: messageData.content,
      senderId: messageData.senderId,
      senderType: messageData.senderType || 'astrologer',
      timestamp: messageData.timestamp || new Date().toISOString(),
      status: 'delivered'
    };
    
    safeSetState(setMessages, prev => [...prev, newMessage]);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [generateMessageId, safeSetState]);
  
  const handleMessageDelivered = useCallback((data) => {
    console.log('✅ [MESSAGE] Delivered:', data);
    
    safeSetState(setMessages, prev => 
      prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: 'delivered' }
          : msg
      )
    );
  }, [safeSetState]);
  
  const handleTypingIndicator = useCallback((data) => {
    if (data.userId !== authUser?.id) {
      safeSetState(setAstrologerTyping, data.isTyping);
      
      if (data.isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          safeSetState(setAstrologerTyping, false);
        }, 3000);
      }
    }
  }, [authUser?.id, safeSetState]);
  
  // ===== SESSION EVENT HANDLERS =====
  const handleSessionStarted = useCallback((data) => {
    console.log('🚀 [SESSION] Session started:', data);
    console.log('🚀 [SESSION] Setting sessionActive to true');
    safeSetState(setSessionActive, true);
    safeSetState(setConnectionStatus, 'connected');
    
    if (data.duration) {
      console.log('🚀 [SESSION] Starting local timer with duration:', data.duration);
      startLocalTimer(data.duration);
    } else {
      console.log('⚠️ [SESSION] No duration provided in session start data');
    }
  }, [safeSetState, startLocalTimer]);
  
  const handleTimerUpdate = useCallback((data) => {
    console.log('⏱️ [TIMER] Update received:', data);
    console.log('⏱️ [TIMER] Current bookingId:', bookingId);
    console.log('⏱️ [TIMER] Data bookingId:', data.bookingId);
    
    if (data.bookingId !== bookingId) {
      console.log('⚠️ [TIMER] Ignoring timer for different booking');
      return;
    }
    
    safeSetState(setConnectionStatus, 'connected');
    
    // Always activate timer when receiving backend timer events
    if (data.elapsed !== undefined || data.durationSeconds !== undefined || data.duration !== undefined) {
      const backendElapsed = parseInt(data.elapsed || data.durationSeconds || data.duration, 10);
      console.log('⏱️ [TIMER] Activating timer with backend elapsed:', backendElapsed);
      console.log('⏱️ [TIMER] Setting timer data - isActive: true, elapsed:', backendElapsed);
      
      safeSetState(setTimerData, prev => {
        const newTimerData = {
          ...prev,
          elapsed: backendElapsed,
          isActive: true,
          duration: data.duration || prev.duration
        };
        console.log('⏱️ [TIMER] New timer data:', newTimerData);
        return newTimerData;
      });
    } else {
      console.log('⚠️ [TIMER] No elapsed, durationSeconds, or duration in data:', data);
    }
  }, [bookingId, safeSetState]);
  

  
  const handleSessionEnded = useCallback((data) => {
    console.log('🛑 [SESSION] Session ended:', data);
    safeSetState(setSessionActive, false);
    stopLocalTimer();
    
    Alert.alert(
      'Session Ended',
      'Your consultation session has ended.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [safeSetState, stopLocalTimer, navigation]);

  const joinConsultationRoom = useCallback(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket || roomJoinedRef.current) {
      console.log('⚠️ [ROOM] Skipping room join - socket not available or already joined');
      console.log('⚠️ [ROOM] Socket available:', !!currentSocket);
      console.log('⚠️ [ROOM] Already joined:', roomJoinedRef.current);
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
    
    roomJoinedRef.current = true;
    console.log('🏠 [ROOM] Room join process completed');
  }, [getCurrentRoomId, bookingId, sessionId, authUser?.id]);

  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;
    
    console.log('👂 [SOCKET] Setting up event listeners');
    
    socket.on('connect', () => {
      console.log('✅ [SOCKET] Connected successfully');
      safeSetState(setConnectionStatus, 'connecting');
      joinConsultationRoom();
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ [SOCKET] Disconnected:', reason);
      safeSetState(setConnectionStatus, 'connecting');
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ [SOCKET] Connection error:', error);
      safeSetState(setConnectionStatus, 'error');
    });
    
    socket.on('receive_message', handleIncomingMessage);
    socket.on('message_delivered', handleMessageDelivered);
    socket.on('typing_indicator', handleTypingIndicator);
    socket.on('session_started', handleSessionStarted);
    socket.on('session_timer', (data) => {
      console.log('🎯 [DEBUG] Raw session_timer event received:', JSON.stringify(data, null, 2));
      handleTimerUpdate(data);
    });
    
    // Also listen for session_timer_update events (backend sends both)
    socket.on('session_timer_update', (data) => {
      console.log('🎯 [DEBUG] Raw session_timer_update event received:', JSON.stringify(data, null, 2));
      handleTimerUpdate(data);
    });
    socket.on('session_ended', handleSessionEnded);
    
    // Add debug listeners for room join events
    socket.on('room_joined', (data) => {
      console.log('🏠 [DEBUG] Room joined confirmation:', JSON.stringify(data, null, 2));
    });
    
    socket.on('user_joined_consultation_ack', (data) => {
      console.log('🏠 [DEBUG] User joined consultation ack:', JSON.stringify(data, null, 2));
    });
    
    // Debug: Listen for all timer-related events
    socket.on('session_timer_started', (data) => {
      console.log('🎯 [DEBUG] session_timer_started event:', JSON.stringify(data, null, 2));
    });
    
    socket.on('session_timer_update', (data) => {
      console.log('🎯 [DEBUG] session_timer_update event:', JSON.stringify(data, null, 2));
    });
    
    // Debug: Track socket connection events
    const originalOnevent = socket.onevent;
    socket.onevent = function(packet) {
      const args = packet.data || [];
      const eventName = args[0];
      const eventData = args[1];
      
      // Log all events for debugging
      if (eventName && eventName.includes('timer') || eventName.includes('session')) {
        console.log('🔍 [DEBUG] Socket event received:', eventName, JSON.stringify(eventData, null, 2));
      }
      
      originalOnevent.call(this, packet);
    };
    
  }, [bookingId]); // Only stable dependencies to prevent event listener loss

  const initializeSocket = useCallback(async () => {
    console.log('🔌 [SOCKET] Initializing socket connection');
    
    try {
      const socket = await getSocket();
      if (!socket) {
        throw new Error('Failed to get socket instance');
      }
      
      socketRef.current = socket;
      
      if (!socket.connected) {
        console.log('🔌 [SOCKET] Connecting socket...');
        socket.connect();
      }
      
      setupSocketListeners();
      safeSetState(setConnectionStatus, 'connecting');
      
    } catch (error) {
      console.error('❌ [SOCKET] Initialization failed:', error);
      safeSetState(setConnectionStatus, 'error');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          console.log('🔄 [SOCKET] Attempting reconnection...');
          initializeSocket();
        }
      }, 3000);
    }
  }, [safeSetState, setupSocketListeners]);

  // ===== MESSAGE SENDING =====
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !sessionActive) {
      console.log('⚠️ [MESSAGE] Cannot send - empty text or session inactive');
      return;
    }
    
    const messageContent = inputText.trim();
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
    safeSetState(setInputText, '');
    
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
  }, [inputText, sessionActive, generateMessageId, authUser?.id, bookingId, sessionId, getCurrentRoomId, safeSetState]);
  
  const handleInputChange = useCallback((text) => {
    safeSetState(setInputText, text);
    
    const socket = socketRef.current;
    if (socket?.connected && sessionActive) {
      socket.emit('typing_indicator', {
        bookingId,
        sessionId,
        userId: authUser?.id,
        isTyping: text.length > 0,
        roomId: getCurrentRoomId()
      });
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
    
    // Remove duplicate socket initialization - handled by main init useEffect
    
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 [APP-STATE] Changed to:', nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 [APP-STATE] App foregrounded, reconnecting...');
        if (socketRef.current && !socketRef.current.connected) {
          initializeSocket();
        }
      }
      
      appStateRef.current = nextAppState;
    };
    
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    setTimeout(() => {
      safeSetState(setLoading, false);
    }, 1000);
    
    return () => {
      console.log('🧹 [LIFECYCLE] Component unmounting');
      mountedRef.current = false;
      
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
        const events = [
          'connect', 'disconnect', 'connect_error',
          'receive_message', 'message_delivered', 'typing_indicator',
          'session_started', 'session_timer', 'session_ended'
        ];
        
        events.forEach(event => {
          socketRef.current.off(event);
        });
      }
      
      appStateSubscription?.remove();
    };
  }, [safeSetState]); // Remove initializeSocket from dependencies

  // ===== MAIN COMPONENT INITIALIZATION =====
  useEffect(() => {
    console.log('🚀 [INIT] Starting component initialization');
    console.log('🚀 [INIT] BookingId:', bookingId, 'SessionId:', sessionId);
    // Prevent duplicate initialization
    if (socketInitializedRef.current) {
      console.log('⚠️ [INIT] Socket already initialized, skipping duplicate initialization');
      return;
    }
    
    if (!bookingId) {
      console.error('❌ [INIT] Missing bookingId:', bookingId);
      return;
    }
    
    if (!authUser?.id) {
      console.error('❌ [INIT] Missing authUser.id, waiting for auth to load...');
      return;
    }
    
    // Mark socket as being initialized
    socketInitializedRef.current = true;
    
    // Initialize socket connection
    const initTimer = setTimeout(() => {
      console.log('🚀 [INIT] Initializing socket after delay');
      initializeSocket();
      
      // Join room after socket initialization
      setTimeout(() => {
        console.log('🚀 [INIT] Joining consultation room');
        joinConsultationRoom();
      }, 1000);
    }, 500);
    
    return () => {
      clearTimeout(initTimer);
      console.log('🚀 [CLEANUP] Component cleanup');
      
      // Clean up socket listeners and connection
      if (socketRef.current) {
        console.log('🚀 [CLEANUP] Cleaning up socket listeners');
        const events = [
          'connect', 'disconnect', 'connect_error',
          'receive_message', 'message_delivered', 'typing_indicator',
          'session_started', 'session_timer', 'session_ended'
        ];
        
        events.forEach(event => {
          socketRef.current.off(event);
        });
        
        socketRef.current = null;
      }
      
      // Reset initialization flags for proper remount handling
      socketInitializedRef.current = false;
      roomJoinedRef.current = false;
      
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
      initializationCompleteRef.current = false;
      socketInitializedRef.current = false;
    };
  }, [bookingId, sessionId, authUser?.id]);

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
                {item.status === 'sending' && <Ionicons name="time-outline" size={12} color="#E0E0E0" />}
                {item.status === 'sent' && <Ionicons name="checkmark" size={12} color="#E0E0E0" />}
                {item.status === 'delivered' && <Ionicons name="checkmark-done" size={12} color="#E0E0E0" />}
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
    switch (connectionStatus) {
      case 'connected':
        return { color: '#10B981', text: sessionActive ? 'Connected' : 'Waiting for session to start...' };
      case 'connecting':
        return { color: '#F59E0B', text: 'Connecting...' };
      case 'error':
        return { color: '#EF4444', text: 'Connection lost. Retrying...' };
      default:
        return { color: '#6B7280', text: 'Unknown status' };
    }
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
                <Text style={styles.amountText}>
                  ₹{Math.ceil(((timerData.elapsed || 0) / 60) * (bookingDetails?.rate || 50))}/min
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
});

export default FixedChatScreen;
