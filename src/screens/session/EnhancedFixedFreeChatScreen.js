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
  SafeAreaView,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useFreeChatContext } from '../../context/FreeChatContext';

// API Configuration
const API_BASE_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1';

/**
 * EnhancedFixedFreeChatScreen - Production-Ready Free Chat with Robust Message Persistence
 * Features:
 * - Multi-layer message persistence (memory, session, AsyncStorage)
 * - Survives component remounts and app backgrounding
 * - Intelligent message deduplication and merging
 * - Real-time synchronization with backend
 */
const EnhancedFixedFreeChatScreen = memo(({ route, navigation }) => {
  console.log('🚀 EnhancedFixedFreeChatScreen: Component mounting with params:', route.params);
  
  // Memoize route parameters to prevent continuous re-mounting
  const stableParams = useMemo(() => {
    return route.params || {};
  }, [route.params?.freeChatId, route.params?.sessionId, route.params?.astrologerId]);
  
  const {
    freeChatId,
    sessionId,
    astrologerId,
    userProfile,
    bookingDetails,
    astrologer,
    isFreeChat = true,
    sessionDuration = 180,
    consultationType = 'chat',
  } = stableParams;
  
  // Validate that we have either freeChatId or sessionId
  const effectiveFreeChatId = freeChatId || sessionId;
  if (!effectiveFreeChatId) {
    console.error('❌ [ENHANCED_FREE_CHAT] Missing both freeChatId and sessionId:', { freeChatId, sessionId });
    
    Alert.alert(
      'Session Error',
      'Unable to join free chat session. Missing session information.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
    return null;
  }
  
  console.log('✅ [ENHANCED_FREE_CHAT] Using effective freeChatId:', effectiveFreeChatId);
  
  // Hooks
  const { user: authUser } = useAuth();
  const { socket: contextSocket } = useSocket();
  const {
    initializeSession,
    addMessage,
    mergeBackendMessages,
    setSessionStatus,
    setTimerData,
    getSession,
    getMessages,
    isSessionInitialized
  } = useFreeChatContext();

  // Get session data from context
  const sessionData = getSession(effectiveFreeChatId);
  const messages = getMessages(effectiveFreeChatId);

  // Local state for UI-specific data
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const mountedRef = useRef(true);
  const initializationCompleteRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));

  console.log(`🚀 EnhancedFixedFreeChatScreen: Instance ${instanceId.current} - Session data:`, {
    messagesCount: messages.length,
    sessionActive: sessionData?.sessionActive,
    sessionEnded: sessionData?.sessionEnded,
    initialized: sessionData?.initialized,
    persistenceLoaded: sessionData?.persistenceLoaded
  });

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
    return `free_chat:${effectiveFreeChatId}`;
  }, [effectiveFreeChatId]);

  // ===== SOCKET MANAGEMENT =====
  const initializeSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('🔌 [ENHANCED_SOCKET] Socket already connected');
      return;
    }

    if (contextSocket?.connected) {
      socketRef.current = contextSocket;
      console.log('✅ [ENHANCED_SOCKET] Using context socket');
      setupSocketListeners();
      joinFreeChatRoom();
    } else {
      console.log('⚠️ [ENHANCED_SOCKET] Context socket not available or not connected');
    }
  }, [contextSocket]);

  const joinFreeChatRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log('⚠️ [ENHANCED_ROOM] Socket not connected, cannot join room');
      return;
    }

    const roomId = getCurrentRoomId();
    console.log('🏠 [ENHANCED_ROOM] Joining room:', roomId);

    socket.emit('join_free_chat_room', {
      freeChatId: effectiveFreeChatId,
      sessionId,
      userId: authUser?.id,
      astrologerId,
      userToken: authUser?.token
    }, (response) => {
      console.log('🏠 [ENHANCED_ROOM] Join room response:', response);
      if (response?.success) {
        setSessionStatus(effectiveFreeChatId, { connected: true });
        // Request message history after joining
        requestMessageHistory();
      }
    });
  }, [effectiveFreeChatId, sessionId, authUser, astrologerId, setSessionStatus]);

  const requestMessageHistory = useCallback(async () => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log('📨 [ENHANCED_HISTORY] Socket not connected, skipping history request');
      return;
    }

    console.log('📨 [ENHANCED_HISTORY] Requesting message history for:', effectiveFreeChatId);

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️ [ENHANCED_HISTORY] Socket timeout for message history');
        resolve();
      }, 8000);

      socket.emit('get_free_chat_message_history', {
        freeChatId: effectiveFreeChatId,
        sessionId,
        since: null, // Get all messages
        userId: authUser?.id
      }, async (response) => {
        clearTimeout(timeout);
        console.log('📨 [ENHANCED_HISTORY] Message history response:', response);

        if (response?.success && response?.messages && Array.isArray(response.messages)) {
          const normalizedMessages = response.messages.map(msg => ({
            id: msg.id || msg._id || generateMessageId(),
            text: msg.content || msg.text || msg.message || '',
            content: msg.content || msg.text || msg.message || '',
            sender: msg.senderType || msg.sender || (msg.senderId === authUser?.id ? 'user' : 'astrologer'),
            senderId: msg.senderId || msg.sender,
            senderType: msg.senderType || (msg.senderId === authUser?.id ? 'user' : 'astrologer'),
            timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
            status: msg.status || 'delivered'
          }));

          console.log(`📨 [ENHANCED_HISTORY] Merging ${normalizedMessages.length} messages from backend`);
          await mergeBackendMessages(effectiveFreeChatId, normalizedMessages);

          // Scroll to bottom after loading
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        resolve();
      });
    });
  }, [effectiveFreeChatId, sessionId, authUser, generateMessageId, mergeBackendMessages]);

  // ===== MESSAGE HANDLERS =====
  const handleIncomingMessage = useCallback(async (data) => {
    console.log('📥 [ENHANCED_MESSAGE] Incoming message:', data);

    // Validate message is for this session
    if (data.freeChatId !== effectiveFreeChatId) {
      console.log('⚠️ [ENHANCED_MESSAGE] Message not for this session, ignoring');
      return;
    }

    const extractedText = data.message || data.content || data.text || '';
    if (!extractedText.trim()) {
      console.log('⚠️ [ENHANCED_MESSAGE] Empty message content, ignoring');
      return;
    }

    const newMessage = {
      id: data.messageId || data.id || generateMessageId(),
      text: extractedText,
      content: extractedText,
      sender: data.senderType || (data.senderId === authUser?.id ? 'user' : 'astrologer'),
      senderId: data.senderId,
      senderType: data.senderType || (data.senderId === authUser?.id ? 'user' : 'astrologer'),
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'delivered'
    };

    console.log('📥 [ENHANCED_MESSAGE] Adding normalized message:', newMessage);
    await addMessage(effectiveFreeChatId, newMessage);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [effectiveFreeChatId, authUser?.id, generateMessageId, addMessage]);

  const handleSessionStarted = useCallback((data) => {
    console.log('🎬 [ENHANCED_SESSION] Session started:', data);
    
    if (data.freeChatId !== effectiveFreeChatId) return;

    setSessionStatus(effectiveFreeChatId, {
      sessionActive: true,
      sessionEnded: false,
      connected: true
    });

    if (data.duration) {
      setTimerData(effectiveFreeChatId, {
        duration: data.duration,
        timeRemaining: data.timeRemaining || data.duration,
        isActive: true,
        startTime: data.startTime || new Date().toISOString()
      });
    }
  }, [effectiveFreeChatId, setSessionStatus, setTimerData]);

  const handleTimerUpdate = useCallback((data) => {
    console.log('⏱️ [ENHANCED_TIMER] Timer update:', data);
    
    if (data.freeChatId !== effectiveFreeChatId) return;

    setTimerData(effectiveFreeChatId, {
      elapsed: data.elapsed || 0,
      timeRemaining: data.timeRemaining || 0,
      isActive: true
    });

    // Update connection status if receiving timer updates
    if (sessionData && !sessionData.connected) {
      setSessionStatus(effectiveFreeChatId, { connected: true });
    }
  }, [effectiveFreeChatId, sessionData, setTimerData, setSessionStatus]);

  const handleSessionEnded = useCallback((data) => {
    console.log('🛑 [ENHANCED_SESSION] Session ended:', data);
    
    if (data.freeChatId !== effectiveFreeChatId) return;

    setSessionStatus(effectiveFreeChatId, {
      sessionActive: false,
      sessionEnded: true,
      sessionEndReason: data.reason || 'timer_expired'
    });

    setTimerData(effectiveFreeChatId, {
      isActive: false,
      timeRemaining: 0
    });

    // Show session end alert
    setTimeout(() => {
      Alert.alert(
        'Free Chat Ended',
        'Your free chat session has ended. To continue chatting, please start a new session.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }, 500);
  }, [effectiveFreeChatId, setSessionStatus, setTimerData, navigation]);

  const handleTypingStarted = useCallback((data) => {
    if (data.freeChatId !== effectiveFreeChatId || data.senderId === authUser?.id) return;
    setSessionStatus(effectiveFreeChatId, { astrologerTyping: true });
  }, [effectiveFreeChatId, authUser?.id, setSessionStatus]);

  const handleTypingStopped = useCallback((data) => {
    if (data.freeChatId !== effectiveFreeChatId || data.senderId === authUser?.id) return;
    setSessionStatus(effectiveFreeChatId, { astrologerTyping: false });
  }, [effectiveFreeChatId, authUser?.id, setSessionStatus]);

  // ===== SOCKET LISTENERS =====
  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    console.log('🎧 [ENHANCED_LISTENERS] Setting up socket listeners');

    // Clean up existing listeners
    socket.off('free_chat_message');
    socket.off('session_started');
    socket.off('session_timer');
    socket.off('session_end');
    socket.off('typing_started');
    socket.off('typing_stopped');

    // Set up new listeners
    socket.on('free_chat_message', handleIncomingMessage);
    socket.on('session_started', handleSessionStarted);
    socket.on('session_timer', handleTimerUpdate);
    socket.on('session_end', handleSessionEnded);
    socket.on('typing_started', handleTypingStarted);
    socket.on('typing_stopped', handleTypingStopped);

    console.log('✅ [ENHANCED_LISTENERS] Socket listeners configured');
  }, [
    handleIncomingMessage,
    handleSessionStarted,
    handleTimerUpdate,
    handleSessionEnded,
    handleTypingStarted,
    handleTypingStopped
  ]);

  const cleanupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    console.log('🧹 [ENHANCED_LISTENERS] Cleaning up socket listeners');
    socket.off('free_chat_message');
    socket.off('session_started');
    socket.off('session_timer');
    socket.off('session_end');
    socket.off('typing_started');
    socket.off('typing_stopped');
  }, []);

  // ===== MESSAGE SENDING =====
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !sessionData?.sessionActive) {
      console.log('⚠️ [ENHANCED_SEND] Cannot send message - empty text or session not active');
      return;
    }

    const socket = socketRef.current;
    if (!socket?.connected) {
      console.log('⚠️ [ENHANCED_SEND] Socket not connected');
      Alert.alert('Connection Error', 'Unable to send message. Please check your connection.');
      return;
    }

    const messageId = generateMessageId();
    const messageData = {
      id: messageId,
      text: messageText.trim(),
      content: messageText.trim(),
      sender: 'user',
      senderId: authUser?.id,
      senderType: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    console.log('📤 [ENHANCED_SEND] Sending message:', messageData);

    // Add message to context immediately (optimistic update)
    await addMessage(effectiveFreeChatId, messageData);
    setMessageText('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Send via socket
    socket.emit('send_free_chat_message', {
      freeChatId: effectiveFreeChatId,
      sessionId,
      message: messageText.trim(),
      senderId: authUser?.id,
      senderType: 'user',
      messageId,
      timestamp: new Date().toISOString()
    }, (response) => {
      console.log('📤 [ENHANCED_SEND] Send message response:', response);
      // Update message status based on response
      // Note: The actual message update would be handled by the context
    });
  }, [messageText, sessionData, authUser, effectiveFreeChatId, sessionId, generateMessageId, addMessage]);

  // ===== TYPING INDICATORS =====
  const handleTyping = useCallback((text) => {
    setMessageText(text);

    const socket = socketRef.current;
    if (!socket?.connected || !sessionData?.sessionActive) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing started if not already typing
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socket.emit('typing_started', {
        freeChatId: effectiveFreeChatId,
        senderId: authUser?.id,
        senderType: 'user'
      });
    }

    // Set timeout to send typing stopped
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing_stopped', {
          freeChatId: effectiveFreeChatId,
          senderId: authUser?.id,
          senderType: 'user'
        });
      }
    }, 1000);
  }, [isTyping, sessionData, effectiveFreeChatId, authUser]);

  // ===== INITIALIZATION =====
  useEffect(() => {
    if (initializationCompleteRef.current) {
      console.log('⚠️ [ENHANCED_INIT] Initialization already complete, skipping');
      return;
    }

    console.log('🚀 [ENHANCED_INIT] Starting initialization for:', effectiveFreeChatId);

    const initialize = async () => {
      try {
        // Initialize session in context (this loads persisted messages)
        if (!isSessionInitialized(effectiveFreeChatId)) {
          console.log('🏗️ [ENHANCED_INIT] Initializing session in context');
          await initializeSession(effectiveFreeChatId);
        }

        // Initialize socket
        initializeSocket();

        initializationCompleteRef.current = true;
        setLoading(false);

        console.log('✅ [ENHANCED_INIT] Initialization complete');
      } catch (error) {
        console.error('❌ [ENHANCED_INIT] Initialization error:', error);
        setLoading(false);
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      cleanupSocketListeners();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [effectiveFreeChatId, initializeSession, isSessionInitialized, initializeSocket, cleanupSocketListeners]);

  // ===== APP STATE HANDLING =====
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      console.log('📱 [ENHANCED_APP_STATE] App state changed to:', nextAppState);
      
      if (nextAppState === 'active' && socketRef.current?.connected) {
        // Re-join room and request latest messages when app becomes active
        setTimeout(() => {
          joinFreeChatRoom();
        }, 1000);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [joinFreeChatRoom]);

  // ===== RENDER FUNCTIONS =====
  const renderMessage = useCallback(({ item }) => {
    const isOwnMessage = item.senderType === 'user';
    
    return (
      <View style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble]}>
          <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
            {item.text || item.content || item.message}
          </Text>
          <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, []);

  const getStatusInfo = useCallback(() => {
    if (loading) {
      return { text: 'Loading...', color: '#FFA500', backgroundColor: 'rgba(255, 165, 0, 0.1)' };
    }
    
    if (sessionData?.sessionEnded) {
      return { text: 'Session Ended', color: '#FF6B6B', backgroundColor: 'rgba(255, 107, 107, 0.1)' };
    }
    
    if (!sessionData?.connected) {
      return { text: 'Connecting...', color: '#FFA500', backgroundColor: 'rgba(255, 165, 0, 0.1)' };
    }
    
    if (sessionData?.sessionActive) {
      const timeRemaining = sessionData?.timerData?.timeRemaining || 0;
      return { 
        text: `Connected - ${formatTime(timeRemaining)} remaining`, 
        color: '#4CAF50', 
        backgroundColor: 'rgba(76, 175, 80, 0.1)' 
      };
    }
    
    return { text: 'Waiting for session...', color: '#FFA500', backgroundColor: 'rgba(255, 165, 0, 0.1)' };
  }, [loading, sessionData, formatTime]);

  const statusInfo = getStatusInfo();

  // Show loading screen during initialization
  if (loading || !sessionData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Free Chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B46C1" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Free Chat</Text>
          <Text style={styles.headerSubtitle}>
            {astrologer?.name || 'Astrologer'} • {messages.length} messages
          </Text>
        </View>
      </View>

      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: statusInfo.backgroundColor }]}>
        <Text style={[styles.statusText, { color: statusInfo.color }]}>
          {statusInfo.text}
        </Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing Indicator */}
      {sessionData?.astrologerTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>Astrologer is typing...</Text>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={messageText}
            onChangeText={handleTyping}
            placeholder={sessionData?.sessionEnded ? "Session has ended" : "Type your message..."}
            placeholderTextColor="#999"
            multiline
            maxLength={500}
            editable={!sessionData?.sessionEnded && sessionData?.sessionActive}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sessionData?.sessionEnded || !sessionData?.sessionActive) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sessionData?.sessionEnded || !sessionData?.sessionActive}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6B46C1',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  messagesContainer: {
    padding: 16,
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
    padding: 12,
    borderRadius: 16,
  },
  ownMessageBubble: {
    backgroundColor: '#6B46C1',
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#E5E7EB',
  },
  otherMessageTime: {
    color: '#9CA3AF',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
  },
  typingText: {
    color: '#6B46C1',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#6B46C1',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});

export default EnhancedFixedFreeChatScreen;
