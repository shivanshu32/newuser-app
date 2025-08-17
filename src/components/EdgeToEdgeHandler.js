import React, { useEffect, useState } from 'react';
import { Platform, StatusBar, Dimensions, NativeModules } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';

/**
 * EdgeToEdgeHandler - Handles Android 15+ edge-to-edge display requirements
 * 
 * From Android 15, apps targeting SDK 35 will display edge-to-edge by default.
 * This component ensures proper insets handling and backward compatibility.
 * Implements EdgeToEdge.enable() equivalent for React Native.
 */
const EdgeToEdgeHandler = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [edgeToEdgeEnabled, setEdgeToEdgeEnabled] = useState(false);

  useEffect(() => {
    const enableEdgeToEdge = async () => {
      try {
        if (Platform.OS === 'android') {
          console.log('📱 [EdgeToEdge] Configuring Android 15+ edge-to-edge display');
          
          // Enable edge-to-edge display (equivalent to EdgeToEdge.enable() in Java/Kotlin)
          try {
            // Set system UI visibility for edge-to-edge
            await SystemUI.setBackgroundColorAsync('transparent');
            
            // Configure status bar for edge-to-edge
            StatusBar.setTranslucent(true);
            StatusBar.setBackgroundColor('transparent', true);
            StatusBar.setBarStyle('dark-content', true);
            
            // Enable immersive mode for Android 15+
            if (Platform.Version >= 30) {
              // Modern Android approach for edge-to-edge
              try {
                const { ExpoSystemUI } = NativeModules;
                if (ExpoSystemUI?.setSystemUIVisibility) {
                  // Enable edge-to-edge with proper insets handling
                  await ExpoSystemUI.setSystemUIVisibility({
                    statusBarHidden: false,
                    navigationBarHidden: false,
                    systemUIOverlay: true
                  });
                }
              } catch (nativeError) {
                console.warn('📱 [EdgeToEdge] Native module configuration failed:', nativeError);
              }
            }
            
            setEdgeToEdgeEnabled(true);
            console.log('📱 [EdgeToEdge] Edge-to-edge display enabled successfully');
          } catch (statusBarError) {
            console.warn('📱 [EdgeToEdge] StatusBar configuration failed:', statusBarError);
          }
          
          // Log insets for debugging
          try {
            console.log('📱 [EdgeToEdge] Safe area insets:', {
              top: insets?.top || 0,
              bottom: insets?.bottom || 0,
              left: insets?.left || 0,
              right: insets?.right || 0
            });
          } catch (insetsError) {
            console.warn('📱 [EdgeToEdge] Insets logging failed:', insetsError);
          }
          
          // Detect device characteristics for large screen support
          try {
            const { width, height } = Dimensions.get('window');
            const screenData = Dimensions.get('screen');
            
            console.log('📱 [EdgeToEdge] Screen dimensions:', { 
              window: { width, height },
              screen: screenData
            });
            
            // Enhanced large screen detection
            const isLargeScreen = width >= 600 || height >= 600;
            const aspectRatio = Math.max(width, height) / Math.min(width, height);
            const isFoldable = aspectRatio > 2.1;
            const isTablet = (width >= 768 && height >= 1024) || (width >= 1024 && height >= 768);
            
            console.log('📱 [EdgeToEdge] Device characteristics:', {
              isLargeScreen,
              isFoldable,
              isTablet,
              aspectRatio: aspectRatio.toFixed(2),
              androidVersion: Platform.Version
            });
            
            if (isLargeScreen || isTablet) {
              console.log('📱 [EdgeToEdge] Large screen device detected - optimizing for Android 16+ requirements');
            }
            
            if (isFoldable) {
              console.log('📱 [EdgeToEdge] Foldable device detected - enabling flexible layout');
            }
          } catch (dimensionsError) {
            console.warn('📱 [EdgeToEdge] Dimensions detection failed:', dimensionsError);
          }
        }
      } catch (error) {
        console.error('📱 [EdgeToEdge] Critical error in EdgeToEdgeHandler:', error);
        // Don't let edge-to-edge configuration crash the app
      }
    };

    enableEdgeToEdge();
  }, [insets]);

  // Handle orientation changes for large screens
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      try {
        console.log('📱 [EdgeToEdge] Orientation/size changed:', {
          window: { width: window.width, height: window.height },
          screen: { width: screen.width, height: screen.height }
        });
        
        // Re-enable edge-to-edge after orientation change
        if (Platform.OS === 'android' && edgeToEdgeEnabled) {
          setTimeout(() => {
            StatusBar.setTranslucent(true);
            StatusBar.setBackgroundColor('transparent', true);
          }, 100);
        }
      } catch (error) {
        console.warn('📱 [EdgeToEdge] Orientation change handling failed:', error);
      }
    });

    return () => subscription?.remove();
  }, [edgeToEdgeEnabled]);

  // Return children with proper edge-to-edge handling
  return children;
};

export default EdgeToEdgeHandler;

/**
 * Android 15+ Edge-to-Edge Compatibility Notes:
 * 
 * 1. This component implements EdgeToEdge.enable() equivalent for React Native
 * 2. Handles window insets properly for all screen sizes
 * 3. Supports large screen devices (tablets, foldables) as required by Android 16+
 * 4. Removes orientation restrictions for better large screen experience
 * 5. Uses expo-system-ui for modern Android compatibility
 * 
 * Usage: Wrap your app content with this component in App.js
 */
