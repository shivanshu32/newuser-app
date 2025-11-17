import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PrepaidRechargeOfferCard = ({ offer, onStartChat }) => {
  // Determine astrologer eligibility text
  const getAstrologerEligibilityText = () => {
    const assignment = offer.card?.astrologerAssignment;
    const assignedCount = offer.card?.assignedAstrologers?.length || 0;
    
    if (assignment === 'all') {
      return 'Valid for Any Astrologer';
    } else if (assignment === 'single' && assignedCount === 1) {
      return 'Valid for Specific Astrologer';
    } else if (assignment === 'multiple' || assignment === 'single') {
      return `Valid for ${assignedCount} Selected Astrologer${assignedCount > 1 ? 's' : ''}`;
    }
    return 'Valid for Any Astrologer';
  };

  const eligibilityText = getAstrologerEligibilityText();

  return (
    <View style={styles.card}>
      {/* Card Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{offer.purchaseDetails.displayName}</Text>
        
        {/* Duration */}
        <View style={styles.durationRow}>
          <Ionicons name="time-outline" size={20} color="#4CAF50" />
          <Text style={styles.duration}>
            {offer.purchaseDetails.durationMinutes} min
          </Text>
        </View>

        {/* Astrologer Eligibility */}
        <View style={styles.eligibilityRow}>
          <Ionicons name="people-outline" size={20} color="#8B5CF6" />
          <Text style={styles.eligibilityText}>
            {eligibilityText}
          </Text>
        </View>

        {/* Features */}
        {offer.card?.features && offer.card.features.length > 0 && (
          <View style={styles.features}>
            {offer.card.features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Start Chat Button */}
      <TouchableOpacity 
        style={styles.button}
        onPress={onStartChat}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>Start Chat Now</Text>
          <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  content: {
    marginBottom: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  duration: {
    fontSize: 15,
    color: '#2E7D32',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1
  },
  eligibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F3E8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  eligibilityText: {
    fontSize: 15,
    color: '#6B21A8',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1
  },
  features: {
    marginTop: 8,
    marginBottom: 8
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default PrepaidRechargeOfferCard;
