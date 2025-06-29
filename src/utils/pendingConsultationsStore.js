import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistent store to manage pending consultations using AsyncStorage
 * This allows us to track consultations that have been accepted but not yet joined
 */

const STORAGE_KEY = 'pending_consultations';

// Helper function to get consultations from AsyncStorage
const getStoredConsultations = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const consultations = stored ? JSON.parse(stored) : [];
    console.log(' [PENDING-STORE] Retrieved from AsyncStorage:', consultations.length, 'consultations');
    return consultations;
  } catch (error) {
    console.error(' [PENDING-STORE] Error reading from AsyncStorage:', error);
    return [];
  }
};

// Helper function to save consultations to AsyncStorage
const saveConsultations = async (consultations) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(consultations));
    console.log(' [PENDING-STORE] Saved to AsyncStorage:', consultations.length, 'consultations');
    return true;
  } catch (error) {
    console.error(' [PENDING-STORE] Error saving to AsyncStorage:', error);
    return false;
  }
};

// Add a consultation to the store
export const addPendingConsultation = async (consultation) => {
  try {
    console.log(' [PENDING-STORE] addPendingConsultation called with:', {
      bookingId: consultation.booking?._id,
      hasAstrologer: !!consultation.astrologer,
      hasBooking: !!consultation.booking,
      topLevelKeys: Object.keys(consultation),
      fullData: JSON.stringify(consultation, null, 2)
    });
    
    const consultations = await getStoredConsultations();
    
    // Check if this consultation already exists
    const exists = consultations.some(c => c.booking._id === consultation.booking._id);
    
    if (!exists) {
      console.log(' [PENDING-STORE] Adding pending consultation to store:', consultation.booking._id);
      console.log(' [PENDING-STORE] Consultation data:', {
        bookingId: consultation.booking._id,
        astrologerName: consultation.astrologer?.displayName || consultation.booking.astrologer?.displayName,
        consultationType: consultation.booking.type,
        sessionId: consultation.sessionId,
        roomId: consultation.roomId
      });
      
      consultations.push(consultation);
      const saved = await saveConsultations(consultations);
      
      if (saved) {
        console.log(' [PENDING-STORE] Total pending consultations:', consultations.length);
        return true;
      } else {
        console.error(' [PENDING-STORE] Failed to save consultation to storage');
        return false;
      }
    } else {
      console.log(' [PENDING-STORE] Consultation already exists in store:', consultation.booking._id);
      return false;
    }
  } catch (error) {
    console.error(' [PENDING-STORE] Error adding consultation:', error);
    return false;
  }
};

// Remove a consultation from the store
export const removePendingConsultation = async (bookingId) => {
  try {
    const consultations = await getStoredConsultations();
    const initialLength = consultations.length;
    const index = consultations.findIndex(c => c.booking._id === bookingId);
    
    if (index !== -1) {
      consultations.splice(index, 1);
      const saved = await saveConsultations(consultations);
      
      if (saved) {
        console.log(' [PENDING-STORE] Removed pending consultation from store:', bookingId);
        console.log(' [PENDING-STORE] Remaining consultations:', consultations.length);
        return true;
      } else {
        console.error(' [PENDING-STORE] Failed to save after removal');
        return false;
      }
    } else {
      console.log(' [PENDING-STORE] Consultation not found for removal:', bookingId);
      return false;
    }
  } catch (error) {
    console.error(' [PENDING-STORE] Error removing consultation:', error);
    return false;
  }
};

// Get all pending consultations
export const getPendingConsultations = async () => {
  try {
    const consultations = await getStoredConsultations();
    console.log(' [PENDING-STORE] Getting pending consultations, count:', consultations.length);
    return consultations;
  } catch (error) {
    console.error(' [PENDING-STORE] Error getting consultations:', error);
    return [];
  }
};

// Check if there are any pending consultations
export const hasPendingConsultations = async () => {
  try {
    const consultations = await getStoredConsultations();
    return consultations.length > 0;
  } catch (error) {
    console.error(' [PENDING-STORE] Error checking pending consultations:', error);
    return false;
  }
};

// Get count of pending consultations
export const getPendingConsultationsCount = async () => {
  try {
    const consultations = await getStoredConsultations();
    return consultations.length;
  } catch (error) {
    console.error(' [PENDING-STORE] Error getting consultations count:', error);
    return 0;
  }
};

// Clear all pending consultations (useful for debugging)
export const clearAllPendingConsultations = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log(' [PENDING-STORE] Cleared all pending consultations');
    return true;
  } catch (error) {
    console.error(' [PENDING-STORE] Error clearing consultations:', error);
    return false;
  }
};

// Debug function to manually inspect AsyncStorage contents for troubleshooting
export const debugAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    console.log(' [PENDING-STORE] AsyncStorage contents:');
    values.forEach((value, index) => {
      console.log(`  ${keys[index]}: ${value[1]}`);
    });
  } catch (error) {
    console.error(' [PENDING-STORE] Error debugging AsyncStorage:', error);
  }
};
