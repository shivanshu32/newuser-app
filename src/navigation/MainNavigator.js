import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import BookingScreen from '../screens/main/BookingScreen';
import WalletScreen from '../screens/main/WalletScreen';
import WalletTopUpSummaryScreen from '../screens/main/WalletTopUpSummaryScreen';
import PrepaidOfferPaymentScreen from '../screens/main/PrepaidOfferPaymentScreen';
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
import EnhancedFixedFreeChatScreen from '../screens/session/EnhancedFixedFreeChatScreen';
import PreChatForm from '../screens/session/PreChatForm';
import FreeChatPreForm from '../screens/session/FreeChatPreForm';
import TransactionHistoryScreen from '../screens/main/TransactionHistoryScreen';
import TransactionDetailScreen from '../screens/main/TransactionDetailScreen';
import ChatHistoryScreen from '../screens/ChatHistoryScreen';
import BlogDetailScreen from '../screens/main/BlogDetailScreen';
import DailyHoroscopeScreen from '../screens/main/DailyHoroscopeScreen';

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
      console.log(' [BookingPopupWrapper] Attempting to join session:', bookingData);
      
      // Validate booking data
      if (!bookingData?.bookingId || !bookingData?.sessionId) {
        console.error(' [BookingPopupWrapper] Invalid booking data for session join:', bookingData);
        Alert.alert('Error', 'Invalid session data. Please try again.');
        return;
      }

      // Prevent rapid navigation calls that could cause stack overflow
      if (navigation.isFocused && !navigation.isFocused()) {
        console.warn(' [BookingPopupWrapper] Navigation not focused, preventing duplicate navigation');
        return;
      }

      // Get consultation type from booking data or default to 'chat'
      const consultationType = bookingData.consultationType || 'chat';
      console.log(' [BookingPopupWrapper] Consultation type:', consultationType);

      // Hide the popup before navigation to prevent double-taps
      hideBookingAcceptedPopup();

      // Navigate based on consultation type with reset action to prevent stack overflow
      const resetAction = CommonActions.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          {
            name: consultationType === 'voice' ? 'VoiceCallScreen' :
                  consultationType === 'video' ? 'VideoCallScreen' : 'FixedChatScreen',
            params: {
              bookingId: bookingData.bookingId,
              sessionId: bookingData.sessionId,
              roomId: bookingData.roomId,
              astrologerId: bookingData.astrologerId,
              consultationType: consultationType === 'voice' || consultationType === 'video' ? consultationType : 'chat'
            }
          }
        ]
      });

      console.log(` [BookingPopupWrapper] Navigating to ${consultationType} session with reset action`);
      navigation.dispatch(resetAction);
      
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
          name="EnhancedFixedFreeChatScreen" 
          component={EnhancedFixedFreeChatScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="FreeChatPreForm" 
          component={FreeChatPreForm} 
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
          name="PrepaidOfferPayment" 
          component={PrepaidOfferPaymentScreen} 
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
          name="DailyHoroscope" 
          component={DailyHoroscopeScreen} 
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
