import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Create context
const NotificationContext = createContext();

// Import API service
import { authAPI } from '../services/api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NotificationProvider = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();
  const { token } = useAuth();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log('Expo push token obtained:', token);
      }
    });

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
      
      // Handle offer notifications specially
      const data = notification.request.content.data;
      if (data && data.type === 'offer') {
        console.log('Offer notification received:', data);
        // You could store offer notifications in AsyncStorage or state for later display
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      // Handle notification tap here
      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

    // Register token with backend if user is logged in
    if (token && expoPushToken) {
      registerTokenWithBackend(expoPushToken);
    }

    // Setup socket listener for real-time offer notifications
    const setupSocketListener = async () => {
      try {
        const { socket } = require('../context/SocketContext');
        if (socket && socket.connected) {
          socket.on('offer_notification', (data) => {
            console.log('Real-time offer notification received:', data);
            // Display the notification immediately
            scheduleLocalNotification(
              data.title,
              data.message,
              { type: 'offer', notificationId: data.notificationId }
            );
          });
        }
      } catch (error) {
        console.log('Error setting up socket listener for offers:', error);
      }
    };
    
    setupSocketListener();

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
      
      // Clean up socket listener
      try {
        const { socket } = require('../context/SocketContext');
        if (socket) {
          socket.off('offer_notification');
        }
      } catch (error) {
        console.log('Error cleaning up socket listener:', error);
      }
    };
  }, [token, expoPushToken]);

  // Register token with backend
  const registerTokenWithBackend = async (pushToken) => {
    try {
      // Call the backend API to register the token
      await authAPI.registerDeviceToken(pushToken);
      console.log('FCM token registered with backend:', pushToken);
    } catch (error) {
      console.log('Error registering token with backend:', error);
    }
  };

  // Handle notification navigation
  const handleNotificationNavigation = (data) => {
    console.log('Handling notification navigation with data:', data);
    
    // Navigation logic based on notification type
    if (data.type === 'booking' && data.bookingId) {
      // Navigate to booking details
      // navigation.navigate('Bookings', { screen: 'BookingDetails', params: { id: data.bookingId } });
    } else if (data.type === 'chat' && data.sessionId) {
      // Navigate to chat session
      // navigation.navigate('Chat', { sessionId: data.sessionId });
    } else if (data.type === 'offer') {
      // Navigate to wallet or offers screen for promotional offers
      // navigation.navigate('Wallet');
      console.log('Received offer notification:', data.title, data.message);
    }
  };

  // Send test notification
  const sendTestNotification = async () => {
    try {
      // In a real app, this would call your backend API
      // await axios.post(`${API_URL}/notifications/test`);
      console.log('Test notification sent');
      
      // For demo purposes, schedule a local notification
      await scheduleLocalNotification(
        'Test Notification',
        'This is a test notification from Jyotish Call',
        { type: 'test' }
      );
      
      return { success: true };
    } catch (error) {
      console.log('Error sending test notification:', error);
      return { success: false, message: 'Failed to send test notification' };
    }
  };

  // Schedule a local notification
  const scheduleLocalNotification = async (title, body, data = {}) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: { seconds: 1 },
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        sendTestNotification,
        scheduleLocalNotification,
        handleNotificationNavigation,
        registerTokenWithBackend
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Helper function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;
  
  // Create offer notification channel for Android
  if (Platform.OS === 'android') {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    // Special channel for offers
    await Notifications.setNotificationChannelAsync('offers', {
      name: 'Offers & Promotions',
      description: 'Notifications for special offers and promotions',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 200, 300],
      lightColor: '#FF9800',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: "19ce1c4d-7c68-407f-96a0-d41bedaa3d55" // JyotishCall User App project ID
      })).data;
      console.log('Expo push token:', token);
      
      // Store token in AsyncStorage for persistence
      await AsyncStorage.setItem('expoPushToken', token);
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export default NotificationContext;
