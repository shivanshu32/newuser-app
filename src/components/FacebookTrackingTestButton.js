import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import facebookTrackingService from '../services/facebookTrackingService';

/**
 * Test button to verify Facebook tracking is working
 * Remove this component in production
 */
const FacebookTrackingTestButton = () => {
  const testFacebookTracking = async () => {
    try {
      console.log('🧪 [FB-TEST] Testing Facebook tracking...');
      
      // Initialize service
      await facebookTrackingService.initialize();
      
      // Test payment initiation tracking
      await facebookTrackingService.trackPaymentInitiated({
        amount: 100,
        currency: 'INR',
        paymentType: 'wallet_recharge',
        selectedPackage: {
          id: 'test_package',
          name: 'Test Package',
          percentageBonus: 10
        }
      });
      
      // Test payment completion tracking
      await facebookTrackingService.trackPaymentCompleted({
        amount: 100,
        currency: 'INR',
        paymentId: 'test_payment_123',
        orderId: 'test_order_456',
        paymentType: 'wallet_recharge',
        bonusAmount: 10,
        totalWalletCredit: 110
      });
      
      // Test conversion milestone
      await facebookTrackingService.trackConversionMilestone('test_milestone', 100);
      
      // Get status
      const status = facebookTrackingService.getStatus();
      
      Alert.alert(
        'Facebook Tracking Test',
        `✅ Test completed successfully!\n\nStatus: ${status.isInitialized ? 'Initialized' : 'Not Initialized'}\nService: ${status.service}\nEvents: ${status.events.length} available\n\nCheck console for detailed logs.`,
        [{ text: 'OK' }]
      );
      
      console.log('✅ [FB-TEST] Facebook tracking test completed successfully');
      console.log('📊 [FB-TEST] Service status:', status);
      
    } catch (error) {
      console.error('❌ [FB-TEST] Facebook tracking test failed:', error);
      Alert.alert(
        'Facebook Tracking Test Failed',
        `Error: ${error.message}\n\nCheck console for details.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <TouchableOpacity style={styles.testButton} onPress={testFacebookTracking}>
      <Text style={styles.testButtonText}>🧪 Test FB Tracking</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  testButton: {
    backgroundColor: '#1877F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 10,
    alignSelf: 'center',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default FacebookTrackingTestButton;
