import React, { useState, useRef, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

// CRED dark luxury theme with gold accent
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

const LoginScreen = () => {
  const navigation = useNavigation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { requestOtp, loading } = useAuth();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRequestOtp = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    
    requestOtp(phoneNumber)
      .then(result => {
        if (result && result.success) {
          navigation.navigate('OtpVerification', { phoneNumber });
        } else {
          Alert.alert('Error', result?.message || 'Failed to send OTP');
        }
      })
      .catch(error => {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      });
  };

  const isValidNumber = phoneNumber.length === 10;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo Section */}
        <Animated.View 
          style={[
            styles.logoSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Image
            source={require('../../../assets/logo-placeholder.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>Jyotish Call</Text>
          <Text style={styles.tagline}>Connect with Expert Astrologers</Text>
        </Animated.View>

        {/* Form Section */}
        <Animated.View 
          style={[
            styles.formSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Enter your mobile number</Text>

          {/* Phone Input */}
          <View style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused
          ]}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="10-digit number"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={10}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              selectionColor={COLORS.primary}
            />
            {phoneNumber.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setPhoneNumber('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              !isValidNumber && styles.ctaButtonDisabled,
            ]}
            onPress={handleRequestOtp}
            disabled={loading || !isValidNumber}
            activeOpacity={0.8}
          >
            {isValidNumber ? (
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.ctaText}>Get OTP</Text>
                )}
              </LinearGradient>
            ) : (
              <View style={styles.ctaDisabledInner}>
                {loading ? (
                  <ActivityIndicator color={COLORS.textMuted} size="small" />
                ) : (
                  <Text style={styles.ctaTextDisabled}>Get OTP</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms</Text>
            {' '}&{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Text>
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  // Form Section
  formSection: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    height: 56,
    marginBottom: 20,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceElevated,
  },
  countryCode: {
    paddingRight: 12,
  },
  countryCodeText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginRight: 12,
  },
  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    letterSpacing: 1,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.textSecondary,
    fontSize: 11,
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

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});

export default LoginScreen;
