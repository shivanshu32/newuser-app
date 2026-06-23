import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadows } from '../theme';

const PrepaidRechargeOfferCard = ({ offer, onStartChat }) => {
  // Determine astrologer eligibility text
  const getAstrologerEligibilityText = () => {
    const assignment = offer.card?.astrologerAssignment;
    const assignedCount = offer.card?.assignedAstrologers?.length || 0;

    if (assignment === 'all') {
      return 'Any Astrologer';
    } else if (assignment === 'single' && assignedCount === 1) {
      return 'Specific Astrologer';
    } else if (assignment === 'multiple' || assignment === 'single') {
      return `${assignedCount} Selected Astrologer${assignedCount > 1 ? 's' : ''}`;
    }
    return 'Any Astrologer';
  };

  const eligibilityText = getAstrologerEligibilityText();

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Text style={styles.title}>{offer.purchaseDetails.displayName}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {offer.purchaseDetails.durationMinutes} min
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{eligibilityText}</Text>
        </View>

        {offer.card?.features && offer.card.features.length > 0 && (
          <View style={styles.features}>
            {offer.card.features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Text style={styles.featureBullet}>·</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={onStartChat}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Start Session</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  features: {
    marginTop: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  featureBullet: {
    fontSize: 16,
    color: colors.primary,
    lineHeight: 18,
  },
  featureText: {
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#1A1A1A',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  }
});

export default PrepaidRechargeOfferCard;
