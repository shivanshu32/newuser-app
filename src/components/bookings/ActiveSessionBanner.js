import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

const STATUS_CONFIG = {
  'in-progress': {
    label: 'Live Session',
    dot: colors.success,
    pulse: true,
    cta: 'Rejoin Now',
    ctaIcon: 'enter-outline',
  },
  confirmed: {
    label: 'Ready to Start',
    dot: '#60A5FA',
    pulse: true,
    cta: 'Join Session',
    ctaIcon: 'play-circle-outline',
  },
  waiting_for_user: {
    label: 'Astrologer Waiting',
    dot: colors.warning,
    pulse: true,
    cta: 'Join Now',
    ctaIcon: 'enter-outline',
  },
  pending: {
    label: 'Awaiting Confirmation',
    dot: colors.accentGold,
    pulse: false,
    cta: 'View Details',
    ctaIcon: 'eye-outline',
  },
};

const PulseDot = ({ color }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.dotWrapper}>
      <Animated.View
        style={[
          styles.dotRing,
          { borderColor: color, transform: [{ scale: pulseAnim }] },
        ]}
      />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
};

const ActiveSessionBanner = ({ booking, onJoin, onCancel }) => {
  if (!booking) return null;

  const config = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const astrologerName =
    booking.astrologer?.displayName || booking.astrologer?.name || 'Astrologer';
  const astrologerImage =
    booking.astrologer?.imageUrl ||
    booking.astrologer?.profileImage ||
    null;
  const consultationType =
    booking.isFreeChat ? 'Free Chat' :
    booking.isPrepaidOffer ? 'Prepaid Offer' :
    booking.type ? booking.type.charAt(0).toUpperCase() + booking.type.slice(1) : 'Chat';

  const canJoin = ['confirmed', 'waiting_for_user', 'in-progress'].includes(booking.status);
  const canCancel = booking.status === 'pending';

  return (
    <View style={styles.outerWrapper}>
      <LinearGradient
        colors={['#1A1A0F', '#171717']}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.leftAccent} />

        <View style={styles.content}>
          {/* Status row */}
          <View style={styles.statusRow}>
            <PulseDot color={config.dot} />
            <Text style={[styles.statusLabel, { color: config.dot }]}>
              {config.label}
            </Text>
            <View style={styles.typePill}>
              <Text style={styles.typeText}>{consultationType}</Text>
            </View>
          </View>

          {/* Astrologer info */}
          <View style={styles.astrologerRow}>
            <View style={styles.avatarWrapper}>
              {astrologerImage ? (
                <Image source={{ uri: astrologerImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={22} color={colors.textMuted} />
                </View>
              )}
              {config.pulse && (
                <View style={[styles.avatarDot, { backgroundColor: config.dot }]} />
              )}
            </View>
            <View style={styles.astrologerInfo}>
              <Text style={styles.astrologerName} numberOfLines={1}>
                {astrologerName}
              </Text>
              <Text style={styles.subLabel}>
                Tap to {canJoin ? 'join your session' : 'view details'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => onJoin(booking)}
              activeOpacity={0.85}
              accessibilityLabel={config.cta}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={canJoin ? ['#D4AF37', '#B5A06D'] : [colors.surface, colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Ionicons
                  name={config.ctaIcon}
                  size={16}
                  color={canJoin ? '#FFFFFF' : colors.textSecondary}
                />
                <Text style={[styles.ctaText, !canJoin && styles.ctaTextMuted]}>
                  {config.cta}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Cancel row for pending */}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelRow}
              onPress={() => onCancel(booking)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.cancelText}>Cancel request</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: colors.accentGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  banner: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
    flexDirection: 'row',
  },
  leftAccent: {
    width: 4,
    backgroundColor: colors.accentGold,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dotWrapper: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    opacity: 0.5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    flex: 1,
  },
  typePill: {
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  astrologerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.35)',
  },
  avatarFallback: {
    backgroundColor: colors.surfaceTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#171717',
  },
  astrologerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  ctaButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ctaTextMuted: {
    color: colors.textSecondary,
  },
  cancelRow: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  cancelText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default React.memo(ActiveSessionBanner);
