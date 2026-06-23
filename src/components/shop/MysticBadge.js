import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

const BADGE_STYLES = {
  discount: {
    background: colors.error,
    text: colors.textInverse,
  },
  new: {
    background: colors.info,
    text: colors.textInverse,
  },
  trending: {
    background: colors.primary,
    text: colors.textInverse,
  },
  bestseller: {
    background: colors.warning,
    text: colors.textPrimary,
  },
  outOfStock: {
    background: colors.textSecondary,
    text: colors.textInverse,
  },
};

const MysticBadge = ({ type = 'discount', label, style }) => {
  const theme = BADGE_STYLES[type] || BADGE_STYLES.discount;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.background },
        style,
      ]}
    >
      <Text style={[styles.text, { color: theme.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default MysticBadge;
