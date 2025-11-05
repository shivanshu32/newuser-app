import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  SafeAreaView,
  ActivityIndicator,
  Text,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { walletAPI } from '../../services/api';
import prepaidOffersAPI from '../../services/prepaidOffersAPI';
import poojaAPI from '../../services/poojaAPI';
import usePaymentTimeout from '../../hooks/usePaymentTimeout';
import facebookTrackingService from '../../services/facebookTrackingService';

const RazorpayPaymentScreen = ({ route, navigation }) => {
  const { order, config, finalAmount, user, selectedPackage, paymentType, offerId, offerDetails, bookingId } = route.params;
  const { updateWalletBalance, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactionId, setTransactionId] = useState(order?.transactionId || null);
  
  // Payment timeout hook
  const {
    isActive: isTimeoutActive,
    remainingTime,
    formatRemainingTime,
    startTimeout,
    cancelPayment,
    markCompleted,
    isExpired,
    isCancelled
  } = usePaymentTimeout({
    timeoutMinutes: 15,
    onTimeout: handlePaymentTimeout,
    onCancel: handlePaymentCancel,
    onStatusChange: handleStatusChange
  });
  
  // Debug logging for received parameters
  console.log('🎯 RazorpayPaymentScreen received params:', {
    order,
    config,
    finalAmount,
    user: user ? { name: user.name, email: user.email, mobileNumber: user.mobileNumber } : null,
    selectedPackage: selectedPackage ? { name: selectedPackage.name, minRechargeAmount: selectedPackage.minRechargeAmount } : null
  });

  // Timeout callback functions
  const handlePaymentTimeout = (txnId) => {
    console.log('🕐 Payment timed out:', txnId);
    Alert.alert(
      'Payment Expired',
      'Your payment session has expired due to inactivity. Please try again.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handlePaymentCancel = (txnId, reason) => {
    console.log('🚫 Payment cancelled:', txnId, reason);
    Alert.alert(
      'Payment Cancelled',
      'Your payment has been cancelled.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleStatusChange = (status, txnId) => {
    console.log('📊 Payment status changed:', status, txnId);
    if (status === 'expired' || status === 'cancelled') {
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

  // Initialize timeout when component mounts
  useEffect(() => {
    if (transactionId && order) {
      console.log('🕐 Starting payment timeout for transaction:', transactionId);
      startTimeout(transactionId, {
        orderId: order.id,
        amount: finalAmount,
        selectedPackage: selectedPackage
      });
    }
  }, [transactionId, order]);

  // Track payment initiation when component mounts
  useEffect(() => {
    const trackPaymentInitiation = async () => {
      try {
        await facebookTrackingService.initialize();
        
        const trackingData = {
          amount: finalAmount,
          currency: 'INR',
          paymentType: paymentType || 'wallet_recharge',
          selectedPackage: selectedPackage,
          offerId: offerId
        };

        await facebookTrackingService.trackPaymentInitiated(trackingData);
        console.log('📊 [FB-TRACKING] Payment initiation tracked for amount:', finalAmount);
      } catch (error) {
        console.error('❌ [FB-TRACKING] Failed to track payment initiation:', error);
      }
    };

    trackPaymentInitiation();
  }, [finalAmount, paymentType, selectedPackage, offerId]);

  const handleBackPress = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel the payment?',
      [
        { text: 'Continue Payment', style: 'cancel' },
        { text: 'Cancel', onPress: () => navigation.goBack() }
      ]
    );
    return true;
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('Payment successful, verifying with backend:', paymentData);
      console.log('Payment type:', paymentType);
      
      let verificationResponse;
      
      if (paymentType === 'prepaid_offer') {
        // Handle prepaid offer payment verification
        console.log('Verifying prepaid offer payment for offerId:', offerId);
        const verificationData = {
          razorpay_payment_id: paymentData.payment_id,
          razorpay_order_id: paymentData.order_id,
          razorpay_signature: paymentData.signature
        };
        
        verificationResponse = await prepaidOffersAPI.verifyRazorpayPayment(offerId, verificationData);
        console.log('🎯 [PREPAID_OFFER_VERIFICATION] Response received:', {
          success: verificationResponse?.success,
          message: verificationResponse?.message,
          data: verificationResponse?.data,
          fullResponse: verificationResponse
        });
      } else if (paymentType === 'pooja_booking') {
        // Handle pooja booking payment verification
        console.log('Verifying pooja booking payment for bookingId:', bookingId);
        const verificationData = {
          razorpay_payment_id: paymentData.payment_id,
          razorpay_order_id: paymentData.order_id,
          razorpay_signature: paymentData.signature,
          bookingId: bookingId
        };
        
        verificationResponse = await poojaAPI.verifyPoojaPayment(verificationData);
        console.log('📿 [POOJA_BOOKING_VERIFICATION] Response received:', {
          success: verificationResponse?.success,
          message: verificationResponse?.message,
          data: verificationResponse?.data
        });
      } else {
        // Handle wallet payment verification (existing logic)
        const verificationData = {
          razorpay_payment_id: paymentData.payment_id,
          razorpay_order_id: paymentData.order_id,
          razorpay_signature: paymentData.signature
        };
        
        // Include selected package information if available
        if (selectedPackage) {
          verificationData.selectedPackage = {
            id: selectedPackage.id,
            name: selectedPackage.name,
            percentageBonus: selectedPackage.percentageBonus || 0,
            flatBonus: selectedPackage.flatBonus || 0,
            minRechargeAmount: selectedPackage.minRechargeAmount || 0,
            firstRecharge: selectedPackage.firstRecharge || false
          };
          console.log('🎁 Including selected package in verification:', verificationData.selectedPackage);
        }
        
        verificationResponse = await walletAPI.verifyPayment(verificationData);
      }
      
      console.log('Payment verification response:', verificationResponse);
      
      if (verificationResponse.success) {
        // Mark payment as completed to stop timeout
        markCompleted();
        
        // Get the new balance from verification response
        const newBalance = verificationResponse.data?.newBalance || verificationResponse.data?.balance;
        console.log('💰 New wallet balance from verification:', newBalance);
        
        // Immediately update user context with new balance
        if (newBalance !== undefined) {
          await updateUser({ walletBalance: newBalance });
          console.log('✅ Updated user context with new balance:', newBalance);
        } else {
          // Fallback: fetch balance from API
          console.log('⚠️ No balance in verification response, fetching from API...');
          await updateWalletBalance();
        }

        // Track successful payment with Facebook SDK
        try {
          const trackingData = {
            amount: finalAmount,
            currency: 'INR',
            paymentId: paymentData.payment_id,
            orderId: paymentData.order_id,
            paymentType: paymentType || 'wallet_recharge',
            selectedPackage: selectedPackage,
            offerId: offerId
          };

          if (paymentType === 'prepaid_offer') {
            // Track prepaid offer purchase
            await facebookTrackingService.trackPrepaidOfferPurchase({
              offerId: offerId,
              amount: finalAmount,
              currency: 'INR',
              astrologerName: offerDetails?.astrologerName,
              durationMinutes: offerDetails?.durationMinutes,
              paymentId: paymentData.payment_id,
              orderId: paymentData.order_id
            });
          } else {
            // Calculate bonus and total wallet credit for regular payments
            let bonusAmount = 0;
            let totalWalletCredit = finalAmount;

            if (selectedPackage) {
              const rechargeAmount = selectedPackage.minRechargeAmount || 0;
              bonusAmount = selectedPackage.percentageBonus > 0 
                ? Math.round(rechargeAmount * selectedPackage.percentageBonus / 100)
                : (selectedPackage.flatBonus || 0);
              totalWalletCredit = rechargeAmount + bonusAmount;
            } else {
              // Manual recharge - remove GST to get actual wallet credit
              totalWalletCredit = Math.round(finalAmount / 1.18);
            }

            trackingData.bonusAmount = bonusAmount;
            trackingData.totalWalletCredit = totalWalletCredit;

            await facebookTrackingService.trackPaymentCompleted(trackingData);
          }

          // Track first payment milestone
          await facebookTrackingService.trackFirstPayment({
            amount: finalAmount,
            currency: 'INR',
            paymentType: paymentType || 'wallet_recharge',
            paymentId: paymentData.payment_id
          });

          console.log('📊 [FB-TRACKING] Payment success tracked with Facebook SDK');
        } catch (trackingError) {
          console.error('❌ [FB-TRACKING] Failed to track payment success:', trackingError);
          // Don't fail the payment flow if tracking fails
        }
        
        // Show different success messages based on payment type
        let successMessage;
        if (paymentType === 'prepaid_offer') {
          // Prepaid offer payment success message
          successMessage = `Payment Successful!\n\n${offerDetails?.description || 'Prepaid Chat Offer'}\n\nPayment Details:\n• Amount Paid: ₹${finalAmount}\n• Duration: ${offerDetails?.durationMinutes || 5} minutes\n• Astrologer: ${offerDetails?.astrologerName || 'Selected Astrologer'}\n\nYou can now start your prepaid chat session!\n\nPayment ID: ${paymentData.payment_id}`;
        } else if (paymentType === 'pooja_booking') {
          // Pooja booking payment success message
          const bookingData = verificationResponse.data?.booking;
          successMessage = `Pooja Booking Confirmed!\n\n${bookingData?.pooja?.mainHeading || 'Pooja Booking'}\n\nBooking Details:\n• Amount Paid: ₹${finalAmount}\n• Package: ${bookingData?.package?.name || 'Selected Package'}\n• Location: ${bookingData?.pooja?.location || 'TBD'}\n\nYour booking has been confirmed. You will receive further details soon.\n\nPayment ID: ${paymentData.payment_id}`;
        } else if (selectedPackage) {
          // Package payment success message
          const rechargeAmount = selectedPackage.minRechargeAmount || 0;
          const bonusAmount = selectedPackage.percentageBonus > 0 
            ? Math.round(rechargeAmount * selectedPackage.percentageBonus / 100)
            : (selectedPackage.flatBonus || 0);
          const gstAmount = Math.round(rechargeAmount * 0.18);
          const totalWalletCredit = rechargeAmount + bonusAmount;
          
          successMessage = `Package: ${selectedPackage.name}\n\nPayment Details:\n• You Paid: ₹${finalAmount} (including GST)\n• Base Credit: ₹${rechargeAmount}\n• Bonus Credit: +₹${bonusAmount}\n• Total Wallet Credit: ₹${totalWalletCredit}\n\nPayment ID: ${paymentData.payment_id}`;
        } else {
          // Manual payment success message
          const baseAmount = finalAmount / 1.18; // Remove GST to get base amount
          const gstAmount = finalAmount - baseAmount;
          successMessage = `Payment completed successfully.\n\nTransaction Details:\n• Amount Added: ₹${baseAmount.toFixed(2)}\n• GST (18%): ₹${gstAmount.toFixed(2)}\n• Total Paid: ₹${finalAmount}\n\nPayment ID: ${paymentData.payment_id}`;
        }
        
        Alert.alert(
          'Payment Successful!',
          successMessage,
          [
            {
              text: 'OK',
              onPress: async () => {
                if (paymentType === 'prepaid_offer') {
                  console.log('🔙 Navigating to Home screen after prepaid offer payment...');
                  // Small delay to ensure database update propagates
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  navigation.navigate('Home');
                } else {
                  console.log('🔙 Navigating back to Wallet screen...');
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        console.error('Payment verification failed:', verificationResponse);
        Alert.alert(
          'Payment Verification Failed',
          'Payment was successful but verification failed. Please contact support if your wallet is not updated.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      Alert.alert(
        'Payment Verification Error',
        'Payment was successful but verification failed. Please contact support if your wallet is not updated.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  };

  const handlePaymentFailure = async (error) => {
    // Track payment failure with Facebook SDK
    try {
      const trackingData = {
        amount: finalAmount,
        currency: 'INR',
        error: error,
        paymentType: paymentType || 'wallet_recharge',
        selectedPackage: selectedPackage,
        offerId: offerId
      };

      await facebookTrackingService.trackPaymentFailed(trackingData);
      console.log('📊 [FB-TRACKING] Payment failure tracked with Facebook SDK');
    } catch (trackingError) {
      console.error('❌ [FB-TRACKING] Failed to track payment failure:', trackingError);
    }

    Alert.alert(
      'Payment Failed',
      `Payment could not be completed.\nError: ${error}\n\nPlease try again.`,
      [
        {
          text: 'Retry',
          onPress: () => navigation.goBack()
        },
        {
          text: 'Cancel',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleWebViewMessage = (event) => {
    try {
      console.log('WebView message received:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Parsed WebView data:', data);
      
      if (data.type === 'payment_success') {
        console.log('Payment success detected');
        // Pass complete payment data for verification
        handlePaymentSuccess({
          payment_id: data.payment_id,
          order_id: data.order_id,
          signature: data.signature
        });
      } else if (data.type === 'payment_failed') {
        console.log('Payment failed detected:', data.error);
        handlePaymentFailure(data.error || 'Unknown error');
      } else if (data.type === 'payment_cancelled') {
        console.log('Payment cancelled detected');
        Alert.alert(
          'Payment Cancelled',
          'Payment was cancelled by user.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (data.type === 'error') {
        console.error('WebView error:', data.error);
        Alert.alert(
          'Payment Error',
          `An error occurred: ${data.error}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      Alert.alert(
        'WebView Error',
        'Failed to process payment response. Please try again.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  // Validate required parameters
  if (!order || !config || !finalAmount || !user) {
    console.error('Missing required parameters:', { order, config, finalAmount, user });
    Alert.alert(
      'Payment Error',
      'Missing payment information. Please try again.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
    return null;
  }
  
  // Safely escape user data for HTML
  const safeUserName = (user?.name || user?.displayName || 'User').replace(/["'<>&]/g, '');
  const safeUserEmail = (user?.email || '').replace(/["'<>&]/g, '');
  const safeUserContact = (user?.mobileNumber || '').replace(/["'<>&]/g, '');
  
  const paymentHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>JyotishCall Payment</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:;">
    <script src="https://checkout.razorpay.com/v1/checkout.js" onerror="console.error('Failed to load Razorpay SDK')"></script>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px; 
            text-align: center; 
            background: #f8f9fa;
            margin: 0;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .logo {
            color: #F97316;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .payment-info { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #F97316;
        }
        .amount {
            font-size: 28px;
            font-weight: bold;
            color: #F97316;
            margin: 10px 0;
        }
        .order-id {
            font-size: 12px;
            color: #666;
            margin-bottom: 20px;
        }
        .btn { 
            background: #F97316; 
            color: white; 
            padding: 16px 32px; 
            border: none; 
            border-radius: 8px; 
            font-size: 16px; 
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.3s;
        }
        .btn:hover {
            background: #e8650e;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 20px 0;
        }
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #F97316;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🔮 JyotishCall</div>
        <h2>Wallet Top-up</h2>
        <div class="payment-info">
            <div class="amount">₹${finalAmount}</div>
            <div class="order-id">Order ID: ${order.orderId}</div>
        </div>
        <button class="btn" onclick="startPayment()" id="payBtn">
            Pay ₹${finalAmount}
        </button>
        <div class="loading" id="loading" style="display: none;">
            <div class="spinner"></div>
            <span>Processing payment...</span>
        </div>
    </div>

    <script>
        function showLoading() {
            document.getElementById('payBtn').style.display = 'none';
            document.getElementById('loading').style.display = 'flex';
        }

        function hideLoading() {
            document.getElementById('payBtn').style.display = 'block';
            document.getElementById('loading').style.display = 'none';
        }

        function postMessage(data) {
            console.log('Posting message to React Native:', data);
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
            } else {
                console.error('ReactNativeWebView not available');
                alert('ReactNativeWebView not available');
            }
        }
        
        function logError(message, error) {
            console.error(message, error);
            postMessage({
                type: 'error',
                error: message + (error ? ': ' + error.message : '')
            });
        }

        function startPayment() {
            console.log('Starting payment process...');
            showLoading();
            
            // Check if Razorpay is loaded
            if (typeof Razorpay === 'undefined') {
                logError('Razorpay SDK not loaded');
                hideLoading();
                return;
            }
            
            var options = {
                key: '${config.keyId}',
                amount: ${order.amount},
                currency: '${order.currency}',
                name: 'JyotishCall',
                description: 'Wallet Top-up',
                order_id: '${order.orderId}',
                theme: { color: '#F97316' },
                prefill: {
                    name: '${safeUserName}',
                    email: '${safeUserEmail}',
                    contact: '${safeUserContact}'
                },
                handler: function(response) {
                    console.log('Payment successful:', response);
                    postMessage({
                        type: 'payment_success',
                        payment_id: response.razorpay_payment_id,
                        order_id: response.razorpay_order_id,
                        signature: response.razorpay_signature
                    });
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment modal dismissed');
                        hideLoading();
                        postMessage({
                            type: 'payment_cancelled'
                        });
                    }
                }
            };
            
            console.log('Razorpay options:', options);
            
            try {
                var rzp = new Razorpay(options);
                rzp.on('payment.failed', function(response) {
                    console.log('Payment failed:', response);
                    hideLoading();
                    postMessage({
                        type: 'payment_failed',
                        error: response.error.description || 'Payment failed'
                    });
                });
                console.log('Opening Razorpay checkout...');
                rzp.open();
            } catch (error) {
                console.error('Error initializing Razorpay:', error);
                hideLoading();
                logError('Failed to initialize payment', error);
            }
        }

        // Check if Razorpay script loaded successfully
        function checkRazorpayLoaded() {
            if (typeof Razorpay !== 'undefined') {
                console.log('Razorpay SDK loaded successfully');
                startPayment();
            } else {
                console.error('Razorpay SDK failed to load');
                logError('Razorpay SDK failed to load. Please check your internet connection.');
            }
        }
        
        // Auto-start payment when page loads with error handling
        setTimeout(checkRazorpayLoaded, 1000);
        
        // Add error handling for script loading
        window.addEventListener('error', function(e) {
            console.error('Script loading error:', e);
            if (e.target && e.target.src && e.target.src.includes('razorpay')) {
                logError('Failed to load Razorpay SDK');
            }
        });
    </script>
</body>
</html>`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Payment Timeout Header */}
      {isTimeoutActive && (
        <View style={styles.timeoutHeader}>
          <View style={styles.timeoutInfo}>
            <Text style={styles.timeoutText}>Payment expires in: </Text>
            <Text style={styles.timeoutTime}>{formatRemainingTime()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              Alert.alert(
                'Cancel Payment?',
                'Are you sure you want to cancel this payment?',
                [
                  { text: 'Continue Payment', style: 'cancel' },
                  { 
                    text: 'Cancel Payment', 
                    style: 'destructive',
                    onPress: () => cancelPayment('User cancelled payment')
                  }
                ]
              );
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading payment page...</Text>
        </View>
      )}
      <WebView
        source={{ html: paymentHtml }}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          console.log('WebView loaded successfully');
          setLoading(false);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          Alert.alert(
            'WebView Error',
            'Failed to load payment page. Please try again.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error:', nativeEvent);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        allowsBackForwardNavigationGestures={false}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  timeoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEAA7',
  },
  timeoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeoutText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
  timeoutTime: {
    fontSize: 16,
    color: '#DC3545',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  cancelButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RazorpayPaymentScreen;
