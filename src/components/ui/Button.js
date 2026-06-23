import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '../animations/AnimatedPressable';
import Text from './Text';
import { colors, spacing, radius, shadows } from '../../theme';

/**
 * Button — Premium button with multiple variants and sizes.
 */

const Button = ({
  title,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  onPress,
  style,
  textStyle,
}) => {
  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl },
  };

  const variantConfig = {
    primary: {
      gradient: colors.gradientPrimary,
      textColor: colors.textInverse,
      disabledColor: colors.textMuted,
    },
    secondary: {
      gradient: [colors.surfaceSecondary, colors.surfaceSecondary],
      textColor: colors.textPrimary,
      disabledColor: colors.textMuted,
    },
    ghost: {
      gradient: ['transparent', 'transparent'],
      textColor: colors.primary,
      disabledColor: colors.textMuted,
    },
    danger: {
      gradient: [colors.error, colors.error],
      textColor: colors.textInverse,
      disabledColor: colors.textMuted,
    },
  };

  const config = variantConfig[variant];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.container, sizeStyles[size], style]}
    >
      <LinearGradient
        colors={disabled ? [colors.surfaceTertiary, colors.surfaceTertiary] : config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          { borderRadius: radius.md },
        ]}
      >
        <View style={styles.content}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text
            variant={size === 'sm' ? 'caption' : 'bodySmall'}
            color={disabled ? config.disabledColor : config.textColor}
            style={[{ fontWeight: '600' }, textStyle]}
          >
            {title}
          </Text>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
});

export default React.memo(Button);
