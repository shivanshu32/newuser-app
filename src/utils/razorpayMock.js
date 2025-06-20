// Mock implementation for Razorpay in Expo Go
// This avoids the native module error when running in Expo Go

import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';

// Check if we're running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Create a mock Razorpay implementation for Expo Go
const RazorpayMock = {
  open: (options) => {
    console.log('Mock Razorpay payment initiated with options:', options);
    
    // Show a mock payment UI
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Mock Razorpay Payment',
        `This is a mock payment for ₹${options.amount / 100} in Expo Go.\n\nIn production builds, this would open the real Razorpay payment gateway.`,
        [
          {
            text: 'Cancel Payment',
            style: 'cancel',
            onPress: () => {
              reject(new Error('Payment cancelled'));
            }
          },
          {
            text: 'Simulate Success',
            onPress: () => {
              // Simulate a successful payment with mock data
              resolve({
                razorpay_payment_id: 'mock_payment_' + Date.now(),
                razorpay_order_id: options.order_id,
                razorpay_signature: 'mock_signature_' + Date.now()
              });
            }
          }
        ]
      );
    });
  }
};

// Export the appropriate implementation based on environment
let RazorpayCheckout;

try {
  // Try to import the real Razorpay module
  if (!isExpoGo) {
    RazorpayCheckout = require('react-native-razorpay').default;
  } else {
    // Use mock in Expo Go
    RazorpayCheckout = RazorpayMock;
  }
} catch (error) {
  // Fallback to mock if import fails
  console.log('Using Razorpay mock implementation');
  RazorpayCheckout = RazorpayMock;
}

export default RazorpayCheckout;
