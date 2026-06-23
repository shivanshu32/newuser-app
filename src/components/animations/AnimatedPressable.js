import React, { useRef, useCallback } from 'react';
import { TouchableOpacity, Animated, Platform } from 'react-native';

/**
 * AnimatedPressable — Press feedback using React Native's built-in Animated API.
 * Provides a spring-like scale animation on press.
 *
 * If react-native-reanimated is installed later, this can be upgraded
 * to use useSharedValue / useAnimatedStyle for better performance.
 */

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedPressable = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  activeScale = 0.97,
  style,
  disabled,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: activeScale,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
    onPressIn?.();
  }, [activeScale, onPressIn, scaleAnim]);

  const animateOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
    onPressOut?.();
  }, [onPressOut, scaleAnim]);

  return (
    <AnimatedTouchable
      {...props}
      activeOpacity={1}
      disabled={disabled}
      onPress={onPress}
      onPressIn={animateIn}
      onPressOut={animateOut}
      style={[
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {children}
    </AnimatedTouchable>
  );
};

export default React.memo(AnimatedPressable);
