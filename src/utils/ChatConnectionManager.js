import { AppState, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSocket } from '../services/socketService';

/**
 * Enhanced Chat Connection Manager
 * Handles robust socket connections with reconnection logic, message queuing, and app state management
 */
class ChatConnectionManager {
  constructor() {
    this.socket = null;
    this.currentBookingId = null;
    this.currentUserId = null;
    this.currentAstrologerId = null;
    this.messageCallbacks = new Set();
    this.statusCallbacks = new Set();
    this.connectionCallbacks = new Set();
    this.typingCallbacks = new Set();
    this.messageQueue = []; // Initialize message queue array
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000; // 30 seconds max delay
    this.roomJoined = false;
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.connectionStabilityTimer = null;
    
    // Bind methods
    this.handleAppStateChange = this.handleAppStateChange.bind(this);
    this.handleConnect = this.handleConnect.bind(this);
    this.handleDisconnect = this.handleDisconnect.bind(this);
    this.handleConnectError = this.handleConnectError.bind(this);
    this.handleReconnect = this.handleReconnect.bind(this);
    
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Initialize connection with booking details
   */
  async initialize(bookingId, userId, astrologerId) {
    console.log('[ChatConnectionManager] Initializing with:', { bookingId, userId, astrologerId });
    
    this.currentBookingId = bookingId;
    this.currentUserId = userId;
    this.currentAstrologerId = astrologerId;
    
    await this.connect();
  }

  /**
   * Connect to socket server
   */
  async connect() {
    if (this.isConnecting || this.isConnected) {
      console.log('[ChatConnectionManager] Already connecting or connected');
      return;
    }

    try {
      this.isConnecting = true;
      this.notifyConnectionStatus('connecting');

      console.log('[ChatConnectionManager] Using global socket from socketService');
      
      // Get the global socket instance from socketService
      this.socket = await getSocket();
      
      if (!this.socket) {
        throw new Error('Failed to get global socket instance');
      }
      
      console.log('[ChatConnectionManager] Got global socket instance:', this.socket.id);
      
      // Check if socket is already connected
      if (this.socket.connected) {
        console.log('[ChatConnectionManager] Socket already connected');
        this.handleConnect();
      } else {
        console.log('[ChatConnectionManager] Socket not connected, waiting for connection');
        // Set up event listeners and wait for connection
        this.setupEventListeners();
      }

    } catch (error) {
      console.error('[ChatConnectionManager] Connection failed:', error);
      this.isConnecting = false;
      this.notifyConnectionStatus('error', error.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Set up socket event listeners
   */
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
    this.socket.on('reconnect', this.handleReconnect);

    // Chat-specific events - Optimized for instant delivery
    this.socket.on('receive_message', (message) => {
      const receiveTime = Date.now();
      console.log('🔴 [USER-APP] Received message event at:', receiveTime, message);
      
      // Fast path: Pre-compute expected roomId to avoid repeated string concatenation
      const expectedRoomId = `room:${this.currentBookingId}`;
      
      // Quick roomId validation
      if (message.roomId !== expectedRoomId && message.roomId !== this.currentBookingId) {
        console.log('🔴 [USER-APP] Message rejected - roomId mismatch');
        return;
      }
      
      console.log('🔴 [USER-APP] Message accepted, processing immediately');
      
      // Streamlined message normalization - avoid object spread for performance
      const normalizedMessage = {
        id: message.id || message.messageId || `msg_${receiveTime}`,
        text: message.content || message.text || message.message,
        content: message.content || message.text || message.message,
        senderId: message.senderId || message.sender,
        senderName: message.senderName || 'Astrologer',
        timestamp: message.timestamp || new Date().toISOString(),
        status: 'received',
        roomId: message.roomId,
        bookingId: message.bookingId
      };
      
      // Immediate callback notification - use setImmediate for fastest possible execution
      setImmediate(() => {
        const processTime = Date.now();
        console.log('🔴 [USER-APP] Message processed in:', processTime - receiveTime, 'ms');
        this.notifyMessage(normalizedMessage);
      });
    });

    this.socket.on('typing_started', (data) => {
      console.log('🔴 [USER-APP] ChatConnectionManager: Received typing_started event:', data);
      console.log('🔴 [USER-APP] ChatConnectionManager: Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] ChatConnectionManager: Event booking ID:', data.bookingId);
      
      if (data.bookingId === this.currentBookingId) {
        console.log('🔴 [USER-APP] ChatConnectionManager: Booking ID matches, notifying typing callbacks');
        this.notifyTyping(true, data);
      } else {
        console.log('🔴 [USER-APP] ChatConnectionManager: Booking ID mismatch, ignoring typing event');
      }
    });

    this.socket.on('typing_stopped', (data) => {
      console.log('🔴 [USER-APP] ChatConnectionManager: Received typing_stopped event:', data);
      console.log('🔴 [USER-APP] ChatConnectionManager: Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] ChatConnectionManager: Event booking ID:', data.bookingId);
      
      if (data.bookingId === this.currentBookingId) {
        console.log('🔴 [USER-APP] ChatConnectionManager: Booking ID matches, notifying typing callbacks');
        this.notifyTyping(false, data);
      } else {
        console.log('🔴 [USER-APP] ChatConnectionManager: Booking ID mismatch, ignoring typing event');
      }
    });

    // Consultation room events (matching video/voice consultation flow)
    this.socket.on('user_joined_consultation', (data) => {
      console.log('[ChatConnectionManager] User joined consultation:', data);
      if (data.bookingId === this.currentBookingId) {
        this.notifyConnectionStatus('user_joined', 'You joined the consultation');
      }
    });

    this.socket.on('astrologer_joined_consultation', (data) => {
      console.log('[ChatConnectionManager] Astrologer joined consultation:', data);
      if (data.bookingId === this.currentBookingId) {
        this.notifyConnectionStatus('astrologer_joined', 'Astrologer joined the consultation');
        this.notifyStatusUpdate({ type: 'astrologer_joined', data });
      }
    });

    this.socket.on('session_started', (data) => {
      console.log('🔴 [USER-APP] Session started event received:', data);
      console.log('🔴 [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] Event booking ID:', data.bookingId);
      console.log('🔴 [USER-APP] Booking IDs match:', data.bookingId === this.currentBookingId);
      
      if (data.bookingId === this.currentBookingId) {
        console.log('🔴 [USER-APP] Activating session and notifying status update');
        this.notifyConnectionStatus('session_active', 'Chat session is now active');
        this.notifyStatusUpdate({ type: 'session_started', data });
      } else {
        console.log('🔴 [USER-APP] Session started event ignored - booking ID mismatch');
      }
    });

    this.socket.on('session_timer', (data) => {
      console.log('🔴 [USER-APP] Session timer event received:', data);
      // Backend sends durationSeconds, not seconds
      const timerValue = data.durationSeconds || data.seconds || 0;
      console.log('🔴 [USER-APP] Timer value extracted:', timerValue);
      this.notifyStatusUpdate({ type: 'timer', durationSeconds: timerValue, seconds: timerValue });
    });

    this.socket.on('session_ended', (data) => {
      console.log('[ChatConnectionManager] Session ended:', data);
      if (data.bookingId === this.currentBookingId) {
        this.notifyConnectionStatus('session_ended', 'Chat session has ended');
        this.notifyStatusUpdate({ type: 'session_ended', data });
      }
    });

    this.socket.on('consultation_ended', (data) => {
      console.log('🔴 [USER-APP] Consultation ended event received:', data);
      console.log('🔴 [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] Event booking ID:', data.bookingId);
      
      if (data.bookingId === this.currentBookingId) {
        console.log('🔴 [USER-APP] Processing consultation end - ended by:', data.endedBy);
        this.notifyConnectionStatus('consultation_ended', `Session ended by ${data.endedBy}`);
        this.notifyStatusUpdate({ 
          type: 'consultation_ended', 
          data,
          endedBy: data.endedBy,
          sessionData: data.sessionData
        });
      } else {
        console.log('🔴 [USER-APP] Consultation ended event ignored - booking ID mismatch');
      }
    });

    // Note: booking_status_update events are handled by global socketService for popups
    // ChatConnectionManager focuses only on chat-specific events

    this.socket.on('message_status_update', (data) => {
      if (data.bookingId === this.currentBookingId) {
        this.notifyStatusUpdate(data);
      }
    });

    this.socket.on('session_timer', (data) => {
      this.notifyStatusUpdate({ type: 'timer', ...data });
    });

    this.socket.on('session_end', (data) => {
      if (data.bookingId === this.currentBookingId) {
        this.notifyStatusUpdate({ type: 'session_end', ...data });
      }
    });

    // Voice call failure notification - Global handler (works regardless of current screen)
    this.socket.on('call_failure_notification', (data) => {
      console.log('🔴 [USER-APP] Call failure notification received:', data);
      console.log('🔴 [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] Event booking ID:', data.bookingId);
      

      
      // Show global alert regardless of current screen or booking context
      console.log('🔴 [USER-APP] Showing global call failure alert');
      Alert.alert(
        data.title || 'Call Failed',
        data.message || 'The voice call could not be completed.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔴 [USER-APP] User acknowledged call failure notification');
            }
          }
        ],
        { cancelable: false }
      );
      
      // Also notify status update if there's an active booking context
      if (data.bookingId === this.currentBookingId) {
        console.log('🔴 [USER-APP] Also sending status update for active booking');
        this.notifyStatusUpdate({ 
          type: 'call_failure', 
          data,
          title: data.title,
          message: data.message,
          failureReason: data.failureReason
        });
      }
    });
  }

  /**
   * Handle successful connection
   */
  handleConnect() {
    console.log('🔴 [USER-APP] ChatConnectionManager: Socket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = Date.now();
    this.roomJoined = false; // Reset room joined status
    this.notifyConnectionStatus('connected', 'Connected to chat server');
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    // Join room if we have booking details and flush queued messages
    if (this.currentBookingId && this.currentUserId) {
      this.joinRoom();
    }
    this.flushMessageQueue();
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(reason) {
    console.log('🔴 [USER-APP] ChatConnectionManager: Socket disconnected:', reason);
    this.isConnected = false;
    this.roomJoined = false;
    this.stopHeartbeat(); // Stop heartbeat on disconnect
    this.notifyConnectionStatus('disconnected', `Disconnected: ${reason}`);
    
    // Attempt reconnection if not manually disconnected
    if (reason !== 'io client disconnect') {
      console.log('🔴 [USER-APP] Attempting automatic reconnection due to:', reason);
      this.handleReconnection();
    }
  }

  /**
   * Handle connection error
   */
  handleConnectError(error) {
    console.error('[ChatConnectionManager] Connection error:', error);
    this.isConnecting = false;
    this.notifyConnectionStatus('error', error.message);
    this.scheduleReconnect();
  }

  /**
   * Handle successful reconnection
   */
  handleReconnect() {
    console.log('[ChatConnectionManager] Reconnected successfully');
    this.handleConnect();
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[ChatConnectionManager] Max reconnection attempts reached');
      this.notifyConnectionStatus('failed', 'Maximum reconnection attempts exceeded');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    console.log(`[ChatConnectionManager] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    this.notifyConnectionStatus('reconnecting', `Reconnecting in ${Math.ceil(delay / 1000)}s...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Handle app state changes
   */
  handleAppStateChange(nextAppState) {
    console.log('[ChatConnectionManager] App state changed:', this.appState, '->', nextAppState);
    
    if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (!this.isConnected && !this.isConnecting) {
        console.log('[ChatConnectionManager] App foregrounded, reconnecting...');
        this.connect();
      }
    } else if (nextAppState === 'background') {
      // App went to background - don't disconnect but stop reconnection attempts
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
    
    this.appState = nextAppState;
  }

  /**
   * Join chat room
   */
  joinRoom() {
    try {
      console.log('[ChatConnectionManager] DEBUG: Starting joinRoom method');
      console.log('[ChatConnectionManager] DEBUG: isConnected:', this.isConnected);
      console.log('[ChatConnectionManager] DEBUG: socket exists:', !!this.socket);
      console.log('[ChatConnectionManager] DEBUG: currentBookingId:', this.currentBookingId);
      
      if (this.isConnected && this.socket && this.currentBookingId) {
        console.log('[ChatConnectionManager] Joining consultation room:', this.currentBookingId);
        
        // Construct roomId in the format expected by backend
        const roomId = `room:${this.currentBookingId}`;
        console.log('[ChatConnectionManager] DEBUG: Constructed roomId:', roomId);
        
        // Use the same join_consultation_room event as video/voice consultations
        const joinData = {
          bookingId: this.currentBookingId,
          roomId: roomId,
          sessionId: this.currentBookingId, // Use bookingId as sessionId for chat
          userId: this.currentUserId,
          userType: 'user',
          consultationType: 'chat'
        };
        
        console.log('[ChatConnectionManager] DEBUG: About to emit join_consultation_room with data:', joinData);
        this.socket.emit('join_consultation_room', joinData);
        console.log('[ChatConnectionManager] DEBUG: Successfully emitted join_consultation_room');
        
        console.log('[ChatConnectionManager] DEBUG: About to call notifyConnectionStatus');
        this.notifyConnectionStatus('joining', 'Joining consultation room...');
        console.log('[ChatConnectionManager] DEBUG: Successfully called notifyConnectionStatus');
      } else {
        console.warn('[ChatConnectionManager] Cannot join room - not connected or missing booking ID');
        console.warn('[ChatConnectionManager] DEBUG: isConnected:', this.isConnected, 'socket:', !!this.socket, 'bookingId:', this.currentBookingId);
      }
      
      console.log('[ChatConnectionManager] DEBUG: joinRoom method completed successfully');
    } catch (error) {
      console.error('[ChatConnectionManager] ERROR in joinRoom method:', error);
      console.error('[ChatConnectionManager] ERROR stack:', error.stack);
      throw error; // Re-throw to see where it's caught
    }
  }

  /**
   * Send message with queuing support
   */
  sendMessage(messageData) {
    if (this.isConnected && this.socket) {
      this.socket.emit('send_message', messageData);
      console.log('[ChatConnectionManager] Message sent:', messageData.id);
    } else {
      // Queue message for later sending
      this.messageQueue.push(messageData);
      console.log('[ChatConnectionManager] Message queued:', messageData.id);
      this.notifyConnectionStatus('queued', 'Message queued - will send when reconnected');
    }
  }

  /**
   * Send typing status
   */
  sendTypingStatus(isTyping) {
    if (this.isConnected && this.socket) {
      this.socket.emit(isTyping ? 'typing_started' : 'typing_stopped', {
        bookingId: this.currentBookingId,
        userId: this.currentUserId
      });
      console.log(`[ChatConnectionManager] Sent ${isTyping ? 'typing_started' : 'typing_stopped'} event for booking ${this.currentBookingId}`);
    }
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId) {
    if (this.isConnected && this.socket) {
      this.socket.emit('message_read', {
        bookingId: this.currentBookingId,
        messageId
      });
    }
  }

  /**
   * Flush queued messages
   */
  flushMessageQueue() {
    if (this.messageQueue.length > 0 && this.isConnected && this.socket) {
      console.log(`[ChatConnectionManager] Flushing ${this.messageQueue.length} queued messages`);
      
      this.messageQueue.forEach(messageData => {
        this.socket.emit('send_message', messageData);
      });
      
      this.messageQueue = [];
      this.notifyConnectionStatus('flushed', 'Queued messages sent');
    }
  }

  /**
   * Add connection status callback
   */
  onConnectionStatus(callback) {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * Add message callback
   */
  onMessage(callback) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Add typing callback
   */
  onTyping(callback) {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  /**
   * Add status update callback
   */
  onStatusUpdate(callback) {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Notify connection status
   */
  notifyConnectionStatus(status, message = '') {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback({ status, message, isConnected: this.isConnected, isConnecting: this.isConnecting });
      } catch (error) {
        console.error('[ChatConnectionManager] Error in connection callback:', error);
      }
    });
  }

  /**
   * Start heartbeat mechanism to maintain connection stability
   */
  startHeartbeat() {
    console.log('🔴 [USER-APP] Starting heartbeat mechanism');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
        this.lastHeartbeat = Date.now();
      } else {
        console.log('🔴 [USER-APP] Socket disconnected during heartbeat - attempting reconnection');
        this.handleReconnection();
      }
    }, 5000); // Send heartbeat every 5 seconds
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    console.log('🔴 [USER-APP] Stopping heartbeat mechanism');
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle reconnection logic
   */
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔴 [USER-APP] Max reconnection attempts reached');
      this.notifyConnectionStatus('error', 'Connection lost - please refresh');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔴 [USER-APP] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (this.currentBookingId && this.currentUserId) {
        this.initialize(this.currentBookingId, this.currentUserId, this.currentAstrologerId);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Notify new message - Optimized for instant delivery
   */
  notifyMessage(message) {
    const callbackTime = Date.now();
    console.log('🔴 [USER-APP] Notifying message callbacks at:', callbackTime);
    
    // Convert Set to Array once for better performance
    const callbacks = Array.from(this.messageCallbacks);
    
    // Use for loop instead of forEach for better performance
    for (let i = 0; i < callbacks.length; i++) {
      try {
        // Call each callback immediately without any delays
        callbacks[i](message);
      } catch (error) {
        console.error('[ChatConnectionManager] Error in message callback:', error);
      }
    }
    
    const endTime = Date.now();
    console.log('🔴 [USER-APP] All message callbacks completed in:', endTime - callbackTime, 'ms');
  }

  /**
   * Notify typing status
   */
  notifyTyping(isTyping, data) {
    console.log('🔴 [USER-APP] ChatConnectionManager: notifyTyping called with:', { isTyping, data });
    console.log('🔴 [USER-APP] ChatConnectionManager: Number of typing callbacks:', this.typingCallbacks.length);
    
    this.typingCallbacks.forEach((callback, index) => {
      try {
        console.log(`🔴 [USER-APP] ChatConnectionManager: Calling typing callback ${index + 1}`);
        callback(isTyping, data);
        console.log(`🔴 [USER-APP] ChatConnectionManager: Typing callback ${index + 1} executed successfully`);
      } catch (error) {
        console.error(`[ChatConnectionManager] Error in typing callback ${index + 1}:`, error);
      }
    });
  }

  /**
   * Notify status update
   */
  notifyStatusUpdate(data) {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[ChatConnectionManager] Error in status callback:', error);
      }
    });
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('🔴 [USER-APP] ChatConnectionManager: Disconnecting...');
    
    // Stop heartbeat mechanism
    this.stopHeartbeat();
    
    // Stop connection stability timer
    if (this.connectionStabilityTimer) {
      clearInterval(this.connectionStabilityTimer);
      this.connectionStabilityTimer = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.roomJoined = false;
    this.currentBookingId = null;
    this.currentUserId = null;
    this.currentAstrologerId = null;
    this.reconnectAttempts = 0;
    
    // Clear callbacks
    this.messageCallbacks.clear();
    this.statusCallbacks.clear();
    this.connectionCallbacks.clear();
    this.typingCallbacks.clear();
    
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.notifyConnectionStatus('disconnected', 'Manually disconnected');
  }

  /**
   * Start session timer
   * @param {string} sessionId - Session ID
   */
  startSessionTimer(sessionId) {
    if (this.isConnected && this.socket) {
      console.log('🔴 [USER-APP] Starting session timer for sessionId:', sessionId);
      this.socket.emit('start_session_timer', {
        bookingId: this.currentBookingId,
        sessionId
      });
    } else {
      console.warn('🔴 [USER-APP] Cannot start session timer - not connected');
    }
  }

  /**
   * End session
   * @param {string} sessionId - Session ID
   */
  endSession(sessionId) {
    if (this.isConnected && this.socket) {
      console.log('🔴 [USER-APP] Ending session for sessionId:', sessionId);
      this.socket.emit('end_session', {
        bookingId: this.currentBookingId,
        sessionId
      });
    } else {
      console.warn('🔴 [USER-APP] Cannot end session - not connected');
    }
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      appState: this.appState
    };
  }
}

export default ChatConnectionManager;
