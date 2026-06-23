import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { colors } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';

const AddressManagementScreen = ({ route, navigation }) => {
  const { selectMode } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    addressType: 'home',
    isDefault: false
  });

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [])
  );

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getAddresses();
      setAddresses(response.data);
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
      addressType: 'home',
      isDefault: false
    });
    setEditingAddress(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (address) => {
    setFormData({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      addressType: address.addressType,
      isDefault: address.isDefault
    });
    setEditingAddress(address);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.fullName || !formData.phone || !formData.addressLine1 || 
        !formData.city || !formData.state || !formData.pincode) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setSaving(true);
      if (editingAddress) {
        await productAPI.updateAddress(editingAddress._id, formData);
      } else {
        await productAPI.createAddress(formData);
      }
      
      setShowAddModal(false);
      resetForm();
      await loadAddresses();
      Alert.alert('Success', `Address ${editingAddress ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (addressId) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productAPI.deleteAddress(addressId);
              await loadAddresses();
              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address');
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (addressId) => {
    try {
      await productAPI.setDefaultAddress(addressId);
      await loadAddresses();
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  const renderAddress = (address) => (
    <View key={address._id} style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTypeRow}>
          <Ionicons
            name={address.addressType === 'home' ? 'home' : address.addressType === 'work' ? 'briefcase' : 'location'}
            size={20}
            color="#FBBF24"
          />
          <Text style={styles.addressType}>
            {address.addressType.charAt(0).toUpperCase() + address.addressType.slice(1)}
          </Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => openEditModal(address)}
          >
            <Ionicons name="pencil" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleDelete(address._id)}
          >
            <Ionicons name="trash-outline" size={18} color="#F87171" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addressName}>{address.fullName}</Text>
      <Text style={styles.addressText}>
        {address.addressLine1}
        {address.addressLine2 && `, ${address.addressLine2}`}
      </Text>
      <Text style={styles.addressText}>
        {address.city}, {address.state} - {address.pincode}
      </Text>
      <Text style={styles.addressPhone}>Phone: {address.phone}</Text>

      {!address.isDefault && (
        <TouchableOpacity
          style={styles.setDefaultButton}
          onPress={() => handleSetDefault(address._id)}
        >
          <Text style={styles.setDefaultText}>Set as Default</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <CosmicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FBBF24" />
        </View>
      </CosmicBackground>
    );
  }

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Addresses</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FBBF24" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="location-outline" size={64} color="#94A3B8" />
            <Text style={styles.emptyText}>No addresses found</Text>
            <Text style={styles.emptySubtext}>Add a delivery address to continue</Text>
          </View>
        ) : (
          addresses.map(renderAddress)
        )}
      </ScrollView>

      {/* Add/Edit Address Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#F3F4F6" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll}>
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                value={formData.fullName}
                onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Address Line 1 *"
                value={formData.addressLine1}
                onChangeText={(text) => setFormData({ ...formData, addressLine1: text })}
                placeholderTextColor="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Address Line 2 (Optional)"
                value={formData.addressLine2}
                onChangeText={(text) => setFormData({ ...formData, addressLine2: text })}
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="City *"
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="State *"
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Pincode *"
                value={formData.pincode}
                onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                keyboardType="numeric"
                maxLength={6}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Address Type</Text>
              <View style={styles.typeButtons}>
                {['home', 'work', 'other'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      formData.addressType === type && styles.typeButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, addressType: type })}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.addressType === type && styles.typeButtonTextActive
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
              >
                <View style={[styles.checkbox, formData.isDefault && styles.checkboxChecked]}>
                  {formData.isDefault && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default address</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Address</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  addButton: {
    padding: 4
  },
  content: {
    flex: 1,
    padding: 16
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8
  },
  addressCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  addressTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  addressType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FBBF24',
    borderRadius: 4
  },
  defaultText: {
    fontSize: 10,
    color: '#0B0F2F',
    fontWeight: '600'
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    padding: 4
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4
  },
  addressText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 2
  },
  addressPhone: {
    fontSize: 13,
    color: '#A5B4FC',
    marginTop: 4
  },
  setDefaultButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FBBF24',
    alignItems: 'center'
  },
  setDefaultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBBF24'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#0f1229',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 20
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#F3F4F6',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  halfInput: {
    flex: 1
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 8
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  typeButtonActive: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.15)'
  },
  typeButtonText: {
    fontSize: 14,
    color: '#94A3B8'
  },
  typeButtonTextActive: {
    color: '#FBBF24',
    fontWeight: '600'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: {
    backgroundColor: '#FBBF24',
    borderColor: '#FBBF24'
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#F3F4F6'
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default AddressManagementScreen;
