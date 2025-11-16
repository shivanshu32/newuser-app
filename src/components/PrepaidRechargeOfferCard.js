import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PrepaidRechargeOfferCard = ({ offer, onStartChat }) => {
  // Calculate days until expiry
  const daysUntilExpiry = offer.expiresAt 
    ? Math.ceil((new Date(offer.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  // Get badge color
  const getBadgeColor = (badge) => {
    const colors = {
      popular: ['#FF6B6B', '#FF8E53'],
      best_value: ['#4CAF50', '#45B649'],
      premium: ['#9C27B0', '#BA68C8'],
      limited: ['#FF9800', '#FFB74D']
    };
    return colors[badge?.toLowerCase()] || ['#FF6B6B', '#FF8E53'];
  };

  const badgeColors = getBadgeColor(offer.card?.badge);

  return (
    <View style={styles.card}>
      {/* Badge */}
      {offer.card?.badge && (
        <LinearGradient
          colors={badgeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.badge}
        >
          <Text style={styles.badgeText}>{offer.card.badge.toUpperCase()}</Text>
        </LinearGradient>
      )}

      {/* Card Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={styles.title}>{offer.purchaseDetails.displayName}</Text>
        
        {/* Duration */}
        <View style={styles.durationRow}>
          <Ionicons name="time-outline" size={22} color="#4CAF50" />
          <Text style={styles.duration}>
            {offer.purchaseDetails.durationMinutes} Minutes Guaranteed Chat
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

        {/* Expiry Info */}
        {daysUntilExpiry !== null && (
          <View style={styles.expiryContainer}>
            <Ionicons name="calendar-outline" size={14} color="#FF9800" />
            <Text style={styles.expiry}>
              {daysUntilExpiry > 0 
                ? `Valid for ${daysUntilExpiry} more ${daysUntilExpiry === 1 ? 'day' : 'days'}`
                : 'Expires today'}
            </Text>
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
    marginBottom: 12,
    paddingRight: 80 // Space for badge
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  duration: {
    fontSize: 16,
    color: '#2E7D32',
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
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  expiry: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '500',
    marginLeft: 6
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
