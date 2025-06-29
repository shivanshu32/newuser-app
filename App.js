import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
// import LogRocket from '@logrocket/react-native'; // Temporarily disabled due to build issues
import Constants from 'expo-constants';

// Initialize LogRocket safely - only in development or when safe
try {
  // Temporarily disable LogRocket to resolve build issues
  // TODO: Re-enable once LogRocket Maven repository issue is resolved
  if (false && (__DEV__ || Constants.debugMode)) {
    // LogRocket.init('r9ooew/jyotishcalluser-app');
    console.log('LogRocket initialized successfully');
  } else {
    console.log('LogRocket disabled temporarily due to build issues');
  }
} catch (error) {
  console.warn('LogRocket initialization failed:', error);
}

// Import navigation stacks
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { SocketProvider } from './src/context/SocketContext';

// Create a wrapper component that uses the AuthContext
function AppContent() {
  const { token, initialLoading } = useAuth();
  
  if (initialLoading) {
    // Show loading indicator only during initial auth check
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  // Return the appropriate navigator based on auth state
  return token ? <MainNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </NavigationContainer>
  );
}
