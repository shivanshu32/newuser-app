import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadows } from '../../theme';

/**
 * Card — Surface card with configurable elevation, padding, and radius.
 * Supports gradient background for premium variants.
 */

const Card = ({
  children,
  variant = 'default',
  padding = 'lg',
  style,
  onPress,
}) => {
  const paddingMap = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
    xl: spacing.xl,
  };

  const isPremium = variant === 'premium' || variant === 'cosmic';
  const gradient = variant === 'premium' ? colors.gradientPremium : colors.gradientCosmic;

  return (
    <View
      style={[
        styles.card,
        {
          padding: paddingMap[padding],
          backgroundColor: isPremium ? 'transparent' : colors.surface,
          borderRadius: isPremium ? radius.lg : radius.lg,
        },
        variant === 'elevated' ? shadows.elevated : shadows.card,
        style,
      ]}
    >
      {isPremium ? (
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius.lg }]}
        />
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default React.memo(Card);
