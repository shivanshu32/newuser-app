import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import GooglePlacesInput from '../../components/GooglePlacesInput';
import analyticsService from '../../services/analyticsService';

const AddUserProfile = ({ navigation, route }) => {
  const { user, setUser } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const birthLocationRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [isTimeOfBirthUnknown, setIsTimeOfBirthUnknown] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    birthDate: new Date(),
    birthTime: new Date(),
    birthLocation: '',
    birthLocationCoordinates: null, // { latitude, longitude }
    gender: '',
    isTimeOfBirthUnknown: false,
  });

  // Initialize form with existing user data
  useEffect(() => {
    console.log('🔄 Initializing AddUserProfile with user data:', user);
    if (user) {
      const isTimeUnknown = user.isTimeOfBirthUnknown || false;
      const initialData = {
        name: user.name || '',
        birthDate: user.birthDate ? new Date(user.birthDate) : new Date(),
        birthTime: isTimeUnknown ? null : (user.birthTime ? new Date(user.birthTime) : new Date()),
        birthLocation: user.birthLocation || '',
        birthLocationCoordinates: user.birthLocationCoordinates || null,
        gender: user.gender || '',
        isTimeOfBirthUnknown: isTimeUnknown,
      };
      console.log('📝 Setting form data:', initialData);
      setFormData(initialData);
      setIsTimeOfBirthUnknown(user.isTimeOfBirthUnknown || false);
    }
  }, [user]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle date picker change
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('birthDate', selectedDate);
    }
  };

  // Handle time picker change
  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      handleInputChange('birthTime', selectedTime);
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    }
  };

  // Handle gender selection
  const handleGenderSelect = (gender) => {
    handleInputChange('gender', gender);
    setShowGenderPicker(false);
  };

  // Handle time of birth unknown checkbox
  const handleTimeOfBirthUnknownChange = (value) => {
    setIsTimeOfBirthUnknown(value);
    handleInputChange('isTimeOfBirthUnknown', value);
    if (value) {
      // If unknown is checked, clear the birth time
      handleInputChange('birthTime', null);
    } else {
      // If unknown is unchecked, initialize with current time if birth time is null
      if (!formData.birthTime) {
        handleInputChange('birthTime', new Date());
      }
    }
  };

  // Handle birth location field focus - scroll to top
  const handleBirthLocationFocus = () => {
    // Scroll to bring birth location field to top of visible area
    if (birthLocationRef.current && scrollViewRef.current) {
      birthLocationRef.current.measureLayout(
        scrollViewRef.current.getInnerViewNode?.() || scrollViewRef.current,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => {
          // Fallback: scroll to a fixed position if measureLayout fails
          scrollViewRef.current?.scrollTo({ y: 150, animated: true });
        }
      );
    } else {
      // Fallback scroll position
      scrollViewRef.current?.scrollTo({ y: 150, animated: true });
    }
  };

  // Handle birth location selection from Google Places
  const handleLocationSelect = (locationData) => {
    try {
      if (!locationData) {
        console.log('GooglePlacesInput: No data received');
        return;
      }
      
      console.log('📍 Selected location:', locationData);
      
      // Update birth location name
      handleInputChange('birthLocation', locationData.name || '');
      
      // Update coordinates if available
      if (locationData.coordinates) {
        handleInputChange('birthLocationCoordinates', {
          latitude: locationData.coordinates.latitude,
          longitude: locationData.coordinates.longitude,
        });
        console.log('📍 Coordinates:', locationData.coordinates);
      } else {
        handleInputChange('birthLocationCoordinates', null);
      }
    } catch (error) {
      console.error('Error handling location selection:', error);
      Alert.alert('Error', 'Failed to select location. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (time) => {
    if (!time || time === null) {
      return 'Select time';
    }
    return time.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return false;
    }
    if (!formData.gender) {
      Alert.alert('Validation Error', 'Please select your gender');
      return false;
    }
    if (!formData.birthDate || !(formData.birthDate instanceof Date) || isNaN(formData.birthDate)) {
      Alert.alert('Validation Error', 'Please select your date of birth');
      return false;
    }
    if (!formData.birthLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter your birth location');
      return false;
    }
    if (!isTimeOfBirthUnknown && !formData.birthTime) {
      Alert.alert('Validation Error', 'Please select your birth time or check "I don\'t know my time of birth"');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Safely convert dates to ISO strings
      let birthDateISO = null;
      let birthTimeISO = null;
      
      try {
        if (formData.birthDate instanceof Date && !isNaN(formData.birthDate)) {
          birthDateISO = formData.birthDate.toISOString();
        } else if (formData.birthDate) {
          birthDateISO = new Date(formData.birthDate).toISOString();
        }
      } catch (dateError) {
        console.error('Error converting birthDate:', dateError);
      }
      
      try {
        if (!isTimeOfBirthUnknown && formData.birthTime) {
          if (formData.birthTime instanceof Date && !isNaN(formData.birthTime)) {
            birthTimeISO = formData.birthTime.toISOString();
          } else {
            birthTimeISO = new Date(formData.birthTime).toISOString();
          }
        }
      } catch (timeError) {
        console.error('Error converting birthTime:', timeError);
      }

      // Prepare data for API
      const profileData = {
        name: formData.name.trim(),
        birthDate: birthDateISO,
        birthTime: birthTimeISO,
        birthLocation: formData.birthLocation.trim(),
        birthLocationCoordinates: formData.birthLocationCoordinates,
        gender: formData.gender,
        isTimeOfBirthUnknown: isTimeOfBirthUnknown,
      };

      console.log('📤 Updating user profile with data:', profileData);

      // Call API to update profile
      const response = await authAPI.updateProfile(profileData);
      console.log('📥 Profile update response:', response);
      
      if (response.success) {
        // Update user context with new data from API response
        const updatedUser = {
          ...user,
          ...response.data
        };
        console.log('👤 Updated user context:', updatedUser);
        setUser(updatedUser);
        
        // Also update AsyncStorage with the new user data
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        } catch (storageError) {
          console.error('Error updating user data in storage:', storageError);
        }

        // Track profile completion
        try {
          await analyticsService.logEvent('profile_completed', {
            has_birth_date: !!profileData.birthDate,
            has_birth_time: !!profileData.birthTime,
            has_birth_location: !!profileData.birthLocation,
            gender: profileData.gender,
            is_required: route.params?.isRequired || false
          });

          const { AppEventsLogger } = require('react-native-fbsdk-next');
          await AppEventsLogger.logEvent('ProfileCompleted', {
            fb_content_type: 'user_profile',
            has_complete_info: !!(profileData.birthDate && profileData.birthLocation)
          });

          console.log('📊 [TRACKING] Profile completed');
        } catch (trackingError) {
          console.error('❌ [TRACKING] Failed to track profile completion:', trackingError);
        }

        Alert.alert(
          'Profile Updated',
          'Your profile has been updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to home or previous screen
                if (route.params?.isRequired) {
                  // If this was a required profile completion, navigate to home
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                  });
                } else {
                  // If accessed manually, just go back
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Error details:', {
        message: error.message,
        userMessage: error.userMessage,
        response: error.response?.data,
        isNetworkError: error.isNetworkError,
        isAuthError: error.isAuthError,
      });
      
      // Use userMessage from API interceptor if available
      let errorMessage = 'Failed to update profile. Please try again.';
      if (error.userMessage) {
        errorMessage = error.userMessage;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.isNetworkError) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.isAuthError) {
        // Auth error is handled by the global LOGOUT_REQUIRED event
        // Just show a brief message, user will be redirected to login
        errorMessage = 'Session expired. Redirecting to login...';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Don't show alert for auth errors - the LOGOUT_REQUIRED handler will show it
      if (!error.isAuthError) {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 20 }}
        >
        {/* Info Message */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Please complete your profile to get personalized astrological consultations
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formContainer}>
          {/* Name Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Gender Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender *</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowGenderPicker(true)}
            >
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={[styles.dateTimeText, !formData.gender && styles.placeholderText]}>
                {formData.gender || 'Select your gender'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Birth Location Field - Moved up for better keyboard handling */}
          <View ref={birthLocationRef} style={[styles.inputGroup, { zIndex: 1000 }]}>
            <Text style={styles.label}>Birth Location *</Text>
            <GooglePlacesInput
              value={formData.birthLocation}
              onLocationSelect={handleLocationSelect}
              onFocus={handleBirthLocationFocus}
              placeholder="Search for your birth city/place"
            />
            {formData.birthLocationCoordinates && (
              <Text style={styles.coordinatesText}>
                📍 Lat: {formData.birthLocationCoordinates.latitude?.toFixed(4)}, 
                Lng: {formData.birthLocationCoordinates.longitude?.toFixed(4)}
              </Text>
            )}
          </View>

          {/* Date of Birth Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth *</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.dateTimeText}>
                {formatDate(formData.birthDate)}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Time of Birth Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time of Birth *</Text>
            
            {/* Checkbox for unknown time */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => handleTimeOfBirthUnknownChange(!isTimeOfBirthUnknown)}
            >
              <View style={[styles.checkbox, isTimeOfBirthUnknown && styles.checkboxChecked]}>
                {isTimeOfBirthUnknown && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>I don't know my time of birth</Text>
            </TouchableOpacity>
            
            {/* Time picker (disabled if unknown is checked) */}
            <TouchableOpacity
              style={[styles.dateTimeButton, isTimeOfBirthUnknown && styles.disabledButton]}
              onPress={() => {
                if (!isTimeOfBirthUnknown) {
                  // Ensure we have a valid Date object for the time picker
                  if (!formData.birthTime) {
                    handleInputChange('birthTime', new Date());
                  }
                  setShowTimePicker(true);
                }
              }}
              disabled={isTimeOfBirthUnknown}
            >
              <Ionicons name="time-outline" size={20} color={isTimeOfBirthUnknown ? "#D1D5DB" : "#6B7280"} />
              <Text style={[styles.dateTimeText, isTimeOfBirthUnknown && styles.disabledText]}>
                {isTimeOfBirthUnknown ? 'Time unknown' : formatTime(formData.birthTime)}
              </Text>
              <Ionicons name="chevron-down" size={20} color={isTimeOfBirthUnknown ? "#D1D5DB" : "#6B7280"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.birthDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && !isTimeOfBirthUnknown && formData.birthTime && (
        <DateTimePicker
          value={formData.birthTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {/* Gender Picker Modal */}
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
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.genderOptions}>
              {['Male', 'Female', 'Other', 'Prefer not to say'].map((gender) => (
                <TouchableOpacity
                  key={gender}
                  style={[
                    styles.genderOption,
                    formData.gender === gender && styles.genderOptionSelected
                  ]}
                  onPress={() => handleGenderSelect(gender)}
                >
                  <Text style={[
                    styles.genderOptionText,
                    formData.gender === gender && styles.genderOptionTextSelected
                  ]}>
                    {gender}
                  </Text>
                  {formData.gender === gender && (
                    <Ionicons name="checkmark" size={20} color="#F97316" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 500, // Responsive max width for tablets
    alignSelf: 'center',
    width: '100%',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8, // SafeAreaView now handles safe area properly
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F9FAFB',
  },
  dateTimeText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  googlePlacesContainer: {
    flex: 1,
    zIndex: 1,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  genderOptions: {
    paddingHorizontal: 20,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  genderOptionSelected: {
    backgroundColor: '#FEF3E2',
    borderColor: '#F97316',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  genderOptionTextSelected: {
    color: '#F97316',
    fontWeight: '600',
  },
});

export default AddUserProfile;
