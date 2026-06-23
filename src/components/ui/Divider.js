import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { colors, spacing } from '../../theme';

/**
 * Divider — Thin themed separator with optional label.
 */

const Divider = ({ label, style, labelStyle }) => {
  if (label) {
    return (
      <View style={[styles.labeledContainer, style]}>
        <View style={styles.line} />
        <Text variant="caption" color={colors.textMuted} style={[styles.label, labelStyle]}>
          {label}
        </Text>
        <View style={styles.line} />
      </View>
    );
  }

  return <View style={[styles.divider, style]} />;
};

const styles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  labeledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  label: {
    marginHorizontal: spacing.md,
    textTransform: 'uppercase',
  },
});

export default React.memo(Divider);
