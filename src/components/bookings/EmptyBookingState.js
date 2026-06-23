import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const EMPTY_CONFIG = {
  active: {
    icon: 'telescope-outline',
    iconColor: colors.accentGold,
    iconBg: colors.accentGoldMuted,
    headline: 'No active consultations',
    subtitle: 'Connect with an expert astrologer and get guidance tailored to you.',
    cta: 'Find an Astrologer',
    ctaIcon: 'search-outline',
  },
  history: {
    icon: 'time-outline',
    iconColor: colors.accentPurpleLight,
    iconBg: colors.accentPurpleMuted,
    headline: 'No history yet',
    subtitle: 'Your completed and past consultations will appear here.',
    cta: 'Book Your First Session',
    ctaIcon: 'add-circle-outline',
  },
  completed: {
    icon: 'checkmark-circle-outline',
    iconColor: colors.success,
    iconBg: colors.successMuted,
    headline: 'No completed sessions',
    subtitle: 'Sessions you complete will appear here for review and rebook.',
    cta: null,
  },
  cancelled: {
    icon: 'ban-outline',
    iconColor: colors.textMuted,
    iconBg: colors.surfaceTertiary,
    headline: 'No cancelled bookings',
    subtitle: 'Cancelled or expired bookings will be shown here.',
    cta: null,
  },
};

const EmptyBookingState = ({ tabKey, onCta }) => {
  const config = EMPTY_CONFIG[tabKey] || EMPTY_CONFIG.active;

  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
        <Ionicons name={config.icon} size={38} color={config.iconColor} />
      </View>
      <Text style={styles.headline}>{config.headline}</Text>
      <Text style={styles.subtitle}>{config.subtitle}</Text>
      {config.cta && onCta && (
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onCta}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={config.cta}
        >
          <Ionicons name={config.ctaIcon} size={17} color="#FFFFFF" />
          <Text style={styles.ctaText}>{config.cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingTop: 48,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentGold,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: colors.accentGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default React.memo(EmptyBookingState);
