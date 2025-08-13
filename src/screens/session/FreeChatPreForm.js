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

const FreeChatPreForm = ({ route, navigation }) => {
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
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('');

  // Gender options
  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
    { label: 'Prefer not to say', value: 'Prefer not to say' },
  ];

  // Pre-fill form with user data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        dateOfBirth: user.birthDate ? new Date(user.birthDate) : new Date(),
        timeOfBirth: user.birthTime ? new Date(user.birthTime) : new Date(),
        placeOfBirth: user.birthLocation || '',
        gender: user.gender || '',
        isTimeOfBirthUnknown: user.isTimeOfBirthUnknown || false,
      }));
      
      setIsTimeOfBirthUnknown(user.isTimeOfBirthUnknown || false);
    }
  }, [user]);

  // Socket event listeners for free chat
  useEffect(() => {
    if (!socket) return;

    const handleFreeChatRequested = (data) => {
      console.log('🆓 Free chat requested:', data);
      setShowWaitingModal(true);
      setWaitingMessage('Waiting for an astrologer to join...');
    };

    const handleFreeChatAccepted = (data) => {
      console.log('✅ Free chat accepted:', data);
      setShowWaitingModal(false);
      setLoading(false);
      
      // Navigate to free chat screen
      navigation.replace('FixedFreeChatScreen', {
        freeChatId: data.freeChatId,
        sessionId: data.sessionId,
        astrologerId: data.astrologer.id,
        astrologer: data.astrologer,
        isFreeChat: true,
        userProfile: formData // Pass the form data as user profile
      });
    };

    const handleFreeChatExpired = (data) => {
      console.log('⏰ Free chat expired:', data);
      setShowWaitingModal(false);
      setLoading(false);
      
      Alert.alert(
        'No Astrologers Available',
        'Sorry, no astrologers are currently available for free chat. Please try again later.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    };

    const handleFreeChatError = (data) => {
      console.error('❌ Free chat error:', data);
      setShowWaitingModal(false);
      setLoading(false);
      
      if (data.message === 'Profile incomplete') {
        Alert.alert(
          'Complete Your Profile',
          'Please complete your profile to use free chat.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Complete Profile', 
              onPress: () => navigation.navigate('AddUserProfile', { isRequired: true })
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message, [{ text: 'OK' }]);
      }
    };

    // Register socket listeners
    socket.on('free_chat_requested', handleFreeChatRequested);
    socket.on('free_chat_accepted', handleFreeChatAccepted);
    socket.on('free_chat_expired', handleFreeChatExpired);
    socket.on('free_chat_error', handleFreeChatError);

    return () => {
      // Cleanup listeners
      socket.off('free_chat_requested', handleFreeChatRequested);
      socket.off('free_chat_accepted', handleFreeChatAccepted);
      socket.off('free_chat_expired', handleFreeChatExpired);
      socket.off('free_chat_error', handleFreeChatError);
    };
  }, [socket, navigation, formData]);

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    // Date of birth validation
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }
    
    // Place of birth validation
    if (!formData.placeOfBirth.trim()) {
      newErrors.placeOfBirth = 'Place of birth is required';
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
      if (errors.dateOfBirth) {
        setErrors(prev => ({ ...prev, dateOfBirth: null }));
      }
    }
  };

  // Handle time change
  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (event.type === 'dismissed') {
      setShowTimePicker(false);
      return;
    }
    
    if (selectedTime) {
      setFormData(prev => ({ ...prev, timeOfBirth: selectedTime }));
      if (errors.timeOfBirth) {
        setErrors(prev => ({ ...prev, timeOfBirth: null }));
      }
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    }
  };

  // Handle gender selection
  const handleGenderSelect = (gender) => {
    setFormData(prev => ({ ...prev, gender }));
    setShowGenderModal(false);
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
    if (value && errors.timeOfBirth) {
      setErrors(prev => ({ ...prev, timeOfBirth: null }));
    }
  };

  // Handle input change
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  // Handle form submission and start free chat
  const handleStartFreeChat = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    if (!socket || !socket.connected) {
      Alert.alert('Connection Error', 'Please check your internet connection and try again.');
      return;
    }

    setLoading(true);

    try {
      console.log('🆓 [FreeChatPreForm] Starting free chat with user profile:', formData);
      
      // Prepare user profile data for free chat
      const userProfileData = {
        name: formData.name.trim(),
        dateOfBirth: formData.dateOfBirth.toISOString(),
        timeOfBirth: formData.isTimeOfBirthUnknown ? null : formData.timeOfBirth?.toISOString(),
        placeOfBirth: formData.placeOfBirth.trim(),
        gender: formData.gender,
        isTimeOfBirthUnknown: formData.isTimeOfBirthUnknown,
      };

      // Emit socket event to request free chat with user profile
      socket.emit('request_free_chat', {
        userId: user.id,
        userProfile: userProfileData
      });

      console.log('🆓 [FreeChatPreForm] Free chat request sent with profile data');

    } catch (error) {
      console.error('Error starting free chat:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to start free chat. Please try again.');
    }
  };

  // Handle cancel waiting
  const handleCancelWaiting = () => {
    setShowWaitingModal(false);
    setLoading(false);
    
    // Emit cancel event to backend
    if (socket) {
      socket.emit('cancel_free_chat_request');
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
          <Text style={styles.headerTitle}>Free Chat Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#4CAF50" />
              <Text style={styles.infoTitle}>Free Chat Session</Text>
            </View>
            <Text style={styles.infoText}>
              Please provide your details for a personalized 3-minute free chat session with an available astrologer.
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Gender Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender *</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, errors.gender && styles.inputError]}
                onPress={() => setShowGenderModal(true)}
              >
                <Text style={[styles.selectText, !formData.gender && styles.placeholderText]}>
                  {getGenderDisplayText(formData.gender)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
            </View>

            {/* Date of Birth Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth *</Text>
              <TouchableOpacity
                style={[styles.input, styles.selectInput, errors.dateOfBirth && styles.inputError]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.selectText}>{formatDate(formData.dateOfBirth)}</Text>
                <Ionicons name="calendar" size={20} color="#666" />
              </TouchableOpacity>
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            {/* Time of Birth Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Time of Birth</Text>
              
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

              {/* Time Picker (only show if time is not unknown) */}
              {!isTimeOfBirthUnknown && (
                <TouchableOpacity
                  style={[styles.input, styles.selectInput, errors.timeOfBirth && styles.inputError]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.selectText}>{formatTime(formData.timeOfBirth)}</Text>
                  <Ionicons name="time" size={20} color="#666" />
                </TouchableOpacity>
              )}
              {errors.timeOfBirth && <Text style={styles.errorText}>{errors.timeOfBirth}</Text>}
            </View>

            {/* Place of Birth Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Place of Birth *</Text>
              <TextInput
                style={[styles.input, errors.placeOfBirth && styles.inputError]}
                value={formData.placeOfBirth}
                onChangeText={(value) => handleInputChange('placeOfBirth', value)}
                placeholder="Enter your birth city"
                placeholderTextColor="#999"
              />
              {errors.placeOfBirth && <Text style={styles.errorText}>{errors.placeOfBirth}</Text>}
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleStartFreeChat}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="chatbubbles" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Start Free Chat</Text>
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
                  onPress={() => setShowGenderModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalOption}
                  onPress={() => handleGenderSelect(option.value)}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                  {formData.gender === option.value && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Waiting Modal */}
        <Modal
          visible={showWaitingModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelWaiting}
        >
          <View style={styles.waitingOverlay}>
            <View style={styles.waitingContent}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.waitingTitle}>Finding Astrologer...</Text>
              <Text style={styles.waitingMessage}>{waitingMessage}</Text>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelWaiting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#f44336',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
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
    borderColor: '#ddd',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  waitingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  waitingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  waitingMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
});

export default FreeChatPreForm;
