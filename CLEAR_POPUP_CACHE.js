/**
 * TEMPORARY UTILITY - Clear Seen Popups Cache
 * 
 * Add this code temporarily to HomeScreen.js to force popup to show again
 * Remove after testing is complete
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

// Option 1: Add this useEffect to HomeScreen component
const clearSeenPopupsEffect = () => {
  useEffect(() => {
    // TEMPORARY: Clear seen popups for testing
    AsyncStorage.removeItem('seenPopups').then(() => {
      console.log('🗑️ [DEBUG] Cleared seen popups cache');
    });
  }, []);
};

// Option 2: Call this function manually from console
export const clearSeenPopups = async () => {
  try {
    await AsyncStorage.removeItem('seenPopups');
    console.log('✅ Cleared seen popups cache');
    return true;
  } catch (error) {
    console.error('❌ Error clearing seen popups:', error);
    return false;
  }
};

// Option 3: View current seen popups
export const viewSeenPopups = async () => {
  try {
    const seenPopups = await AsyncStorage.getItem('seenPopups');
    const seenPopupIds = seenPopups ? JSON.parse(seenPopups) : [];
    console.log('👁️ Currently seen popup IDs:', seenPopupIds);
    return seenPopupIds;
  } catch (error) {
    console.error('❌ Error viewing seen popups:', error);
    return [];
  }
};

/**
 * HOW TO USE:
 * 
 * 1. TEMPORARY CODE IN HomeScreen.js:
 *    Add this at the top of HomeScreen component:
 * 
 *    useEffect(() => {
 *      AsyncStorage.removeItem('seenPopups').then(() => {
 *        console.log('🗑️ Cleared seen popups');
 *      });
 *    }, []);
 * 
 * 2. FROM CONSOLE (React Native Debugger):
 *    AsyncStorage.removeItem('seenPopups')
 * 
 * 3. REINSTALL APP:
 *    Uninstall and reinstall the app to clear all AsyncStorage
 */
