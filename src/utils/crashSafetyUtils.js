// Crash Safety Utilities for Production App Stability
// This module provides utilities to prevent common crash scenarios

/**
 * Safely execute async operations with timeout and error handling
 * @param {Function} asyncFn - The async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds (default: 5000)
 * @param {string} operationName - Name for logging purposes
 * @returns {Promise} - Resolves with result or safe fallback
 */
export const safeAsyncOperation = async (asyncFn, timeoutMs = 5000, operationName = 'operation') => {
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${operationName} timeout`)), timeoutMs);
    });

    const result = await Promise.race([
      asyncFn(),
      timeoutPromise
    ]);

    return { success: true, data: result };
  } catch (error) {
    console.warn(`🛡️ [CrashSafety] ${operationName} failed safely:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Safely parse JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} - Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return fallback;
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('🛡️ [CrashSafety] JSON parse failed safely:', error.message);
    return fallback;
  }
};

/**
 * Safely access AsyncStorage with error handling
 * @param {string} key - Storage key
 * @param {*} fallback - Fallback value
 * @returns {Promise} - Storage value or fallback
 */
export const safeStorageGet = async (key, fallback = null) => {
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const value = await AsyncStorage.getItem(key);
    return value !== null ? value : fallback;
  } catch (error) {
    console.warn(`🛡️ [CrashSafety] Storage get failed safely for key ${key}:`, error.message);
    return fallback;
  }
};

/**
 * Safely set AsyncStorage with error handling
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Promise<boolean>} - Success status
 */
export const safeStorageSet = async (key, value) => {
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`🛡️ [CrashSafety] Storage set failed safely for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Safely remove AsyncStorage items with error handling
 * @param {string|string[]} keys - Key or array of keys to remove
 * @returns {Promise<boolean>} - Success status
 */
export const safeStorageRemove = async (keys) => {
  try {
    const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
    if (Array.isArray(keys)) {
      await AsyncStorage.multiRemove(keys);
    } else {
      await AsyncStorage.removeItem(keys);
    }
    return true;
  } catch (error) {
    console.warn('🛡️ [CrashSafety] Storage remove failed safely:', error.message);
    return false;
  }
};

/**
 * Safely execute a function with error boundary
 * @param {Function} fn - Function to execute
 * @param {*} fallback - Fallback return value
 * @param {string} operationName - Name for logging
 * @returns {*} - Function result or fallback
 */
export const safeExecute = (fn, fallback = null, operationName = 'function') => {
  try {
    return fn();
  } catch (error) {
    console.warn(`🛡️ [CrashSafety] ${operationName} failed safely:`, error.message);
    return fallback;
  }
};

/**
 * Debounce function to prevent rapid successive calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memory usage monitor (development only)
 */
export const monitorMemoryUsage = () => {
  if (__DEV__) {
    const checkMemory = () => {
      if (global.performance && global.performance.memory) {
        const memory = global.performance.memory;
        console.log('🧠 [Memory] Used:', Math.round(memory.usedJSHeapSize / 1048576), 'MB');
        console.log('🧠 [Memory] Total:', Math.round(memory.totalJSHeapSize / 1048576), 'MB');
        console.log('🧠 [Memory] Limit:', Math.round(memory.jsHeapSizeLimit / 1048576), 'MB');
      }
    };
    
    // Check every 30 seconds in development
    setInterval(checkMemory, 30000);
    checkMemory(); // Initial check
  }
};

export default {
  safeAsyncOperation,
  safeJsonParse,
  safeStorageGet,
  safeStorageSet,
  safeStorageRemove,
  safeExecute,
  debounce,
  throttle,
  monitorMemoryUsage
};
