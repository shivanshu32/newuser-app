import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../../theme';
import BookingCard from './BookingCard';

const SWIPE_THRESHOLD = 70;
const ACTION_WIDTH = 80;

const SwipeableBookingCard = ({
  booking,
  index,
  onPress,
  onViewHistory,
  onRate,
  onRebook,
  currentOpenId,
  onOpen,
}) => {
  const translateX = useSharedValue(0);
  const context = useSharedValue({ startX: 0 });
  const isOpen = useSharedValue(false);
  const itemId = booking._id;

  const isCompleted = booking.status === 'completed';

  const closeCard = useCallback(() => {
    translateX.value = withSpring(0, { stiffness: 300, damping: 25 });
    isOpen.value = false;
  }, []);

  // Close this card if another card opens
  React.useEffect(() => {
    if (currentOpenId !== null && currentOpenId !== itemId && isOpen.value) {
      closeCard();
    }
  }, [currentOpenId, itemId, closeCard]);

  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const leftActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, ACTION_WIDTH],
      [0, 1]
    );
    return { opacity };
  });

  const rightActionStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, -ACTION_WIDTH],
      [0, 1]
    );
    return { opacity };
  });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onBegin(() => {
      'worklet';
      context.value = { startX: translateX.value };
    })
    .onUpdate((event) => {
      'worklet';
      // Only allow swipe actions for completed bookings
      if (!isCompleted) return;
      translateX.value = context.value.startX + event.translationX;
    })
    .onEnd((event) => {
      'worklet';
      if (!isCompleted) {
        translateX.value = withSpring(0, { stiffness: 300, damping: 25 });
        return;
      }

      const finalX = context.value.startX + event.translationX;

      if (finalX > SWIPE_THRESHOLD) {
        // Swiped right → reveal Rate
        translateX.value = withSpring(ACTION_WIDTH, { stiffness: 300, damping: 25 });
        isOpen.value = true;
        runOnJS(onOpen)(itemId);
      } else if (finalX < -SWIPE_THRESHOLD) {
        // Swiped left → reveal Rebook
        translateX.value = withSpring(-ACTION_WIDTH, { stiffness: 300, damping: 25 });
        isOpen.value = true;
        runOnJS(onOpen)(itemId);
      } else {
        // Snap back
        translateX.value = withSpring(0, { stiffness: 300, damping: 25 });
        isOpen.value = false;
      }
    });

  const handleRate = () => {
    closeCard();
    if (!booking._id) {
      Alert.alert('Error', 'This booking cannot be rated at this time.');
      return;
    }
    onRate?.(booking._id);
  };

  const handleRebook = () => {
    closeCard();
    const astrologerId = booking.astrologer?._id || booking.astrologer;
    if (!astrologerId) {
      Alert.alert('Error', 'Astrologer information is missing.');
      return;
    }
    onRebook?.(astrologerId);
  };

  return (
    <View style={styles.container}>
      {/* Left Action (Rate) — shown when swiped right */}
      {isCompleted && (
        <Animated.View style={[styles.leftAction, leftActionStyle]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accentGold }]}
            onPress={handleRate}
          >
            <Ionicons name="star" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>Rate</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Right Action (Rebook) — shown when swiped left */}
      {isCompleted && (
        <Animated.View style={[styles.rightAction, rightActionStyle]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.accentPurple }]}
            onPress={handleRebook}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
            <Text style={styles.actionText}>Rebook</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.cardWrapper, cardAnimatedStyle]}>
          <BookingCard
            booking={booking}
            index={index}
            onPress={onPress}
            onViewHistory={onViewHistory}
            onRate={onRate}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  cardWrapper: {
    zIndex: 2,
  },
  leftAction: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 16,
    zIndex: 1,
  },
  rightAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 16,
    zIndex: 1,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  actionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
});

export default React.memo(SwipeableBookingCard);
