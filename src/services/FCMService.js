import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert, AppState } from 'react-native';
import Constants from 'expo-constants';
import API, { authAPI } from './api';

// Check if running in standalone build (development/production) vs Expo Go
const isExpoGo = Constants.appOwnership === 'expo';
const isStandaloneBuild = Constants.appOwnership === 'standalone' || Constants.appOwnership === null;
const isDevelopmentBuild = __DEV__ && isStandaloneBuild;
const isProductionBuild = !__DEV__ && isStandaloneBuild;

// Dynamic Firebase import for standalone builds (both development and production)
let messaging = null;
if (isStandaloneBuild && !isExpoGo) {
  try {
    // Import Firebase messaging for standalone builds (development + production)
    const firebase = require('@react-native-firebase/app').default;
    messaging = require('@react-native-firebase/messaging').default;
    
    if (isProductionBuild) {
      console.log('🔥 [FCM] Firebase messaging loaded for production build');
    } else if (isDevelopmentBuild) {
      console.log('🔥 [FCM] Firebase messaging loaded for development build');
    } else {
      console.log('🔥 [FCM] Firebase messaging loaded for standalone build');
    }
  } catch (error) {
    console.log('⚠️ [FCM] Firebase messaging not available, falling back to Expo notifications');
  }
}

// FCM Service for User App (Expo FCM)
class FCMService {
  constructor() {
    this.token = null;
    this.isInitialized = false;
    this.unsubscribeTokenRefresh = null;
    this.unsubscribeForeground = null;
    this.unsubscribeBackground = null;
    this.appStateSubscription = null;
  }

  /**
   * Initialize FCM service with production-grade configuration
   */
  async initialize() {
    try {
      console.log('🚀 [FCM] Initializing FCM Service for User App...');
      
      // Check if device supports push notifications
      if (!Device.isDevice) {
        console.log('⚠️ [FCM] Must use physical device for push notifications');
        return false;
      }
      
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      
      console.log('✅ [FCM] Device configured for notifications');

      // Configure push notifications
      await this.configurePushNotifications();
      
      // Request permissions
      await this.requestPermissions();
      
      // Get FCM token
      await this.getFCMToken();
      
      // Set up message handlers
      this.setupMessageHandlers();
      
      // Set up token refresh listener
      this.setupTokenRefreshListener();
      
      // Handle app state changes
      this.setupAppStateHandler();
      
      // Set up token refresh handler
      this.setupTokenRefreshHandler();
      
      this.isInitialized = true;
      console.log('✅ [FCM] FCM Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ [FCM] Failed to initialize FCM Service:', error);
      return false;
    }
  }

  /**
   * Configure push notifications for Android
   */
  async configurePushNotifications() {
    // Configure push notification channels for Android using Expo Notifications
    console.log('📱 [FCM] Configuring push notifications with Expo Notifications');
    
    // Create notification channels for Android
    if (Platform.OS === 'android') {
      await this.createNotificationChannels();
    }
    
    console.log('✅ [FCM] Push notifications configured');
  }

  /**
   * Create notification channels for Android
   */
  async createNotificationChannels() {
    if (Platform.OS !== 'android') {
      console.log('📱 [FCM] Notification channels only needed on Android');
      return;
    }

    try {
      // High priority channel for booking requests
      await Notifications.setNotificationChannelAsync('booking_requests', {
        name: 'Booking Requests',
        description: 'Notifications for new booking requests',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      console.log('📱 [FCM] Booking requests channel created');

      // Default channel for general notifications
      await Notifications.setNotificationChannelAsync('general', {
        name: 'General Notifications',
        description: 'General app notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
      console.log('📱 [FCM] General channel created');

      // Chat messages channel
      await Notifications.setNotificationChannelAsync('chat_messages', {
        name: 'Chat Messages',
        description: 'New chat messages from astrologers',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
      console.log('📱 [FCM] Chat messages channel created');

      // Payment notifications channel
      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payment Notifications',
        description: 'Payment and wallet related notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
      console.log('📱 [FCM] Payments channel created');
      
      console.log('✅ [FCM] All notification channels created successfully');
    } catch (error) {
      console.error('❌ [FCM] Failed to create notification channels:', error);
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      console.log('🔐 [FCM] Requesting notification permissions...');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        console.log('✅ [FCM] Notification permissions granted');
        return true;
      } else {
        console.log('❌ [FCM] Notification permissions denied');
        
        // Show alert to guide user to settings
        Alert.alert(
          'Notification Permission Required',
          'Please enable notifications in your device settings to receive booking updates and important messages.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => this.openNotificationSettings() },
          ]
        );
        
        return false;
      }
    } catch (error) {
      console.error('❌ [FCM] Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  async getFCMToken() {
    try {
      console.log('🔑 [FCM] Getting FCM token...');
      console.log('📱 [FCM] App ownership:', Constants.appOwnership);
      console.log('🏗️ [FCM] Is development build:', isDevelopmentBuild);
      console.log('🏭 [FCM] Is production build:', isProductionBuild);
      console.log('📱 [FCM] Is standalone build:', isStandaloneBuild);
      console.log('📦 [FCM] Is Expo Go:', isExpoGo);
      console.log('🔧 [FCM] __DEV__ flag:', __DEV__);
      
      let token = null;
      
      // Use Firebase FCM for standalone builds (both development and production)
      if (messaging && isStandaloneBuild && !isExpoGo) {
        if (isProductionBuild) {
          console.log('🔥 [FCM] Using Firebase FCM for production build');
        } else if (isDevelopmentBuild) {
          console.log('🔥 [FCM] Using Firebase FCM for development build');
        } else {
          console.log('🔥 [FCM] Using Firebase FCM for standalone build');
        }
        
        // Request permission for Firebase messaging using modern API
        const authStatus = await messaging().requestPermission();
        const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                       authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        
        if (enabled) {
          console.log('✅ [FCM] Firebase messaging permission granted');
          
          // Get Firebase FCM token
          const fcmToken = await messaging().getToken();
          if (fcmToken) {
            console.log('✅ [FCM] Firebase FCM token obtained:', fcmToken.substring(0, 20) + '...');
            token = fcmToken;
          } else {
            console.warn('⚠️ [FCM] No Firebase FCM token available');
          }
        } else {
          console.warn('⚠️ [FCM] Firebase messaging permission denied');
        }
      } 
      // Fallback to Expo push tokens for Expo Go
      else {
        console.log('📱 [FCM] Using Expo push tokens for Expo Go');
        
        try {
          const expoPushToken = await Notifications.getExpoPushTokenAsync({
            projectId: '19ce1c4d-7c68-407f-96a0-d41bedaa3d55', // Your Expo project ID
          });
          
          if (expoPushToken?.data) {
            console.log('✅ [FCM] Expo push token obtained:', expoPushToken.data.substring(0, 30) + '...');
            token = expoPushToken.data;
          } else {
            console.warn('⚠️ [FCM] No Expo push token available');
          }
        } catch (expoError) {
          console.error('❌ [FCM] Failed to get Expo push token:', expoError);
          // Don't throw here, continue with null token
        }
      }
      
      if (token) {
        // Store token locally
        await AsyncStorage.setItem('fcm_token', token);
        this.token = token;
        
        // Register token with backend
        await this.registerTokenWithBackend(token);
        
        return token;
      } else {
        console.warn('⚠️ [FCM] No token available from any source');
        return null;
      }
    } catch (error) {
      console.error('❌ [FCM] Failed to get FCM token:', error);
      throw error;
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
      console.log('🔑 [FCM] Token to register:', token.substring(0, 30) + '...');
      
      const response = await API.post('/notifications/register-token', {
        fcmToken: token
      });

      if (response.success) {
        console.log('✅ [FCM] Token registered with backend successfully');
        await AsyncStorage.setItem('fcm_token_registered', 'true');
        await AsyncStorage.setItem('fcm_token_registered_at', new Date().toISOString());
      } else {
        throw new Error(response.message || 'Failed to register token');
      }
    } catch (error) {
      console.error('❌ [FCM] Failed to register token with backend:', error);
      console.error('❌ [FCM] Error details:', error.response?.data || error.message);
      
      // Mark as not registered
      await AsyncStorage.removeItem('fcm_token_registered');
      
      // Don't throw error - app should continue working even if token registration fails
    }
  }

  /**
   * Setup message handlers for different app states
   */
  setupMessageHandlers() {
    // Handle notification received while app is in foreground
    this.unsubscribeForeground = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📱 [FCM] Foreground notification received:', notification);
      this.handleForegroundMessage(notification);
    });

    // Handle notification tapped/opened
    this.unsubscribeBackground = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('📱 [FCM] Notification response received:', response);
      this.handleNotificationOpened(response.notification);
    });

    // Handle app opened from quit state by notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        console.log('📱 [FCM] App opened from quit state by notification:', response);
        this.handleNotificationOpened(response.notification);
      }
    });

    console.log('✅ [FCM] Message handlers setup');
  }

  /**
   * Handle foreground messages
   */
  async handleForegroundMessage(remoteMessage) {
    const { notification, data } = remoteMessage;
    
    console.log('📱 [FCM] Processing foreground message:', {
      title: notification?.title,
      body: notification?.body,
      data: data,
    });

    // Handle specific notification types
    await this.processNotificationByType(remoteMessage);
  }

  /**
   * Handle notification opened (from background or quit state)
   */
  handleNotificationOpened(remoteMessage) {
    console.log('👆 [FCM] Notification opened:', remoteMessage);
    
    const { data } = remoteMessage;
    
    // Navigate based on notification type
    this.navigateBasedOnNotification(data);
  }

  /**
   * Process notification by type
   */
  async processNotificationByType(remoteMessage) {
    const { data } = remoteMessage;
    const type = data?.type;

    switch (type) {
      case 'booking_request':
        await this.handleBookingRequestNotification(data);
        break;
      case 'chat_message':
        await this.handleChatMessageNotification(data);
        break;
      case 'payment':
        await this.handlePaymentNotification(data);
        break;
      case 'profile_update':
        await this.handleProfileUpdateNotification(data);
        break;
      default:
        console.log('📱 [FCM] General notification processed');
    }
  }

  /**
   * Handle specific notification types
   */
  async handleBookingRequestNotification(data) {
    console.log('📅 [FCM] Processing booking request:', data);
    // Update local state, show in-app notification, etc.
  }

  async handleChatMessageNotification(data) {
    console.log('💬 [FCM] Processing chat message:', data);
    // Update chat state, increment unread count, etc.
  }

  async handlePaymentNotification(data) {
    console.log('💳 [FCM] Processing payment notification:', data);
    // Update wallet balance, show payment status, etc.
  }

  async handleProfileUpdateNotification(data) {
    console.log('👤 [FCM] Processing profile update:', data);
    // Refresh profile data, show update notification, etc.
  }

  /**
   * Navigate based on notification data
   */
  navigateBasedOnNotification(data) {
    const type = data?.type;
    
    console.log('🧭 [FCM] Navigating based on notification type:', type);
    
    // This would integrate with your navigation system
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
  }

  /**
   * Setup token refresh listener
   */
  setupTokenRefreshListener() {
    // Note: Expo handles token refresh automatically
    // We can periodically check for token updates if needed
    console.log('🔄 [FCM] Token refresh handling setup (managed by Expo)');
  }

  /**
   * Setup token refresh handler
   */
  setupTokenRefreshHandler() {
    try {
      if (messaging && isStandaloneBuild && !isExpoGo) {
        console.log('🔄 [FCM] Setting up token refresh handler...');
        
        // Listen for token refresh events using the correct method
        this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
          console.log('🔄 [FCM] FCM token refreshed:', newToken.substring(0, 20) + '...');
          
          try {
            // Store new token locally
            await AsyncStorage.setItem('fcm_token', newToken);
            this.token = newToken;
            
            // Register new token with backend
            await this.registerTokenWithBackend(newToken);
            
            console.log('✅ [FCM] Token refresh completed successfully');
          } catch (error) {
            console.error('❌ [FCM] Failed to handle token refresh:', error);
          }
        });
        
        console.log('✅ [FCM] Token refresh handler set up successfully');
      } else {
        console.log('📱 [FCM] Token refresh handler not needed for Expo Go');
      }
    } catch (error) {
      console.error('❌ [FCM] Failed to setup token refresh handler:', error);
    }
  }

  /**
   * Setup app state handler
   */
  setupAppStateHandler() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 [FCM] App became active, processing pending notifications');
        this.processPendingNotifications();
      }
    });
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications() {
    try {
      const pendingNotifications = await AsyncStorage.getItem('pending_notifications');
      if (!pendingNotifications) return;

      const notifications = JSON.parse(pendingNotifications);
      console.log(`🔄 [FCM] Processing ${notifications.length} pending notifications`);

      for (const notification of notifications) {
        await this.processNotificationByType(notification);
      }

      // Clear processed notifications
      await AsyncStorage.removeItem('pending_notifications');
      console.log('✅ [FCM] Pending notifications processed');
    } catch (error) {
      console.error('❌ [FCM] Failed to process pending notifications:', error);
    }
  }

  /**
   * Open notification settings
   */
  openNotificationSettings() {
    // This would open the device's notification settings
    console.log('⚙️ [FCM] Opening notification settings');
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
        await authAPI.post('/notifications/unregister-token', {
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
   * Manually refresh FCM token
   */
  async refreshToken() {
    try {
      console.log('🔄 [FCM] Manually refreshing FCM token...');
      
      // Clear old token
      await AsyncStorage.removeItem('fcm_token');
      await AsyncStorage.removeItem('fcm_token_registered');
      this.token = null;
      
      // Get new token
      const newToken = await this.getFCMToken();
      
      if (newToken) {
        console.log('✅ [FCM] Token refreshed successfully:', newToken.substring(0, 20) + '...');
        return newToken;
      } else {
        throw new Error('Failed to get new FCM token');
      }
    } catch (error) {
      console.error('❌ [FCM] Failed to refresh token:', error);
      throw error;
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
        await authAPI.post('/notifications/unregister-token', {
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
    if (this.unsubscribeTokenRefresh) {
      this.unsubscribeTokenRefresh();
    }
    if (this.unsubscribeForeground) {
      this.unsubscribeForeground();
    }
    if (this.unsubscribeBackground) {
      this.unsubscribeBackground();
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
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
