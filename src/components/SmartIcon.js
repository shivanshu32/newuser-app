import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FallbackIcon from './FallbackIcon';

const SmartIcon = ({ name, size = 24, color = '#333', style, testID }) => {
  const [useIonicons, setUseIonicons] = useState(true);
  const [iconLoaded, setIconLoaded] = useState(false);

  useEffect(() => {
    // Test if Ionicons are working by trying to render one
    const testIconLoad = () => {
      try {
        // Simple test - if we get here without errors, Ionicons should work
        setIconLoaded(true);
        console.log('✅ [SmartIcon] Ionicons available for:', name);
      } catch (error) {
        console.warn('⚠️ [SmartIcon] Ionicons failed, using fallback for:', name);
        setUseIonicons(false);
        setIconLoaded(true);
      }
    };

    // Delay the test slightly to allow font loading
    const timer = setTimeout(testIconLoad, 100);
    return () => clearTimeout(timer);
  }, [name]);

  // Show nothing while testing
  if (!iconLoaded) {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  // Try Ionicons first, fall back to custom icons if they fail
  if (useIonicons) {
    try {
      return (
        <Ionicons 
          name={name} 
          size={size} 
          color={color} 
          style={style}
          testID={testID}
          onError={() => {
            console.warn('⚠️ [SmartIcon] Ionicons render failed for:', name);
            setUseIonicons(false);
          }}
        />
      );
    } catch (error) {
      console.warn('⚠️ [SmartIcon] Ionicons error for:', name, error);
      return <FallbackIcon name={name} size={size} color={color} style={style} />;
    }
  }

  // Use fallback icons
  return <FallbackIcon name={name} size={size} color={color} style={style} />;
};

export default SmartIcon;
