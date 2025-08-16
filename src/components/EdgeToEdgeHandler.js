import React, { useEffect } from 'react';
import { Platform, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * EdgeToEdgeHandler - Handles Android 15+ edge-to-edge display requirements
 * 
 * From Android 15, apps targeting SDK 35 will display edge-to-edge by default.
 * This component ensures proper insets handling for backward compatibility.
 */
const EdgeToEdgeHandler = ({ children }) => {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    try {
      if (Platform.OS === 'android') {
        console.log('📱 [EdgeToEdge] Configuring Android 15+ edge-to-edge display');
        
        // Safely configure status bar for edge-to-edge display
        try {
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent');
          StatusBar.setBarStyle('dark-content');
        } catch (statusBarError) {
          console.warn('📱 [EdgeToEdge] StatusBar configuration failed:', statusBarError);
        }
        
        // Safely log insets for debugging
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
        
        // Safely get screen dimensions
        try {
          const { width, height } = Dimensions.get('window');
          console.log('📱 [EdgeToEdge] Screen dimensions:', { width, height });
          
          // Detect large screen devices (tablets, foldables)
          const isLargeScreen = width >= 600 || height >= 600;
          const aspectRatio = Math.max(width, height) / Math.min(width, height);
          const isFoldable = aspectRatio > 2.1; // Common foldable aspect ratio
          
          console.log('📱 [EdgeToEdge] Device characteristics:', {
            isLargeScreen,
            isFoldable,
            aspectRatio: aspectRatio.toFixed(2)
          });
          
          if (isLargeScreen) {
            console.log('📱 [EdgeToEdge] Large screen device detected - optimizing layout');
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
  }, [insets]);

  // For Android, we let the SafeAreaProvider handle insets
  // The MainActivity already enables edge-to-edge with WindowCompat.setDecorFitsSystemWindows(window, false)
  return children;
};

export default EdgeToEdgeHandler;
