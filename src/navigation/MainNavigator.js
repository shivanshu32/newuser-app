import React, { useState, useEffect } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/main/HomeScreen';
import BookingScreen from '../screens/main/BookingScreen';
import WalletScreen from '../screens/main/WalletScreen';
import WalletTopUpSummaryScreen from '../screens/main/WalletTopUpSummaryScreen';
import PrepaidOfferPaymentScreen from '../screens/main/PrepaidOfferPaymentScreen';
import PrepaidRechargeCardPaymentScreen from '../screens/main/PrepaidRechargeCardPaymentScreen';
import PrepaidRechargeCardsListScreen from '../screens/main/PrepaidRechargeCardsListScreen';
import PrepaidVoiceCardsListScreen from '../screens/main/PrepaidVoiceCardsListScreen';
import PrepaidVoiceCardPaymentScreen from '../screens/main/PrepaidVoiceCardPaymentScreen';
import PrepaidVoicePackAstrologersScreen from '../screens/main/PrepaidVoicePackAstrologersScreen';
import RazorpayPaymentScreen from '../screens/main/RazorpayPaymentScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import AddUserProfile from '../screens/main/AddUserProfile';
import UpdateScreen from '../screens/UpdateScreen';
import ProfileCompletionCheck from '../components/ProfileCompletionCheck';
import AstrologerProfileScreen from '../screens/main/AstrologerProfileScreen';
import AstrologersScreen from '../screens/main/AstrologersScreen';
import PrepaidChatPackAstrologersScreen from '../screens/main/PrepaidChatPackAstrologersScreen';
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
import BlogListScreen from '../screens/main/BlogListScreen';
import DailyHoroscopeScreen from '../screens/main/DailyHoroscopeScreen';
import AstrologyToolScreen from '../screens/main/AstrologyToolScreen';
import PoojaDetailScreen from '../screens/pooja/PoojaDetailScreen';
import PoojaListScreen from '../screens/pooja/PoojaListScreen';
import PoojaDetailsForm from '../screens/pooja/PoojaDetailsForm';

// Shop Navigator
import ShopNavigator from './ShopNavigator';

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

// CRED-inspired dark theme with gold accent
const TAB_COLORS = {
  background: '#000000',
  active: '#C8A46A',
  inactive: '#5A5A5A',
  border: 'transparent',
  centerBg: '#111111',
  centerRing: '#C8A46A',
  centerIcon: '#F5F5F5',
  centerGlow: 'rgba(200, 164, 106, 0.2)',
};

// Custom center tab button (premium dark floating button with gold ring)
const CenterTabButton = ({ children, onPress, accessibilityState }) => {
  const focused = accessibilityState?.selected;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.centerButtonContainer}
    >
      <View style={styles.centerButtonWrapper}>
        {focused && (
          <View style={styles.centerButtonGlowOuter} />
        )}
        <View
          style={[
            styles.centerButtonInner,
            focused && styles.centerButtonFocused,
          ]}
        >
          <Ionicons
            name="home"
            size={18}
            color={focused ? TAB_COLORS.active : TAB_COLORS.inactive}
          />
        </View>
        {focused && <View style={styles.centerButtonGlow} />}
      </View>
    </TouchableOpacity>
  );
};

// Main tab navigator - CRED style
const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          const iconSize = 24;

          if (route.name === 'Home') {
            return null;
          } else if (route.name === 'Bookings') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Shop') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: TAB_COLORS.active,
        tabBarInactiveTintColor: TAB_COLORS.inactive,
        tabBarStyle: [styles.tabBar, { paddingBottom: bottomPadding, height: 64 + bottomPadding }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Bookings" 
        component={BookingScreen} 
        options={{ tabBarLabel: 'BOOKINGS' }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopNavigator}
        options={{ tabBarLabel: 'SHOP' }}
      />
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarLabel: () => null,
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen} 
        options={{ tabBarLabel: 'WALLET' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'PROFILE' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(200, 164, 106, 0.08)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: -4,
    textTransform: 'uppercase',
  },
  tabBarItem: {
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 56,
    height: 56,
  },
  centerButtonWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 52,
    height: 52,
  },
  centerButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TAB_COLORS.centerBg,
    borderWidth: 1.5,
    borderColor: 'rgba(200, 164, 106, 0.25)',
    shadowColor: TAB_COLORS.centerRing,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 2,
  },
  centerButtonFocused: {
    borderColor: '#C8A46A',
    borderWidth: 2,
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  centerButtonGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TAB_COLORS.centerGlow,
    zIndex: 1,
    opacity: 0.4,
  },
  centerButtonGlowOuter: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(200, 164, 106, 0.08)',
    zIndex: 0,
    opacity: 0.3,
  },
});

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
          name="PrepaidChatPackAstrologers" 
          component={PrepaidChatPackAstrologersScreen} 
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
          name="PrepaidRechargeCardPayment" 
          component={PrepaidRechargeCardPaymentScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PrepaidRechargeCardsList" 
          component={PrepaidRechargeCardsListScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PrepaidVoiceCardsList" 
          component={PrepaidVoiceCardsListScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PrepaidVoiceCardPayment" 
          component={PrepaidVoiceCardPaymentScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PrepaidVoicePackAstrologers" 
          component={PrepaidVoicePackAstrologersScreen} 
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
          name="BlogList" 
          component={BlogListScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="DailyHoroscope" 
          component={DailyHoroscopeScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="AstrologyTool" 
          component={AstrologyToolScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PoojaDetail" 
          component={PoojaDetailScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PoojaList" 
          component={PoojaListScreen} 
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="PoojaDetailsForm" 
          component={PoojaDetailsForm} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <BookingPopupWrapper />
    </BookingPopupProvider>
  );
};

export default MainNavigator;
