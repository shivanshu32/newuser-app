import { useEffect, useState, useCallback } from 'react';
import { Platform, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Android15Compatibility from '../utils/android15Compatibility';

/**
 * Custom hook for Android 15+ compatibility
 * Handles edge-to-edge display, deprecated APIs, and large screen support
 */
export const useAndroid15Compatibility = () => {
  const [isCompatibilityEnabled, setIsCompatibilityEnabled] = useState(false);
  const [deviceCharacteristics, setDeviceCharacteristics] = useState({});
  const [compatibilityStatus, setCompatibilityStatus] = useState({});
  const insets = useSafeAreaInsets();

  // Initialize Android 15 compatibility
  const initializeCompatibility = useCallback(async () => {
    try {
      if (Platform.OS !== 'android') {
        console.log('📱 [useAndroid15] Skipping Android 15 compatibility on non-Android platform');
        return;
      }

      console.log('📱 [useAndroid15] Initializing Android 15+ compatibility');

      // Enable edge-to-edge display
      const edgeToEdgeEnabled = await Android15Compatibility.enableEdgeToEdge();
      
      // Get device characteristics
      const characteristics = Android15Compatibility.getWindowInsets();
      setDeviceCharacteristics(characteristics || {});

      // Validate compatibility
      const status = Android15Compatibility.validateCompatibility();
      setCompatibilityStatus(status);

      // Configure status bar for edge-to-edge
      if (edgeToEdgeEnabled) {
        try {
          StatusBar.setTranslucent(true);
          StatusBar.setBackgroundColor('transparent', true);
          StatusBar.setBarStyle('dark-content', true);
        } catch (error) {
          console.warn('📱 [useAndroid15] StatusBar configuration failed:', error);
        }
      }

      setIsCompatibilityEnabled(edgeToEdgeEnabled);
      console.log('📱 [useAndroid15] Android 15 compatibility initialized successfully');
    } catch (error) {
      console.error('📱 [useAndroid15] Compatibility initialization failed:', error);
    }
  }, []);

  // Handle orientation changes
  const handleOrientationChange = useCallback((dimensions) => {
    try {
      console.log('📱 [useAndroid15] Handling orientation change');
      
      // Update device characteristics
      const newCharacteristics = Android15Compatibility.getWindowInsets();
      setDeviceCharacteristics(newCharacteristics || {});

      // Handle orientation change in compatibility layer
      Android15Compatibility.handleOrientationChange(dimensions);

      // Re-validate compatibility after orientation change
      const newStatus = Android15Compatibility.validateCompatibility();
      setCompatibilityStatus(newStatus);
    } catch (error) {
      console.error('📱 [useAndroid15] Orientation change handling failed:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeCompatibility();
  }, [initializeCompatibility]);

  // Listen for orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', handleOrientationChange);
    return () => subscription?.remove();
  }, [handleOrientationChange]);

  // Update compatibility when insets change
  useEffect(() => {
    if (isCompatibilityEnabled && Platform.OS === 'android') {
      console.log('📱 [useAndroid15] Safe area insets updated:', insets);
      
      // Re-validate compatibility when insets change
      const newStatus = Android15Compatibility.validateCompatibility();
      setCompatibilityStatus(newStatus);
    }
  }, [insets, isCompatibilityEnabled]);

  // Utility functions
  const isLargeScreen = useCallback(() => {
    return Android15Compatibility.isLargeScreen();
  }, []);

  const isTablet = useCallback(() => {
    return Android15Compatibility.isTablet();
  }, []);

  const isFoldable = useCallback(() => {
    return Android15Compatibility.isFoldable();
  }, []);

  const getSupportedOrientations = useCallback(() => {
    return Android15Compatibility.getSupportedOrientations();
  }, []);

  const getRecommendedStyles = useCallback(() => {
    if (!isCompatibilityEnabled || Platform.OS !== 'android') {
      return {};
    }

    return {
      // Edge-to-edge compatible styles
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      // Large screen optimizations
      ...(isLargeScreen() && {
        maxWidth: isTablet() ? '100%' : 800,
        alignSelf: 'center'
      })
    };
  }, [isCompatibilityEnabled, insets, isLargeScreen, isTablet]);

  return {
    // Status
    isCompatibilityEnabled,
    isAndroid15Plus: Platform.OS === 'android' && Platform.Version >= 34,
    isAndroid16Plus: Platform.OS === 'android' && Platform.Version >= 35,
    
    // Device characteristics
    deviceCharacteristics,
    isLargeScreen: isLargeScreen(),
    isTablet: isTablet(),
    isFoldable: isFoldable(),
    
    // Compatibility status
    compatibilityStatus,
    
    // Insets
    insets,
    
    // Utility functions
    getSupportedOrientations,
    getRecommendedStyles,
    
    // Manual controls
    reinitialize: initializeCompatibility
  };
};

/**
 * Hook for getting Android 15 compatible styles
 */
export const useAndroid15Styles = () => {
  const { getRecommendedStyles, isCompatibilityEnabled, insets } = useAndroid15Compatibility();
  
  return {
    safeAreaStyles: getRecommendedStyles(),
    edgeToEdgeStyles: isCompatibilityEnabled ? {
      paddingTop: insets.top,
      paddingBottom: insets.bottom
    } : {},
    containerStyles: {
      flex: 1,
      ...getRecommendedStyles()
    }
  };
};

/**
 * Hook for large screen detection and optimization
 */
export const useLargeScreenOptimization = () => {
  const { 
    isLargeScreen, 
    isTablet, 
    isFoldable, 
    getSupportedOrientations,
    deviceCharacteristics 
  } = useAndroid15Compatibility();

  const getOptimizedLayout = useCallback((baseStyles = {}) => {
    if (!isLargeScreen && !isTablet) {
      return baseStyles;
    }

    return {
      ...baseStyles,
      // Large screen optimizations
      maxWidth: isTablet ? '100%' : 800,
      alignSelf: 'center',
      // Foldable optimizations
      ...(isFoldable && {
        flexDirection: 'row',
        flexWrap: 'wrap'
      })
    };
  }, [isLargeScreen, isTablet, isFoldable]);

  return {
    isLargeScreen,
    isTablet,
    isFoldable,
    supportedOrientations: getSupportedOrientations(),
    deviceCharacteristics,
    getOptimizedLayout
  };
};

export default useAndroid15Compatibility;
