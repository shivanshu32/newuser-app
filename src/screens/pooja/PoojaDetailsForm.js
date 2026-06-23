import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import poojaAPI from '../../services/poojaAPI';
import { colors, spacing, radius, shadows } from '../../theme';

const PoojaDetailsForm = ({ navigation, route }) => {
  const { booking } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    motherName: '',
    gotra: '',
    dateOfBirth: null,
    birthTime: '',
    birthPlace: '',
    sankalpPurpose: '',
    specificWishes: '',
    additionalNotes: '',
    // Prasad delivery address
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
  });
  
  const [familyMembers, setFamilyMembers] = useState([]);
  
  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      relation: '',
      dateOfBirth: null,
      gotra: '',
    }]);
  };
  
  const updateFamilyMember = (id, field, value) => {
    setFamilyMembers(prev => prev.map(member => 
      member.id === id ? { ...member, [field]: value } : member
    ));
  };
  
  const removeFamilyMember = (id) => {
    setFamilyMembers(prev => prev.filter(member => member.id !== id));
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormData('dateOfBirth', selectedDate);
    }
  };
  
  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    if (!formData.dateOfBirth) {
      Alert.alert('Validation Error', 'Please select your date of birth');
      return false;
    }
    if (!formData.birthPlace.trim()) {
      Alert.alert('Validation Error', 'Please enter your birth place');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const poojaDetails = {
        fullName: formData.fullName.trim(),
        fatherName: formData.fatherName.trim(),
        motherName: formData.motherName.trim(),
        gotra: formData.gotra.trim(),
        dateOfBirth: formData.dateOfBirth?.toISOString(),
        birthTime: formData.birthTime.trim(),
        birthPlace: formData.birthPlace.trim(),
        familyMembers: familyMembers.map(m => ({
          name: m.name,
          relation: m.relation,
          dateOfBirth: m.dateOfBirth?.toISOString(),
          gotra: m.gotra,
        })).filter(m => m.name),
        sankalpPurpose: formData.sankalpPurpose.trim(),
        specificWishes: formData.specificWishes.trim(),
        prasadDeliveryAddress: {
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          landmark: formData.landmark.trim(),
        },
        additionalNotes: formData.additionalNotes.trim(),
      };
      
      const response = await poojaAPI.submitPoojaDetails(booking._id, poojaDetails);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Your pooja details have been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit pooja details');
      }
    } catch (error) {
      console.error('Error submitting pooja details:', error);
      Alert.alert('Error', error.message || 'Failed to submit pooja details');
    } finally {
      setLoading(false);
    }
  };
  
  const renderInput = (label, field, placeholder, options = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label}
        {options.required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[styles.input, options.multiline && styles.multilineInput]}
        placeholder={placeholder}
        placeholderTextColor="#666"
        value={formData[field]}
        onChangeText={(value) => updateFormData(field, value)}
        multiline={options.multiline}
        numberOfLines={options.multiline ? 3 : 1}
        keyboardType={options.keyboardType || 'default'}
      />
    </View>
  );
  
  const pooja = booking?.pooja || {};
  const packageData = booking?.package || booking?.packageSnapshot || {};
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#0f0f23', '#1a1a2e', '#16213e']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pooja Details</Text>
          <View style={styles.headerRight} />
        </View>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Booking Info Card */}
            <View style={styles.bookingInfoCard}>
              <MaterialCommunityIcons name="hands-pray" size={24} color="#9b59b6" />
              <View style={styles.bookingInfo}>
                <Text style={styles.poojaName}>{pooja.mainHeading || 'Pooja Booking'}</Text>
                <Text style={styles.packageName}>{packageData.name || 'Standard Package'}</Text>
              </View>
            </View>
            
            {/* Primary Person Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="account" size={18} color="#9b59b6" />
                {' '}Primary Person Details
              </Text>
              
              {renderInput('Full Name', 'fullName', 'Enter your full name', { required: true })}
              {renderInput("Father's Name", 'fatherName', "Enter father's name")}
              {renderInput("Mother's Name", 'motherName', "Enter mother's name")}
              {renderInput('Gotra (Family Lineage)', 'gotra', 'Enter your gotra')}
              
              {/* Date of Birth */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Date of Birth<Text style={styles.required}> *</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={formData.dateOfBirth ? styles.dateText : styles.datePlaceholder}>
                    {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : 'Select date of birth'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#9b59b6" />
                </TouchableOpacity>
              </View>
              
              {showDatePicker && (
                <DateTimePicker
                  value={formData.dateOfBirth || new Date(1990, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
              
              {renderInput('Birth Time', 'birthTime', 'e.g., 10:30 AM')}
              {renderInput('Birth Place', 'birthPlace', 'Enter birth place', { required: true })}
            </View>
            
            {/* Family Members */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>
                  <MaterialCommunityIcons name="account-group" size={18} color="#9b59b6" />
                  {' '}Family Members (Optional)
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={addFamilyMember}>
                  <Ionicons name="add-circle" size={24} color="#9b59b6" />
                </TouchableOpacity>
              </View>
              
              {familyMembers.map((member, index) => (
                <View key={member.id} style={styles.familyMemberCard}>
                  <View style={styles.familyMemberHeader}>
                    <Text style={styles.familyMemberTitle}>Family Member {index + 1}</Text>
                    <TouchableOpacity onPress={() => removeFamilyMember(member.id)}>
                      <Ionicons name="close-circle" size={22} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>
                  
                  <TextInput
                    style={styles.input}
                    placeholder="Name"
                    placeholderTextColor="#666"
                    value={member.name}
                    onChangeText={(value) => updateFamilyMember(member.id, 'name', value)}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Relation (e.g., Spouse, Son, Daughter)"
                    placeholderTextColor="#666"
                    value={member.relation}
                    onChangeText={(value) => updateFamilyMember(member.id, 'relation', value)}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Gotra"
                    placeholderTextColor="#666"
                    value={member.gotra}
                    onChangeText={(value) => updateFamilyMember(member.id, 'gotra', value)}
                  />
                </View>
              ))}
              
              {familyMembers.length === 0 && (
                <Text style={styles.emptyText}>
                  Tap + to add family members for the pooja
                </Text>
              )}
            </View>
            
            {/* Sankalp Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="heart-outline" size={18} color={colors.secondary} />
                {' '}Sankalp (Purpose of Pooja)
              </Text>
              
              {renderInput('Main Purpose/Wish', 'sankalpPurpose', 'What is the main purpose of this pooja?', { multiline: true })}
              {renderInput('Specific Wishes/Prayers', 'specificWishes', 'Any specific wishes or prayers?', { multiline: true })}
            </View>
            
            {/* Prasad Delivery Address */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="truck-delivery" size={18} color={colors.secondary} />
                {' '}Prasad Delivery Address
              </Text>
              
              {renderInput('Address Line 1', 'addressLine1', 'House/Flat No., Building Name')}
              {renderInput('Address Line 2', 'addressLine2', 'Street, Area')}
              {renderInput('City', 'city', 'Enter city')}
              {renderInput('State', 'state', 'Enter state')}
              {renderInput('Pincode', 'pincode', 'Enter pincode', { keyboardType: 'numeric' })}
              {renderInput('Landmark', 'landmark', 'Nearby landmark')}
            </View>
            
            {/* Additional Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <MaterialCommunityIcons name="note-text" size={18} color={colors.secondary} />
                {' '}Additional Notes
              </Text>
              
              {renderInput('Any other information', 'additionalNotes', 'Any other details you want to share...', { multiline: true })}
            </View>
            
            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={[colors.secondary, '#8e44ad']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={22} color={colors.textInverse} />
                    <Text style={styles.submitText}>Submit Pooja Details</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(155, 89, 182, 0.2)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  bookingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  bookingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  poojaName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  packageName: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.2)',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.2)',
  },
  dateText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  datePlaceholder: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  familyMemberCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.15)',
  },
  familyMemberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  familyMemberTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default PoojaDetailsForm;
