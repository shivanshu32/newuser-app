import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  SafeAreaView,
  ActivityIndicator,
  Text
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { walletAPI } from '../../services/api';

const RazorpayPaymentScreen = ({ route, navigation }) => {
  const { order, config, finalAmount, user } = route.params;
  const { updateWalletBalance } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, []);

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
      
      // Verify payment with backend
      const verificationResponse = await walletAPI.verifyPayment({
        razorpay_payment_id: paymentData.payment_id,
        razorpay_order_id: paymentData.order_id,
        razorpay_signature: paymentData.signature
      });
      
      console.log('Payment verification response:', verificationResponse);
      
      if (verificationResponse.success) {
        // Update wallet balance after successful verification
        await updateWalletBalance();
        
        Alert.alert(
          'Payment Successful!',
          `Payment completed successfully.\nPayment ID: ${paymentData.payment_id}\n\nYour wallet has been updated with ₹${finalAmount}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Wallet');
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
              onPress: () => navigation.navigate('Wallet')
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
            onPress: () => navigation.navigate('Wallet')
          }
        ]
      );
    }
  };

  const handlePaymentFailure = (error) => {
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
          onPress: () => navigation.navigate('Wallet')
        }
      ]
    );
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'payment_success') {
        // Pass complete payment data for verification
        handlePaymentSuccess({
          payment_id: data.payment_id,
          order_id: data.order_id,
          signature: data.signature
        });
      } else if (data.type === 'payment_failed') {
        handlePaymentFailure(data.error || 'Unknown error');
      } else if (data.type === 'payment_cancelled') {
        Alert.alert(
          'Payment Cancelled',
          'Payment was cancelled by user.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const paymentHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>JyotishCall Payment</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
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
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify(data));
            }
        }

        function startPayment() {
            showLoading();
            
            var options = {
                key: '${config.keyId}',
                amount: ${order.amount},
                currency: '${order.currency}',
                name: 'JyotishCall',
                description: 'Wallet Top-up',
                order_id: '${order.orderId}',
                theme: { color: '#F97316' },
                prefill: {
                    name: '${user?.name || user?.displayName || 'User'}',
                    email: '${user?.email || ''}',
                    contact: '${user?.mobileNumber || ''}'
                },
                handler: function(response) {
                    postMessage({
                        type: 'payment_success',
                        payment_id: response.razorpay_payment_id,
                        order_id: response.razorpay_order_id,
                        signature: response.razorpay_signature
                    });
                },
                modal: {
                    ondismiss: function() {
                        hideLoading();
                        postMessage({
                            type: 'payment_cancelled'
                        });
                    }
                }
            };
            
            try {
                var rzp = new Razorpay(options);
                rzp.on('payment.failed', function(response) {
                    hideLoading();
                    postMessage({
                        type: 'payment_failed',
                        error: response.error.description || 'Payment failed'
                    });
                });
                rzp.open();
            } catch (error) {
                hideLoading();
                postMessage({
                    type: 'payment_failed',
                    error: 'Failed to initialize payment: ' + error.message
                });
            }
        }

        // Auto-start payment when page loads
        setTimeout(startPayment, 1000);
    </script>
</body>
</html>`;

  return (
    <SafeAreaView style={styles.container}>
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
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
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
});

export default RazorpayPaymentScreen;
