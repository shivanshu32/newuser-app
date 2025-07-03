import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Alert } from 'react-native';
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
import TestBookingPopup from '../components/TestBookingPopup';

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

  // Debug wrapper state
  useEffect(() => {
    console.log(' [BookingPopupWrapper] State update:');
    console.log('   - isVisible:', isVisible);
    console.log('   - popupData present:', !!popupData);
    console.log('   - popupData:', popupData);
  }, [isVisible, popupData]);

  // Setup event listener for booking accepted popup
  useEffect(() => {
    const handleShowBookingAcceptedPopup = (bookingData) => {
      console.log(' [BookingPopupWrapper] Received showBookingAcceptedPopup event:', bookingData);
      console.log(' [BookingPopupWrapper] Event data type:', typeof bookingData);
      console.log(' [BookingPopupWrapper] Event data keys:', bookingData ? Object.keys(bookingData) : 'none');
      
      if (!bookingData) {
        console.error(' [BookingPopupWrapper] ERROR: Received null/undefined bookingData from event!');
        return;
      }
      
      console.log(' [BookingPopupWrapper] Calling showBookingAcceptedPopup...');
      showBookingAcceptedPopup(bookingData);
      console.log(' [BookingPopupWrapper] showBookingAcceptedPopup call completed');
    };

    if (global.eventEmitter) {
      console.log(' [BookingPopupWrapper] Setting up event listener for showBookingAcceptedPopup');
      global.eventEmitter.on('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);

      return () => {
        console.log(' [BookingPopupWrapper] Cleaning up event listener for showBookingAcceptedPopup');
        global.eventEmitter.off('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
      };
    } else {
      console.error(' [BookingPopupWrapper] ERROR: global.eventEmitter is not available!');
    }
  }, [showBookingAcceptedPopup]);

  const navigation = useNavigation();

  const handleJoinSession = async (bookingData) => {
    try {
      console.log(' [BookingPopupWrapper] Starting handleJoinSession with data:', JSON.stringify(bookingData, null, 2));
      
      // Validate required parameters
      if (!bookingData || !bookingData.bookingId) {
        console.error(' [BookingPopupWrapper] Missing bookingId in bookingData:', bookingData);
        Alert.alert('Error', 'Missing booking information. Please try again.');
        return;
      }
      
      console.log(' [BookingPopupWrapper] Validation passed, joining consultation room...');
      
      // Join the consultation room via socket
      const joinResult = await joinConsultationRoom({
        bookingId: bookingData.bookingId,
        sessionId: bookingData.sessionId,
        roomId: bookingData.roomId,
        astrologerId: bookingData.astrologerId,
        consultationType: bookingData.type
      });
      
      console.log(' [BookingPopupWrapper] Successfully joined consultation room:', joinResult);
      
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
        console.log(' [BookingPopupWrapper] Navigating to EnhancedConsultationRoom screen');
        navigation.navigate('EnhancedConsultationRoom', {
          bookingId: bookingData.bookingId,
          sessionId: bookingData.sessionId,
          roomId: bookingData.roomId,
          astrologerId: bookingData.astrologerId,
          consultationType: bookingData.type
        });
        console.log(' [BookingPopupWrapper] EnhancedConsultationRoom navigation completed');
      } else {
        console.error(' [BookingPopupWrapper] Unknown consultation type:', bookingData.type);
        Alert.alert('Error', `Unknown consultation type: ${bookingData.type}`);
        return;
      }
      
      console.log(' [BookingPopupWrapper] handleJoinSession completed successfully');
      
    } catch (error) {
      console.error(' [BookingPopupWrapper] Error in handleJoinSession:', error);
      console.error(' [BookingPopupWrapper] Error stack:', error.stack);
      Alert.alert('Error', `Failed to join session: ${error.message || 'Unknown error'}`);
      // Don't re-throw the error, handle it gracefully
    }
  };

  return (
    <>
      <BookingAcceptedPopup
        visible={isVisible}
        onClose={hideBookingAcceptedPopup}
        bookingData={popupData}
        onJoinSession={handleJoinSession}
      />
      
      {/* Test popup to isolate the narrow box issue */}
      <TestBookingPopup
        visible={false} // Set to true to test
        onClose={() => console.log('🧪 [TestBookingPopup] Close called')}
      />
    </>
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
