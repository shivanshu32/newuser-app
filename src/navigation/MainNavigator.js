import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import BookingScreen from '../screens/main/BookingScreen';
import WalletScreen from '../screens/main/WalletScreen';
import WalletTopUpSummaryScreen from '../screens/main/WalletTopUpSummaryScreen';
import RazorpayPaymentScreen from '../screens/main/RazorpayPaymentScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AddUserProfile from '../screens/main/AddUserProfile';
import UpdateScreen from '../screens/UpdateScreen';
import ProfileCompletionCheck from '../components/ProfileCompletionCheck';
import AstrologerProfileScreen from '../screens/main/AstrologerProfileScreen';
import AstrologersScreen from '../screens/main/AstrologersScreen';
import BookingWaitingScreen from '../screens/main/BookingWaitingScreen';
import PendingConsultationsScreen from '../screens/main/PendingConsultationsScreen';
import ChatScreen from '../screens/session/ChatScreen';
import FixedChatScreen from '../screens/session/FixedChatScreen';
import FixedFreeChatScreen from '../screens/session/FixedFreeChatScreen';
import PreChatForm from '../screens/session/PreChatForm';
import TransactionHistoryScreen from '../screens/main/TransactionHistoryScreen';
import TransactionDetailScreen from '../screens/main/TransactionDetailScreen';
import ChatHistoryScreen from '../screens/ChatHistoryScreen';
import BlogDetailScreen from '../screens/main/BlogDetailScreen';

// E-Pooja screens
import EPoojaCategories from '../screens/epooja/EPoojaCategories';
import EPoojaDetails from '../screens/epooja/EPoojaDetails';
import EPoojaBooking from '../screens/epooja/EPoojaBooking';
import EPoojaBookings from '../screens/epooja/EPoojaBookings';

import RatingScreen from '../screens/session/RatingScreen';

// Import components
import NotificationBadge from '../components/NotificationBadge';
import BookingAcceptedPopup from '../components/BookingAcceptedPopup';
import BookingAcceptedModal from '../components/BookingAcceptedModal';

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
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Bookings" 
        component={BookingScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen} 
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ headerShown: false }}
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
        consultationType: bookingData.bookingType || bookingData.type
      });
      
      console.log(' [BookingPopupWrapper] Successfully joined consultation room:', joinResult);
      
      // Prepare navigation parameters
      const navigationParams = {
        bookingId: bookingData.bookingId,
        sessionId: bookingData.sessionId,
        roomId: bookingData.roomId,
        astrologerId: bookingData.astrologerId,
        consultationType: bookingData.bookingType || bookingData.type
      };
      
      console.log(' [BookingPopupWrapper] Navigation params prepared:', JSON.stringify(navigationParams, null, 2));
      
      // Navigate to appropriate session screen after successful join
      const consultationType = bookingData.bookingType || bookingData.type;
      console.log(' [BookingPopupWrapper] Using consultation type:', consultationType);
      
      if (consultationType === 'video') {
        console.log(' [BookingPopupWrapper] Video calls are no longer supported');
        // Video calls are no longer supported
      } else if (consultationType === 'voice') {
        console.log(' [BookingPopupWrapper] Voice call handled by Exotel - no navigation needed');
        // Voice calls are now handled by Exotel - no navigation needed
      } else if (consultationType === 'chat') {
        console.log(' [BookingPopupWrapper] Navigating to FixedChatScreen screen');
        navigation.navigate('FixedChatScreen', {
          bookingId: bookingData.bookingId,
          sessionId: bookingData.sessionId,
          roomId: bookingData.roomId,
          astrologerId: bookingData.astrologerId,
          consultationType: consultationType
        });
        console.log(' [BookingPopupWrapper] FixedChatScreen navigation completed');
      } else {
        console.error(' [BookingPopupWrapper] Unknown consultation type:', consultationType);
        console.error(' [BookingPopupWrapper] Available booking data:', JSON.stringify(bookingData, null, 2));
        Alert.alert('Error', `Unknown consultation type: ${consultationType}`);
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

  // Determine which popup component to render based on booking type
  const bookingType = popupData?.bookingType || 'chat';
  const shouldUseModal = bookingType === 'voice' || bookingType === 'video';
  
  console.log('🎯 [BookingPopupWrapper] Rendering popup - bookingType:', bookingType, 'shouldUseModal:', shouldUseModal);
  
  if (shouldUseModal) {
    // Use BookingAcceptedModal for voice and video consultations
    return (
      <BookingAcceptedModal
        visible={isVisible}
        onClose={hideBookingAcceptedPopup}
        onJoinNow={() => handleJoinSession(popupData)}
        astrologerName={popupData?.astrologerName}
        astrologerImage={popupData?.astrologerImage}
        bookingType={bookingType}
      />
    );
  } else {
    // Use BookingAcceptedPopup for chat consultations
    return (
      <BookingAcceptedPopup
        visible={isVisible}
        onClose={hideBookingAcceptedPopup}
        bookingData={popupData}
        onJoinSession={handleJoinSession}
      />
    );
  }
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
        <Stack.Screen name="Main">
          {() => (
            <ProfileCompletionCheck>
              <TabNavigator />
            </ProfileCompletionCheck>
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="AstrologerProfile" 
          component={AstrologerProfileScreen} 
          options={{ headerShown: true, title: 'Astrologer Profile' }}
        />
        <Stack.Screen 
          name="Astrologers" 
          component={AstrologersScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Chat" 
          component={ChatScreen} 
          options={{ headerShown: true, title: 'Chat Consultation' }}
        />
        <Stack.Screen 
          name="EnhancedChat" 
          component={FixedChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PreChatForm" 
          component={PreChatForm} 
          options={{ headerShown: false }}
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
          name="FixedChatScreen" 
          component={FixedChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="FixedFreeChatScreen" 
          component={FixedFreeChatScreen} 
          options={{ headerShown: false }}
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
        <Stack.Screen 
          name="WalletTopUpSummary" 
          component={WalletTopUpSummaryScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RazorpayPayment" 
          component={RazorpayPaymentScreen} 
          options={{ headerShown: true, title: 'Payment' }}
        />
        <Stack.Screen 
          name="AddUserProfile" 
          component={AddUserProfile} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="UpdateScreen" 
          component={UpdateScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="TransactionHistory" 
          component={TransactionHistoryScreen} 
          options={{ headerShown: true, title: 'Transaction History' }}
        />
        <Stack.Screen 
          name="TransactionDetail" 
          component={TransactionDetailScreen} 
          options={{ headerShown: true, title: 'Transaction Details' }}
        />
        <Stack.Screen 
          name="ChatHistory" 
          component={ChatHistoryScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="BlogDetail" 
          component={BlogDetailScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EPoojaCategories" 
          component={EPoojaCategories} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EPoojaDetails" 
          component={EPoojaDetails} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EPoojaBooking" 
          component={EPoojaBooking} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="EPoojaBookings" 
          component={EPoojaBookings} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <BookingPopupWrapper />
    </BookingPopupProvider>
  );
};

export default MainNavigator;
