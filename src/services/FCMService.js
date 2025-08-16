import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authAPI } from './api';
import { firebaseConfig, isFirebaseConfigured } from '../config/firebase';

// FCM Service for User App (Expo FCM)
class FCMService {
  constructor() {
    this.token = null;
    this.isInitialized = false;
    this.notificationListener = null;
    this.responseListener = null;
    this.backgroundSubscription = null;
  }

  /**
   * Initialize FCM service with production-grade configuration
   */
  async initialize() {
    try {
      console.log('🚀 [FCM] Initializing FCM Service...');
      
      // Configure notification behavior
      await this.configureNotifications();
      
      // Register for push notifications
      await this.registerForPushNotifications();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Handle background notifications
      this.setupBackgroundNotificationHandler();
      
      this.isInitialized = true;
      console.log('✅ [FCM] FCM Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ [FCM] Failed to initialize FCM Service:', error);
      return false;
    }
  }

  /**
   * Configure notification behavior for production
   */
  async configureNotifications() {
    // Set notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        console.log('📱 [FCM] Handling foreground notification:', notification.request.content);
        
        // Custom logic based on notification type
        const notificationType = notification.request.content.data?.type;
        
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          // Customize based on notification type
          priority: notificationType === 'booking_request' ? 'high' : 'default'
        };
      },
    });

    // Configure notification categories for interactive notifications
    await this.setupNotificationCategories();
  }

  /**
   * Setup notification categories for interactive notifications
   */
  async setupNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync('booking_request', [
        {
          identifier: 'accept',
          buttonTitle: 'Accept',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'decline',
          buttonTitle: 'Decline',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('chat_message', [
        {
          identifier: 'reply',
          buttonTitle: 'Reply',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'mark_read',
          buttonTitle: 'Mark as Read',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      console.log('✅ [FCM] Notification categories configured');
    } catch (error) {
      console.error('❌ [FCM] Failed to setup notification categories:', error);
    }
  }

  /**
   * Register for push notifications with proper permissions
   */
  async registerForPushNotifications() {
    try {
      console.log('📱 [FCM] Registering for push notifications...');

      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.warn('⚠️ [FCM] Push notifications only work on physical devices');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        console.log('📱 [FCM] Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: true,
            provideAppNotificationSettings: true,
            allowProvisional: true,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.error('❌ [FCM] Notification permissions not granted');
        throw new Error('Notification permissions not granted');
      }

      console.log('✅ [FCM] Notification permissions granted');

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '19ce1c4d-7c68-407f-96a0-d41bedaa3d55', // Actual project ID
      });

      const token = tokenData.data;
      console.log('✅ [FCM] Expo push token obtained:', token);

      // Store token locally
      await AsyncStorage.setItem('fcm_token', token);
      this.token = token;

      // Register token with backend
      await this.registerTokenWithBackend(token);

      return token;
    } catch (error) {
      console.error('❌ [FCM] Failed to register for push notifications:', error);
      throw error;
    }
  }

  /**
   * Register FCM token with backend
   */
  async registerTokenWithBackend(token) {
    try {
      console.log('🔄 [FCM] Registering token with backend...');
      
      const response = await authAPI.post('/auth/register-fcm-token', {
        fcmToken: token,
        platform: Platform.OS,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        }
      });

      if (response.data.success) {
        console.log('✅ [FCM] Token registered with backend successfully');
        await AsyncStorage.setItem('fcm_token_registered', 'true');
      } else {
        throw new Error(response.data.message || 'Failed to register token');
      }
    } catch (error) {
      console.error('❌ [FCM] Failed to register token with backend:', error);
      // Don't throw error - app should continue working even if token registration fails
    }
  }

  /**
   * Setup notification listeners for foreground and background
   */
  setupNotificationListeners() {
    // Foreground notification listener
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleForegroundNotification.bind(this)
    );

    // Notification response listener (when user taps notification)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    console.log('✅ [FCM] Notification listeners setup');
  }

  /**
   * Handle foreground notifications
   */
  handleForegroundNotification(notification) {
    console.log('📱 [FCM] Foreground notification received:', notification);
    
    const { title, body, data } = notification.request.content;
    const notificationType = data?.type;

    // Custom handling based on notification type
    switch (notificationType) {
      case 'booking_request':
        this.handleBookingRequestNotification(data);
        break;
      case 'chat_message':
        this.handleChatMessageNotification(data);
        break;
      case 'payment_update':
        this.handlePaymentUpdateNotification(data);
        break;
      case 'astrologer_response':
        this.handleAstrologerResponseNotification(data);
        break;
      default:
        console.log('📱 [FCM] General notification received');
    }

    // Update badge count
    this.updateBadgeCount();
  }

  /**
   * Handle notification responses (when user taps notification)
   */
  handleNotificationResponse(response) {
    console.log('📱 [FCM] Notification response:', response);
    
    const { notification, actionIdentifier } = response;
    const data = notification.request.content.data;

    // Handle action-based responses
    if (actionIdentifier === 'accept' && data.type === 'booking_request') {
      this.handleBookingAcceptance(data);
    } else if (actionIdentifier === 'decline' && data.type === 'booking_request') {
      this.handleBookingDecline(data);
    } else if (actionIdentifier === 'reply' && data.type === 'chat_message') {
      this.handleChatReply(data);
    } else {
      // Default action - navigate to relevant screen
      this.navigateToRelevantScreen(data);
    }
  }

  /**
   * Setup background notification handler
   */
  setupBackgroundNotificationHandler() {
    // Handle notifications when app is in background/killed
    this.backgroundSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('📱 [FCM] Background notification response:', response);
        // Handle background notification logic
        this.handleBackgroundNotificationResponse(response);
      }
    );
  }

  /**
   * Handle specific notification types
   */
  handleBookingRequestNotification(data) {
    console.log('📅 [FCM] Booking request notification:', data);
    // Custom logic for booking requests
    // Could trigger local state updates, navigation, etc.
  }

  handleChatMessageNotification(data) {
    console.log('💬 [FCM] Chat message notification:', data);
    // Custom logic for chat messages
    // Could update unread count, trigger sound, etc.
  }

  handlePaymentUpdateNotification(data) {
    console.log('💳 [FCM] Payment update notification:', data);
    // Custom logic for payment updates
  }

  handleAstrologerResponseNotification(data) {
    console.log('🔮 [FCM] Astrologer response notification:', data);
    // Custom logic for astrologer responses
  }

  /**
   * Handle notification actions
   */
  handleBookingAcceptance(data) {
    console.log('✅ [FCM] Handling booking acceptance:', data);
    // Implement booking acceptance logic
  }

  handleBookingDecline(data) {
    console.log('❌ [FCM] Handling booking decline:', data);
    // Implement booking decline logic
  }

  handleChatReply(data) {
    console.log('💬 [FCM] Handling chat reply:', data);
    // Navigate to chat screen for reply
  }

  /**
   * Navigate to relevant screen based on notification data
   */
  navigateToRelevantScreen(data) {
    console.log('🧭 [FCM] Navigating to relevant screen:', data);
    // Implement navigation logic based on notification type
    // This would typically use your navigation service
  }

  /**
   * Handle background notification responses
   */
  handleBackgroundNotificationResponse(response) {
    const data = response.notification.request.content.data;
    console.log('🔄 [FCM] Handling background notification:', data);
    
    // Store notification for processing when app becomes active
    this.storeNotificationForLaterProcessing(data);
  }

  /**
   * Store notification for processing when app becomes active
   */
  async storeNotificationForLaterProcessing(data) {
    try {
      const existingNotifications = await AsyncStorage.getItem('pending_notifications');
      const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
      
      notifications.push({
        ...data,
        receivedAt: new Date().toISOString(),
      });

      await AsyncStorage.setItem('pending_notifications', JSON.stringify(notifications));
      console.log('💾 [FCM] Notification stored for later processing');
    } catch (error) {
      console.error('❌ [FCM] Failed to store notification:', error);
    }
  }

  /**
   * Process pending notifications when app becomes active
   */
  async processPendingNotifications() {
    try {
      const pendingNotifications = await AsyncStorage.getItem('pending_notifications');
      if (!pendingNotifications) return;

      const notifications = JSON.parse(pendingNotifications);
      console.log(`🔄 [FCM] Processing ${notifications.length} pending notifications`);

      for (const notification of notifications) {
        await this.processNotification(notification);
      }

      // Clear processed notifications
      await AsyncStorage.removeItem('pending_notifications');
      console.log('✅ [FCM] Pending notifications processed');
    } catch (error) {
      console.error('❌ [FCM] Failed to process pending notifications:', error);
    }
  }

  /**
   * Process individual notification
   */
  async processNotification(notification) {
    console.log('🔄 [FCM] Processing notification:', notification);
    // Implement notification processing logic
  }

  /**
   * Update badge count
   */
  async updateBadgeCount() {
    try {
      // Get unread count from your app state/API
      const unreadCount = await this.getUnreadNotificationCount();
      await Notifications.setBadgeCountAsync(unreadCount);
      console.log(`🔢 [FCM] Badge count updated: ${unreadCount}`);
    } catch (error) {
      console.error('❌ [FCM] Failed to update badge count:', error);
    }
  }

  /**
   * Get unread notification count (implement based on your app logic)
   */
  async getUnreadNotificationCount() {
    // Implement logic to get unread count from your app state or API
    return 0;
  }

  /**
   * Get current FCM token
   */
  async getToken() {
    if (this.token) {
      return this.token;
    }

    try {
      const storedToken = await AsyncStorage.getItem('fcm_token');
      if (storedToken) {
        this.token = storedToken;
        return storedToken;
      }
    } catch (error) {
      console.error('❌ [FCM] Failed to get stored token:', error);
    }

    return null;
  }

  /**
   * Refresh FCM token
   */
  async refreshToken() {
    try {
      console.log('🔄 [FCM] Refreshing FCM token...');
      await this.registerForPushNotifications();
      console.log('✅ [FCM] FCM token refreshed');
    } catch (error) {
      console.error('❌ [FCM] Failed to refresh FCM token:', error);
    }
  }

  /**
   * Clear FCM token (for logout)
   */
  async clearToken() {
    try {
      console.log('🗑️ [FCM] Clearing FCM token...');
      
      // Unregister token from backend
      if (this.token) {
        await authAPI.post('/auth/unregister-fcm-token', {
          fcmToken: this.token,
        });
      }

      // Clear local storage
      await AsyncStorage.removeItem('fcm_token');
      await AsyncStorage.removeItem('fcm_token_registered');
      await AsyncStorage.removeItem('pending_notifications');

      this.token = null;
      console.log('✅ [FCM] FCM token cleared');
    } catch (error) {
      console.error('❌ [FCM] Failed to clear FCM token:', error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    if (this.backgroundSubscription) {
      Notifications.removeNotificationSubscription(this.backgroundSubscription);
    }
    
    console.log('🧹 [FCM] FCM Service cleaned up');
  }

  /**
   * Check if FCM is properly initialized
   */
  isReady() {
    return this.isInitialized && this.token !== null;
  }

  /**
   * Get FCM service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasToken: !!this.token,
      token: this.token,
    };
  }
}

// Export singleton instance
export default new FCMService();
