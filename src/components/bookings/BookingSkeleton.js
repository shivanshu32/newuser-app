import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../theme';

const { width } = Dimensions.get('window');

const SkeletonItem = () => {
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-width, width]) }],
  }));

  return (
    <View style={styles.card}>
      {/* Top row: avatar + name block + status chip */}
      <View style={styles.topRow}>
        <View style={styles.avatar} />
        <View style={styles.nameBlock}>
          <View style={styles.nameLine} />
          <View style={styles.metaLine} />
          <View style={styles.pillRow}>
            <View style={styles.pill} />
            <View style={styles.pillSmall} />
          </View>
        </View>
        <View style={styles.statusChip} />
      </View>
      {/* Action bar */}
      <View style={styles.actionBar} />
      {/* Shimmer overlay */}
      <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
        <View style={styles.shimmerGradient} />
      </Animated.View>
    </View>
  );
};

const BookingSkeleton = ({ count = 3 }) => (
  <View style={styles.container}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonItem key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  card: {
    backgroundColor: '#17171C',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceTertiary,
    marginTop: 2,
  },
  nameBlock: {
    flex: 1,
    gap: 7,
  },
  nameLine: {
    height: 13,
    width: '60%',
    borderRadius: 7,
    backgroundColor: colors.surfaceTertiary,
  },
  metaLine: {
    height: 11,
    width: '85%',
    borderRadius: 6,
    backgroundColor: colors.surfaceTertiary,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    height: 18,
    width: 54,
    borderRadius: 9,
    backgroundColor: colors.surfaceTertiary,
  },
  pillSmall: {
    height: 18,
    width: 38,
    borderRadius: 9,
    backgroundColor: colors.surfaceTertiary,
  },
  statusChip: {
    width: 68,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    marginTop: 2,
  },
  actionBar: {
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceTertiary,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmerGradient: {
    width: 80,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});

export default BookingSkeleton;
