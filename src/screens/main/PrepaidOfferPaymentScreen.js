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
import Icon from 'react-native-vector-icons/MaterialIcons';
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

    // Check wallet balance
    if (user?.wallet?.balance < offer.totalAmount) {
      Alert.alert(
        'Insufficient Balance',
        `You need ₹${offer.totalAmount} but have ₹${user.wallet.balance}. Please recharge your wallet first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Recharge Wallet', 
            onPress: () => navigation.navigate('Wallet') 
          }
        ]
      );
      return;
    }

    setPaying(true);
    try {
      const response = await prepaidOffersAPI.payForOffer(offerId);
      
      if (response.success) {
        // Refresh user data to update wallet balance
        await refreshUserData();
        
        Alert.alert(
          'Payment Successful!',
          'You can now start your prepaid chat session.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      } else {
        Alert.alert('Payment Failed', response.message || 'Please try again');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert(
        'Payment Failed',
        error.response?.data?.message || 'Please try again'
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
          <Icon name="arrow-back" size={24} color="#333" />
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
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>{offer.astrologer.averageRating}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Offer Details */}
        <View style={styles.offerCard}>
          <View style={styles.offerHeader}>
            <Icon name="local-fire-department" size={24} color="#FF6B35" />
            <Text style={styles.offerTitle}>Special Prepaid Chat Offer</Text>
          </View>
          
          <View style={styles.offerDetails}>
            <View style={styles.detailRow}>
              <Icon name="schedule" size={20} color="#666" />
              <Text style={styles.detailText}>{offer.durationMinutes} minutes chat</Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="person" size={20} color="#666" />
              <Text style={styles.detailText}>Same astrologer</Text>
            </View>
            <View style={styles.detailRow}>
              <Icon name="flash-on" size={20} color="#666" />
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

        {/* Wallet Balance */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Icon name="account-balance-wallet" size={24} color="#4CAF50" />
            <Text style={styles.walletTitle}>Wallet Balance</Text>
          </View>
          <Text style={styles.walletBalance}>₹{user?.wallet?.balance || 0}</Text>
          
          {user?.wallet?.balance < offer.totalAmount && (
            <View style={styles.insufficientBalance}>
              <Icon name="warning" size={16} color="#F44336" />
              <Text style={styles.insufficientText}>
                Insufficient balance. Need ₹{(offer.totalAmount - (user?.wallet?.balance || 0)).toFixed(2)} more.
              </Text>
            </View>
          )}
        </View>

        {/* Terms */}
        <View style={styles.termsCard}>
          <Text style={styles.termsTitle}>Important Notes</Text>
          <Text style={styles.termsText}>
            • This is a one-time offer valid for 24 hours{'\n'}
            • Chat session will be 5 minutes long{'\n'}
            • Amount will be deducted from your wallet{'\n'}
            • No refunds once session starts
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.payButton,
            (paying || user?.wallet?.balance < offer.totalAmount) && styles.disabledButton
          ]}
          onPress={handlePayNow}
          disabled={paying || user?.wallet?.balance < offer.totalAmount}
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
  walletCard: {
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
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  walletBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  insufficientBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  insufficientText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 5,
    flex: 1,
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
