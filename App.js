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

// Import error boundary and edge-to-edge handler
import ErrorBoundary from './src/components/ErrorBoundary';
import ContextErrorBoundary from './src/components/ContextErrorBoundary';
import EdgeToEdgeHandler from './src/components/EdgeToEdgeHandler';

// Analytics service import (no-op implementation)
import analyticsService from './src/services/analyticsService';
import { Settings } from 'react-native-fbsdk-next';
// Import version check hook
import useVersionCheck from './src/hooks/useVersionCheck';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://d1f4441d45237d6cbf1bf0a140a565cb@o4509860442406912.ingest.de.sentry.io/4509860448436304',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// Create a wrapper component that uses the AuthContext
function AppContent() {
  const { token, initialLoading } = useAuth();
  const { checkForUpdatesOnLaunch } = useVersionCheck();
  const [updateRequired, setUpdateRequired] = useState(null);
  const [versionCheckComplete, setVersionCheckComplete] = useState(false);


  
  // Analytics and crash tracking initialization (completely non-blocking)
  useEffect(() => {
    console.log('📊 [APP] Analytics disabled - skipping initialization');
    
    // Minimal crash-safe initialization tracking
    const trackAppInitialization = () => {
      try {
        console.log('📊 [APP] App initialization started - version 5.2.1');
        console.log('📊 [APP] Platform: android');
        console.log('📊 [APP] Timestamp:', new Date().toISOString());
      } catch (error) {
        // Silent fail - don't crash the app
      }
    };
    
    // Immediate execution - no async operations
    trackAppInitialization();
  }, []);

  // Check for updates on app launch (completely non-blocking and crash-safe)
  useEffect(() => {
    // Allow app to start immediately - no version check blocking
    setVersionCheckComplete(true);
    
    // Minimal version check in background (crash-safe)
    const performVersionCheck = () => {
      try {
        console.log('📱 [App] Skipping version check to prevent crashes');
        console.log('📱 [App] App will start immediately');
        
        // Optional: Perform version check after app is fully loaded
        setTimeout(() => {
          if (checkForUpdatesOnLaunch && typeof checkForUpdatesOnLaunch === 'function') {
            checkForUpdatesOnLaunch()
              .then(updateData => {
                if (updateData?.updateRequired) {
                  console.log('📱 [App] Update available (background check):', updateData);
                  // Could show update prompt here if needed
                }
              })
              .catch(error => {
                console.warn('📱 [App] Background version check failed:', error);
              });
          }
        }, 3000); // Check after 3 seconds when app is stable
        
      } catch (error) {
        console.error('📱 [App] Version check setup failed:', error);
        // Continue anyway - don't crash
      }
    };
    
    performVersionCheck();
  }, []);
  
  // Show loading only during initial auth check - remove version check dependency
  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F97316" />
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: '#6B7280', fontSize: 16 }}>Loading...</Text>
        </View>
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

export default Sentry.wrap(function App() {
 
  useEffect(() => {
    Settings.initializeSDK();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <EdgeToEdgeHandler>
          <ContextErrorBoundary 
            contextName="Auth" 
            fallbackMessage="Authentication service failed. App will continue with limited functionality."
            onError={(error) => console.error('Auth context crashed:', error)}
          >
            <AuthProvider>
              <ContextErrorBoundary 
                contextName="Notifications" 
                fallbackMessage="Notification service failed. You may not receive push notifications."
                onError={(error) => console.error('Notification context crashed:', error)}
              >
                <NotificationProvider>
                  <ContextErrorBoundary 
                    contextName="Socket" 
                    fallbackMessage="Real-time connection failed. Some features may not work properly."
                    onError={(error) => console.error('Socket context crashed:', error)}
                  >
                    <SocketProvider>
                      <ContextErrorBoundary 
                        contextName="FreeChat" 
                        fallbackMessage="Free chat service failed. Free chat features may be unavailable."
                        onError={(error) => console.error('FreeChat context crashed:', error)}
                      >
                        <FreeChatProvider>
                          <NavigationContainer>
                            <AppContent />
                          </NavigationContainer>
                        </FreeChatProvider>
                      </ContextErrorBoundary>
                    </SocketProvider>
                  </ContextErrorBoundary>
                </NotificationProvider>
              </ContextErrorBoundary>
            </AuthProvider>
          </ContextErrorBoundary>
          <StatusBar style="auto" />
        </EdgeToEdgeHandler>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
});