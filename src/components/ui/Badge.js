import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { colors, spacing, radius } from '../../theme';

/**
 * Badge — Status badge for online, pending, premium, success, error, etc.
 */

const Badge = ({
  label,
  variant = 'default',
  style,
  dot = false,
}) => {
  const variantMap = {
    default: { bg: colors.surfaceTertiary, text: colors.textSecondary },
    primary: { bg: colors.primaryMuted, text: colors.primary },
    success: { bg: colors.successMuted, text: colors.success },
    warning: { bg: colors.warningMuted, text: colors.warning },
    error: { bg: colors.errorMuted, text: colors.error },
    info: { bg: colors.infoMuted, text: colors.info },
    premium: { bg: 'rgba(255, 215, 0, 0.15)', text: '#FFD700' },
    online: { bg: 'rgba(16, 185, 129, 0.15)', text: colors.success },
    live: { bg: colors.error, text: colors.textInverse },
  };

  const config = variantMap[variant] || variantMap.default;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.text,
        },
        variant === 'live' && styles.liveBadge,
        style,
      ]}
    >
      {dot && (
        <View style={[styles.dot, { backgroundColor: config.text }]} />
      )}
      <Text
        variant="caption"
        color={config.text}
        style={[{ fontWeight: '700' }, variant === 'premium' && { letterSpacing: 0.5 }]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  liveBadge: {
    borderRadius: radius.sm,
    borderWidth: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
});

export default React.memo(Badge);
