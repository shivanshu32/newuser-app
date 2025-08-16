import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import FCMService from '../services/FCMService';

// Create context
const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [fcmToken, setFcmToken] = useState('');
  const [notification, setNotification] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const appStateRef = useRef(AppState.currentState);
  const { token, user } = useAuth();

  // Initialize FCM service when user is authenticated (non-blocking)
  useEffect(() => {
    if (token && user && !isInitialized) {
      // Make FCM initialization completely non-blocking to prevent app crashes
      initializeFCMService().catch(error => {
        console.error('❌ [NotificationContext] FCM initialization failed, continuing without notifications:', error);
        // Set initialized to true even on failure to prevent retry loops
        setIsInitialized(true);
      });
    }
  }, [token, user, isInitialized]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 [NotificationContext] App has come to the foreground');
        // Process any pending notifications
        FCMService.processPendingNotifications();
        // Update unread count
        updateUnreadCount();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      FCMService.cleanup();
    };
  }, []);

  /**
   * Initialize FCM service (with comprehensive error handling)
   */
  const initializeFCMService = async () => {
    try {
      console.log('🚀 [NotificationContext] Initializing FCM service...');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('FCM initialization timeout')), 10000);
      });
      
      const initPromise = FCMService.initialize();
      const success = await Promise.race([initPromise, timeoutPromise]);
      
      if (success) {
        const token = await FCMService.getToken();
        if (token) {
          setFcmToken(token);
          console.log('✅ [NotificationContext] FCM service initialized with token');
        }
        setIsInitialized(true);
        
        // Load initial unread count (non-blocking)
        updateUnreadCount().catch(error => {
          console.warn('❌ [NotificationContext] Failed to load unread count:', error);
        });
      } else {
        console.error('❌ [NotificationContext] Failed to initialize FCM service');
        setIsInitialized(true); // Set to true to prevent retry loops
      }
    } catch (error) {
      console.error('❌ [NotificationContext] FCM initialization error:', error);
      setIsInitialized(true); // Set to true even on error to prevent retry loops
      
      // Don't throw error - let app continue without notifications
    }
  };

  /**
   * Update unread notification count
   */
  const updateUnreadCount = async () => {
    try {
      const storedCount = await AsyncStorage.getItem('unread_notification_count');
      const count = storedCount ? parseInt(storedCount) : 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to update unread count:', error);
    }
  };

  /**
   * Mark notification as read
   */
  const markAsRead = async (notificationId) => {
    try {
      console.log('✅ [NotificationContext] Marking notification as read:', notificationId);
      
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      await AsyncStorage.setItem('unread_notification_count', newCount.toString());
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to mark notification as read:', error);
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      console.log('✅ [NotificationContext] Marking all notifications as read');
      
      setUnreadCount(0);
      await AsyncStorage.setItem('unread_notification_count', '0');
      
      // Clear badge count
      await FCMService.updateBadgeCount();
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to mark all notifications as read:', error);
    }
  };

  /**
   * Refresh FCM token
   */
  const refreshToken = async () => {
    try {
      console.log('🔄 [NotificationContext] Refreshing FCM token...');
      
      await FCMService.refreshToken();
      const newToken = await FCMService.getToken();
      
      if (newToken) {
        setFcmToken(newToken);
        console.log('✅ [NotificationContext] FCM token refreshed');
      }
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to refresh FCM token:', error);
    }
  };

  /**
   * Clear FCM token (for logout)
   */
  const clearToken = async () => {
    try {
      console.log('🗑️ [NotificationContext] Clearing FCM token...');
      
      await FCMService.clearToken();
      setFcmToken('');
      setIsInitialized(false);
      setUnreadCount(0);
      
      console.log('✅ [NotificationContext] FCM token cleared');
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to clear FCM token:', error);
    }
  };

  /**
   * Get FCM service status
   */
  const getStatus = () => {
    return {
      isInitialized,
      hasToken: !!fcmToken,
      token: fcmToken,
      unreadCount,
      fcmServiceStatus: FCMService.getStatus(),
    };
  };

  /**
   * Handle booking request notifications
   */
  const handleBookingRequest = async (bookingData) => {
    try {
      console.log('📅 [NotificationContext] Handling booking request:', bookingData);
      
      const newCount = unreadCount + 1;
      setUnreadCount(newCount);
      await AsyncStorage.setItem('unread_notification_count', newCount.toString());
      
      const existingRequests = await AsyncStorage.getItem('pending_booking_requests');
      const requests = existingRequests ? JSON.parse(existingRequests) : [];
      
      requests.push({
        ...bookingData,
        receivedAt: new Date().toISOString(),
        read: false,
      });
      
      await AsyncStorage.setItem('pending_booking_requests', JSON.stringify(requests));
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to handle booking request:', error);
    }
  };

  /**
   * Handle chat message notifications
   */
  const handleChatMessage = async (messageData) => {
    try {
      console.log('💬 [NotificationContext] Handling chat message:', messageData);
      
      const newCount = unreadCount + 1;
      setUnreadCount(newCount);
      await AsyncStorage.setItem('unread_notification_count', newCount.toString());
      
      const chatId = messageData.chatId;
      if (chatId) {
        const chatUnreadKey = `chat_unread_${chatId}`;
        const currentChatUnread = await AsyncStorage.getItem(chatUnreadKey);
        const chatCount = currentChatUnread ? parseInt(currentChatUnread) : 0;
        await AsyncStorage.setItem(chatUnreadKey, (chatCount + 1).toString());
      }
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to handle chat message:', error);
    }
  };

  /**
   * Schedule local notification
   */
  const scheduleLocalNotification = async (title, body, data = {}) => {
    try {
      console.log('📱 [NotificationContext] Scheduling local notification:', { title, body, data });
      setNotification({ title, body, data, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('❌ [NotificationContext] Failed to schedule local notification:', error);
    }
  };

  /**
   * Handle notification navigation
   */
  const handleNotificationNavigation = (data) => {
    console.log('🧭 [NotificationContext] Handling notification navigation:', data);
    
    const type = data?.type;
    
    switch (type) {
      case 'booking_request':
        // Navigate to bookings screen
        break;
      case 'chat_message':
        // Navigate to chat screen
        break;
      case 'payment':
        // Navigate to wallet screen
        break;
      default:
        // Navigate to home screen
    }
  };

  // Context value
  const value = {
    // State
    fcmToken,
    notification,
    isInitialized,
    unreadCount,
    
    // Methods
    initializeFCMService,
    updateUnreadCount,
    markAsRead,
    markAllAsRead,
    refreshToken,
    clearToken,
    getStatus,
    handleBookingRequest,
    handleChatMessage,
    scheduleLocalNotification,
    handleNotificationNavigation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
