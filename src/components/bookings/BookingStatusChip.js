import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';

const STATUS_CONFIG = {
  completed: {
    bg: colors.successMuted,
    text: colors.success,
    label: 'Completed',
  },
  'no_show': {
    bg: colors.warningMuted,
    text: colors.warning,
    label: 'No Show',
  },
  cancelled: {
    bg: colors.errorMuted,
    text: colors.error,
    label: 'Cancelled',
  },
  rejected: {
    bg: colors.errorMuted,
    text: colors.error,
    label: 'Rejected',
  },
  expired: {
    bg: colors.textMuted,
    text: '#9CA3AF',
    label: 'Expired',
  },
  pending: {
    bg: colors.accentPurpleMuted,
    text: colors.accentPurple,
    label: 'Pending',
  },
  confirmed: {
    bg: colors.accentPurpleMuted,
    text: colors.accentPurple,
    label: 'Confirmed',
  },
  'waiting_for_user': {
    bg: colors.accentPurpleMuted,
    text: colors.accentPurple,
    label: 'Waiting',
  },
  'in-progress': {
    bg: colors.accentPurpleMuted,
    text: colors.accentPurple,
    label: 'In Progress',
  },
};

const BookingStatusChip = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    bg: colors.surfaceTertiary,
    text: colors.textSecondary,
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ') : 'Unknown',
  };

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default React.memo(BookingStatusChip);
