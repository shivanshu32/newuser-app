import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const { verifyOtp, requestOtp, loading, token } = useAuth();
  
  const inputRefs = useRef([]);
  const isMountedRef = useRef(true);
  const timerRef = useRef(null);

  // Handle navigation when token is set (successful verification)
  useEffect(() => {
    if (token && hasVerified) {
      console.log('OTP verification successful, token received');
    }
  }, [token, hasVerified]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer effect with proper cleanup
  useEffect(() => {
    if (timer > 0 && !canResend && isMountedRef.current) {
      timerRef.current = setInterval(() => {
        if (isMountedRef.current) {
          setTimer((prevTimer) => {
            if (prevTimer <= 1) {
              setCanResend(true);
              return 0;
            }
            return prevTimer - 1;
          });
        }
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [timer, canResend]);

  // Enhanced OTP change handler with auto-fill support
  const handleOtpChange = useCallback((text, index) => {
    // Check if the input contains multiple digits (auto-fill scenario)
    if (text.length > 1) {
      // Extract only digits from the text
      const digits = text.replace(/\D/g, '');
      
      if (digits.length >= 4) {
        // Auto-fill all 4 digits
        const newOtp = digits.slice(0, 4).split('');
        setOtp(newOtp);
        
        // Focus the last input after auto-fill
        setTimeout(() => {
          inputRefs.current[3]?.focus();
        }, 100);
        
        console.log('🔢 Auto-filled OTP from SMS:', newOtp.join(''));
        return;
      }
    }
    
    // Handle single digit input (manual typing)
    const newOtp = [...otp];
    newOtp[index] = text.replace(/\D/g, ''); // Only allow digits
    setOtp(newOtp);

    // Auto-focus next input if current input is filled
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyPress = useCallback((e, index) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);



  const handleVerifyOtp = useCallback(async () => {
    // Prevent multiple verification attempts
    if (isVerifying || localLoading || loading) {
      return;
    }

    const otpString = otp.join('');
    if (otpString.length !== 4) {
      Alert.alert('Error', 'Please enter a complete 4-digit OTP');
      return;
    }

    setIsVerifying(true);
    setLocalLoading(true);

    try {
      const result = await verifyOtp(phoneNumber, otpString);
      
      if (result.success) {
        setHasVerified(true);
        console.log('OTP verification successful');
        // Navigation will be handled by App.js when token is set
      } else {
        Alert.alert('Error', result.message || 'Invalid OTP. Please try again.');
        // Clear OTP inputs on error
        setOtp(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      if (isMountedRef.current) {
        setIsVerifying(false);
        setLocalLoading(false);
      }
    }
  }, [otp, isVerifying, localLoading, loading, phoneNumber, verifyOtp]);

  const handleResendOtp = useCallback(async () => {
    if (!canResend || loading) return;

    setLocalLoading(true);
    const result = await requestOtp(phoneNumber, 'user');
    setLocalLoading(false);

    if (result.success) {
      setTimer(30);
      setCanResend(false);
      Alert.alert('Success', 'OTP sent successfully');
    } else {
      Alert.alert('Error', result.message || 'Failed to resend OTP');
    }
  }, [canResend, loading, phoneNumber, requestOtp]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
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
                maxLength={index === 0 ? 4 : 1} // Allow first input to accept full OTP
                value={otp[index]}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                placeholderTextColor="#9CA3AF"
                autoFocus={index === 0}
                // Android SMS auto-read properties
                textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                importantForAutofill="yes"
                // Additional properties for better auto-fill support
                selectTextOnFocus={true}
                blurOnSubmit={false}
                returnKeyType="next"
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
  content: {
    flex: 1,
    paddingVertical: 40,
    justifyContent: 'center',
    minHeight: '80%',
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
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
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
