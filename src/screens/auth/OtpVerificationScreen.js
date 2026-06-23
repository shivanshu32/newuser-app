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
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { AppEventsLogger } from 'react-native-fbsdk-next';

const { width, height } = Dimensions.get('window');

// CRED dark luxury theme with gold accent (same as LoginScreen)
const COLORS = {
  background: '#111111',
  surface: '#1A1A1A',
  surfaceElevated: '#222222',
  primary: '#C8A46A',
  primaryLight: '#D4B896',
  primaryDark: '#A68B5B',
  primaryMuted: 'rgba(200, 164, 106, 0.12)',
  text: '#F5F5F5',
  textSecondary: '#8A8A8A',
  textMuted: '#666666',
  border: '#2A2A2A',
  borderFocused: '#C8A46A',
  white: '#111111',
};

const OtpVerificationScreen = ({ route, navigation }) => {
  const { phoneNumber } = route.params;
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasVerified, setHasVerified] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { verifyOtp, requestOtp, loading, token } = useAuth();
  
  const inputRefs = useRef([]);
  const isMountedRef = useRef(true);
  const timerRef = useRef(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle navigation when token is set (successful verification)
  useEffect(() => {
    if (token && hasVerified) {
      console.log('OTP verification successful, token received');
      AppEventsLogger.logEvent('fb_mobile_login_success');
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

  // Timer effect
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
  }, [timer, canResend]);

  const handleOtpChange = useCallback((text, index) => {
    const digits = text.replace(/\D/g, '');

    // Handle empty/delete
    if (!digits) {
      setOtp(prevOtp => {
        if (!prevOtp[index]) return prevOtp;
        const newOtp = [...prevOtp];
        newOtp[index] = '';
        return newOtp;
      });
      return;
    }

    // Handle auto-fill (full OTP pasted/auto-filled)
    if (digits.length === 4) {
      console.log('🔐 [OTP] Auto-fill detected, filling all digits:', digits);
      const newOtp = digits.split('').slice(0, 4);
      setOtp(newOtp);
      
      // Focus last input
      setTimeout(() => {
        inputRefs.current[3]?.focus();
        setFocusedIndex(3);
      }, 100);
      
      // Auto-verify after a short delay
      setTimeout(() => {
        console.log('🔐 [OTP] Auto-verifying...');
        const otpString = newOtp.join('');
        if (otpString.length === 4) {
          handleVerifyOtp(otpString);
        }
      }, 300);
      return;
    }

    // Handle multi-digit paste (2-3 digits)
    if (digits.length > 1) {
      console.log('🔐 [OTP] Multi-digit paste detected:', digits);
      setOtp(prevOtp => {
        const newOtp = [...prevOtp];
        let cursorIndex = index;
        let remaining = digits;

        while (cursorIndex < 4 && remaining.length > 0) {
          const nextDigit = remaining[0];
          remaining = remaining.slice(1);
          newOtp[cursorIndex] = nextDigit;
          cursorIndex += 1;
        }

        // Focus next empty input or last input
        const nextFocusIndex = Math.min(cursorIndex, 3);
        setTimeout(() => {
          inputRefs.current[nextFocusIndex]?.focus();
          setFocusedIndex(nextFocusIndex);
        }, 50);

        return newOtp;
      });
      return;
    }

    // Handle single digit entry
    if (digits.length === 1) {
      setOtp(prevOtp => {
        const newOtp = [...prevOtp];
        newOtp[index] = digits[0];
        return newOtp;
      });
      
      // Move to next input
      if (index < 3) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
          setFocusedIndex(index + 1);
        }, 50);
      } else {
        // Last digit entered, auto-verify
        setTimeout(() => {
          const currentOtp = [...otp];
          currentOtp[index] = digits[0];
          const otpString = currentOtp.join('');
          if (otpString.length === 4) {
            console.log('🔐 [OTP] All digits entered, auto-verifying...');
            handleVerifyOtp(otpString);
          }
        }, 100);
      }
    }
  }, [otp, handleVerifyOtp]);

  const handleKeyPress = useCallback((e, index) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0) {
      setOtp(prevOtp => {
        if (!prevOtp[index]) {
          setTimeout(() => {
            inputRefs.current[index - 1]?.focus();
            setFocusedIndex(index - 1);
          }, 100);
        }
        return prevOtp;
      });
    }
  }, []);

  const handleVerifyOtp = useCallback(async (otpOverride = null) => {
    if (isVerifying || localLoading || loading) return;

    const otpString = otpOverride !== null ? otpOverride : otp.join('');
    if (otpString.length !== 4) {
      Alert.alert('Incomplete OTP', 'Please enter all 4 digits');
      return;
    }

    setIsVerifying(true);
    setLocalLoading(true);

    try {
      const result = await verifyOtp(phoneNumber, otpString);
      
      if (result.success) {
        setHasVerified(true);
      } else {
        Alert.alert('Invalid OTP', result.message || 'Please check and try again');
        setOtp(['', '', '', '']);
        setTimeout(() => {
          inputRefs.current[0]?.focus();
          setFocusedIndex(0);
        }, 100);
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed. Please try again.');
      setOtp(['', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
        setFocusedIndex(0);
      }, 100);
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
        setTimer(30);
        setCanResend(false);
        setOtp(['', '', '', '']);
        Alert.alert('OTP Sent', 'A new code has been sent to your number');
        setTimeout(() => {
          inputRefs.current[0]?.focus();
          setFocusedIndex(0);
        }, 100);
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

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify OTP</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Main Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a 4-digit code to{' '}
            <Text style={styles.phoneNumber}>+91 {phoneNumber}</Text>
          </Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <View 
                key={`otp-${index}`}
                style={[
                  styles.otpInputWrapper,
                  focusedIndex === index && styles.otpInputWrapperFocused,
                  digit && styles.otpInputWrapperFilled,
                ]}
              >
                <TextInput
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 4 : 1}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  autoFocus={index === 0}
                  textContentType={index === 0 ? (Platform.OS === 'ios' ? 'oneTimeCode' : undefined) : 'none'}
                  autoComplete={index === 0 ? (Platform.OS === 'android' ? 'sms-otp' : 'one-time-code') : 'off'}
                  selectTextOnFocus={true}
                  blurOnSubmit={false}
                  editable={!loading && !localLoading}
                  selectionColor={COLORS.primary}
                />
              </View>
            ))}
          </View>

          {/* Timer / Resend */}
          <View style={styles.timerContainer}>
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResendOtp} 
                disabled={loading || localLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.resendButtonText}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend OTP in <Text style={styles.timerCount}>{timer}s</Text>
              </Text>
            )}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              !isOtpComplete && styles.ctaButtonDisabled,
            ]}
            onPress={handleVerifyOtp}
            disabled={loading || localLoading || !isOtpComplete}
            activeOpacity={0.8}
          >
            {isOtpComplete ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {loading || localLoading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.ctaText}>Verify OTP</Text>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.ctaDisabledInner}>
                {loading || localLoading ? (
                  <ActivityIndicator color={COLORS.textMuted} size="small" />
                ) : (
                  <Text style={styles.ctaTextDisabled}>Verify OTP</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Edit Number */}
          <TouchableOpacity onPress={handleGoBack} style={styles.editButton}>
            <Text style={styles.editButtonText}>Wrong number? Edit</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    fontSize: 20,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
    paddingTop: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  phoneNumber: {
    fontWeight: '600',
    color: COLORS.text,
  },

  // OTP Input
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    maxWidth: 260,
  },
  otpInputWrapper: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInputWrapperFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
  otpInputWrapperFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
  otpInput: {
    width: '100%',
    height: '100%',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Timer
  timerContainer: {
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  timerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timerCount: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  resendButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // CTA Button
  ctaButton: {
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
  },
  ctaButtonDisabled: {
    opacity: 1,
  },
  ctaGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaDisabledInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  ctaTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },

  // Edit Button
  editButton: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
  },
  editButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default OtpVerificationScreen;
