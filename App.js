import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';

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
