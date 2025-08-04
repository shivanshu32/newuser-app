import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { epoojaAPI } from '../../services/epoojaAPI';
import { useAuth } from '../../context/AuthContext';

const EPoojaBooking = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { pooja, package: selectedPackage } = route.params;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Booking form data
  const [bookingData, setBookingData] = useState({
    selectedDate: new Date(),
    selectedTime: '09:00',
    participantName: user?.name || '',
    participantPhone: user?.phone || '',
    participantEmail: user?.email || '',
    gotra: '',
    specialInstructions: '',
    templeId: selectedPackage?.temple_id || null,
  });

  // Date/Time picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Available time slots
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const response = await epoojaAPI.getWalletBalance();
      if (response.success) {
        setWalletBalance(response.data.balance);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBookingData(prev => ({ ...prev, selectedDate }));
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      setBookingData(prev => ({ ...prev, selectedTime: timeString }));
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return bookingData.selectedDate && bookingData.selectedTime;
      case 2:
        return bookingData.participantName && bookingData.participantPhone;
      case 3:
        return true; // Review step, no validation needed
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleConfirmBooking();
      }
    } else {
      Alert.alert('Incomplete Information', 'Please fill in all required fields');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleConfirmBooking = async () => {
    // Check wallet balance
    if (walletBalance < selectedPackage.price) {
      Alert.alert(
        'Insufficient Balance',
        `Your wallet balance (₹${walletBalance}) is insufficient for this booking (₹${selectedPackage.price}). Please add money to your wallet.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Money', onPress: () => navigation.navigate('Wallet') }
        ]
      );
      return;
    }

    setLoading(true);
    
    try {
      const bookingPayload = {
        category_id: pooja.id,
        package_id: selectedPackage.id,
        temple_id: bookingData.templeId,
        booking_date: bookingData.selectedDate.toISOString().split('T')[0],
        booking_time: bookingData.selectedTime,
        participant_name: bookingData.participantName,
        participant_phone: bookingData.participantPhone,
        participant_email: bookingData.participantEmail,
        gotra: bookingData.gotra,
        special_instructions: bookingData.specialInstructions,
        amount: selectedPackage.price,
      };

      const response = await epoojaAPI.createBooking(bookingPayload);
      
      if (response.success) {
        Alert.alert(
          'Booking Confirmed!',
          'Your e-pooja has been successfully booked. You will receive updates via SMS and email.',
          [
            {
              text: 'View Booking',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { 
                      name: 'EPoojaBookings',
                      params: { bookingId: response.data.booking_id }
                    }
                  ],
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Booking Failed', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.activeStepCircle
          ]}>
            <Text style={[
              styles.stepNumber,
              currentStep >= step && styles.activeStepNumber
            ]}>
              {step}
            </Text>
          </View>
          <Text style={[
            styles.stepLabel,
            currentStep >= step && styles.activeStepLabel
          ]}>
            {step === 1 ? 'Date & Time' : step === 2 ? 'Details' : 'Review'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Date & Time</Text>
      
      {/* Date Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Preferred Date</Text>
        <TouchableOpacity 
          style={styles.dateTimeInput}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          <Text style={styles.dateTimeText}>
            {bookingData.selectedDate.toLocaleDateString()}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Time Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Preferred Time</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.timeSlotContainer}
        >
          {timeSlots.map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.timeSlot,
                bookingData.selectedTime === time && styles.selectedTimeSlot
              ]}
              onPress={() => setBookingData(prev => ({ ...prev, selectedTime: time }))}
            >
              <Text style={[
                styles.timeSlotText,
                bookingData.selectedTime === time && styles.selectedTimeSlotText
              ]}>
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={bookingData.selectedDate}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Participant Details</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={styles.textInput}
          value={bookingData.participantName}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, participantName: text }))}
          placeholder="Enter participant's full name"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.textInput}
          value={bookingData.participantPhone}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, participantPhone: text }))}
          placeholder="Enter phone number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address</Text>
        <TextInput
          style={styles.textInput}
          value={bookingData.participantEmail}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, participantEmail: text }))}
          placeholder="Enter email address"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Gotra (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={bookingData.gotra}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, gotra: text }))}
          placeholder="Enter your gotra"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Special Instructions (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={bookingData.specialInstructions}
          onChangeText={(text) => setBookingData(prev => ({ ...prev, specialInstructions: text }))}
          placeholder="Any special requests or instructions"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Confirm</Text>
      
      {/* Pooja Details */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Pooja Details</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Pooja:</Text>
          <Text style={styles.reviewValue}>{pooja.name}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Package:</Text>
          <Text style={styles.reviewValue}>{selectedPackage.package_name}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Temple:</Text>
          <Text style={styles.reviewValue}>{selectedPackage.temple_name}</Text>
        </View>
      </View>

      {/* Schedule */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Schedule</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Date:</Text>
          <Text style={styles.reviewValue}>{bookingData.selectedDate.toLocaleDateString()}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Time:</Text>
          <Text style={styles.reviewValue}>{bookingData.selectedTime}</Text>
        </View>
      </View>

      {/* Participant */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Participant</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Name:</Text>
          <Text style={styles.reviewValue}>{bookingData.participantName}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Phone:</Text>
          <Text style={styles.reviewValue}>{bookingData.participantPhone}</Text>
        </View>
        {bookingData.gotra && (
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Gotra:</Text>
            <Text style={styles.reviewValue}>{bookingData.gotra}</Text>
          </View>
        )}
      </View>

      {/* Payment */}
      <View style={styles.reviewSection}>
        <Text style={styles.reviewSectionTitle}>Payment</Text>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Amount:</Text>
          <Text style={styles.reviewValue}>₹{selectedPackage.price}</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Payment Method:</Text>
          <Text style={styles.reviewValue}>Wallet</Text>
        </View>
        <View style={styles.reviewItem}>
          <Text style={styles.reviewLabel}>Wallet Balance:</Text>
          <Text style={[
            styles.reviewValue,
            walletBalance < selectedPackage.price && styles.insufficientBalance
          ]}>
            ₹{walletBalance}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book E-Pooja</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.price}>₹{selectedPackage.price}</Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.nextButton,
            !validateStep(currentStep) && styles.disabledButton
          ]}
          onPress={handleNext}
          disabled={!validateStep(currentStep) || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentStep === 3 ? 'Confirm Booking' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activeStepCircle: {
    backgroundColor: '#F97316',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeStepNumber: {
    color: 'white',
  },
  stepLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  activeStepLabel: {
    color: '#F97316',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
    marginLeft: 12,
  },
  timeSlotContainer: {
    marginTop: 8,
  },
  timeSlot: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
  },
  selectedTimeSlot: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: 'white',
    fontWeight: '600',
  },
  reviewSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 2,
    textAlign: 'right',
  },
  insufficientBalance: {
    color: '#EF4444',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F97316',
  },
  nextButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EPoojaBooking;
