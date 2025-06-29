import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import BookingScreen from '../screens/main/BookingScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AstrologerProfileScreen from '../screens/main/AstrologerProfileScreen';
import BookingWaitingScreen from '../screens/main/BookingWaitingScreen';
import PendingConsultationsScreen from '../screens/main/PendingConsultationsScreen';
import ChatScreen from '../screens/session/ChatScreen';
import EnhancedChatScreen from '../screens/session/EnhancedChatScreen';
import PreChatForm from '../screens/session/PreChatForm';
import VideoConsultationScreen from '../screens/VideoConsultationScreen';
import VoiceCallScreen from '../screens/VoiceCallScreen';
import RatingScreen from '../screens/session/RatingScreen';

// Import components
import NotificationBadge from '../components/NotificationBadge';
import BookingAcceptedPopup from '../components/BookingAcceptedPopup';

// Import context
import { BookingPopupProvider, useBookingPopup } from '../context/BookingPopupContext';

// Import utilities
import eventEmitter from '../utils/eventEmitter';
import { joinConsultationRoom } from '../services/socketService';

// Import navigation hook
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Set our custom event emitter as the global event emitter
if (!global.eventEmitter) {
  global.eventEmitter = eventEmitter;
}

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingScreen} 
        options={{ title: 'Bookings' }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen} 
        options={{ title: 'Wallet' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Wrapper component that uses the BookingPopup context
const BookingPopupWrapper = () => {
  const { popupData, isVisible, hideBookingAcceptedPopup, showBookingAcceptedPopup } = useBookingPopup();
  const navigation = useNavigation();

  // Listen for booking acceptance events
  useEffect(() => {
    const handleShowBookingAcceptedPopup = (bookingData) => {
      console.log(' [BookingPopupWrapper] Received showBookingAcceptedPopup event:', bookingData);
      showBookingAcceptedPopup(bookingData);
    };

    if (global.eventEmitter) {
      global.eventEmitter.on('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
    }

    return () => {
      if (global.eventEmitter) {
        global.eventEmitter.off('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
      }
    };
  }, [showBookingAcceptedPopup]);

  const handleJoinSession = async (bookingData) => {
    try {
      console.log(' [BookingPopupWrapper] Joining consultation room with data:', JSON.stringify(bookingData, null, 2));
      
      // Validate required parameters
      if (!bookingData.bookingId) {
        console.error(' [BookingPopupWrapper] Missing bookingId in bookingData');
        Alert.alert('Error', 'Missing booking information. Please try again.');
        return;
      }
      
      // Join the consultation room via socket
      await joinConsultationRoom({
        bookingId: bookingData.bookingId,
        sessionId: bookingData.sessionId,
        roomId: bookingData.roomId,
        astrologerId: bookingData.astrologerId,
        consultationType: bookingData.type
      });
      
      console.log(' [BookingPopupWrapper] Successfully joined consultation room');
      
      // Prepare navigation parameters
      const navigationParams = {
        bookingId: bookingData.bookingId,
        sessionId: bookingData.sessionId,
        roomId: bookingData.roomId,
        astrologerId: bookingData.astrologerId,
        consultationType: bookingData.type
      };
      
      console.log(' [BookingPopupWrapper] Navigation params prepared:', JSON.stringify(navigationParams, null, 2));
      
      // Navigate to appropriate session screen after successful join
      if (bookingData.type === 'video') {
        console.log(' [BookingPopupWrapper] Navigating to VideoCall screen');
        navigation.navigate('VideoCall', navigationParams);
        console.log(' [BookingPopupWrapper] VideoCall navigation completed');
      } else if (bookingData.type === 'voice') {
        console.log(' [BookingPopupWrapper] Navigating to VoiceCall screen');
        navigation.navigate('VoiceCall', navigationParams);
        console.log(' [BookingPopupWrapper] VoiceCall navigation completed');
      } else if (bookingData.type === 'chat') {
        console.log(' [BookingPopupWrapper] Navigating to EnhancedChat screen');
        navigation.navigate('EnhancedChat', {
          bookingId: bookingData.bookingId,
          astrologer: bookingData.astrologer,
          userInfo: bookingData.userInfo
        });
        console.log(' [BookingPopupWrapper] EnhancedChat navigation completed');
      } else {
        console.error(' [BookingPopupWrapper] Unknown consultation type:', bookingData.type);
        Alert.alert('Error', `Unknown consultation type: ${bookingData.type}`);
      }
      
    } catch (error) {
      console.error(' [BookingPopupWrapper] Error joining consultation room:', error);
      throw error;
    }
  };

  return (
    <BookingAcceptedPopup
      visible={isVisible}
      onClose={hideBookingAcceptedPopup}
      bookingData={popupData}
      onJoinSession={handleJoinSession}
    />
  );
};

// Main stack navigator that includes the tab navigator and other screens
const MainNavigator = () => {
  return (
    <BookingPopupProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen 
          name="AstrologerProfile" 
          component={AstrologerProfileScreen} 
          options={{ headerShown: true, title: 'Astrologer Profile' }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: true, title: 'Chat Consultation' }}
        />
        <Stack.Screen 
          name="EnhancedChat" 
          component={EnhancedChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PreChatForm" 
          component={PreChatForm} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="VideoCall" 
          component={VideoConsultationScreen} 
          options={{ headerShown: true, title: 'Video Consultation' }}
        />
        <Stack.Screen 
          name="Rating" 
          component={RatingScreen} 
          options={{ headerShown: true, title: 'Rate Your Consultation' }}
        />
        <Stack.Screen 
          name="ConsultationRoom" 
          component={ChatScreen} 
          options={{ headerShown: true, title: 'Consultation Room' }}
        />
        <Stack.Screen 
          name="EnhancedConsultationRoom" 
          component={EnhancedChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="VoiceCall" 
          component={VoiceCallScreen} 
          options={{ headerShown: true, title: 'Voice Consultation' }}
        />
        <Stack.Screen 
          name="BookingWaiting" 
          component={BookingWaitingScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PendingConsultations" 
          component={PendingConsultationsScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <BookingPopupWrapper />
    </BookingPopupProvider>
  );
};

export default MainNavigator;
