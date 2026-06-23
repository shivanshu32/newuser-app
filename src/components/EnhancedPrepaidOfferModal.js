import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { colors } from '../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * EnhancedPrepaidOfferModal Component
 * 
 * Displays prepaid chat offer with discount information
 * Shows original price, discount, and final price
 * Includes countdown timer for discount validity
 * 
 * Props:
 * - visible: Boolean to show/hide modal
 * - offer: Offer object with pricing and discount details
 * - onAccept: Callback when user accepts offer
 * - onDecline: Callback when user declines offer
 * - astrologerName: Name of the astrologer
 */
const EnhancedPrepaidOfferModal = ({
  visible,
  offer,
  onAccept,
  onDecline,
  astrologerName
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const [remainingTime, setRemainingTime] = useState(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!offer?.couponCode || !offer?.validUntil) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(offer.validUntil);
      const diff = expiry - now;

      if (diff <= 0) {
        setRemainingTime({ expired: true });
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemainingTime({ minutes, seconds, expired: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [offer]);

  if (!offer) return null;

  const hasDiscount = offer.discountAmount > 0;
  const discountPercentage = offer.discountPercentage || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <LinearGradient
            colors={hasDiscount ? ['#8b5cf6', '#7c3aed', '#6d28d9'] : ['#4f46e5', '#4338ca']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDecline}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color={colors.textInverse} />
            </TouchableOpacity>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Header */}
              <View style={styles.header}>
                {hasDiscount && (
                  <View style={styles.discountBadge}>
                    <Ionicons name="flash" size={20} color={colors.textInverse} />
                    <Text style={styles.discountBadgeText}>
                      {discountPercentage}% OFF
                    </Text>
                  </View>
                )}
                
                <Text style={styles.title}>
                  {hasDiscount ? '🎉 Special Discount Offer!' : 'Continue Consultation'}
                </Text>
                <Text style={styles.subtitle}>
                  with {astrologerName || 'Astrologer'}
                </Text>
              </View>

              {/* Countdown Timer (if discount) */}
              {hasDiscount && remainingTime && !remainingTime.expired && (
                <View style={styles.timerCard}>
                  <Ionicons name="time-outline" size={24} color="#8b5cf6" />
                  <View style={styles.timerContent}>
                    <Text style={styles.timerLabel}>Offer expires in</Text>
                    <Text style={styles.timerValue}>
                      {remainingTime.minutes}:{remainingTime.seconds.toString().padStart(2, '0')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Pricing Card */}
              <View style={styles.pricingCard}>
                {hasDiscount && (
                  <>
                    {/* Original Price */}
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Original Price</Text>
                      <Text style={styles.originalPrice}>₹{offer.totalAmount}</Text>
                    </View>

                    {/* Discount */}
                    <View style={styles.priceRow}>
                      <Text style={styles.discountLabel}>
                        Discount ({discountPercentage}%)
                      </Text>
                      <Text style={styles.discountAmount}>
                        -₹{offer.discountAmount.toFixed(2)}
                      </Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />
                  </>
                )}

                {/* Final Price */}
                <View style={styles.finalPriceRow}>
                  <Text style={styles.finalPriceLabel}>
                    {hasDiscount ? 'You Pay' : 'Total Amount'}
                  </Text>
                  <Text style={styles.finalPrice}>
                    ₹{(offer.finalAmount || offer.totalAmount).toFixed(2)}
                  </Text>
                </View>

                {hasDiscount && (
                  <View style={styles.savingsTag}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.savingsText}>
                      You save ₹{offer.discountAmount.toFixed(2)}!
                    </Text>
                  </View>
                )}
              </View>

              {/* Features */}
              <View style={styles.featuresCard}>
                <Text style={styles.featuresTitle}>What you'll get:</Text>
                
                <View style={styles.feature}>
                  <Ionicons name="time-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.featureText}>
                    {offer.duration || 15} minutes consultation
                  </Text>
                </View>

                <View style={styles.feature}>
                  <Ionicons name="chatbubbles-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.featureText}>
                    Detailed astrology analysis
                  </Text>
                </View>

                <View style={styles.feature}>
                  <Ionicons name="bulb-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.featureText}>
                    Personalized remedies & guidance
                  </Text>
                </View>

                <View style={styles.feature}>
                  <Ionicons name="star-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.featureText}>
                    Expert astrologer consultation
                  </Text>
                </View>
              </View>

              {/* Coupon Code (if discount) */}
              {hasDiscount && offer.couponCode && (
                <View style={styles.couponCard}>
                  <Text style={styles.couponLabel}>Coupon Code Applied:</Text>
                  <View style={styles.couponCodeContainer}>
                    <Text style={styles.couponCode}>{offer.couponCode}</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={onAccept}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.acceptGradient}
                  >
                    <Text style={styles.acceptButtonText}>
                      {hasDiscount ? 'Claim Offer & Continue' : 'Continue Chat'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.textInverse} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={onDecline}
                  activeOpacity={0.7}
                >
                  <Text style={styles.declineButtonText}>Maybe Later</Text>
                </TouchableOpacity>
              </View>

              {/* Trust Indicators */}
              <View style={styles.trustIndicators}>
                <View style={styles.trustItem}>
                  <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                  <Text style={styles.trustText}>Secure Payment</Text>
                </View>
                <View style={styles.trustItem}>
                  <Ionicons name="lock-closed" size={16} color="#10b981" />
                  <Text style={styles.trustText}>100% Private</Text>
                </View>
                <View style={styles.trustItem}>
                  <Ionicons name="people" size={16} color="#10b981" />
                  <Text style={styles.trustText}>1000+ Happy Users</Text>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContainer: {
    width: width - 40,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden'
  },
  gradient: {
    borderRadius: 24
  },
  scrollContent: {
    padding: 24
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12
  },
  discountBadgeText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6
  },
  title: {
    color: colors.textInverse,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center'
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16
  },
  timerContent: {
    marginLeft: 12,
    flex: 1
  },
  timerLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4
  },
  timerValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b5cf6'
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  priceLabel: {
    fontSize: 16,
    color: '#6b7280'
  },
  originalPrice: {
    fontSize: 18,
    color: '#9ca3af',
    textDecorationLine: 'line-through'
  },
  discountLabel: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600'
  },
  discountAmount: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: 'bold'
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12
  },
  finalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  finalPriceLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937'
  },
  finalPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b5cf6'
  },
  savingsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    alignSelf: 'flex-start'
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 6
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  featureText: {
    fontSize: 15,
    color: '#4b5563',
    marginLeft: 12
  },
  couponCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10b981',
    borderStyle: 'dashed'
  },
  couponLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8
  },
  couponCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  couponCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b5cf6',
    letterSpacing: 1
  },
  actions: {
    marginBottom: 16
  },
  acceptButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24
  },
  acceptButtonText: {
    color: colors.textInverse,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8
  },
  declineButton: {
    paddingVertical: 14,
    alignItems: 'center'
  },
  declineButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600'
  },
  trustIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)'
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  trustText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginLeft: 4
  }
});

export default EnhancedPrepaidOfferModal;
