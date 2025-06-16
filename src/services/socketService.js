import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
 * @param {String} messageType - Message type (text, image, etc.)
 * @returns {Promise<Object>} - Promise that resolves with response
 */
export const sendChatMessage = async (roomId, message, messageType = 'text') => {
  const socketInstance = await getSocket();
  
  if (!socketInstance) {
    throw new Error('Socket not connected');
  }
  
  return new Promise((resolve, reject) => {
    const messageData = {
      roomId,
      content: message,
      type: messageType,
      timestamp: new Date().toISOString()
    };
    
    socketInstance.emit('send_message', messageData, (response) => {
      if (response && response.success) {
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
  listenForChatMessages
};
