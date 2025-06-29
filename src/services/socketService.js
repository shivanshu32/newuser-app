import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for typing indicator
const TYPING_DEBOUNCE_TIME = 1000; // 1 second

// API URL Configuration - Comment/Uncomment as needed
// Local Development (commented out for production)
// const API_URL = 'http://192.168.29.107:5000';

// Production - New backend URL
const API_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app';
// Old production URL: const API_URL = 'http://3.110.171.85';

let socket = null;

/**
 * Initialize socket connection
 * @returns {Promise<Object>} - Socket instance
 */
export const initSocket = async () => {
  try {
    // Get user token from AsyncStorage
    const token = await AsyncStorage.getItem('userToken');
    
    // Always get userId from userData to ensure we have the latest user ID
    let userId = null;
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsedUserData = JSON.parse(userData);
      userId = parsedUserData._id || parsedUserData.id;
    }
    
    // Fallback to direct userId storage if userData is not available
    if (!userId) {
      userId = await AsyncStorage.getItem('userId');
    }
    
    console.log(' [socketService] Authentication data - token exists:', !!token, 'userId:', userId);
    console.log(' [socketService] Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    console.log(' [socketService] Connecting to:', API_URL);
    
    if (!token || !userId) {
      console.error(' [socketService] Token or userId not found. Cannot initialize socket.');
      console.error(' [socketService] Token:', !!token, 'UserId:', !!userId);
      return null;
    }
    
    // Create socket connection with authentication
    const socketInstance = io(API_URL, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      auth: {
        token,
        id: userId,
        role: 'user'
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });

    // Add comprehensive event listeners for debugging
    socketInstance.on('connect', () => {
      console.log(' [socketService] Socket connected successfully:', socketInstance.id);
      console.log(' [socketService] Socket auth data sent:', {
        token: !!token,
        id: userId,
        role: 'user'
      });
      
      // Register listeners after connection is established
      console.log(' [socketService] Registering booking_status_update listener after connection');
      
      // Add global listener for booking_status_update events
      socketInstance.on('booking_status_update', (data) => {
        console.log(' [socketService] booking_status_update event received! ');
        console.log(' [socketService] Raw event data:', JSON.stringify(data, null, 2));
        console.log(' [socketService] Socket ID:', socketInstance?.id);
        console.log(' [socketService] Socket connected:', socketInstance?.connected);
        console.log(' [socketService] Event timestamp:', new Date().toISOString());
        console.log(' [socketService] GLOBAL booking_status_update received:', {
          bookingId: data.bookingId,
          status: data.status,
          sessionId: data.sessionId,
          roomId: data.roomId,
          message: data.message,
          timestamp: new Date().toISOString(),
          socketId: socketInstance.id
        });
        
        // Handle booking acceptance with popup
        if (data.status === 'accepted') {
          console.log(' [socketService] Booking accepted - triggering popup');
          console.log(' [socketService] Raw booking status data:', JSON.stringify(data, null, 2));
          
          // Debug consultation type detection
          const consultationType = data.consultationType || data.type || data.bookingDetails?.type || data.bookingDetails?.consultationType;
          console.log(' [socketService] Consultation type detection:');
          console.log('   - data.consultationType:', data.consultationType);
          console.log('   - data.type:', data.type);
          console.log('   - data.bookingDetails?.type:', data.bookingDetails?.type);
          console.log('   - data.bookingDetails?.consultationType:', data.bookingDetails?.consultationType);
          console.log('   - Final consultationType:', consultationType);
          
          // Emit event to show booking accepted popup
          if (global.eventEmitter) {
            const popupData = {
              bookingId: data.bookingId,
              sessionId: data.sessionId,
              roomId: data.roomId,
              astrologerId: data.astrologerId,
              type: consultationType || 'video', // Use comprehensive detection
              rate: data.rate,
              astrologerName: data.astrologerName,
              message: data.message
            };
            
            console.log(' [socketService] Emitting showBookingAcceptedPopup with data:', JSON.stringify(popupData, null, 2));
            global.eventEmitter.emit('showBookingAcceptedPopup', popupData);
          }
          
          // Also show alert as fallback (avoiding ToastAndroid for Expo Go compatibility)
          import('react-native').then((RN) => {
            const { Alert } = RN;
            Alert.alert('Booking Accepted', 'Check the popup to join your session!');
          }).catch(err => {
            console.error('Error showing fallback alert:', err);
          });
        } else if (data.status === 'rejected') {
          console.log(' [socketService] Booking rejected - showing notification');
          
          // Show rejection notification (avoiding ToastAndroid for Expo Go compatibility)
          import('react-native').then((RN) => {
            const { Alert } = RN;
            Alert.alert('Booking Rejected', 'Your booking request was declined.');
          }).catch(err => {
            console.error('Error showing rejection alert:', err);
          });
        }
      });
    });

    socketInstance.on('connect_error', (error) => {
      console.error(' [socketService] Socket connection error:', error);
      console.error(' [socketService] Error message:', error.message);
      console.error(' [socketService] Error type:', error.type);
      console.error(' [socketService] Error description:', error.description);
      
      // Check if it's an authentication error
      if (error.message && error.message.includes('Authentication error')) {
        console.error(' [socketService] Authentication failed - check token and userId');
      }
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(' [socketService] Socket disconnected:', reason);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(' [socketService] Socket reconnected after', attemptNumber, 'attempts');
    });

    socketInstance.on('reconnect_error', (error) => {
      console.error(' [socketService] Socket reconnection error:', error);
    });

    socketInstance.on('error', (error) => {
      console.error(' [socketService] Socket error:', error);
      if (!socketInstance.connected) {
        // Return a promise that resolves when the socket is connected
        return new Promise((resolve, reject) => {
          // Set a connection timeout
          const connectionTimeout = setTimeout(() => {
            reject(new Error('Socket connection timeout'));
          }, 10000); // 10 seconds timeout
          
          // Set up event listeners
          socketInstance.on('connect', () => {
            clearTimeout(connectionTimeout);
            socket = socketInstance; // Store the socket instance globally
            resolve(socketInstance);
          });
        });
      }
    });
    
    // Return a promise that resolves when the socket is connected
    return new Promise((resolve, reject) => {
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'));
      }, 10000); // 10 seconds timeout
      
      // Set up event listeners
      socketInstance.on('connect', () => {
        clearTimeout(connectionTimeout);
        socket = socketInstance; // Store the socket instance globally
        resolve(socketInstance);
      });
      
      socketInstance.on('connect_error', (error) => {
        console.error(' [socketService] Socket connection error:', error);
        // Don't reject here, let the timeout handle it or wait for connect
      });
      
      socketInstance.on('disconnect', (reason) => {
        socket = null; // Clear the socket reference on disconnect
      });
    });
  } catch (error) {
    console.error(' [socketService] Socket initialization error:', error);
    return null;
  }
};

/**
 * Get the current socket instance or initialize if not exists
 * @returns {Promise<Object>} - Socket instance
 */
export const getSocket = async () => {
  if (!socket) {
    return await initSocket();
  }
  
  if (!socket.connected) {
    socket.disconnect();
    return await initSocket();
  }
  
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Send real-time booking request to an astrologer
 * @param {Object} bookingData - Booking data
 * @returns {Promise<Object>} - Promise that resolves with booking response
 */
export const initiateRealTimeBooking = async (bookingData) => {
  try {
    // Ensure we have a connected socket before proceeding
    const socketInstance = await getSocket();
    
    if (!socketInstance || !socketInstance.connected || !socketInstance.id) {
      throw new Error('Socket not connected properly');
    }
    
    // Return a promise that resolves when booking is accepted or rejected
    return new Promise((resolve, reject) => {
      // Set up timeout for booking request
      const timeout = setTimeout(() => {
        socketInstance.off('booking_status_update'); // Remove listeners to prevent memory leaks
        socketInstance.off('booking_initiated'); // Remove listeners to prevent memory leaks
        socketInstance.off('booking_error'); // Remove listeners to prevent memory leaks
        socketInstance.off('error');
        reject(new Error('Booking request timed out. Astrologer may be unavailable.'));
      }, 60000); // 60 seconds timeout
      
      // Listen for booking status updates
      socketInstance.once('booking_status_update', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
      
      // Listen for booking initiation success
      socketInstance.once('booking_initiated', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
      
      // Listen for booking errors (new specific error event)
      socketInstance.once('booking_error', (error) => {
        console.error(' [socketService] Booking error:', error);
        clearTimeout(timeout);
        reject(new Error(error.message || 'Failed to initiate booking'));
      });
      
      // Listen for general errors (fallback)
      socketInstance.once('error', (error) => {
        console.error(' [socketService] Socket error during booking request:', error);
        clearTimeout(timeout);
        
        // Handle specific error codes
        if (error.code === 'USER_NOT_FOUND' && error.action === 'CLEAR_AUTH_DATA') {
          console.log(' [socketService] Invalid user data detected, clearing auth data...');
          // Import AsyncStorage and clear auth data
          import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
            AsyncStorage.multiRemove(['userToken', 'userData']).then(() => {
              console.log(' [socketService] Auth data cleared. Please log in again.');
              // You could also trigger a logout here if needed
            });
          });
        }
        
        reject(error);
      });
      
      // Now that listeners are set up, emit the event
      socketInstance.emit('initiate_booking', bookingData);
    });
  } catch (error) {
    console.error(' [socketService] Booking request error:', error);
    throw error;
  }
};

/**
 * Join a consultation room
 * @param {Object} consultationData - Consultation data object
 * @param {String} consultationData.bookingId - Booking ID
 * @param {String} consultationData.roomId - Room ID
 * @param {String} consultationData.sessionId - Session ID (optional)
 * @param {String} consultationData.astrologerId - Astrologer ID
 * @param {String} consultationData.consultationType - Type of consultation (video/voice/chat)
 * @returns {Promise<void>}
 */
export const joinConsultationRoom = async (consultationData) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    throw new Error('Socket not connected');
  }
  
  // Extract parameters from consultationData object
  const bookingId = consultationData.bookingId;
  const roomId = consultationData.roomId;
  const astrologerId = consultationData.astrologerId;
  const consultationType = consultationData.consultationType;
  const sessionId = consultationData.sessionId;
  
  // Validate required parameters
  if (!bookingId) {
    throw new Error('Missing required parameter: bookingId');
  }
  
  console.log(' [socketService] Joining consultation room:', {
    bookingId,
    roomId,
    astrologerId,
    consultationType,
    sessionId
  });
  
  return new Promise((resolve, reject) => {
    // Emit user_joined_consultation event with proper data structure
    socketInstance.emit('user_joined_consultation', {
      bookingId,
      roomId,
      astrologerId,
      consultationType,
      sessionId
    });
    
    // Listen for confirmation (if backend sends one)
    const timeoutId = setTimeout(() => {
      console.log(' [socketService] Join consultation room completed (no confirmation expected)');
      resolve({ success: true });
    }, 1000);
    
    // Optional: Listen for any error response
    socketInstance.once('consultation_join_error', (response) => {
      clearTimeout(timeoutId);
      console.error(' [socketService] Failed to join consultation room:', response);
      reject(new Error(response.message || 'Failed to join consultation room'));
    });
  });
};

/**
 * Leave a consultation room
 * @param {String} bookingId - Booking ID
 * @param {String} roomId - Room ID
 */
export const leaveConsultationRoom = async (bookingId, roomId) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    return;
  }
  
  socketInstance.emit('leave_consultation_room', { bookingId, roomId });
};

/**
 * Listen for participant join/leave events
 * @param {Function} onParticipantJoined - Callback when participant joins
 * @param {Function} onParticipantLeft - Callback when participant leaves
 */
export const listenForParticipantEvents = async (onParticipantJoined, onParticipantLeft) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    return;
  }
  
  socketInstance.on('participant_joined', onParticipantJoined);
  socketInstance.on('participant_left', onParticipantLeft);
  
  return () => {
    socketInstance.off('participant_joined', onParticipantJoined);
    socketInstance.off('participant_left', onParticipantLeft);
  };
};

/**
 * Listen for consultation timer updates
 * @param {Function} onTimerUpdate - Callback for timer updates
 */
export const listenForTimerUpdates = async (onTimerUpdate) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    return;
  }
  
  socketInstance.on('session_timer', onTimerUpdate);
  
  return () => {
    socketInstance.off('session_timer', onTimerUpdate);
  };
};

/**
 * Listen for consultation status updates
 * @param {Function} onStatusUpdate - Callback for status updates
 */
export const listenForStatusUpdates = async (onStatusUpdate) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    return;
  }
  
  socketInstance.on('session_status', onStatusUpdate);
  
  return () => {
    socketInstance.off('session_status', onStatusUpdate);
  };
};

/**
 * Listen for booking status updates
 * @param {Function} onStatusUpdate - Callback for status updates
 * @returns {Promise<Function>} - Cleanup function to remove listener
 */
export const listenForBookingStatusUpdates = async (onStatusUpdate) => {
  try {
    const socketInstance = await getSocket();
    if (!socketInstance) {
      throw new Error('Socket not connected');
    }
    
    console.log(' [socketService] Setting up listener for booking_status_update events');
    console.log(' [socketService] Socket connection state:', {
      connected: socketInstance.connected,
      id: socketInstance.id,
      url: socketInstance.io.uri
    });
    
    // Create a wrapper function to log the event when received
    const bookingStatusHandler = (data) => {
      console.log(' [socketService] Received booking_status_update event with data:', data);
      console.log(' [socketService] Event details:', {
        bookingId: data.bookingId,
        status: data.status,
        sessionId: data.sessionId,
        roomId: data.roomId,
        message: data.message,
        timestamp: new Date().toISOString()
      });
      
      // Call the original handler
      onStatusUpdate(data);
      
      console.log(' [socketService] booking_status_update event processed by handler');
    };
    
    socketInstance.on('booking_status_update', bookingStatusHandler);
    
    return () => {
      console.log(' [socketService] Removing listener for booking_status_update');
      socketInstance.off('booking_status_update', bookingStatusHandler);
    };
  } catch (error) {
    console.error(' [socketService] Error setting up booking status listener:', error);
    return () => {}; // Return empty cleanup function
  }
};

/**
 * Send a chat message in a consultation
 * @param {String} roomId - Room ID
 * @param {String} message - Message content
 * @param {String} senderId - Sender ID
 * @param {String} senderName - Sender name
 * @param {String} messageId - Message ID for tracking
 * @param {String} messageType - Message type (text, image, etc.)
 * @returns {Promise<Object>} - Promise that resolves with response
 */
export const sendChatMessage = async (roomId, message, senderId, senderName, messageId, messageType = 'text') => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    throw new Error('Socket not connected');
  }
  
  return new Promise((resolve, reject) => {
    // Ensure we have a valid messageId
    if (!messageId) {
      console.error(' [socketService] Missing messageId when sending message');
      messageId = Date.now().toString();
    }
    
    const messageData = {
      roomId,
      content: message,
      type: messageType,
      timestamp: new Date().toISOString(),
      id: messageId, // Always use the provided messageId, no fallback to ensure consistency
      messageId: messageId, // IMPORTANT: Also include as messageId to ensure consistency
      sender: senderId,
      senderName: senderName
    };
    
    socketInstance.emit('send_message', messageData, (response) => {
      if (response && response.success) {
        // Message sent successfully
        resolve(response);
      } else {
        reject(new Error(response?.message || 'Failed to send message'));
      }
    });
    
    // If no acknowledgment within 5 seconds, resolve anyway to prevent hanging
    setTimeout(() => {
      resolve({ success: true, message: 'No acknowledgment received' });
    }, 5000);
  });
};

/**
 * Listen for chat messages in a consultation
 * @param {Function} onChatMessage - Callback for new messages
 * @returns {Promise<Function>} - Cleanup function to remove listener
 */
export const listenForChatMessages = async (onChatMessage) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    return () => {};
  }
  
  const messageHandler = (data) => {
    // Ensure message has an ID to maintain consistency across apps
    if (!data.id) {
      console.error(' [socketService] Received message without ID');
    }
    
    if (onChatMessage && typeof onChatMessage === 'function') {
      onChatMessage(data);
    }
  };
  
  socketInstance.on('receive_message', messageHandler);
  
  return () => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.off('receive_message', messageHandler);
    }
  };
};

/**
 * Send typing indicator status
 * @param {String} roomId - Room ID (booking ID)
 * @param {Boolean} isTyping - Whether the user is typing or stopped typing
 * @returns {Promise<void>}
 */
export const sendTypingStatus = async (roomId, isTyping) => {
  try {
    const socketInstance = await getSocket();
    
    if (!socketInstance) {
      console.error(' [socketService] Socket not connected for typing status');
      throw new Error('Socket not connected');
    }
    
    const eventName = isTyping ? 'typing_started' : 'typing_stopped';
    console.log(' [socketService] Emitting', eventName, 'event with payload:', { bookingId: roomId });
    socketInstance.emit(eventName, { bookingId: roomId });
    
    return Promise.resolve();
  } catch (error) {
    console.error(' [socketService] Error sending typing status:', error);
    return Promise.reject(error);
  }
};

/**
 * Listen for typing status changes
 * @param {Function} onTypingStarted - Callback when typing starts
 * @param {Function} onTypingStopped - Callback when typing stops
 * @returns {Promise<Function>} - Cleanup function to remove listeners
 */
export const listenForTypingStatus = async (onTypingStarted, onTypingStopped) => {
  try {
    const socketInstance = await getSocket();
    
    if (!socketInstance) {
      return () => {};
    }
    
    socketInstance.on('typing_started', onTypingStarted);
    socketInstance.on('typing_stopped', onTypingStopped);
    
    return () => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.off('typing_started', onTypingStarted);
        socketInstance.off('typing_stopped', onTypingStopped);
      }
    };
  } catch (error) {
    console.error(' [socketService] Error setting up typing status listeners:', error);
    return () => {};
  }
};

/**
 * Mark a message as read
 * @param {String} roomId - Room ID (booking ID)
 * @param {String} messageId - ID of the message that was read
 * @returns {Promise<void>}
 */
export const markMessageAsRead = async (roomId, messageId) => {
  try {
    const socketInstance = await getSocket();
    
    if (!socketInstance) {
      throw new Error('Socket not connected');
    }
    
    socketInstance.emit('message_read', { bookingId: roomId, messageId });
    return Promise.resolve();
  } catch (error) {
    console.error(' [socketService] Error marking message as read:', error);
    return Promise.reject(error);
  }
};

/**
 * Listen for message status updates (read receipts)
 * @param {Function} onMessageStatusUpdate - Callback for status updates
 * @returns {Promise<Function>} - Cleanup function to remove listener
 */
export const listenForMessageStatusUpdates = async (onMessageStatusUpdate) => {
  try {
    const socketInstance = await getSocket();
    
    if (!socketInstance) {
      return () => {};
    }
    
    socketInstance.on('message_status_update', onMessageStatusUpdate);
    
    return () => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.off('message_status_update', onMessageStatusUpdate);
      }
    };
  } catch (error) {
    console.error(' [socketService] Error setting up message status listeners:', error);
    return () => {};
  }
};

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  initiateRealTimeBooking,
  joinConsultationRoom,
  leaveConsultationRoom,
  listenForParticipantEvents,
  listenForTimerUpdates,
  listenForStatusUpdates,
  listenForBookingStatusUpdates,
  sendChatMessage,
  listenForChatMessages,
  sendTypingStatus,
  listenForTypingStatus,
  markMessageAsRead,
  listenForMessageStatusUpdates
};
