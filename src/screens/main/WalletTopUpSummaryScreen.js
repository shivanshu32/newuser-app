import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Linking } from 'react-native';
// Using Razorpay Web Checkout instead of native SDK for better compatibility
// import RazorpayCheckout from 'react-native-razorpay';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { walletAPI } from '../../services/api';

// API Base URL for payment link creation
const API_BASE_URL = 'https://jyotishcall-backend.onrender.com';
import { useAuth } from '../../context/AuthContext';

const WalletTopUpSummaryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { amount } = route.params;
  const { user, updateUser } = useAuth();
  
  const [processingPayment, setProcessingPayment] = useState(false);

  // Calculate GST and final amount
  const baseAmount = parseFloat(amount) || 0;
  const gstRate = 0.18; // 18% GST
  const gstAmount = baseAmount * gstRate;
  const finalAmount = baseAmount + gstAmount;

  const handleProceedToPay = async () => {
    if (baseAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setProcessingPayment(true);
    try {
      console.log('🔄 Starting payment process for amount:', finalAmount);
      
      // Get Razorpay config
      const configResponse = await walletAPI.getRazorpayConfig();
      console.log('Razorpay config response:', configResponse);
      
      // Handle the response structure - API interceptor returns response.data directly
      let config;
      if (configResponse.success && configResponse.data) {
        config = configResponse.data;
      } else if (configResponse.data && configResponse.data.success) {
        config = configResponse.data.data;
      } else {
        const errorMsg = configResponse.message || configResponse.data?.message || 'Failed to get payment config';
        throw new Error(errorMsg);
      }
      
      console.log('Razorpay config extracted:', config);
      
      // Create order on backend with final amount (including GST)
      const orderResponse = await walletAPI.createOrder(finalAmount);
      console.log('Order creation response:', orderResponse);
      
      // Handle the response structure - API interceptor returns response.data directly
      let order;
      if (orderResponse.success && orderResponse.data) {
        order = orderResponse.data;
      } else if (orderResponse.data && orderResponse.data.success) {
        order = orderResponse.data.data;
      } else {
        const errorMsg = orderResponse.message || orderResponse.data?.message || 'Failed to create order';
        throw new Error(errorMsg);
      }
      
      console.log('Order extracted:', order);
      
      // Prepare Razorpay options for native SDK
      const options = {
        description: 'Wallet Top-up',
        image: 'https://your-logo-url.com/logo.png', // You can add your app logo here
        currency: 'INR',
        key: config.keyId,
        amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise
        name: 'JyotishCall',
        order_id: order.orderId, // Fixed: use orderId instead of id
        prefill: {
          email: user?.email || '',
          contact: user?.mobileNumber || '',
          name: user?.name || user?.displayName || ''
        },
        theme: {
          color: '#F97316'
        }
      };
      
      console.log('Opening Razorpay with options:', options);
      
      // Navigate to WebView payment screen with payment details
      navigation.navigate('RazorpayPayment', {
        order: order,
        config: config,
        finalAmount: finalAmount,
        user: user
      });
      
      console.log('Navigating to Razorpay WebView payment screen');
      
    } catch (error) {
      console.error('Payment error:', error);
      
      if (error.code === 'payment_cancelled') {
        Alert.alert('Payment Cancelled', 'Payment was cancelled by user.');
      } else {
        let errorMessage = 'Failed to process payment. Please try again.';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message && !error.message.includes('payment_cancelled')) {
          errorMessage = error.message;
        }
        
        Alert.alert('Payment Error', errorMessage);
      }
    } finally {
      setProcessingPayment(false);
    }
  };



  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('Payment successful:', paymentData);
      
      // Verify payment on backend
      const verificationResponse = await walletAPI.verifyPayment({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        amount: finalAmount
      });
      
      console.log('Payment verification response:', verificationResponse);
      
      // Handle the response structure - API interceptor returns response.data directly
      let verificationResult;
      if (verificationResponse.success && verificationResponse.data) {
        verificationResult = verificationResponse.data;
      } else if (verificationResponse.data && verificationResponse.data.success) {
        verificationResult = verificationResponse.data.data;
      } else {
        const errorMsg = verificationResponse.message || verificationResponse.data?.message || 'Payment verification failed';
        throw new Error(errorMsg);
      }
      
      if (verificationResult.verified) {
        // Update user balance in context if available
        if (updateUser && verificationResult.newBalance) {
          updateUser({ walletBalance: verificationResult.newBalance });
        }
        
        Alert.alert(
          'Payment Successful!',
          `₹${baseAmount.toFixed(2)} has been added to your wallet.\n\nTransaction Details:\n• Amount Added: ₹${baseAmount.toFixed(2)}\n• GST (18%): ₹${gstAmount.toFixed(2)}\n• Total Paid: ₹${finalAmount.toFixed(2)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to wallet screen
                navigation.navigate('Wallet');
              }
            }
          ]
        );
      } else {
        throw new Error('Payment verification failed');
      }
      
    } catch (error) {
      console.error('Payment verification error:', error);
      
      let errorMessage = 'Payment verification failed. Please contact support.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Verification Error', errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Summary</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Wallet Top-Up Summary</Text>
          
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Top-up Amount</Text>
            <Text style={styles.amountValue}>₹{baseAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>GST (18%)</Text>
            <Text style={styles.amountValue}>₹{gstAmount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Payable Amount</Text>
            <Text style={styles.totalValue}>₹{finalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#F97316" />
            <Text style={styles.infoTitle}>Payment Information</Text>
          </View>
          <Text style={styles.infoText}>
            • GST is applicable as per government regulations{'\n'}
            • The wallet amount credited will be ₹{baseAmount.toFixed(2)}{'\n'}
            • GST amount (₹{gstAmount.toFixed(2)}) is charged separately{'\n'}
            • Payment is processed securely through Razorpay
          </Text>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Charge Breakdown</Text>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownDot} />
            <Text style={styles.breakdownText}>
              Wallet Credit: ₹{baseAmount.toFixed(2)} (Amount you'll receive in wallet)
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <View style={[styles.breakdownDot, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.breakdownText}>
              GST Charges: ₹{gstAmount.toFixed(2)} (Government tax - 18%)
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.proceedButton, processingPayment && styles.disabledButton]}
          onPress={handleProceedToPay}
          disabled={processingPayment}
        >
          {processingPayment ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.proceedButtonText}>Proceed to Pay</Text>
              <Text style={styles.proceedButtonAmount}>₹{finalAmount.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  amountLabel: {
    fontSize: 16,
    color: '#666',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginTop: 8,
    borderRadius: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F97316',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F97316',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginTop: 6,
    marginRight: 12,
  },
  breakdownText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  proceedButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  proceedButtonAmount: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default WalletTopUpSummaryScreen;
