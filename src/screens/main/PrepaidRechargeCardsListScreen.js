import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import prepaidRechargeCardsAPI from '../../services/prepaidRechargeCardsAPI';

const PrepaidRechargeCardsListScreen = () => {
  const navigation = useNavigation();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get badge colors based on badge type
  const getBadgeColors = (badge) => {
    const badgeType = badge?.toLowerCase();
    switch (badgeType) {
      case 'limited':
        return ['#EF4444', '#DC2626']; // Red
      case 'popular':
        return ['#F59E0B', '#D97706']; // Amber
      case 'best value':
        return ['#10B981', '#059669']; // Green
      case 'new':
        return ['#3B82F6', '#2563EB']; // Blue
      case 'recommended':
        return ['#8B5CF6', '#7C3AED']; // Purple
      default:
        return ['#FF6B6B', '#FF8E53']; // Default Orange-Red
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching prepaid recharge cards...');
      const data = await prepaidRechargeCardsAPI.getActiveCards();
      console.log('✅ Prepaid recharge cards fetched:', data);

      if (data.success) {
        setCards(data.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching prepaid recharge cards:', error);
      Alert.alert('Error', 'Failed to load prepaid chat packs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCard = (card) => {
    navigation.navigate('PrepaidRechargeCardPayment', { card });
  };

  const renderCard = ({ item: card }) => (
    <View style={styles.cardContainer}>
      <View style={styles.card}>
        {card.badge ? (
          <View style={styles.ribbonContainer}>
            <LinearGradient
              colors={getBadgeColors(card.badge)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ribbonBadge}
            >
              <Text style={styles.ribbonBadgeText}>{card.badge.toUpperCase()}</Text>
            </LinearGradient>
          </View>
        ) : null}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {card.displayName}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#4CAF50" />
            <Text style={styles.infoText}>{card.durationMinutes} min chat</Text>
          </View>

          <View style={styles.applicabilityRow}>
            <Ionicons name="people-outline" size={14} color="#FF6B35" />
            <Text style={styles.applicabilityText}>
              {card.astrologerAssignment === 'specific'
                ? 'Selected astrologers'
                : 'Any Astrologer'}
            </Text>
          </View>

          {card.usageType === 'single_use' && (
            <View style={styles.singleUseBadge}>
              <Ionicons name="alert-circle-outline" size={12} color="#8B5CF6" />
              <Text style={styles.singleUseText}>Single Use Only</Text>
            </View>
          )}

          {Array.isArray(card.features) && card.features.length > 0 && (
            <View style={styles.features}>
              {card.features.slice(0, 2).map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.featureText} numberOfLines={1}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>
              ₹{card.basePrice ?? card.totalAmount ?? '--'}
            </Text>
            {card.durationMinutes && (card.basePrice || card.totalAmount) ? (
              <Text style={styles.perMinute}>
                ₹{Math.round((card.basePrice ?? card.totalAmount) / card.durationMinutes)}/min
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => handleBuyCard(card)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4CAF50', '#45B649']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyButtonGradient}
            >
              <Text style={styles.buyButtonText}>Buy</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prepaid Chat Packs</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading prepaid chat packs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prepaid Chat Packs</Text>
        <View style={{ width: 24 }} />
      </View>

      {cards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No prepaid chat packs available</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          renderItem={renderCard}
          keyExtractor={(item) => item.id || item._id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  ribbonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 70,
    height: 70,
    overflow: 'hidden',
    zIndex: 10,
  },
  ribbonBadge: {
    position: 'absolute',
    top: 10,
    left: -22,
    width: 90,
    paddingVertical: 3,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  ribbonBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  singleUseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#8B5CF6',
  },
  singleUseText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    marginBottom: 12,
    marginTop: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 6,
  },
  applicabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#FF6B35',
  },
  applicabilityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#E65100',
    marginLeft: 6,
  },
  features: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F97316',
  },
  perMinute: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    marginTop: 2,
  },
  buyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  buyButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PrepaidRechargeCardsListScreen;
