import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAndroid15Compatibility } from '../hooks/useAndroid15Compatibility';

/**
 * Android 15 Safe Area Wrapper Component
 * 
 * Provides proper safe area handling for Android 15+ edge-to-edge display
 * while maintaining backward compatibility with older Android versions.
 */
const Android15SafeAreaWrapper = ({ 
  children, 
  style, 
  enableEdgeToEdge = true,
  applyHorizontalInsets = true,
  applyVerticalInsets = true 
}) => {
  const insets = useSafeAreaInsets();
  const { isCompatibilityEnabled, isLargeScreen, isTablet } = useAndroid15Compatibility();

  // Calculate safe area styles based on Android 15 compatibility
  const getSafeAreaStyles = () => {
    if (Platform.OS !== 'android' || !enableEdgeToEdge || !isCompatibilityEnabled) {
      return {};
    }

    const safeAreaStyles = {};

    // Apply vertical insets for edge-to-edge display
    if (applyVerticalInsets) {
      safeAreaStyles.paddingTop = insets.top;
      safeAreaStyles.paddingBottom = insets.bottom;
    }

    // Apply horizontal insets for edge-to-edge display
    if (applyHorizontalInsets) {
      safeAreaStyles.paddingLeft = insets.left;
      safeAreaStyles.paddingRight = insets.right;
    }

    // Large screen optimizations for Android 16+
    if (isLargeScreen || isTablet) {
      safeAreaStyles.maxWidth = isTablet ? '100%' : 800;
      safeAreaStyles.alignSelf = 'center';
    }

    return safeAreaStyles;
  };

  const containerStyles = [
    styles.container,
    getSafeAreaStyles(),
    style
  ];

  return (
    <View style={containerStyles}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default Android15SafeAreaWrapper;
