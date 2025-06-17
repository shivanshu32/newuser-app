import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants for typing indicator
const TYPING_DEBOUNCE_TIME = 1000; // 1 second

// API URL (should match the backend URL) - Using local network IP instead of localhost for device/emulator access
const API_URL = 'http://192.168.29.107:5000';

let socket = null;

/**
 * Initialize socket connection
 * @returns {Promise<Object>} - Socket instance
 */
export const initSocket = async () => {
  try {
    // Get user token from AsyncStorage
    const token = await AsyncStorage.getItem('userToken');
    let userId = await AsyncStorage.getItem('userId');
    
    // If userId is not found directly, try getting it from userData
    if (!userId) {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        userId = parsedUserData._id;
      }
    }
    
    if (!token || !userId) {
      console.error('Token or userId not found. Cannot initialize socket.');
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
        console.error('Socket connection error:', error);
        // Don't reject here, let the timeout handle it or wait for connect
      });
      
      socketInstance.on('disconnect', (reason) => {
        socket = null; // Clear the socket reference on disconnect
      });
      
      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        if (!socketInstance.connected) {
          clearTimeout(connectionTimeout);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Socket initialization error:', error);
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
        socketInstance.off('error');
        reject(new Error('Booking request timed out. Astrologer may be unavailable.'));
      }, 60000); // 60 seconds timeout
      
      // Listen for booking status updates
      socketInstance.once('booking_status_update', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
      
      // Listen for errors
      socketInstance.once('error', (error) => {
        console.error('Socket error during booking request:', error);
        clearTimeout(timeout);
        reject(error);
      });
      
      // Now that listeners are set up, emit the event
      socketInstance.emit('initiate_booking', bookingData);
    });
  } catch (error) {
    console.error('Booking request error:', error);
    throw error;
  }
};

/**
 * Join a consultation room
 * @param {String} bookingId - Booking ID
 * @param {String} roomId - Room ID
 * @returns {Promise<void>}
 */
export const joinConsultationRoom = async (bookingId, roomId) => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    throw new Error('Socket not connected');
  }
  
  return new Promise((resolve, reject) => {
    socketInstance.emit('join_consultation_room', { bookingId, roomId });
    
    socketInstance.once('joined_consultation_room', (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.message || 'Failed to join consultation room'));
      }
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
    
    // Create handler function
    const handleStatusUpdate = (data) => {
      if (onStatusUpdate && typeof onStatusUpdate === 'function') {
        onStatusUpdate(data);
      }
    };
    
    // Register event listener
    socketInstance.on('booking_status_update', handleStatusUpdate);
    
    // Return cleanup function
    return () => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.off('booking_status_update', handleStatusUpdate);
      }
    };
  } catch (error) {
    console.error('Error setting up booking status listener:', error);
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
      console.error('Missing messageId when sending message');
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
      console.error('Received message without ID');
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
      console.error('[USER-APP] Socket not connected for typing status');
      throw new Error('Socket not connected');
    }
    
    const eventName = isTyping ? 'typing_started' : 'typing_stopped';
    console.log(`[USER-APP] Emitting ${eventName} event with payload:`, { bookingId: roomId });
    socketInstance.emit(eventName, { bookingId: roomId });
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error sending typing status:', error);
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
    console.error('Error setting up typing status listeners:', error);
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
    console.error('Error marking message as read:', error);
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
    console.error('Error setting up message status listeners:', error);
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
