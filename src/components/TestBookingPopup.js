import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';

const { width, height } = Dimensions.get('window');

/**
 * Test component to isolate the narrow white box issue
 * This will help determine if the issue is with the BookingAcceptedPopup component
 * or with the data/state management
 */
const TestBookingPopup = ({ visible, onClose }) => {
  console.log('🧪 [TestBookingPopup] Rendering with visible:', visible);
  console.log('🧪 [TestBookingPopup] Screen dimensions:', { width, height });
  
  const testData = {
    bookingId: 'test-123',
    astrologerName: 'Test Astrologer',
    type: 'chat',
    rate: 50
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        console.log('🧪 [TestBookingPopup] Modal shown');
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>
          <Text style={styles.title}>Test Booking Popup</Text>
          <Text style={styles.subtitle}>This is a test to isolate the narrow box issue</Text>
          
          <View style={styles.detailsContainer}>
            <Text style={styles.detailText}>Astrologer: {testData.astrologerName}</Text>
            <Text style={styles.detailText}>Type: {testData.type}</Text>
            <Text style={styles.detailText}>Rate: ₹{testData.rate}/min</Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={() => {
                console.log('🧪 [TestBookingPopup] Test button pressed');
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Test Button</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: width * 0.9,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    // Debug styling
    borderWidth: 3,
    borderColor: 'blue',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  detailsContainer: {
    marginBottom: 25,
  },
  detailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 15,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  closeButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TestBookingPopup;
