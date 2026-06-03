import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const STAR_COUNT = 30;

const CosmicBackground = ({ children, style }) => {
  const stars = useRef(
    Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2,
      opacity: new Animated.Value(0.2 + Math.random() * 0.6),
      duration: 1500 + Math.random() * 3000,
      delay: Math.random() * 2000,
    }))
  ).current;

  useEffect(() => {
    const animations = stars.map((star) => {
      const loop = () => {
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 0.8 + Math.random() * 0.2,
            duration: star.duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 0.2 + Math.random() * 0.3,
            duration: star.duration / 2,
            useNativeDriver: true,
          }),
        ]).start(loop);
      };
      const timeout = setTimeout(loop, star.delay);
      return () => clearTimeout(timeout);
    });
    return () => animations.forEach((cleanup) => cleanup());
  }, [stars]);

  return (
    <View style={[styles.container, style]}>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.gradient} />
        {stars.map((star, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: `${star.x * 100}%`,
                top: `${star.y * 100}%`,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
              },
            ]}
          />
        ))}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B0F2F',
  },
  star: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
});

export default CosmicBackground;
