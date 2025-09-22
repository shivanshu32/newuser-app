import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import prepaidOffersAPI from '../../services/prepaidOffersAPI';
import { useAuth } from '../../context/AuthContext';

const PrepaidOfferPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, refreshUserData } = useAuth();
  
  const { offerId } = route.params;
  
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetchOfferDetails();
  }, [offerId]);

  const fetchOfferDetails = async () => {
    try {
      const response = await prepaidOffersAPI.getOfferDetails(offerId);
      if (response.success) {
        setOffer(response.data);
      } else {
        Alert.alert('Error', 'Failed to load offer details');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching offer details:', error);
      Alert.alert('Error', 'Failed to load offer details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!offer || paying) return;

    setPaying(true);
    try {
      // Create Razorpay order
      const orderResponse = await prepaidOffersAPI.createRazorpayOrder(offerId);
      
      if (!orderResponse.success) {
        Alert.alert('Error', orderResponse.message || 'Failed to create payment order');
        return;
      }

      const { orderId, amount, razorpayKeyId } = orderResponse.data;

      // Navigate to WebView payment screen (same as wallet recharge)
      navigation.navigate('RazorpayPayment', {
        order: {
          orderId: orderId,
          amount: amount,
          currency: 'INR'
        },
        config: {
          keyId: razorpayKeyId
        },
        finalAmount: offer.totalAmount,
        user: user,
        // Add prepaid offer specific data
        paymentType: 'prepaid_offer',
        offerId: offerId,
        offerDetails: {
          astrologerName: offer.astrologer?.name,
          durationMinutes: offer.durationMinutes,
          description: `Prepaid Chat Offer - ${offer.durationMinutes} minutes with ${offer.astrologer?.name}`
        }
      });

      console.log('Navigating to Razorpay WebView payment screen for prepaid offer');

    } catch (error) {
      console.error('Error creating payment order:', error);
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initiate payment. Please try again.'
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading offer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!offer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Offer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Astrologer Info */}
        <View style={styles.astrologerCard}>
          <Image 
            source={{ 
              uri: offer.astrologer?.profileImage || 'https://via.placeholder.com/80x80' 
            }}
            style={styles.astrologerImage}
          />
          <View style={styles.astrologerInfo}>
            <Text style={styles.astrologerName}>{offer.astrologer?.name}</Text>
            {offer.astrologer?.specializations && (
              <Text style={styles.specializations}>
                {offer.astrologer.specializations.slice(0, 2).join(', ')}
              </Text>
            )}
            {offer.astrologer?.averageRating && (
              <View style={styles.ratingContainer}>
                <MaterialIcons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{offer.astrologer.averageRating}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Offer Details */}
        <View style={styles.offerCard}>
          <View style={styles.offerHeader}>
            <MaterialIcons name="local-fire-department" size={24} color="#FF6B35" />
            <Text style={styles.offerTitle}>Special Prepaid Chat Offer</Text>
          </View>
          
          <View style={styles.offerDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={20} color="#666" />
              <Text style={styles.detailText}>{offer.durationMinutes} minutes chat</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="person" size={20} color="#666" />
              <Text style={styles.detailText}>Same astrologer</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialIcons name="flash-on" size={20} color="#666" />
              <Text style={styles.detailText}>Instant start available</Text>
            </View>
          </View>
        </View>

        {/* Payment Breakdown */}
        <View style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Chat Duration</Text>
            <Text style={styles.breakdownValue}>{offer.durationMinutes} minutes</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base Price</Text>
            <Text style={styles.breakdownValue}>₹{offer.basePrice}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST (18%)</Text>
            <Text style={styles.breakdownValue}>₹{offer.gstAmount}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalValue}>₹{offer.totalAmount}</Text>
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
              <Text style={styles.razorpayText}>Secure payment powered by Razorpay</Text>
              <Text style={styles.paymentOptions}>
                • Credit/Debit Cards{'\n'}
                • Net Banking{'\n'}
                • UPI{'\n'}
                • Wallets & More
              </Text>
            </View>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Important Notes</Text>
          <Text style={styles.termsText}>
            • This is a one-time offer valid for 24 hours{'\n'}
            • Chat session will be maximum 5 minutes long{'\n'}
            • Session can only be used once, regardless of duration{'\n'}
            • Payment is processed securely via Razorpay{'\n'}
            • No refunds once session starts
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.payButton,
            paying && styles.disabledButton
          ]}
          onPress={handlePayNow}
          disabled={paying}
        >
          {paying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>
              Pay ₹{offer.totalAmount} Now
            </Text>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
  astrologerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  astrologerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  specializations: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  offerCard: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 8,
  },
  offerDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
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

export default PrepaidOfferPaymentScreen;
