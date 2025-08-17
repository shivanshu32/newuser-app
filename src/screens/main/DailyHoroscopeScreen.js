import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import horoscopeService, { ZODIAC_SIGNS, DAY_OPTIONS } from '../../services/horoscopeService';

const { width } = Dimensions.get('window');

const DailyHoroscopeScreen = ({ navigation }) => {
  const [selectedSign, setSelectedSign] = useState(ZODIAC_SIGNS[0]); // Default to Aries
  const [selectedDay, setSelectedDay] = useState(DAY_OPTIONS[0]); // Default to Today
  const [horoscopeData, setHoroscopeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);

  // Fetch horoscope when component mounts or selections change
  useEffect(() => {
    fetchHoroscope();
  }, [selectedSign, selectedDay]);

  const fetchHoroscope = async () => {
    setLoading(true);
    try {
      const data = await horoscopeService.fetchDailyHoroscope(selectedSign.key, selectedDay.key);
      setHoroscopeData(data);
    } catch (error) {
      console.error('Error fetching horoscope:', error);
      Alert.alert('Error', 'Unable to load horoscope. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignSelect = (sign) => {
    setSelectedSign(sign);
    setShowSignModal(false);
  };

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    setShowDayModal(false);
  };

  const renderZodiacSignItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => handleSignSelect(item)}
    >
      <View style={styles.signItemContent}>
        <Text style={styles.signSymbol}>{item.symbol}</Text>
        <View style={styles.signTextContainer}>
          <Text style={styles.signName}>{item.name}</Text>
          <Text style={styles.signDates}>{item.dates}</Text>
        </View>
        {selectedSign.key === item.key && (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDayItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => handleDaySelect(item)}
    >
      <View style={styles.dayItemContent}>
        <Text style={styles.dayName}>{item.name}</Text>
        {selectedDay.key === item.key && (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
      </View>
    </TouchableOpacity>
  );

  // Function to get display date based on selected day
  const getDisplayDate = (dayKey) => {
    const today = new Date();
    let targetDate;

    switch (dayKey) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'yesterday':
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() - 1);
        break;
      default:
        targetDate = today;
    }

    return targetDate.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Horoscope</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Selection Cards */}
        <View style={styles.selectionContainer}>
          {/* Zodiac Sign Selector */}
          <TouchableOpacity
            style={styles.selectorCard}
            onPress={() => setShowSignModal(true)}
          >
            <View style={styles.selectorContent}>
              <Text style={styles.selectorLabel}>Zodiac Sign</Text>
              <View style={styles.selectorMainContent}>
                <View style={styles.selectorValue}>
                  <Text style={styles.signSymbolLarge}>{selectedSign.symbol}</Text>
                  <Text style={styles.selectorText}>{selectedSign.name}</Text>
                </View>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {/* Day Selector */}
          <TouchableOpacity
            style={styles.selectorCard}
            onPress={() => setShowDayModal(true)}
          >
            <View style={styles.selectorContent}>
              <Text style={styles.selectorLabel}>Day</Text>
              <View style={styles.selectorMainContent}>
                <Text style={styles.selectorText}>{selectedDay.name}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Horoscope Content */}
        <View style={styles.horoscopeContainer}>
          <View style={styles.horoscopeCard}>
            <View style={styles.horoscopeHeader}>
              <Text style={styles.horoscopeTitle}>
                {selectedSign.name} - {selectedDay.name}
              </Text>
              <Text style={styles.horoscopeDate}>
                {getDisplayDate(selectedDay.key)}
              </Text>
            </View>

            <View style={styles.horoscopeContent}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Loading your horoscope...</Text>
                </View>
              ) : horoscopeData?.error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="warning-outline" size={48} color="#FFD700" />
                  <Text style={styles.errorText}>{horoscopeData.errorMessage}</Text>
                  {horoscopeData.fallbackMessage && (
                    <View style={styles.fallbackContainer}>
                      <Text style={styles.fallbackLabel}>General Guidance:</Text>
                      <Text style={styles.fallbackText}>{horoscopeData.fallbackMessage}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchHoroscope}
                  >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.horoscopeTextContainer}>
                  {horoscopeData?.fallbackUsed && (
                    <View style={styles.fallbackNoticeContainer}>
                      <Ionicons name="information-circle-outline" size={20} color="#F97316" />
                      <Text style={styles.fallbackNoticeText}>
                        {horoscopeData.fallbackMessage}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.horoscopeText}>
                    {horoscopeData?.horoscope || 'No horoscope available'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Zodiac Sign Selection Modal */}
      <Modal
        visible={showSignModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Zodiac Sign</Text>
              <TouchableOpacity
                onPress={() => setShowSignModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ZODIAC_SIGNS}
              renderItem={renderZodiacSignItem}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Day Selection Modal */}
      <Modal
        visible={showDayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Day</Text>
              <TouchableOpacity
                onPress={() => setShowDayModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DAY_OPTIONS}
              renderItem={renderDayItem}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
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
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selectorCard: {
    flex: 0.48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
    height: 96,
  },
  selectorContent: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    flex: 1,
  },
  selectorMainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signSymbolLarge: {
    fontSize: 24,
    marginRight: 8,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  horoscopeContainer: {
    marginBottom: 20,
  },
  horoscopeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  horoscopeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  horoscopeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  horoscopeDate: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  horoscopeContent: {
    minHeight: 200,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 15,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  fallbackContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  fallbackLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  horoscopeTextContainer: {
    alignItems: 'center',
  },
  horoscopeText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 15,
  },
  fallbackNoticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#F97316',
  },
  fallbackNoticeText: {
    fontSize: 14,
    color: '#F97316',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  refreshButton: {
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  refreshGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 25,
  },
  refreshText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  rotating: {
    transform: [{ rotate: '180deg' }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  signItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signSymbol: {
    fontSize: 24,
    marginRight: 15,
  },
  signTextContainer: {
    flex: 1,
  },
  signName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 12,
  },
  signDates: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 12,
    marginTop: 2,
  },
  dayItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
});

export default DailyHoroscopeScreen;
