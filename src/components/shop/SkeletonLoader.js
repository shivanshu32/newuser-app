import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const SkeletonLoader = ({ variant = 'productCard', count = 1, style }) => {
  const shimmerAnim = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: width,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-width, width],
    outputRange: [-width, width],
  });

  const renderShimmer = (contentStyle) => (
    <View style={[styles.base, contentStyle, style]}>
      <Animated.View
        style={[
          styles.shimmer,
          { transform: [{ translateX: shimmerTranslate }] },
        ]}
      />
    </View>
  );

  const variants = {
    productCard: (
      <View style={styles.cardWrapper}>
        {renderShimmer(styles.cardImage)}
        <View style={styles.cardContent}>
          {renderShimmer(styles.cardTitle)}
          {renderShimmer(styles.cardSubtitle)}
          {renderShimmer(styles.cardPrice)}
        </View>
      </View>
    ),
    textLine: renderShimmer(styles.textLine),
    image: renderShimmer(styles.image),
    orderCard: (
      <View style={styles.orderWrapper}>
        {renderShimmer(styles.orderHeader)}
        {renderShimmer(styles.orderBody)}
        {renderShimmer(styles.orderFooter)}
      </View>
    ),
    circle: renderShimmer(styles.circle),
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.wrapper}>
          {variants[variant] || variants.productCard}
        </View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: width * 0.4,
  },
  wrapper: {
    marginBottom: 12,
  },
  cardWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardImage: {
    height: 160,
    borderRadius: 0,
  },
  cardContent: {
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    height: 16,
    width: '80%',
  },
  cardSubtitle: {
    height: 12,
    width: '60%',
  },
  cardPrice: {
    height: 18,
    width: '40%',
  },
  textLine: {
    height: 14,
    width: '100%',
  },
  image: {
    height: 200,
    width: '100%',
    borderRadius: 12,
  },
  orderWrapper: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  orderHeader: {
    height: 18,
    width: '60%',
  },
  orderBody: {
    height: 12,
    width: '80%',
  },
  orderFooter: {
    height: 12,
    width: '40%',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});

export default SkeletonLoader;
