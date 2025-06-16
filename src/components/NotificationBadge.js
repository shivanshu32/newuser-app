import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * A simple notification badge component that displays a count
 * @param {Object} props
 * @param {number} props.count - The number to display in the badge
 * @param {Object} props.style - Additional styles for the badge container
 */
const NotificationBadge = ({ count, style }) => {
  if (!count || count <= 0) return null;
  
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default NotificationBadge;
