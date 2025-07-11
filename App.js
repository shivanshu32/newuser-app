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

// Import version check hook
import useVersionCheck from './src/hooks/useVersionCheck';

// Create a wrapper component that uses the AuthContext
function AppContent() {
  const { token, initialLoading } = useAuth();
  const { checkForUpdatesOnLaunch } = useVersionCheck();
  const [updateRequired, setUpdateRequired] = useState(null);
  const [versionCheckComplete, setVersionCheckComplete] = useState(false);
  
  // Check for updates on app launch
  useEffect(() => {
    const performVersionCheck = async () => {
      try {
        console.log('Performing version check on app launch...');
        const updateData = await checkForUpdatesOnLaunch();
        
        if (updateData && updateData.updateRequired) {
          console.log('Update required, setting update data:', updateData);
          setUpdateRequired(updateData);
        } else {
          console.log('No update required');
        }
      } catch (error) {
        console.error('Version check failed:', error);
      } finally {
        setVersionCheckComplete(true);
      }
    };

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
