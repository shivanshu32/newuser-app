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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  // Timer effect - completely rewritten to eliminate flickering
  useEffect(() => {
    if (timer > 0 && !canResend) {
      const intervalId = setInterval(() => {
        setTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setCanResend(true);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
      
      timerRef.current = intervalId;
      
      return () => {
        clearInterval(intervalId);
        timerRef.current = null;
      };
    }
  }, [timer, canResend]); // Simple dependencies

  // Enhanced OTP change handler with auto-fill support - completely optimized
  const handleOtpChange = useCallback((text, index) => {
    // Check if the input contains multiple digits (auto-fill scenario)
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '');
      if (digits.length >= 4) {
        const newOtp = digits.slice(0, 4).split('');
        setOtp(newOtp);
        setTimeout(() => inputRefs.current[3]?.focus(), 100);
        return;
      }
    }
    
    // Handle single digit input - only update if different
    const cleanText = text.replace(/\D/g, '');
    setOtp(prevOtp => {
      if (prevOtp[index] === cleanText) return prevOtp; // Prevent unnecessary re-render
      
      const newOtp = [...prevOtp];
      newOtp[index] = cleanText;
      
      // Auto-focus next input
      if (cleanText && index < 3) {
        setTimeout(() => inputRefs.current[index + 1]?.focus(), 100);
      }
      
      return newOtp;
    });
  }, []); // Removed otp dependency to prevent re-renders

  const handleKeyPress = useCallback((e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0) {
      setOtp(prevOtp => {
        if (!prevOtp[index]) {
          setTimeout(() => inputRefs.current[index - 1]?.focus(), 100);
        }
        return prevOtp; // Don't change state, just handle focus
      });
    }
  }, []); // Removed otp dependency



  const handleVerifyOtp = useCallback(async () => {
    if (isVerifying || localLoading || loading) return;

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
      } else {
        Alert.alert('Error', result.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify OTP. Please try again.');
      setOtp(['', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setIsVerifying(false);
      setLocalLoading(false);
    }
  }, [otp, phoneNumber, verifyOtp, isVerifying, localLoading, loading]);

  const handleResendOtp = useCallback(async () => {
    if (!canResend || loading) return;

    setLocalLoading(true);
    try {
      const result = await requestOtp(phoneNumber);
      if (result.success) {
        // Reset timer state in single batch
        setTimer(30);
        setCanResend(false);
        setOtp(['', '', '', '']); // Clear OTP on resend
        Alert.alert('Success', 'OTP sent successfully');
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        Alert.alert('Error', result.message || 'Failed to resend OTP');
      }
    } finally {
      setLocalLoading(false);
    }
  }, [canResend, loading, phoneNumber, requestOtp]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" translucent={false} />
      
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.content}>
          <View style={styles.contentInner}>
            <Text style={styles.title}>Enter OTP</Text>
            
            <View style={styles.subtitleContainer}>
              <Text style={styles.subtitle}>Enter the 4-digit code sent to</Text>
              <Text style={styles.phoneNumber}>+91 {phoneNumber}</Text>
            </View>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={`otp-${index}`}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 4 : 1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  placeholderTextColor="#9CA3AF"
                  autoFocus={index === 0}
                  textContentType={Platform.OS === 'ios' ? 'oneTimeCode' : undefined}
                  autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                  selectTextOnFocus={true}
                  blurOnSubmit={false}
                  returnKeyType="next"
                  editable={!loading && !localLoading}
                />
              ))}
            </View>

            <View style={styles.buttonContainer}>
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
                <View style={styles.resendActionContainer}>
                  {canResend ? (
                    <TouchableOpacity 
                      onPress={handleResendOtp} 
                      disabled={loading || localLoading}
                      style={styles.resendButtonContainer}
                    >
                      <Text style={styles.resendButton}>Resend OTP</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.timer}>Resend in {timer}s</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const { height: screenHeight } = Dimensions.get('window');

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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  contentInner: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
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
    marginBottom: 40,
    paddingHorizontal: 8,
    maxWidth: 280,
    alignSelf: 'center',
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
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#F97316',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    marginHorizontal: 8,
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
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  resendActionContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
  resendButtonContainer: {
    padding: 4,
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
