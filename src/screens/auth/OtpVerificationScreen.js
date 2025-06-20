import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const OtpVerificationScreen = ({ route, navigation }) => {
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const { verifyOtp, requestOtp, loading } = useAuth();
  
  const inputRefs = useRef([]);

  useEffect(() => {
    // Start countdown timer
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
      
      return () => clearInterval(interval);
    } else if (timer === 0 && !canResend) {
      setCanResend(true);
    }
  }, [timer, canResend]);

  const handleOtpChange = (text, index) => {
    // Update OTP array
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerifyOtp = async () => {
    // Prevent double submission
    if (localLoading || loading) {
      return;
    }
    
    const otpString = otp.join('');
    
    // Validate OTP
    if (otpString.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter a valid 4-digit OTP');
      return;
    }
    
    // Set local loading state immediately to prevent double clicks
    setLocalLoading(true);
    
    try {
      const result = await verifyOtp(phoneNumber, otpString);
      
      if (result.success) {
        // OTP verification successful, user will be redirected automatically
        // due to the isLoggedIn check in App.js
      } else {
        Alert.alert('Error', result.message || 'Failed to verify OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const result = await requestOtp(phoneNumber);
    
    if (result.success) {
      // Reset timer and canResend flag
      setTimer(30);
      setCanResend(false);
      Alert.alert('Success', 'OTP sent successfully');
    } else {
      Alert.alert('Error', result.message || 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="#F97316" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Enter OTP</Text>
            
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>Enter the 4-digit code sent to</Text>
              <Text style={styles.phoneNumber}>+91 {phoneNumber}</Text>
            </View>

            <View style={styles.otpContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={otp[index]}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  placeholderTextColor="#9CA3AF"
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, (loading || localLoading) && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading || localLoading}
              activeOpacity={0.8}
            >
              {loading || localLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                  <Text style={styles.resendButton}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timer}>Resend in {timer}s</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginLeft: -40, // To center the text properly with the back button present
  },
  content: {
    flex: 1,
    paddingVertical: 40,
    justifyContent: 'center',
    minHeight: '80%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitleContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  otpInput: {
    width: 65,
    height: 65,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
  },
  button: {
    backgroundColor: '#F97316',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#FDBA74',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    color: '#6B7280',
    fontSize: 14,
  },
  resendButton: {
    color: '#F97316',
    fontWeight: '600',
    fontSize: 14,
  },
  timer: {
    color: '#6B7280',
    fontSize: 14,
  },
});

export default OtpVerificationScreen;
