import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import Button from './Button';
import { colors, spacing } from '../../theme';

/**
 * EmptyState — Illustration + title + subtitle + action for empty lists/screens.
 */

const EmptyState = ({
  icon = 'planet-outline',
  iconSize = 64,
  iconColor = colors.primary,
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={iconSize} color={iconColor} />
      </View>
      {title && (
        <Text variant="h3" color={colors.textPrimary} style={styles.title}>
          {title}
        </Text>
      )}
      {subtitle && (
        <Text variant="bodySmall" color={colors.textSecondary} style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          variant="primary"
          size="md"
          onPress={onAction}
          style={styles.action}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    flex: 1,
  },
  iconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.8,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: spacing.xl,
    textAlign: 'center',
    lineHeight: 22,
  },
  action: {
    marginTop: spacing.sm,
  },
});

export default React.memo(EmptyState);
