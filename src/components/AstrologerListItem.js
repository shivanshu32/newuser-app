import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from './animations/AnimatedPressable';
import Badge from './ui/Badge';
import Text from './ui/Text';
import { colors, spacing, radius, shadows } from '../theme';

const AstrologerListItem = ({ item, onPress }) => {
  const isPremium = item.isPremium || item.rating?.average >= 4.8 || (typeof item.rating === 'number' && item.rating >= 4.8);
  const isOnline = item.status === 'online';

  return (
    <AnimatedPressable
      style={styles.card}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${item.name}, ${item.specialization}, ${item.rating} stars, ${item.experience} years experience, ₹${item.price} per minute. ${isOnline ? 'Online' : 'Offline'}`}
    >
      <View style={styles.badgeRow}>
        {isPremium && (
          <Badge label="PREMIUM" variant="premium" />
        )}
        {isOnline && (
          <Badge label="LIVE" variant="live" />
        )}
      </View>

      <Image
        source={{ uri: item.image }}
        style={styles.image}
        accessibilityLabel={`Profile picture of ${item.name}`}
      />

      <View style={styles.info}>
        <Text variant="h3" color={colors.textPrimary} style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="bodySmall" color={colors.textMuted} style={styles.specialization} numberOfLines={1}>
          {item.specialization || 'Astrologer'}
        </Text>

        <View style={styles.details}>
          <View style={styles.detail}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text variant="caption" color={colors.textSecondary} style={styles.detailText}>
              {item.rating}
            </Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text variant="caption" color={colors.textSecondary} style={styles.detailText}>
              {item.experience}
            </Text>
          </View>
          <View style={styles.detail}>
            <Ionicons name="cash-outline" size={14} color={colors.primary} />
            <Text variant="caption" color={colors.primary} style={styles.detailText}>
              ₹{item.price}
            </Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    margin: spacing.xs,
    ...shadows.card,
    position: 'relative',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSecondary,
  },
  info: {
    alignItems: 'center',
  },
  name: {
    textAlign: 'center',
  },
  specialization: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  detailText: {
    marginLeft: spacing.xs,
  },
});

export default React.memo(AstrologerListItem);
