import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { walletAPI } from '../../services/api';

const PreChatForm = ({ route, navigation }) => {
  const { astrologer, bookingType = 'chat' } = route.params || {};
  const { user } = useAuth();
  const { socket } = useSocket();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: new Date(),
    timeOfBirth: new Date(),
    placeOfBirth: '',
    gender: '',
    isTimeOfBirthUnknown: false,
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [isTimeOfBirthUnknown, setIsTimeOfBirthUnknown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Gender options
  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  ];

  // Pre-fill form with user profile data
  useEffect(() => {
    if (user) {
      const isTimeUnknown = user.isTimeOfBirthUnknown || false;
      const initialData = {
        name: user.name || '',
        dateOfBirth: user.birthDate ? new Date(user.birthDate) : new Date(),
        timeOfBirth: isTimeUnknown ? new Date() : (user.birthTime ? new Date(user.birthTime) : new Date()),
        placeOfBirth: user.birthLocation || '',
        gender: user.gender || '',
        isTimeOfBirthUnknown: isTimeUnknown,
      };
      setFormData(initialData);
      setIsTimeOfBirthUnknown(isTimeUnknown);
    }
  }, [user]);

  // Validation function
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.placeOfBirth.trim()) {
      newErrors.placeOfBirth = 'Place of birth is required';
    } else if (formData.placeOfBirth.trim().length < 2) {
      newErrors.placeOfBirth = 'Place of birth must be at least 2 characters';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    // Check if date of birth is reasonable (not in future, not too old)
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    
    if (formData.dateOfBirth > today) {
      newErrors.dateOfBirth = 'Date of birth cannot be in the future';
    } else if (formData.dateOfBirth < minDate) {
      newErrors.dateOfBirth = 'Please enter a valid date of birth';
    }

    // Time of birth validation (only if not unknown)
    if (!formData.isTimeOfBirthUnknown && !formData.timeOfBirth) {
      newErrors.timeOfBirth = 'Time of birth is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle date change
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData(prev => ({ ...prev, dateOfBirth: selectedDate }));
      // Clear date error if it exists
      if (errors.dateOfBirth) {
        setErrors(prev => ({ ...prev, dateOfBirth: null }));
      }
    }
  };

  // Handle time change
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setFormData(prev => ({ ...prev, timeOfBirth: selectedTime }));
      // Clear time error if it exists
      if (errors.timeOfBirth) {
        setErrors(prev => ({ ...prev, timeOfBirth: null }));
      }
    }
  };

  // Handle gender selection
  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
    setShowGenderModal(false);
    // Clear gender error if it exists
    if (errors.gender) {
      setErrors(prev => ({ ...prev, gender: null }));
    }
  };

  // Handle time of birth unknown change
  const handleTimeOfBirthUnknownChange = (value) => {
    setIsTimeOfBirthUnknown(value);
    setFormData(prev => ({ 
      ...prev, 
      isTimeOfBirthUnknown: value,
      timeOfBirth: value ? null : (prev.timeOfBirth || new Date())
    }));
    // Clear time error if checking unknown
    if (value && errors.timeOfBirth) {
      setErrors(prev => ({ ...prev, timeOfBirth: null }));
    }
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
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

  // Get gender display text
  const getGenderDisplayText = (genderValue) => {
    const option = genderOptions.find(opt => opt.value === genderValue);
    return option ? option.label : 'Select Gender';
  };

  // Check wallet balance before booking
  const checkWalletBalance = async () => {
    try {
      console.log('[PreChatForm] Checking wallet balance...');
      
      // Fetch current wallet balance
      const balanceResponse = await walletAPI.getBalance();
      const currentBalance = balanceResponse.data?.balance || 0;
      
      console.log('[PreChatForm] Current wallet balance:', currentBalance);
      
      // Get per-minute rate for the selected consultation type
      let perMinuteRate = 0;
      if (astrologer?.consultationPrices) {
        switch (bookingType) {
          case 'chat':
            perMinuteRate = astrologer.consultationPrices.chat || 20;
            break;
          case 'call':
          case 'voice':
            perMinuteRate = astrologer.consultationPrices.call || 30;
            break;
          case 'video':
            perMinuteRate = astrologer.consultationPrices.video || 40;
            break;
          default:
            perMinuteRate = 20; // Default fallback
        }
      } else {
        // Fallback rates if consultationPrices not available
        perMinuteRate = bookingType === 'chat' ? 20 : bookingType === 'call' || bookingType === 'voice' ? 30 : 40;
      }
      
      // Calculate minimum required balance for 5 minutes
      const minimumRequiredBalance = perMinuteRate * 5;
      
      console.log('[PreChatForm] Per-minute rate:', perMinuteRate);
      console.log('[PreChatForm] Minimum required balance (5 mins):', minimumRequiredBalance);
      console.log('[PreChatForm] Balance check:', currentBalance >= minimumRequiredBalance ? 'PASS' : 'FAIL');
      
      if (currentBalance < minimumRequiredBalance) {
        // Insufficient balance - show alert and redirect to wallet
        const shortfall = minimumRequiredBalance - currentBalance;
        
        Alert.alert(
          'Insufficient Wallet Balance',
          `You need at least ₹${minimumRequiredBalance} for a 5-minute ${bookingType} consultation (₹${perMinuteRate}/min).\n\nCurrent Balance: ₹${currentBalance.toFixed(2)}\nRequired: ₹${minimumRequiredBalance}\nShortfall: ₹${shortfall.toFixed(2)}\n\nPlease add funds to your wallet to continue.`,
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Add Funds',
              onPress: () => {
                // Navigate to wallet screen
                navigation.navigate('Main', { 
                  screen: 'Wallet',
                  params: { 
                    suggestedAmount: Math.ceil(shortfall / 100) * 100 // Round up to nearest 100
                  }
                });
              }
            }
          ]
        );
        
        return false; // Balance check failed
      }
      
      return true; // Balance check passed
      
    } catch (error) {
      console.error('[PreChatForm] Error checking wallet balance:', error);
      
      // Show error alert but allow user to proceed (in case of API issues)
      Alert.alert(
        'Unable to Check Balance',
        'We could not verify your wallet balance. Please ensure you have sufficient funds before proceeding.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Continue Anyway',
            onPress: () => {
              return true;
            }
          }
        ]
      );
      
      return false; // Don't proceed if balance check fails
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    if (!astrologer || !astrologer._id) {
      Alert.alert('Error', 'Astrologer information is missing. Please try again.');
      return;
    }

    setLoading(true);

    // Check wallet balance before proceeding with booking
    const hasEnoughBalance = await checkWalletBalance();
    if (!hasEnoughBalance) {
      setLoading(false);
      return; // Stop booking process if insufficient balance
    }

    try {
      // Use socket-based booking flow instead of REST API to ensure astrologer gets notification
      if (!socket || !socket.connected) {
        throw new Error('Not connected to server. Please check your internet connection.');
      }

      // Prepare booking data with user information for socket emission
      const bookingData = {
        astrologerId: astrologer._id,
        type: bookingType,
        notes: `${bookingType} consultation request`,
        userInfo: {
          name: formData.name.trim(),
          dateOfBirth: formData.dateOfBirth.toISOString(),
          timeOfBirth: formData.isTimeOfBirthUnknown ? null : formData.timeOfBirth?.toISOString(),
          placeOfBirth: formData.placeOfBirth.trim(),
          gender: formData.gender,
          isTimeOfBirthUnknown: formData.isTimeOfBirthUnknown,
        }
      };

      console.log(' [PreChatForm] Initiating socket-based booking with data:', JSON.stringify(bookingData, null, 2));
      console.log(' [PreChatForm] User context:', user ? 'User authenticated' : 'No user context');
      console.log(' [PreChatForm] Astrologer info:', JSON.stringify(astrologer, null, 2));
      console.log(' [PreChatForm] Socket connected:', socket.connected);

      // Set up one-time listeners for booking response
      const handleBookingInitiated = (response) => {
        console.log(' [PreChatForm] Booking initiated successfully:', response);
        
        // Check if booking was created (either online or offline/queued)
        if (response.booking && response.bookingId) {
          console.log(' [PreChatForm] Booking created successfully');
          
          // Determine the appropriate message based on astrologer status
          let alertTitle, alertMessage;
          
          if (response.queuedRequest || !response.isAstrologerOnline) {
            // Offline astrologer - booking is queued
            alertTitle = 'Request Queued!';
            alertMessage = response.message || `Your ${bookingType} consultation request has been queued. ${astrologer.displayName} will be notified when they come online.`;
            console.log(' [PreChatForm] Astrologer offline - booking queued');
          } else {
            // Online astrologer - booking sent immediately
            alertTitle = 'Request Sent!';
            alertMessage = `Your ${bookingType} consultation request has been sent to ${astrologer.displayName}. You'll receive a notification when they respond.`;
            console.log(' [PreChatForm] Astrologer online - booking sent immediately');
          }
          
          // For chat consultations, show appropriate message and navigate to home
          if (bookingType === 'chat') {
            console.log(' [PreChatForm] Chat consultation - navigating to HomeScreen');
            
            Alert.alert(
              alertTitle,
              alertMessage,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigate to Main tab where user can see notifications
                    navigation.navigate('Main', { screen: 'Home' });
                  }
                }
              ]
            );
          } else {
            // For voice/video consultations, use the existing waiting screen flow
            console.log(' [PreChatForm] Voice/Video consultation - navigating to BookingWaiting');
            
            navigation.replace('BookingWaiting', {
              bookingId: response.booking._id,
              astrologer: astrologer,
              bookingType: bookingType,
              userInfo: formData
            });
          }
        } else {
          console.error(' [PreChatForm] Booking initiation failed:', response);
          throw new Error(response.message || 'Failed to create booking');
        }
        
        setLoading(false);
        
        // Clean up listeners
        socket.off('booking_initiated', handleBookingInitiated);
        socket.off('booking_error', handleBookingError);
      };

      const handleBookingError = (error) => {
        console.error(' [PreChatForm] Booking error received:', error);
        setLoading(false);
        
        let errorMessage = 'Failed to submit booking request. Please try again.';
        if (error.message) {
          errorMessage = error.message;
        }
        
        Alert.alert('Booking Error', errorMessage, [{ text: 'OK' }]);
        
        // Clean up listeners
        socket.off('booking_initiated', handleBookingInitiated);
        socket.off('booking_error', handleBookingError);
      };

      // Set up listeners before emitting
      socket.on('booking_initiated', handleBookingInitiated);
      socket.on('booking_error', handleBookingError);

      // Emit socket-based booking request (this will trigger astrologer notification)
      socket.emit('initiate_booking', bookingData);
      
      console.log(' [PreChatForm] Socket booking request emitted successfully');

    } catch (error) {
      console.error(' [PreChatForm] Error creating booking:', error);
      console.error(' [PreChatForm] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      let errorMessage = 'Failed to submit booking request. Please try again.';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Booking Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consultation Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {/* Astrologer Info */}
          <View style={styles.astrologerCard}>
            <Text style={styles.astrologerName}>
              {astrologer?.displayName || astrologer?.name || 'Astrologer'}
            </Text>
            <Text style={styles.consultationType}>
              {bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Consultation
            </Text>
          </View>

          {/* Form Instructions */}
          <View style={styles.instructionsCard}>
            <Ionicons name="information-circle" size={24} color="#F97316" />
            <View style={styles.instructionsText}>
              <Text style={styles.instructionsTitle}>Required Information</Text>
              <Text style={styles.instructionsSubtitle}>
                Please provide your details for an accurate astrological consultation
              </Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput
                style={[styles.textInput, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Date of Birth Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Date of Birth *</Text>
              <TouchableOpacity
                style={[styles.dateInput, errors.dateOfBirth && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(formData.dateOfBirth)}</Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            {/* Time of Birth Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Time of Birth</Text>
              
              {/* Time of Birth Unknown Checkbox */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => handleTimeOfBirthUnknownChange(!isTimeOfBirthUnknown)}
              >
                <View style={[styles.checkbox, isTimeOfBirthUnknown && styles.checkboxChecked]}>
                  {isTimeOfBirthUnknown && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>I don't know my time of birth</Text>
              </TouchableOpacity>

              {/* Time Picker */}
              <TouchableOpacity
                style={[
                  styles.dateInput, 
                  errors.timeOfBirth && styles.inputError,
                  isTimeOfBirthUnknown && styles.inputDisabled
                ]}
                onPress={() => !isTimeOfBirthUnknown && setShowTimePicker(true)}
                disabled={isTimeOfBirthUnknown}
              >
                <Text style={[
                  styles.dateText,
                  isTimeOfBirthUnknown && styles.disabledText
                ]}>
                  {isTimeOfBirthUnknown ? 'Time unknown' : formatTime(formData.timeOfBirth)}
                </Text>
                <Ionicons 
                  name="time-outline" 
                  size={20} 
                  color={isTimeOfBirthUnknown ? "#ccc" : "#666"} 
                />
              </TouchableOpacity>
              {errors.timeOfBirth && <Text style={styles.errorText}>{errors.timeOfBirth}</Text>}
            </View>

            {/* Gender Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Gender *</Text>
              <TouchableOpacity
                style={[styles.dateInput, errors.gender && styles.inputError]}
                onPress={() => setShowGenderModal(true)}
              >
                <Text style={[
                  styles.dateText,
                  !formData.gender && styles.placeholderText
                ]}>
                  {getGenderDisplayText(formData.gender)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            {/* Place of Birth Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Place of Birth *</Text>
              <TextInput
                style={[styles.textInput, errors.placeOfBirth && styles.inputError]}
                value={formData.placeOfBirth}
                onChangeText={(value) => handleInputChange('placeOfBirth', value)}
                placeholder="Enter your place of birth (City, State)"
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {errors.placeOfBirth && <Text style={styles.errorText}>{errors.placeOfBirth}</Text>}
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
            <Text style={styles.privacyText}>
              Your information is secure and will only be shared with your astrologer for consultation purposes.
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  Start {bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Consultation
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={formData.dateOfBirth}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={formData.timeOfBirth || new Date()}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
          />
        )}

        {/* Gender Selection Modal */}
        <Modal
          visible={showGenderModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowGenderModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowGenderModal(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.genderOptions}>
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      formData.gender === option.value && styles.genderOptionSelected
                    ]}
                    onPress={() => handleGenderSelect(option.value)}
                  >
                    <Text style={[
                      styles.genderOptionText,
                      formData.gender === option.value && styles.genderOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    {formData.gender === option.value && (
                      <Ionicons name="checkmark" size={20} color="#F97316" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  astrologerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  astrologerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: 16,
    color: '#F97316',
    fontWeight: '500',
  },
  instructionsCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3E2',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  instructionsText: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  instructionsSubtitle: {
    fontSize: 14,
    color: '#A16207',
    lineHeight: 20,
  },
  formContainer: {
    marginTop: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dateInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dateText: {
    fontSize: 16,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 4,
  },
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    marginLeft: 8,
    lineHeight: 18,
  },
  submitContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  submitButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Disabled input styles
  inputDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  disabledText: {
    color: '#9ca3af',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  // Gender options styles
  genderOptions: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#f9fafb',
  },
  genderOptionSelected: {
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  genderOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  genderOptionTextSelected: {
    color: '#F97316',
    fontWeight: '600',
  },
});

export default PreChatForm;
