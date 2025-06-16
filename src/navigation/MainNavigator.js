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
import PendingConsultationsScreen from '../screens/main/PendingConsultationsScreen';
import ChatScreen from '../screens/session/ChatScreen';
import VideoCallScreen from '../screens/session/VideoCallScreen';
import RatingScreen from '../screens/session/RatingScreen';

// Import components
import NotificationBadge from '../components/NotificationBadge';

// Import utilities
import { getPendingConsultationsCount } from '../utils/pendingConsultationsStore';
import eventEmitter from '../utils/eventEmitter';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Set our custom event emitter as the global event emitter
if (!global.eventEmitter) {
  global.eventEmitter = eventEmitter;
}

// Main tab navigator
const TabNavigator = () => {
  const [pendingCount, setPendingCount] = useState(0);
  
  // Update badge count when component mounts and when pendingConsultationAdded event is fired
  useEffect(() => {
    // Initial count
    setPendingCount(getPendingConsultationsCount());
    
    // Listen for new pending consultations
    const handleNewConsultation = () => {
      console.log('New pending consultation detected, updating badge count');
      setPendingCount(getPendingConsultationsCount());
    };
    
    global.eventEmitter.on('pendingConsultationAdded', handleNewConsultation);
    
    return () => {
      global.eventEmitter.off('pendingConsultationAdded', handleNewConsultation);
    };
  }, []);
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
        tabBarActiveTintColor: '#8A2BE2',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Bookings" 
        component={BookingScreen} 
        options={{
          tabBarIcon: ({ focused, color, size }) => {
            const iconName = focused ? 'calendar' : 'calendar-outline';
            return (
              <View>
                <Ionicons name={iconName} size={size} color={color} />
                <NotificationBadge count={pendingCount} />
              </View>
            );
          }
        }}
      />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// Main stack navigator that includes the tab navigator and other screens
const MainNavigator = () => {
  return (
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
        name="PendingConsultations" 
        component={PendingConsultationsScreen} 
        options={{ headerShown: true, title: 'Pending Consultations' }}
      />
      <Stack.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ headerShown: true, title: 'Chat Consultation' }}
      />
      <Stack.Screen 
        name="VideoCall" 
        component={VideoCallScreen} 
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
    </Stack.Navigator>
  );
};

export default MainNavigator;
