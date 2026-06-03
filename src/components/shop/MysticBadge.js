import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const BADGE_STYLES = {
  discount: {
    background: '#EF4444',
    text: '#FFFFFF',
  },
  new: {
    background: '#3B82F6',
    text: '#FFFFFF',
  },
  trending: {
    background: '#8B5CF6',
    text: '#FFFFFF',
  },
  bestseller: {
    background: '#FBBF24',
    text: '#1F2937',
  },
  outOfStock: {
    background: '#6B7280',
    text: '#FFFFFF',
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
