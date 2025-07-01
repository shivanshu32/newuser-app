import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const RazorpayWebView = ({ 
  orderId, 
  keyId, 
  amount, 
  currency = 'INR',
  userDetails,
  onPaymentSuccess, 
  onPaymentFailure, 
  onClose 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const webViewRef = useRef(null);

  // Generate the HTML content for Razorpay payment
  const generateRazorpayHTML = () => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
        <title>Razorpay Payment</title>
        <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline';">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
                width: 100%;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #F97316;
                margin-bottom: 20px;
            }
            .amount {
                font-size: 32px;
                font-weight: bold;
                color: #333;
                margin: 20px 0;
            }
            .description {
                color: #666;
                margin-bottom: 30px;
                font-size: 16px;
            }
            .pay-button {
                background: #F97316;
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 8px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                width: 100%;
                transition: background 0.3s;
            }
            .pay-button:hover {
                background: #e5650e;
            }
            .pay-button:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
            .loading {
                display: none;
                margin-top: 20px;
            }
            .loading.show {
                display: block;
            }
            .spinner {
                border: 3px solid #f3f3f3;
                border-top: 3px solid #F97316;
                border-radius: 50%;
                width: 30px;
                height: 30px;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">JyotishCall</div>
            <div class="amount">₹${amount / 100}</div>
            <div class="description">Wallet Top-up</div>
            <button id="payButton" class="pay-button" onclick="initiatePayment()">
                Pay Now
            </button>
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <p>Processing payment...</p>
            </div>
        </div>

        <script>
            // Send debug messages to React Native
            function debugLog(message) {
                console.log('[WebView Debug]:', message);
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'DEBUG_LOG',
                        message: message
                    }));
                }
            }
            
            function showLoading() {
                debugLog('Showing loading state');
                document.getElementById('payButton').disabled = true;
                document.getElementById('loading').classList.add('show');
            }

            function hideLoading() {
                debugLog('Hiding loading state');
                document.getElementById('payButton').disabled = false;
                document.getElementById('loading').classList.remove('show');
            }

            function initiatePayment() {
                try {
                    debugLog('Starting payment initialization');
                    showLoading();
                    
                    // Check if Razorpay is loaded
                    if (typeof Razorpay === 'undefined') {
                        debugLog('ERROR: Razorpay SDK not loaded');
                        throw new Error('Razorpay SDK not loaded');
                    }
                    
                    debugLog('Razorpay SDK is available, creating payment options');
                    debugLog('Order ID: ${orderId}');
                    debugLog('Amount: ${amount}');
                    debugLog('Key ID: ${keyId}');
                    
                    const options = {
                        key: '${keyId}',
                        amount: ${amount},
                        currency: '${currency}',
                        name: 'JyotishCall',
                        description: 'Wallet Top-up',
                        order_id: '${orderId}',
                        prefill: {
                            name: '${userDetails?.name || ''}',
                            email: '${userDetails?.email || ''}',
                            contact: '${userDetails?.phone || ''}'
                        },
                        theme: {
                            color: '#F97316'
                        },
                        handler: function(response) {
                            console.log('Payment Success:', response);
                            hideLoading();
                            if (window.ReactNativeWebView) {
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'PAYMENT_SUCCESS',
                                    data: {
                                        razorpay_payment_id: response.razorpay_payment_id,
                                        razorpay_order_id: response.razorpay_order_id,
                                        razorpay_signature: response.razorpay_signature
                                    }
                                }));
                            }
                        },
                        modal: {
                            ondismiss: function() {
                                console.log('Payment dismissed by user');
                                hideLoading();
                                if (window.ReactNativeWebView) {
                                    window.ReactNativeWebView.postMessage(JSON.stringify({
                                        type: 'PAYMENT_DISMISSED'
                                    }));
                                }
                            }
                        }
                    };

                    debugLog('Creating Razorpay instance with options');
                    const rzp = new Razorpay(options);
                    debugLog('Razorpay instance created successfully');
                    
                    rzp.on('payment.failed', function(response) {
                        debugLog('Payment Failed event triggered');
                        debugLog('Payment failure details: ' + JSON.stringify(response));
                        hideLoading();
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'PAYMENT_FAILED',
                                data: {
                                    code: response.error?.code || 'UNKNOWN_ERROR',
                                    description: response.error?.description || 'Payment failed',
                                    source: response.error?.source || 'unknown',
                                    step: response.error?.step || 'unknown',
                                    reason: response.error?.reason || 'unknown'
                                }
                            }));
                        }
                    });

                    console.log('Opening Razorpay checkout...');
                    rzp.open();
                    
                } catch (error) {
                    console.error('Error initiating payment:', error);
                    hideLoading();
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'PAYMENT_FAILED',
                            data: {
                                code: 'INITIALIZATION_ERROR',
                                description: error.message || 'Failed to initialize payment',
                                source: 'webview',
                                step: 'initialization',
                                reason: 'script_error'
                            }
                        }));
                    }
                }
            }

            // Wait for Razorpay SDK to load and then auto-initiate payment
            function waitForRazorpay() {
                if (typeof Razorpay !== 'undefined') {
                    debugLog('Razorpay SDK loaded successfully, starting payment');
                    // Auto-initiate payment after SDK is confirmed loaded
                    setTimeout(initiatePayment, 500);
                } else {
                    debugLog('Still waiting for Razorpay SDK to load...');
                    setTimeout(waitForRazorpay, 100);
                }
            }
            
            // Start waiting for Razorpay after page loads
            window.addEventListener('load', function() {
                debugLog('Page load event triggered, starting Razorpay SDK check');
                waitForRazorpay();
            });
            
            // Fallback: If page doesn't trigger load event, try after DOMContentLoaded
            document.addEventListener('DOMContentLoaded', function() {
                debugLog('DOM content loaded, starting fallback Razorpay check');
                setTimeout(waitForRazorpay, 1000);
            });
            
            // Initial debug log to confirm script is running
            debugLog('WebView JavaScript loaded and executing');
            debugLog('Window location: ' + window.location.href);
        </script>
    </body>
    </html>
    `;
  };

  // Handle navigation requests to block unsupported URL schemes
  const handleShouldStartLoadWithRequest = (request) => {
    console.log('WebView navigation request:', request.url);
    
    // Block unsupported URL schemes like truecallersdk://, tel:, mailto:, etc.
    const unsupportedSchemes = ['truecallersdk:', 'tel:', 'mailto:', 'sms:', 'whatsapp:', 'intent:'];
    const isUnsupportedScheme = unsupportedSchemes.some(scheme => request.url.startsWith(scheme));
    
    if (isUnsupportedScheme) {
      console.log('Blocking unsupported URL scheme:', request.url);
      // Show error message for blocked external app redirects
      setTimeout(() => {
        onPaymentFailure({
          code: 'external_app_blocked',
          description: 'External payment app not supported. Please try a different payment method or use web-based payment options.',
          reason: 'external_app_redirect_blocked'
        });
      }, 1000);
      return false; // Block navigation
    }
    
    // Block external payment app URLs (like paytmmp://, phonepe://, etc.)
    const paymentAppSchemes = ['paytmmp:', 'phonepe:', 'gpay:', 'bhim:', 'upi:', 'tez:'];
    const isPaymentAppScheme = paymentAppSchemes.some(scheme => request.url.startsWith(scheme));
    
    if (isPaymentAppScheme) {
      console.log('Blocking external payment app URL:', request.url);
      // Show error message for blocked payment app redirects
      setTimeout(() => {
        onPaymentFailure({
          code: 'payment_app_blocked',
          description: 'External payment app not supported in WebView. Please try card payment, net banking, or other web-based payment methods.',
          reason: 'payment_app_redirect_blocked'
        });
      }, 1000);
      return false; // Block navigation
    }
    
    // Allow Razorpay URLs and standard web URLs
    const allowedDomains = [
      'about:blank',
      'https://api.razorpay.com',
      'https://checkout.razorpay.com',
      'https://razorpay.com',
      'https://lumberjack.razorpay.com'
    ];
    
    const isAllowedUrl = allowedDomains.some(domain => request.url.startsWith(domain)) || 
                        request.url.startsWith('http://') || 
                        request.url.startsWith('https://');
    
    if (!isAllowedUrl) {
      console.log('Blocking non-web URL:', request.url);
      // Show generic error for other blocked URLs
      setTimeout(() => {
        onPaymentFailure({
          code: 'unsupported_url',
          description: 'This payment method is not supported in the app. Please try a different payment option.',
          reason: 'unsupported_url_blocked'
        });
      }, 1000);
      return false;
    }
    
    return true; // Allow navigation
  };
  
  // Handle navigation state changes
  const handleNavigationStateChange = (navState) => {
    console.log('WebView navigation state:', navState);
  };

  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('WebView Message:', message);

      switch (message.type) {
        case 'PAYMENT_SUCCESS':
          console.log('Payment successful:', message.data);
          onPaymentSuccess(message.data);
          break;
          
        case 'PAYMENT_FAILED':
          console.log('Payment failed:', message.data);
          onPaymentFailure(message.data);
          break;
          
        case 'PAYMENT_DISMISSED':
          console.log('Payment dismissed by user');
          onClose();
          break;
          
        case 'DEBUG_LOG':
          console.log('[WebView Debug]:', message.message);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      onPaymentFailure({ 
        code: 'PARSE_ERROR', 
        description: 'Failed to parse payment response' 
      });
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView Error:', nativeEvent);
    setError('Failed to load payment page');
    setLoading(false);
  };

  const handleWebViewLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#F97316" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F97316" />
          <Text style={styles.errorTitle}>Payment Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F97316" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading payment page...</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: generateRazorpayHTML() }}
        onError={handleWebViewError}
        onMessage={handleWebViewMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        startInLoadingState={false}
        style={[styles.webview, loading && styles.hidden]}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        allowsBackForwardNavigationGestures={false}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        bounces={false}
        scrollEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
        originWhitelist={['*']}
        allowsLinkPreview={false}
        dataDetectorTypes="none"

        renderError={(errorName) => (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load payment page: {errorName}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F97316',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F97316',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RazorpayWebView;
