import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

/**
 * FadeInView — Wraps children with an entrance fade + slide animation.
 * Uses React Native's built-in Animated API.
 */

const FadeInView = ({
  children,
  delay = 0,
  duration = 400,
  translateY = 20,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(translateY)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(translate, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, opacity, translate]);

  return (
    <Animated.View
      style={[
        { opacity, transform: [{ translateY: translate }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default React.memo(FadeInView);
