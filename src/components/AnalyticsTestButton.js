import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import analyticsService from '../services/analyticsService';

const AnalyticsTestButton = () => {
  const runAnalyticsTest = async () => {
    console.log('🧪 [USER TRIGGERED] Starting analytics test...');
    
    try {
      const testResults = await analyticsService.testAnalytics();
      
      // Show results in an alert
      const resultMessage = `Firebase Analytics Test Results:
      
✅ Initialized: ${testResults.initialized}
✅ Supported: ${testResults.supported}  
✅ Has Analytics: ${testResults.hasAnalytics}
✅ Has Firebase App: ${testResults.hasFirebaseApp}
✅ Platform: ${testResults.platform}

Check console logs for detailed information.

If all are true, events should appear in Firebase Console within 24 hours.

A test event 'analytics_test_event' has been sent!`;

      Alert.alert('Analytics Test Complete', resultMessage);
      
    } catch (error) {
      console.error('🧪 [TEST ERROR]:', error);
      Alert.alert('Analytics Test Failed', `Error: ${error.message}\n\nCheck console logs for details.`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.testButton} 
        onPress={runAnalyticsTest}
      >
        <Text style={styles.buttonText}>🧪 Test Firebase Analytics</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AnalyticsTestButton;
