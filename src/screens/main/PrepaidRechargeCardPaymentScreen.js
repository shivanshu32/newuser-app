import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import prepaidRechargeCardsAPI from '../../services/prepaidRechargeCardsAPI';
import facebookTrackingService from '../../services/facebookTrackingService';

const PrepaidRechargeCardPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  const { card } = route.params;

  const [paying, setPaying] = useState(false);

  if (!card) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prepaid card not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const basePrice = card.basePrice || 0;
  const gstPercentage = card.gstPercentage || 18;
  const gstAmount = card.gstAmount ?? Math.round(basePrice * gstPercentage) / 100;
  const totalAmount = card.totalAmount ?? basePrice + gstAmount;

  const getApplicabilityText = () => {
    const assignment = card.astrologerAssignment || 'all';
    if (assignment === 'specific') {
      return 'Applicable to selected astrologers only';
    }
    return 'Applicable to all astrologers';
  };

  const handlePayNow = async () => {
    if (paying) return;

    setPaying(true);
    try {
      // Track payment initiation with Facebook SDK
      try {
        await facebookTrackingService.initialize();

        const trackingData = {
          amount: totalAmount,
          currency: 'INR',
          paymentType: 'prepaid_recharge_card',
          cardId: card.id || card._id,
        };

        await facebookTrackingService.trackPaymentInitiated(trackingData);
        console.log(
          '\ud83d\udcca [FB-TRACKING] Prepaid recharge card payment initiation tracked for amount:',
          totalAmount,
        );
      } catch (trackingError) {
        console.error(
          '\u274c [FB-TRACKING] Failed to track prepaid recharge card payment initiation:',
          trackingError,
        );
        // Do not block payment flow on tracking failure
      }

      const cardId = card.id || card._id;
      if (!cardId) {
        Alert.alert('Payment Error', 'Invalid card details. Please try again.');
        return;
      }

      console.log('\ud83d\udcb3 [PREPAID_CARD] Creating order for card:', {
        cardId,
        basePrice,
        gstAmount,
        totalAmount,
      });

      const orderResponse = await prepaidRechargeCardsAPI.createOrder(cardId);
      console.log('\ud83d\udcb3 [PREPAID_CARD] createOrder response:', orderResponse);

      if (!orderResponse?.success || !orderResponse?.data) {
        const message = orderResponse?.message || 'Failed to create payment order';
        Alert.alert('Payment Error', message);
        return;
      }

      const { orderId, keyId, amount, currency, purchaseId, cardDetails } = orderResponse.data;

      navigation.navigate('RazorpayPayment', {
        order: {
          id: orderId,
          orderId,
          amount,
          currency: currency || 'INR',
        },
        config: {
          keyId: keyId,
        },
        finalAmount: totalAmount,
        user,
        paymentType: 'prepaid_recharge_card',
        rechargeCardId: cardId,
        rechargeCardPurchaseId: purchaseId,
        rechargeCardDetails: {
          name: cardDetails?.name || card.displayName,
          durationMinutes: cardDetails?.durationMinutes || card.durationMinutes,
          description:
            card.description ||
            `Prepaid Chat Pack - ${card.durationMinutes} minutes`,
        },
      });

      console.log(
        'Navigating to Razorpay WebView payment screen for prepaid recharge card',
      );
    } catch (error) {
      console.error('Error creating prepaid recharge card payment order:', error);

      try {
        const trackingData = {
          amount: totalAmount,
          currency: 'INR',
          error: error.message || 'Failed to create payment order',
          paymentType: 'prepaid_recharge_card',
          cardId: card.id || card._id,
        };

        await facebookTrackingService.trackPaymentFailed(trackingData);
        console.log('\ud83d\udcca [FB-TRACKING] Prepaid recharge card payment failure tracked');
      } catch (trackingError) {
        console.error(
          '\u274c [FB-TRACKING] Failed to track prepaid recharge card payment failure:',
          trackingError,
        );
      }

      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initiate payment. Please try again.',
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Card Info */}
        <View style={styles.cardInfoCard}>
          <Text style={styles.cardTitle}>{card.displayName}</Text>
          {card.description ? (
            <Text style={styles.cardDescription}>{card.description}</Text>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{card.durationMinutes} minutes chat</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color="#666" />
            <Text style={styles.infoText}>{getApplicabilityText()}</Text>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment Breakdown</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Chat Duration</Text>
            <Text style={styles.breakdownValue}>{card.durationMinutes} minutes</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Amount</Text>
            <Text style={styles.breakdownValue}>₹{basePrice}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              GST ({gstPercentage}%){' '}
            </Text>
            <Text style={styles.breakdownValue}>₹{gstAmount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentMethodCard}>
          <View style={styles.paymentMethodHeader}>
            <MaterialIcons name="payment" size={24} color="#4CAF50" />
            <Text style={styles.paymentMethodTitle}>Payment Method</Text>
          </View>
          <View style={styles.paymentMethodContent}>
            <View style={styles.razorpayContainer}>
              <Text style={styles.razorpayText}>
                Secure payment powered by Razorpay
              </Text>
              <Text style={styles.paymentOptions}>
                {`• Credit/Debit Cards\n• Net Banking\n• UPI\n• Wallets & More`}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Important Notes</Text>
          <Text style={styles.termsText}>
            {`• This prepaid chat pack provides fixed chat minutes\n• Once used for a session, it cannot be reused\n• Payment is processed securely via Razorpay\n• No refunds after the chat session starts`}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, paying && styles.disabledButton]}
          onPress={handlePayNow}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>Pay ₹{totalAmount} Now</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
  cardInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  paymentMethodContent: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
  },
  razorpayContainer: {
    alignItems: 'center',
  },
  razorpayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 10,
  },
  paymentOptions: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  termsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  payButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
});

export default PrepaidRechargeCardPaymentScreen;
