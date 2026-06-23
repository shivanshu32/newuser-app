import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';

const Stack = createNativeStackNavigator();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false, // Hide headers for clean UI
      }}
    >
      <Stack.Screen 
        name="Splash" 
        component={SplashScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
      />
      <Stack.Screen 
        name="OtpVerification" 
        component={OtpVerificationScreen} 
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
