import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import GooglePlacesInput from '../../components/GooglePlacesInput';
import analyticsService from '../../services/analyticsService';
import { colors, spacing, radius, shadows } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  {
    id: 1,
    title: 'Tell us about you',
    subtitle: 'Your name and gender help us personalize your experience.',
    icon: 'person-circle-outline',
  },
  {
    id: 2,
    title: 'Your birth details',
    subtitle: 'Precise birth info enables accurate kundali and predictions.',
    icon: 'calendar-outline',
  },
  {
    id: 3,
    title: 'Where were you born?',
    subtitle: 'Birth city helps us calculate exact planetary positions.',
    icon: 'location-outline',
  },
];

const BENEFITS = [
  { icon: 'star-outline', text: 'Accurate kundali charts' },
  { icon: 'people-outline', text: 'Better astrologer matching' },
  { icon: 'sparkles-outline', text: 'Personalized remedies' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const AddUserProfile = ({ navigation, route }) => {
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  // Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isTimeOfBirthUnknown, setIsTimeOfBirthUnknown] = useState(false);

  // Loading
  const [loading, setLoading] = useState(false);

  // Inline validation errors per field
  const [errors, setErrors] = useState({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    birthDate: new Date(),
    birthTime: new Date(),
    birthLocation: '',
    birthLocationCoordinates: null,
    gender: '',
    isTimeOfBirthUnknown: false,
  });

  // Prefill from existing user data
  useEffect(() => {
    if (user) {
      const isTimeUnknown = user.isTimeOfBirthUnknown || false;
      setFormData({
        name: user.name || '',
        birthDate: user.birthDate ? new Date(user.birthDate) : new Date(),
        birthTime: isTimeUnknown ? null : (user.birthTime ? new Date(user.birthTime) : new Date()),
        birthLocation: user.birthLocation || '',
        birthLocationCoordinates: user.birthLocationCoordinates || null,
        gender: user.gender || '',
        isTimeOfBirthUnknown: isTimeUnknown,
      });
      setIsTimeOfBirthUnknown(isTimeUnknown);
    }
  }, [user]);

  // Animate progress bar when step changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep - 1) / (STEPS.length - 1),
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Animate celebration when completed
  useEffect(() => {
    if (completed) {
      Animated.spring(celebrateAnim, {
        toValue: 1,
        tension: 60,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [completed]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: null }));
  }, []);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) handleInputChange('birthDate', selectedDate);
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (event.type === 'dismissed') { setShowTimePicker(false); return; }
    if (selectedTime) {
      handleInputChange('birthTime', selectedTime);
      if (Platform.OS === 'ios') setShowTimePicker(false);
    }
  };

  const handleGenderSelect = (gender) => {
    handleInputChange('gender', gender);
    setShowGenderPicker(false);
  };

  const handleTimeOfBirthUnknownChange = (value) => {
    setIsTimeOfBirthUnknown(value);
    handleInputChange('isTimeOfBirthUnknown', value);
    if (value) {
      handleInputChange('birthTime', null);
    } else if (!formData.birthTime) {
      handleInputChange('birthTime', new Date());
    }
  };

  const handleLocationSelect = (locationData) => {
    try {
      if (!locationData) return;
      handleInputChange('birthLocation', locationData.name || '');
      if (locationData.coordinates) {
        handleInputChange('birthLocationCoordinates', {
          latitude: locationData.coordinates.latitude,
          longitude: locationData.coordinates.longitude,
        });
      } else {
        handleInputChange('birthLocationCoordinates', null);
      }
    } catch (error) {
      console.error('Error handling location selection:', error);
      Alert.alert('Error', 'Failed to select location. Please try again.');
    }
  };

  const formatDate = (date) => date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  const formatTime = (time) => {
    if (!time) return 'Select time';
    return time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // Per-step validation — returns inline errors object
  const validateStep = (step) => {
    const newErrors = {};
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = 'Please enter your full name';
      if (!formData.gender) newErrors.gender = 'Please select your gender';
    }
    if (step === 2) {
      if (!formData.birthDate || isNaN(formData.birthDate)) newErrors.birthDate = 'Please select your date of birth';
      if (!isTimeOfBirthUnknown && !formData.birthTime) newErrors.birthTime = "Please select your birth time or check \"I don't know\"";
    }
    if (step === 3) {
      if (!formData.birthLocation.trim()) newErrors.birthLocation = 'Please search and select your birth city';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < STEPS.length) {
      setCurrentStep(s => s + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // On step 1, always navigate back to previous screen
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let birthDateISO = null;
      let birthTimeISO = null;
      try {
        if (formData.birthDate instanceof Date && !isNaN(formData.birthDate)) {
          birthDateISO = formData.birthDate.toISOString();
        }
      } catch (e) { console.error('birthDate conversion:', e); }
      try {
        if (!isTimeOfBirthUnknown && formData.birthTime) {
          if (formData.birthTime instanceof Date && !isNaN(formData.birthTime)) {
            birthTimeISO = formData.birthTime.toISOString();
          }
        }
      } catch (e) { console.error('birthTime conversion:', e); }

      const profileData = {
        name: formData.name.trim(),
        birthDate: birthDateISO,
        birthTime: birthTimeISO,
        birthLocation: formData.birthLocation.trim(),
        birthLocationCoordinates: formData.birthLocationCoordinates,
        gender: formData.gender,
        isTimeOfBirthUnknown: isTimeOfBirthUnknown,
      };

      const response = await authAPI.updateProfile(profileData);

      if (response.success) {
        const updatedUser = { ...user, ...response.data };
        setUser(updatedUser);
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        } catch (storageError) {
          console.error('Storage update error:', storageError);
        }
        try {
          await analyticsService.logEvent('profile_completed', {
            has_birth_date: !!profileData.birthDate,
            has_birth_time: !!profileData.birthTime,
            has_birth_location: !!profileData.birthLocation,
            gender: profileData.gender,
            is_required: route.params?.isRequired || false,
          });
          // GA4 standard onboarding_complete event (UAC optimisation signal)
          await analyticsService.trackOnboardingComplete(user?._id || user?.id || '');
          const { AppEventsLogger } = require('react-native-fbsdk-next');
          await AppEventsLogger.logEvent('ProfileCompleted', {
            fb_content_type: 'user_profile',
            has_complete_info: !!(profileData.birthDate && profileData.birthLocation),
          });
        } catch (trackingError) {
          console.error('Tracking error:', trackingError);
        }
        setCompleted(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error.userMessage) errorMessage = error.userMessage;
      else if (error.response?.data?.message) errorMessage = error.response.data.message;
      else if (error.isNetworkError) errorMessage = 'Network error. Please check your connection.';
      else if (error.isAuthError) errorMessage = 'Session expired. Redirecting to login...';
      else if (error.message) errorMessage = error.message;
      if (!error.isAuthError) Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (route.params?.isRequired) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      navigation.goBack();
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const canContinueStep1 = formData.name.trim().length > 0 && formData.gender.length > 0;
  const canContinueStep2 = (formData.birthDate && !isNaN(formData.birthDate)) &&
    (isTimeOfBirthUnknown || !!formData.birthTime);
  const canContinueStep3 = formData.birthLocation.trim().length > 0;

  const stepCanContinue = [canContinueStep1, canContinueStep2, canContinueStep3][currentStep - 1];

  // ─── Completion Screen ───
  if (completed) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <Animated.View style={[styles.completionContainer, {
          opacity: celebrateAnim,
          transform: [{ scale: celebrateAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
        }]}>
          <View style={styles.completionIcon}>
            <Ionicons name="checkmark-circle" size={72} color={colors.accentGold} />
          </View>
          <Text style={styles.completionTitle}>You're all set!</Text>
          <Text style={styles.completionSubtitle}>
            Your profile is complete. Start your personalized astrological journey.
          </Text>
          <View style={styles.completionBenefits}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.completionBenefit}>
                <Ionicons name={b.icon} size={18} color={colors.accentGold} />
                <Text style={styles.completionBenefitText}>{b.text}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.doneCta} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneCtaText}>Start Exploring</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const step = STEPS[currentStep - 1];
  const isLastStep = currentStep === STEPS.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* ─── Top bar: back + step count ─── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.stepCount}>Step {currentStep} of {STEPS.length}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ─── Progress bar ─── */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
        >
          {/* ─── Step header ─── */}
          <View style={styles.stepHeader}>
            <View style={styles.stepIconCircle}>
              <Ionicons name={step.icon} size={32} color={colors.accentGold} />
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
          </View>

          {/* ─── Benefits row (step 1 only) ─── */}
          {currentStep === 1 && (
            <View style={styles.benefitsRow}>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitItem}>
                  <Ionicons name={b.icon} size={14} color={colors.accentGold} />
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ─── STEP 1: Name + Gender ─── */}
          {currentStep === 1 && (
            <View style={styles.fieldsContainer}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.textInput, errors.name && styles.inputError]}
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  placeholder="e.g. Priya Sharma"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  accessibilityLabel="Full Name"
                />
                {errors.name ? (
                  <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {errors.name}</Text>
                ) : (
                  <Text style={styles.hintText}>Helps personalize your charts and recommendations</Text>
                )}
              </View>

              {/* Gender */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Gender</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, errors.gender && styles.inputError, formData.gender && styles.pickerButtonFilled]}
                  onPress={() => setShowGenderPicker(true)}
                  activeOpacity={0.8}
                  accessibilityLabel="Select gender"
                  accessibilityRole="button"
                >
                  <Ionicons name="person-outline" size={20} color={formData.gender ? colors.accentGold : colors.textMuted} />
                  <Text style={[styles.pickerText, !formData.gender && styles.placeholderText]}>
                    {formData.gender || 'Select your gender'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {errors.gender ? (
                  <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {errors.gender}</Text>
                ) : (
                  <Text style={styles.hintText}>Used in kundali calculations for accurate predictions</Text>
                )}
              </View>
            </View>
          )}

          {/* ─── STEP 2: Date of Birth + Time of Birth ─── */}
          {currentStep === 2 && (
            <View style={styles.fieldsContainer}>
              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, errors.birthDate && styles.inputError, styles.pickerButtonFilled]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                  accessibilityLabel="Select date of birth"
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.accentGold} />
                  <Text style={styles.pickerText}>{formatDate(formData.birthDate)}</Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {errors.birthDate ? (
                  <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {errors.birthDate}</Text>
                ) : (
                  <Text style={styles.hintText}>Used to generate precise kundali charts</Text>
                )}
              </View>

              {/* Time of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Time of Birth</Text>
                {/* Unknown toggle */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => handleTimeOfBirthUnknownChange(!isTimeOfBirthUnknown)}
                  activeOpacity={0.75}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isTimeOfBirthUnknown }}
                  accessibilityLabel="I don't know my time of birth"
                >
                  <View style={[styles.toggle, isTimeOfBirthUnknown && styles.toggleChecked]}>
                    {isTimeOfBirthUnknown && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.toggleLabel}>I don't know my time of birth</Text>
                </TouchableOpacity>

                {isTimeOfBirthUnknown ? (
                  <View style={styles.unknownTimeBox}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.unknownTimeText}>
                      We'll use a noon approximation. Charts may be less precise for time-sensitive positions.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.pickerButton, errors.birthTime && styles.inputError, formData.birthTime && styles.pickerButtonFilled]}
                    onPress={() => {
                      if (!formData.birthTime) handleInputChange('birthTime', new Date());
                      setShowTimePicker(true);
                    }}
                    activeOpacity={0.8}
                    accessibilityLabel="Select time of birth"
                  >
                    <Ionicons name="time-outline" size={20} color={formData.birthTime ? colors.accentGold : colors.textMuted} />
                    <Text style={[styles.pickerText, !formData.birthTime && styles.placeholderText]}>
                      {formatTime(formData.birthTime)}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}

                {errors.birthTime && (
                  <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {errors.birthTime}</Text>
                )}
                {!errors.birthTime && !isTimeOfBirthUnknown && (
                  <Text style={styles.hintText}>Exact time improves ascendant and house calculations</Text>
                )}
              </View>
            </View>
          )}

          {/* ─── STEP 3: Birth Location ─── */}
          {currentStep === 3 && (
            <View style={[styles.fieldsContainer, { zIndex: 1000 }]}>
              <View style={[styles.inputGroup, { zIndex: 1000 }]}>
                <Text style={styles.label}>Birth City / Place</Text>
                <View style={errors.birthLocation ? styles.placesErrorWrapper : styles.placesWrapper}>
                  <GooglePlacesInput
                    value={formData.birthLocation}
                    onLocationSelect={handleLocationSelect}
                    placeholder="Search your birth city or town"
                  />
                </View>
                {formData.birthLocationCoordinates && (
                  <View style={styles.coordsBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={styles.coordsText}>Location confirmed</Text>
                  </View>
                )}
                {errors.birthLocation ? (
                  <Text style={styles.errorText}><Ionicons name="alert-circle-outline" size={13} /> {errors.birthLocation}</Text>
                ) : (
                  <Text style={styles.hintText}>We use this to calculate exact planetary positions and timezone</Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Sticky bottom CTA ─── */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.ctaButton, (!stepCanContinue || loading) && styles.ctaButtonDimmed]}
          onPress={handleNext}
          disabled={loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLastStep ? 'Save and finish' : 'Continue to next step'}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.ctaText}>{isLastStep ? 'Save & Start' : 'Continue'}</Text>
              <Ionicons name={isLastStep ? 'checkmark-circle-outline' : 'arrow-forward'} size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ─── Date Picker ─── */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.birthDate instanceof Date && !isNaN(formData.birthDate) ? formData.birthDate : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* ─── Time Picker ─── */}
      {showTimePicker && !isTimeOfBirthUnknown && (
        <DateTimePicker
          value={formData.birthTime instanceof Date && !isNaN(formData.birthTime) ? formData.birthTime : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {/* ─── Gender Picker Modal ─── */}
      <Modal
        visible={showGenderPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity
                onPress={() => setShowGenderPicker(false)}
                style={styles.modalCloseBtn}
                accessibilityLabel="Close gender picker"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.genderOptions}>
              {GENDER_OPTIONS.map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[styles.genderOption, formData.gender === gender && styles.genderOptionSelected]}
                  onPress={() => handleGenderSelect(gender)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: formData.gender === gender }}
                >
                  <View style={[styles.genderRadio, formData.gender === gender && styles.genderRadioSelected]}>
                    {formData.gender === gender && <View style={styles.genderRadioDot} />}
                  </View>
                  <Text style={[styles.genderOptionText, formData.gender === gender && styles.genderOptionTextSelected]}>
                    {gender}
                  </Text>
                  {formData.gender === gender && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.accentGold} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  /* ─── Screen ─── */
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },

  /* ─── Top bar ─── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },

  /* ─── Progress bar ─── */
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accentGold,
    borderRadius: 3,
  },

  /* ─── Scroll content ─── */
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  /* ─── Step header ─── */
  stepHeader: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  stepIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },

  /* ─── Benefits row ─── */
  benefitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(212,175,55,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.18)',
  },
  benefitText: {
    fontSize: 12,
    color: colors.accentGold,
    fontWeight: '500',
  },

  /* ─── Fields ─── */
  fieldsContainer: {
    gap: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: '#17171C',
  },
  inputError: {
    borderColor: colors.error || '#FF6B6B',
  },

  /* ─── Picker buttons ─── */
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#17171C',
  },
  pickerButtonFilled: {
    borderColor: 'rgba(212,175,55,0.35)',
    backgroundColor: 'rgba(212,175,55,0.04)',
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  placeholderText: {
    color: colors.textMuted,
  },

  /* ─── Hints and errors ─── */
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 17,
  },
  errorText: {
    fontSize: 12,
    color: colors.error || '#FF6B6B',
    marginTop: 6,
    lineHeight: 17,
  },

  /* ─── TOB toggle ─── */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingVertical: 4,
  },
  toggle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#17171C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleChecked: {
    backgroundColor: colors.accentGold,
    borderColor: colors.accentGold,
  },
  toggleLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  unknownTimeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  unknownTimeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },

  /* ─── Places wrapper ─── */
  placesWrapper: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    backgroundColor: '#17171C',
  },
  placesErrorWrapper: {
    borderWidth: 1.5,
    borderColor: colors.error || '#FF6B6B',
    borderRadius: 14,
    backgroundColor: '#17171C',
  },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  coordsText: {
    fontSize: 12,
    color: colors.success || '#4CAF50',
    fontWeight: '500',
  },

  /* ─── Sticky bottom CTA ─── */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: '#0B0B0F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accentGold,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.accentGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  ctaButtonDimmed: {
    backgroundColor: 'rgba(212,175,55,0.35)',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  /* ─── Completion screen ─── */
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  completionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212,175,55,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  completionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  completionSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  completionBenefits: {
    width: '100%',
    gap: 10,
    marginBottom: 36,
  },
  completionBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(212,175,55,0.07)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  completionBenefitText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  doneCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accentGold,
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
    width: '100%',
    shadowColor: colors.accentGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  doneCtaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ─── Gender modal ─── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#17171C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderOptions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#1E1E24',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(212,175,55,0.07)',
    borderColor: 'rgba(212,175,55,0.4)',
  },
  genderRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderRadioSelected: {
    borderColor: colors.accentGold,
  },
  genderRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accentGold,
  },
  genderOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
  },
  genderOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

export default AddUserProfile;
