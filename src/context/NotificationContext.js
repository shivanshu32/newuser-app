import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Create context
const NotificationContext = createContext();

// API URL
const API_URL = 'http://your-backend-url.com/api/v1';

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
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
      // Handle notification tap here
      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

    // Register token with backend if user is logged in
    if (token && expoPushToken) {
      registerTokenWithBackend(expoPushToken);
    }

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [token, expoPushToken]);

  // Register token with backend
  const registerTokenWithBackend = async (pushToken) => {
    try {
      // In a real app, this would call your backend API
      // await axios.post(`${API_URL}/notifications/register-token`, { token: pushToken });
      console.log('FCM token registered with backend:', pushToken);
    } catch (error) {
      console.log('Error registering token with backend:', error);
    }
  };

  // Handle notification navigation
  const handleNotificationNavigation = (data) => {
    // This function would be implemented to navigate to the appropriate screen
    // based on the notification data
    console.log('Handling notification navigation with data:', data);
    
    // Example navigation logic:
    // if (data.type === 'booking' && data.bookingId) {
    //   navigation.navigate('Bookings', { screen: 'BookingDetails', params: { id: data.bookingId } });
    // } else if (data.type === 'chat' && data.sessionId) {
    //   navigation.navigate('Chat', { sessionId: data.sessionId });
    // }
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
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
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
      alert('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: "your-project-id" // Replace with your actual Expo project ID
    })).data;
    console.log('Expo push token:', token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

export default NotificationContext;
