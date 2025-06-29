import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

/**
 * Enhanced Chat Connection Manager
 * Handles robust socket connections with reconnection logic, message queuing, and app state management
 */
class ChatConnectionManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.reconnectTimer = null;
    this.messageQueue = [];
    this.appState = AppState.currentState;
    this.connectionCallbacks = new Set();
    this.messageCallbacks = new Set();
    this.typingCallbacks = new Set();
    this.statusCallbacks = new Set();
    this.currentBookingId = null;
    this.currentUserId = null;
    this.currentAstrologerId = null;
    
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

      // Get authentication token
      const userToken = await AsyncStorage.getItem('userToken');
      if (!userToken) {
        throw new Error('No authentication token found');
      }

      // Socket configuration
      const socketUrl = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
      const socketOptions = {
        query: {
          userId: this.currentUserId,
          astrologerId: this.currentAstrologerId,
          bookingId: this.currentBookingId,
          sessionType: 'chat',
        },
        auth: {
          token: userToken,
          id: this.currentUserId,
          role: 'user'
        },
        path: '/ws',
        reconnection: false, // We'll handle reconnection manually
        timeout: 10000,
        transports: ['websocket', 'polling']
      };

      console.log('[ChatConnectionManager] Connecting to:', socketUrl);
      this.socket = io(socketUrl, socketOptions);

      // Set up event listeners
      this.setupEventListeners();

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

    // Chat-specific events
    this.socket.on('receive_message', (message) => {
      console.log('🔴 [USER-APP] Received message event:', message);
      console.log('🔴 [USER-APP] Message roomId:', message.roomId);
      console.log('🔴 [USER-APP] Expected roomId:', `room:${this.currentBookingId}`);
      
      // Backend sends roomId as 'room:bookingId', so check both formats
      const expectedRoomId = `room:${this.currentBookingId}`;
      if (message.roomId === expectedRoomId || message.roomId === this.currentBookingId) {
        console.log('🔴 [USER-APP] Message accepted, normalizing fields');
        
        // Normalize message fields to ensure compatibility
        const normalizedMessage = {
          ...message,
          id: message.id || message.messageId || `msg_${Date.now()}`,
          text: message.content || message.text || message.message,
          content: message.content || message.text || message.message,
          senderId: message.senderId || message.sender,
          senderName: message.senderName || 'Astrologer',
          timestamp: message.timestamp || new Date().toISOString(),
          status: 'received'
        };
        
        console.log('🔴 [USER-APP] Normalized message:', normalizedMessage);
        this.notifyMessage(normalizedMessage);
      } else {
        console.log('🔴 [USER-APP] Message rejected - roomId mismatch');
      }
    });

    this.socket.on('typing_started', (data) => {
      if (data.bookingId === this.currentBookingId) {
        this.notifyTyping(true, data);
      }
    });

    this.socket.on('typing_stopped', (data) => {
      if (data.bookingId === this.currentBookingId) {
        this.notifyTyping(false, data);
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

    // Status update events
    this.socket.on('booking_status_update', (data) => {
      console.log('[ChatConnectionManager] Booking status update:', data);
      if (data.bookingId === this.currentBookingId) {
        this.notifyStatusUpdate({ type: 'booking_update', data });
      }
    });

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
  }

  /**
   * Handle successful connection
   */
  handleConnect() {
    console.log('[ChatConnectionManager] Connected successfully');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000; // Reset delay
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.notifyConnectionStatus('connected');

    // Join room and flush queued messages
    this.joinRoom();
    this.flushMessageQueue();
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(reason) {
    console.log('[ChatConnectionManager] Disconnected:', reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.notifyConnectionStatus('disconnected', reason);

    // Only attempt reconnection for certain disconnect reasons
    if (reason !== 'io client disconnect' && this.appState === 'active') {
      this.scheduleReconnect();
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
    if (this.isConnected && this.socket && this.currentBookingId) {
      console.log('[ChatConnectionManager] Joining consultation room:', this.currentBookingId);
      
      // Construct roomId in the format expected by backend
      const roomId = `room:${this.currentBookingId}`;
      
      // Use the same join_consultation_room event as video/voice consultations
      this.socket.emit('join_consultation_room', {
        bookingId: this.currentBookingId,
        roomId: roomId,
        sessionId: this.currentBookingId, // Use bookingId as sessionId for chat
        userId: this.currentUserId,
        userType: 'user',
        consultationType: 'chat'
      });
      
      this.notifyConnectionStatus('joining', 'Joining consultation room...');
    } else {
      console.warn('[ChatConnectionManager] Cannot join room - not connected or missing booking ID');
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
      this.socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
        bookingId: this.currentBookingId,
        userId: this.currentUserId
      });
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
   * Notify new message
   */
  notifyMessage(message) {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[ChatConnectionManager] Error in message callback:', error);
      }
    });
  }

  /**
   * Notify typing status
   */
  notifyTyping(isTyping, data) {
    this.typingCallbacks.forEach(callback => {
      try {
        callback(isTyping, data);
      } catch (error) {
        console.error('[ChatConnectionManager] Error in typing callback:', error);
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
    console.log('[ChatConnectionManager] Disconnecting...');
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Clear all callbacks
    this.connectionCallbacks.clear();
    this.messageCallbacks.clear();
    this.typingCallbacks.clear();
    this.statusCallbacks.clear();

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
