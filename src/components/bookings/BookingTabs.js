import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

const SEGMENTS = [
  { key: 'active', label: 'Active' },
  { key: 'history', label: 'History' },
];

const HISTORY_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const TYPE_CHIPS = [
  { key: 'chat', label: '💬 Chat' },
  { key: 'voice', label: '📞 Voice' },
  { key: 'video', label: '🎥 Video' },
];

const BookingTabs = ({
  activeSegment = 'active',
  onSegmentChange,
  activeFilter = 'all',
  onFilterChange,
  activeTypeFilter = null,
  onTypeFilterChange,
  counts = {},
}) => {
  const chipsScrollRef = useRef(null);

  const showHistoryChips = activeSegment === 'history';

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.segmentRow}>
        {SEGMENTS.map((seg) => {
          const isActive = activeSegment === seg.key;
          const count = counts[seg.key] || 0;
          return (
            <TouchableOpacity
              key={seg.key}
              style={styles.segmentWrapper}
              onPress={() => onSegmentChange(seg.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${seg.label}${count > 0 ? `, ${count} items` : ''}`}
            >
              {isActive ? (
                <LinearGradient
                  colors={colors.gradientGold}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segmentActive}
                >
                  <Text style={styles.segmentActiveText}>{seg.label}</Text>
                  {count > 0 && (
                    <View style={styles.segmentBadge}>
                      <Text style={styles.segmentBadgeText}>{count > 99 ? '99+' : count}</Text>
                    </View>
                  )}
                </LinearGradient>
              ) : (
                <View style={styles.segmentInactive}>
                  <Text style={styles.segmentInactiveText}>{seg.label}</Text>
                  {count > 0 && (
                    <View style={styles.segmentBadgeInactive}>
                      <Text style={styles.segmentBadgeInactiveText}>{count > 99 ? '99+' : count}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filter Chips — visible only in History segment */}
      {showHistoryChips && (
        <ScrollView
          ref={chipsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {/* Status Chips */}
          {HISTORY_CHIPS.map((chip) => {
            const isSelected = activeFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => onFilterChange(chip.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.chipDivider} />

          {/* Type Chips */}
          {TYPE_CHIPS.map((chip) => {
            const isSelected = activeTypeFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, isSelected && styles.chipTypeActive]}
                onPress={() => onTypeFilterChange(isSelected ? null : chip.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTypeTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 4,
    gap: 4,
    marginBottom: 2,
  },
  segmentWrapper: {
    flex: 1,
  },
  segmentActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  segmentActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  segmentInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    gap: 6,
  },
  segmentInactiveText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  segmentBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  segmentBadgeInactive: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  segmentBadgeInactiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipsScroll: {
    marginTop: 10,
  },
  chipsContent: {
    paddingRight: 4,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentGoldMuted,
    borderColor: colors.accentGold,
  },
  chipTypeActive: {
    backgroundColor: colors.accentPurpleMuted,
    borderColor: colors.accentPurple,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accentGold,
    fontWeight: '700',
  },
  chipTypeTextActive: {
    color: colors.accentPurpleLight,
    fontWeight: '700',
  },
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
});

export default React.memo(BookingTabs);
