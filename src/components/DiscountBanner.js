import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/**
 * DiscountBanner Component
 * 
 * Displays a prominent discount offer banner with countdown timer
 * Used during AI free chat conversion funnel
 * 
 * Props:
 * - code: Coupon code (e.g., "MED123456789")
 * - discountValue: Discount percentage (e.g., 10, 20)
 * - validUntil: ISO timestamp when coupon expires
 * - remainingMinutes: Minutes remaining (optional, calculated from validUntil)
 * - message: Custom message to display
 * - onPress: Callback when banner is tapped
 * - onDismiss: Callback when banner is dismissed
 */
const DiscountBanner = ({
  code,
  discountValue,
  validUntil,
  remainingMinutes: initialMinutes,
  message,
  onPress,
  onDismiss
}) => {
  const [remainingTime, setRemainingTime] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 8,
      useNativeDriver: true
    }).start();

    // Pulse animation for urgency
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  useEffect(() => {
    // Calculate remaining time
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(validUntil);
      const diff = expiry - now;

      if (diff <= 0) {
        setRemainingTime({ expired: true });
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setRemainingTime({ minutes, seconds, expired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [validUntil]);

  if (!remainingTime || remainingTime.expired) {
    return null;
  }

  const getGradientColors = () => {
    if (discountValue >= 20) {
      return ['#dc2626', '#b91c1c']; // Strong red for high discount
    } else if (discountValue >= 10) {
      return ['#ea580c', '#c2410c']; // Orange for medium discount
    } else {
      return ['#8b5cf6', '#7c3aed']; // Purple for low discount
    }
  };

  const getUrgencyLevel = () => {
    if (remainingTime.minutes < 5) return 'high';
    if (remainingTime.minutes < 15) return 'medium';
    return 'low';
  };

  const urgency = getUrgencyLevel();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: urgency === 'high' ? pulseAnim : 1 }
          ]
        }
      ]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <TouchableOpacity
          style={styles.content}
          onPress={onPress}
          activeOpacity={0.8}
        >
          {/* Dismiss Button */}
          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}

          {/* Discount Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{discountValue}%</Text>
              <Text style={styles.badgeSubtext}>OFF</Text>
            </View>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {message || `Special ${discountValue}% Discount!`}
              </Text>
              
              {/* Countdown Timer */}
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color="#fff" />
                <Text style={styles.timerText}>
                  {remainingTime.minutes}:{remainingTime.seconds.toString().padStart(2, '0')} remaining
                </Text>
              </View>

              {/* Coupon Code */}
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Code:</Text>
                <Text style={styles.codeText}>{code}</Text>
                <Ionicons name="copy-outline" size={16} color="#fff" style={styles.copyIcon} />
              </View>
            </View>

            {/* CTA Arrow */}
            <View style={styles.ctaContainer}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </View>
          </View>

          {/* Urgency Indicator */}
          {urgency === 'high' && (
            <View style={styles.urgencyBadge}>
              <Ionicons name="flash" size={12} color="#fff" />
              <Text style={styles.urgencyText}>HURRY!</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  gradient: {
    borderRadius: 16
  },
  content: {
    padding: 16,
    position: 'relative'
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10
  },
  badgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 5
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)'
  },
  badgeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28
  },
  badgeSubtext: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 80
  },
  textContainer: {
    flex: 1
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start'
  },
  codeLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6
  },
  codeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  copyIcon: {
    marginLeft: 6
  },
  ctaContainer: {
    marginLeft: 12
  },
  urgencyBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  urgencyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    letterSpacing: 0.5
  }
});

export default DiscountBanner;
