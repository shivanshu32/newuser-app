import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Text } from 'react-native';
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
import UpdateRequiredScreen from './src/screens/UpdateRequiredScreen';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { SocketProvider } from './src/context/SocketContext';
import { FreeChatProvider } from './src/context/FreeChatContext';

// Import analytics service
import analyticsService from './src/services/analyticsService';

// Import version check hook
import useVersionCheck from './src/hooks/useVersionCheck';

// Create a wrapper component that uses the AuthContext
function AppContent() {
  const { token, initialLoading } = useAuth();
  const { checkForUpdatesOnLaunch } = useVersionCheck();
  const [updateRequired, setUpdateRequired] = useState(null);
  const [versionCheckComplete, setVersionCheckComplete] = useState(false);
  
  // Initialize Firebase Analytics on app launch (non-blocking)
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        console.log('🔥 [APP] Initializing Firebase Analytics...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Analytics initialization timeout')), 5000); // 5 second timeout
        });
        
        await Promise.race([
          analyticsService.initialize(),
          timeoutPromise
        ]);
        
        console.log('🔥 [APP] Firebase Analytics initialized successfully');
      } catch (error) {
        console.error('🔥 [APP] Failed to initialize Firebase Analytics:', error);
        // Don't crash the app if analytics fails - it's not critical for core functionality
        console.log('🔥 [APP] Continuing app startup without analytics');
      }
    };

    // Initialize analytics in background, don't block app startup
    initializeAnalytics();
  }, []);

  // Check for updates on app launch (non-blocking)
  useEffect(() => {
    const performVersionCheck = async () => {
      try {
        console.log('Performing version check on app launch...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Version check timeout')), 5000); // 5 second timeout
        });
        
        const updateData = await Promise.race([
          checkForUpdatesOnLaunch(),
          timeoutPromise
        ]);
        
        if (updateData && updateData.updateRequired) {
          console.log('Update required, setting update data:', updateData);
          setUpdateRequired(updateData);
        } else {
          console.log('No update required');
        }
      } catch (error) {
        console.error('Version check failed:', error);
        // Don't block app startup on version check failure
        console.log('Continuing app startup despite version check failure');
      }
    };

    // Allow app to start immediately - don't wait for version check
    setVersionCheckComplete(true);
    
    // Perform version check in background without blocking UI
    performVersionCheck();
  }, []);
  
  // Show loading during initial auth check or version check
  if (initialLoading || !versionCheckComplete) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F97316" />
        {!versionCheckComplete && (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 16 }}>Checking for updates...</Text>
          </View>
        )}
      </View>
    );
  }

  // Show update screen if update is required
  if (updateRequired) {
    return (
      <UpdateRequiredScreen 
        route={{
          params: {
            currentVersion: updateRequired.currentVersion,
            latestVersion: updateRequired.latestVersion,
            updateMessage: updateRequired.updateMessage,
            forceUpdate: updateRequired.forceUpdate,
          }
        }}
      />
    );
  }

  // Return the appropriate navigator based on auth state
  return token ? <MainNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <SocketProvider>
            <FreeChatProvider>
              <NavigationContainer>
                <AppContent />
              </NavigationContainer>
            </FreeChatProvider>
          </SocketProvider>
        </NotificationProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
