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
   * Handle app state changes to maintain timer continuity
   */
  handleAppStateChange(nextAppState) {
    console.log('[ChatConnectionManager] App state changed:', this.appState, '->', nextAppState);
    
    const previousAppState = this.appState;
    this.appState = nextAppState;
    
    if (previousAppState === 'background' && nextAppState === 'active') {
      console.log('[ChatConnectionManager] App returned to foreground - checking session state');
      this.handleAppForeground();
    } else if (nextAppState === 'background') {
      console.log('[ChatConnectionManager] App went to background - preserving session state');
      this.handleAppBackground();
    }
  }

  /**
   * Handle app coming to foreground
   */
  async handleAppForeground() {
    try {
      console.log('[ChatConnectionManager] Handling app foreground transition');
      
      // Check if we have an active session
      if (this.currentBookingId && this.isConnected) {
        console.log('[ChatConnectionManager] Active session detected, requesting timer sync');
        
        // Request current session state from backend
        if (this.socket && this.socket.connected) {
          this.socket.emit('request_session_state', {
            bookingId: this.currentBookingId,
            sessionId: this.sessionId,
            isFreeChat: this.isFreeChat,
            freeChatId: this.isFreeChat ? this.currentBookingId : null
          });
        }
        
        // Rejoin room if needed
        await this.rejoinRoomIfNeeded();
      }
    } catch (error) {
      console.error('[ChatConnectionManager] Error handling app foreground:', error);
    }
  }

  /**
   * Handle app going to background
   */
  handleAppBackground() {
    console.log('[ChatConnectionManager] Handling app background transition');
    
    // Store current session state
    if (this.currentBookingId) {
      this.preservedState = {
        bookingId: this.currentBookingId,
        sessionId: this.sessionId,
        astrologerId: this.currentAstrologerId,
        userId: this.currentUserId,
        isFreeChat: this.isFreeChat,
        timestamp: Date.now()
      };
      console.log('[ChatConnectionManager] Session state preserved for background');
    }
  }

  /**
   * Rejoin room if connection was lost
   */
  async rejoinRoomIfNeeded() {
    try {
      if (!this.socket || !this.socket.connected) {
        console.log('[ChatConnectionManager] Socket not connected, cannot rejoin room');
        return;
      }
      
      console.log('[ChatConnectionManager] Checking if room rejoin is needed');
      
      if (this.isFreeChat) {
        console.log('[ChatConnectionManager] Rejoining free chat room:', this.currentBookingId);
        this.socket.emit('join_free_chat_room', {
          freeChatId: this.currentBookingId,
          sessionId: this.sessionId,
          userId: this.currentUserId,
          userType: 'user'
        });
      } else if (this.currentBookingId) {
        console.log('[ChatConnectionManager] Rejoining consultation room:', this.currentBookingId);
        this.socket.emit('join_consultation_room', {
          bookingId: this.currentBookingId,
          userId: this.currentUserId,
          astrologerId: this.currentAstrologerId
        });
      }
    } catch (error) {
      console.error('[ChatConnectionManager] Error rejoining room:', error);
    }
  }

  /**
   * Initialize connection manager
   */
  async initialize(astrologerId, options = {}) {
    try {
      console.log('[ChatConnectionManager] Initializing with:', {
        astrologerId,
        bookingId: this.currentBookingId,
        userId: this.currentUserId,
        isFreeChat: options.isFreeChat
      });
      
      // Store free chat flag for room joining logic
      this.isFreeChat = options.isFreeChat || false;
      this.sessionId = options.sessionId || this.currentBookingId;
      this.currentAstrologerId = astrologerId;
      
      await this.connect();
    } catch (error) {
      console.error('[ChatConnectionManager] Initialization failed:', error);
    }
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
      
      // CRITICAL FIX: Always set up event listeners first
      console.log('[ChatConnectionManager] Setting up event listeners');
      this.setupEventListeners();
      
      // Check if socket is already connected
      if (this.socket.connected) {
        console.log('[ChatConnectionManager] Socket already connected');
        this.handleConnect();
      } else {
        console.log('[ChatConnectionManager] Socket not connected, waiting for connection');
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
    if (!this.socket) {
      console.log('🔴 [USER-APP] setupEventListeners: No socket available');
      return;
    }

    console.log('🔴 [USER-APP] setupEventListeners: Setting up event listeners for socket:', this.socket.id);
    console.log('🔴 [USER-APP] Socket connected status:', this.socket.connected);

    this.socket.on('connect', this.handleConnect);
    this.socket.on('disconnect', this.handleDisconnect);
    this.socket.on('connect_error', this.handleConnectError);
    this.socket.on('reconnect', this.handleReconnect);

    // Chat-specific events - Unified message handler for both regular and free chat
    this.socket.on('receive_message', (message) => {
      const receiveTime = Date.now();
      console.log('🔴 [USER-APP] Received message event at:', receiveTime, message);
      
      // Room validation for both regular chat and free chat
      let messageAccepted = false;
      
      if (this.isFreeChat) {
        // For free chat, check free chat room format
        const expectedFreeChatRoom = `free_chat:${this.currentBookingId}`;
        if (message.roomId === expectedFreeChatRoom || message.roomId === this.currentBookingId) {
          messageAccepted = true;
        }
      } else {
        // For regular booking, check consultation room format
        const expectedBookingRoom = `consultation:${this.currentBookingId}`;
        if (message.roomId === expectedBookingRoom || message.roomId === this.currentBookingId) {
          messageAccepted = true;
        }
      }
      
      if (!messageAccepted) {
        console.log('🔴 [USER-APP] Message rejected - roomId mismatch. Expected:', this.isFreeChat ? `free_chat:${this.currentBookingId}` : `consultation:${this.currentBookingId}`, 'Got:', message.roomId);
        return;
      }
      
      console.log('🔴 [USER-APP] Message accepted, processing immediately');
      
      // Streamlined message normalization - avoid object spread for performance
      const normalizedMessage = {
        id: message.messageId || message.id || `msg_${receiveTime}`,
        text: message.content || message.text || message.message,
        content: message.content || message.text || message.message,
        sender: message.senderRole === 'user' ? 'user' : 'astrologer',
        senderId: message.sender || message.senderId,
        senderName: message.senderName || (message.senderRole === 'user' ? 'You' : 'Astrologer'),
        senderRole: message.senderRole,
        timestamp: message.timestamp || new Date().toISOString(),
        status: 'delivered',
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

    // Free chat room joined confirmation
    this.socket.on('free_chat_room_joined', (data) => {
      console.log('🏠 [USER-APP] [FREE_CHAT] Room joined confirmation:', data);
      console.log('🏠 [USER-APP] [FREE_CHAT] Current booking ID:', this.currentBookingId);
      console.log('🏠 [USER-APP] [FREE_CHAT] Event freeChatId:', data.freeChatId);
      
      if (data.freeChatId === this.currentBookingId) {
        console.log('🏠 [USER-APP] [FREE_CHAT] ✅ Successfully joined free chat room');
        this.roomJoined = true;
        this.notifyConnectionStatus('connected', 'Joined free chat room successfully');
        this.notifyStatusUpdate({ type: 'room_joined', data });
      } else {
        console.log('🏠 [USER-APP] [FREE_CHAT] ❌ Room joined for different free chat - ignoring');
      }
    });
    
    // Free chat room join error
    this.socket.on('room_join_error', (data) => {
      console.log('❌ [USER-APP] [FREE_CHAT] Room join error:', data);
      this.notifyConnectionStatus('error', data.message || 'Failed to join free chat room');
    });

    // NOTE: receive_message handler is now unified above in setupEventListeners

    this.socket.on('session_started', (data) => {
      console.log('🔴 [USER-APP] ===== SESSION_STARTED EVENT RECEIVED =====');
      console.log('🔴 [USER-APP] Session started event received:', JSON.stringify(data, null, 2));
      console.log('🔴 [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] Event booking ID:', data.bookingId);
      console.log('🔴 [USER-APP] Booking ID types:', typeof this.currentBookingId, 'vs', typeof data.bookingId);
      console.log('🔴 [USER-APP] Booking IDs match (===):', data.bookingId === this.currentBookingId);
      console.log('🔴 [USER-APP] Booking IDs match (==):', data.bookingId == this.currentBookingId);
      
      if (data.bookingId === this.currentBookingId || data.bookingId == this.currentBookingId) {
        console.log('🔴 [USER-APP] ✅ BOOKING ID MATCH - Activating session and notifying status update');
        this.notifyConnectionStatus('session_active', 'Chat session is now active');
        this.notifyStatusUpdate({ type: 'session_started', data });
      } else {
        console.log('🔴 [USER-APP] ❌ BOOKING ID MISMATCH - Session started event ignored');
        console.log('🔴 [USER-APP] Expected:', this.currentBookingId);
        console.log('🔴 [USER-APP] Received:', data.bookingId);
      }
      console.log('🔴 [USER-APP] ===== END SESSION_STARTED EVENT =====');
    });
    
    console.log('🔴 [USER-APP] session_started event listener registered successfully');
    // Note: listenerCount not available in React Native socket.io client
    console.log('🔴 [USER-APP] Event listeners setup completed');

    // New session timer events from backend
    this.socket.on('session_timer_started', (data) => {
      console.log('🔴 [USER-APP] Session timer started event received:', data);
      console.log('🔴 [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] Event booking ID:', data.bookingId);
      
      if (data.bookingId === this.currentBookingId || data.bookingId == this.currentBookingId) {
        console.log('🔴 [USER-APP] ✅ Timer started for current booking - activating session');
        this.notifyConnectionStatus('session_active', 'Session timer started');
        this.notifyStatusUpdate({ 
          type: 'session_started', 
          data,
          sessionId: data.sessionId,
          duration: data.duration || 0
        });
      } else {
        console.log('🔴 [USER-APP] ❌ Timer started for different booking - ignoring');
      }
    });

    this.socket.on('session_timer_update', (data) => {
      console.log('🔴 [USER-APP] Session timer update received:', data);
      console.log('🔴 [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('🔴 [USER-APP] Event booking ID:', data.bookingId);
      
      if (data.bookingId === this.currentBookingId || data.bookingId == this.currentBookingId) {
        console.log('🔴 [USER-APP] ✅ Timer update for current booking:', data.formattedTime);
        this.notifyStatusUpdate({ 
          type: 'timer', 
          durationSeconds: data.duration,
          seconds: data.duration,
          formattedTime: data.formattedTime,
          sessionId: data.sessionId
        });
      } else {
        console.log('🔴 [USER-APP] ❌ Timer update for different booking - ignoring');
      }
    });

    // Session timer event (main timer event from backend)
    this.socket.on('session_timer', (data) => {
      console.log('⏰ [USER-APP] Session timer event received:', data);
      console.log('⏰ [USER-APP] Current booking ID:', this.currentBookingId);
      console.log('⏰ [USER-APP] Event booking/freeChatId:', data.bookingId || data.freeChatId);
      
      // Check if this timer event is for the current session
      const eventId = data.bookingId || data.freeChatId;
      if (eventId === this.currentBookingId || eventId == this.currentBookingId) {
        console.log('⏰ [USER-APP] ✅ Timer update for current session');
        
        // Extract timer values from backend data
        const timerValue = data.durationSeconds || data.seconds || 0;
        const timeRemaining = data.timeRemaining || 0;
        const currentAmount = data.currentAmount || 0;
        
        console.log('⏰ [USER-APP] Timer values:', {
          durationSeconds: timerValue,
          timeRemaining,
          currentAmount
        });
        
        this.notifyStatusUpdate({ 
          type: 'timer', 
          durationSeconds: timerValue,
          seconds: timerValue,
          timeRemaining,
          currentAmount,
          sessionId: data.sessionId,
          freeChatId: data.freeChatId,
          isFreeChat: data.freeChatId ? true : false
        });
      } else {
        console.log('⏰ [USER-APP] ❌ Timer update for different session - ignoring');
      }
    });

    // Session state response handler for app state synchronization
    this.socket.on('session_state_response', (data) => {
      console.log('🔄 [USER-APP] Session state response received:', data);
      
      if (data.success && data.sessionState) {
        const sessionState = data.sessionState;
        console.log('🔄 [USER-APP] Synchronizing session state:', sessionState);
        
        // Update timer if session is active
        if (sessionState.isActive && sessionState.timer) {
          console.log('🔄 [USER-APP] Restoring timer state:', sessionState.timer);
          this.notifyStatusUpdate({
            type: 'timer',
            durationSeconds: sessionState.timer.duration,
            seconds: sessionState.timer.duration,
            formattedTime: sessionState.timer.formattedTime,
            currentAmount: sessionState.timer.currentAmount,
            sessionId: sessionState.sessionId
          });
        }
        
        // Update session status
        if (sessionState.isActive) {
          this.notifyStatusUpdate({
            type: 'session_started',
            data: sessionState,
            sessionId: sessionState.sessionId
          });
        }
      } else {
        console.log('🔄 [USER-APP] No active session state found');
      }
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
    this.isConnecting = false; // Critical fix: Reset isConnecting flag
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
    
    if (this.appState && this.appState.match(/inactive|background/) && nextAppState === 'active') {
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
      console.log('[ChatConnectionManager] DEBUG: isFreeChat:', this.isFreeChat);
      console.log('[ChatConnectionManager] DEBUG: sessionId:', this.sessionId);
      
      if (this.isConnected && this.socket && this.currentBookingId) {
        if (this.isFreeChat) {
          // For free chat, join using free chat specific room logic
          console.log('[ChatConnectionManager] Joining free chat room:', this.currentBookingId);
          
          const joinData = {
            freeChatId: this.currentBookingId,
            sessionId: this.sessionId,
            userId: this.currentUserId,
            userType: 'user'
          };
          
          console.log('[ChatConnectionManager] DEBUG: About to emit join_free_chat_room with data:', joinData);
          this.socket.emit('join_free_chat_room', joinData);
          console.log('[ChatConnectionManager] DEBUG: Successfully emitted join_free_chat_room');
          
          this.notifyConnectionStatus('joining', 'Joining free chat room...');
        } else {
          // For regular bookings, use consultation room logic
          console.log('[ChatConnectionManager] Joining consultation room:', this.currentBookingId);
          
          // Construct roomId in the format expected by backend
          const roomId = `consultation:${this.currentBookingId}`;
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
          
          this.notifyConnectionStatus('joining', 'Joining consultation room...');
        }
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
   * End the current session
   */
  endSession(sessionId) {
    if (this.isConnected && this.socket) {
      console.log(' [USER-APP] Ending session for sessionId:', sessionId);
      console.log(' [USER-APP] Is free chat session:', this.isFreeChat);
      
      if (this.isFreeChat) {
        // For free chat sessions, use end_free_chat event with sessionId
        console.log(' [USER-APP] Ending free chat session with sessionId:', sessionId);
        this.socket.emit('end_free_chat', {
          sessionId: sessionId || this.sessionId
        });
      } else {
        // For regular booking sessions, use end_session event with bookingId
        console.log(' [USER-APP] Ending regular booking session with bookingId:', this.currentBookingId);
        this.socket.emit('end_session', {
          bookingId: this.currentBookingId,
          sessionId
        });
      }
    } else {
      console.warn(' [USER-APP] Cannot end session - not connected');
    }
  }

  /**
   * Handle app state changes (background/foreground)
   */
  handleAppStateChange(nextAppState) {
    console.log('[ChatConnectionManager] App state changed to:', nextAppState);
    
    if (nextAppState === 'active') {
      // App came to foreground - check connection and reconnect if needed
      console.log('[ChatConnectionManager] App became active - checking connection');
      this.handleAppBecameActive();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background - prepare for potential disconnection
      console.log('[ChatConnectionManager] App went to background/inactive');
      this.handleAppWentBackground();
    }
  }

  /**
   * Handle app becoming active (foreground)
   */
  async handleAppBecameActive() {
    try {
      console.log('[ChatConnectionManager] Handling app became active');
      
      // Check if socket is still connected
      if (!this.socket || !this.socket.connected) {
        console.log('[ChatConnectionManager] Socket disconnected - attempting reconnection');
        await this.reconnectAndRestore();
      } else {
        console.log('[ChatConnectionManager] Socket still connected - verifying session state');
        await this.verifySessionState();
      }
    } catch (error) {
      console.error('[ChatConnectionManager] Error handling app became active:', error);
    }
  }

  /**
   * Handle app going to background
   */
  handleAppWentBackground() {
    console.log('[ChatConnectionManager] App went to background - preserving session state');
    // Store current session state for recovery
    this.preserveSessionState();
  }

  /**
   * Reconnect and restore session state
   */
  async reconnectAndRestore() {
    try {
      console.log('[ChatConnectionManager] Starting reconnection and restoration process');
      
      // Reset connection state
      this.isConnected = false;
      this.roomJoined = false;
      
      // Notify UI of reconnection attempt
      this.notifyConnectionStatus('reconnecting', 'Reconnecting to chat...');
      
      // Reconnect socket
      await this.connect();
      
      // Wait a moment for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Restore session state
      await this.restoreSessionState();
      
    } catch (error) {
      console.error('[ChatConnectionManager] Reconnection failed:', error);
      this.notifyConnectionStatus('error', 'Failed to reconnect to chat');
    }
  }

  /**
   * Verify current session state after reconnection
   */
  async verifySessionState() {
    try {
      console.log('[ChatConnectionManager] Verifying session state');
      
      if (!this.roomJoined && this.currentBookingId) {
        console.log('[ChatConnectionManager] Room not joined - rejoining');
        await this.rejoinChatRoom();
      }
      
      // Request session status update from backend
      if (this.socket && this.socket.connected) {
        console.log('[ChatConnectionManager] Requesting session status update');
        this.socket.emit('get_session_status', {
          bookingId: this.currentBookingId,
          sessionId: this.sessionId,
          isFreeChat: this.isFreeChat
        });
      }
      
    } catch (error) {
      console.error('[ChatConnectionManager] Error verifying session state:', error);
    }
  }

  /**
   * Preserve session state before app goes to background
   */
  preserveSessionState() {
    const sessionState = {
      currentBookingId: this.currentBookingId,
      currentUserId: this.currentUserId,
      currentAstrologerId: this.currentAstrologerId,
      sessionId: this.sessionId,
      isFreeChat: this.isFreeChat,
      roomJoined: this.roomJoined,
      isConnected: this.isConnected,
      timestamp: Date.now()
    };
    
    console.log('[ChatConnectionManager] Preserving session state:', sessionState);
    // Store in memory for quick access
    this.preservedSessionState = sessionState;
  }

  /**
   * Restore session state after reconnection
   */
  async restoreSessionState() {
    try {
      console.log('[ChatConnectionManager] Restoring session state');
      
      if (!this.preservedSessionState) {
        console.log('[ChatConnectionManager] No preserved session state found');
        return;
      }
      
      const state = this.preservedSessionState;
      console.log('[ChatConnectionManager] Restoring from state:', state);
      
      // Restore basic properties
      this.currentBookingId = state.currentBookingId;
      this.currentUserId = state.currentUserId;
      this.currentAstrologerId = state.currentAstrologerId;
      this.sessionId = state.sessionId;
      this.isFreeChat = state.isFreeChat;
      
      // Rejoin chat room
      if (this.currentBookingId) {
        await this.rejoinChatRoom();
      }
      
      console.log('[ChatConnectionManager] Session state restored successfully');
      
    } catch (error) {
      console.error('[ChatConnectionManager] Error restoring session state:', error);
    }
  }

  /**
   * Rejoin chat room after reconnection
   */
  async rejoinChatRoom() {
    try {
      console.log('[ChatConnectionManager] Rejoining chat room');
      
      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket not connected');
      }
      
      if (this.isFreeChat) {
        console.log('[ChatConnectionManager] Rejoining free chat room:', this.currentBookingId);
        this.socket.emit('join_free_chat_room', {
          freeChatId: this.currentBookingId,
          userId: this.currentUserId
        });
      } else {
        console.log('[ChatConnectionManager] Rejoining consultation room:', this.currentBookingId);
        this.socket.emit('join_consultation_room', {
          bookingId: this.currentBookingId,
          userId: this.currentUserId,
          astrologerId: this.currentAstrologerId
        });
      }
      
      // Wait for room join confirmation
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Room join timeout'));
        }, 10000); // 10 second timeout
        
        const handleRoomJoined = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        if (this.isFreeChat) {
          this.socket.once('free_chat_room_joined', handleRoomJoined);
        } else {
          this.socket.once('consultation_room_joined', handleRoomJoined);
        }
      });
      
      console.log('[ChatConnectionManager] Successfully rejoined chat room');
      
    } catch (error) {
      console.error('[ChatConnectionManager] Error rejoining chat room:', error);
      throw error;
    }
  }

  /**
   * Handle socket connect event
   */
  handleConnect() {
    console.log('[ChatConnectionManager] Socket connected');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionStatus('connected', 'Connected to chat server');
    
    // Attempt to join room after successful connection
    if (this.currentBookingId) {
      console.log('[ChatConnectionManager] Attempting to join room after connection');
      setTimeout(() => {
        this.joinRoom();
      }, 500); // Small delay to ensure socket is fully established
    }
  }

  /**
   * Handle socket disconnect event
   */
  handleDisconnect(reason) {
    console.log('[ChatConnectionManager] Socket disconnected:', reason);
    this.isConnected = false;
    this.roomJoined = false;
    this.notifyConnectionStatus('disconnected', `Disconnected: ${reason}`);
    
    // Attempt reconnection if not a manual disconnect
    if (reason !== 'io client disconnect') {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle socket connect error
   */
  handleConnectError(error) {
    console.error('[ChatConnectionManager] Connection error:', error);
    this.isConnecting = false;
    this.notifyConnectionStatus('error', `Connection error: ${error.message}`);
    this.scheduleReconnect();
  }

  /**
   * Handle socket reconnect event
   */
  handleReconnect(attemptNumber) {
    console.log('[ChatConnectionManager] Socket reconnected after', attemptNumber, 'attempts');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Restore session state after reconnection
    this.restoreSessionState();
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[ChatConnectionManager] Max reconnection attempts reached');
      this.notifyConnectionStatus('failed', 'Connection failed after multiple attempts');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`[ChatConnectionManager] Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected && !this.isConnecting) {
        this.connect();
      }
    }, delay);
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
  
  /**
   * End the current session
   * @param {string} sessionId - Session ID or booking ID to end
   */
  endSession(sessionId) {
    console.log('[ChatConnectionManager] Ending session:', sessionId);
    
    if (!this.isConnected || !this.socket) {
      console.warn('[ChatConnectionManager] Cannot end session - not connected');
      return;
    }
    
    try {
      // For free chat sessions
      if (this.isFreeChat) {
        console.log('[ChatConnectionManager] Ending free chat session:', sessionId);
        this.socket.emit('end_free_chat', {
          freeChatId: sessionId || this.currentBookingId,
          userId: this.currentUserId,
          userType: 'user'
        });
      } 
      // For regular consultation sessions
      else {
        console.log('[ChatConnectionManager] Ending consultation session:', sessionId);
        this.socket.emit('end_consultation', {
          bookingId: sessionId || this.currentBookingId,
          sessionId: sessionId || this.currentBookingId,
          userId: this.currentUserId,
          userType: 'user'
        });
      }
      
      // Notify status update for session end
      this.notifyStatusUpdate({
        type: 'session_end',
        sessionId: sessionId || this.currentBookingId,
        timestamp: new Date().toISOString()
      });
      
      // Clean up resources
      this.roomJoined = false;
    } catch (error) {
      console.error('[ChatConnectionManager] Error ending session:', error);
    }
  }
}

export default ChatConnectionManager;
