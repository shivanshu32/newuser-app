import React from 'react';
import { View, StyleSheet } from 'react-native';
import AnimatedPressable from '../animations/AnimatedPressable';
import { colors, spacing, radius } from '../../theme';

/**
 * IconButton — Circular icon button with press animation.
 */

const IconButton = ({
  icon,
  onPress,
  disabled = false,
  size = 44,
  variant = 'default',
  style,
}) => {
  const variantMap = {
    default: { bg: colors.surfaceSecondary, active: colors.surfaceTertiary },
    primary: { bg: colors.primaryMuted, active: colors.primary },
    ghost: { bg: 'transparent', active: colors.surfaceTertiary },
  };

  const config = variantMap[variant] || variantMap.default;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: config.bg,
        },
        style,
      ]}
    >
      <View style={styles.icon}>{icon}</View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default React.memo(IconButton);
