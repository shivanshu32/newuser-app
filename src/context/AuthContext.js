import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';
import { walletAPI } from '../services/api';
import analyticsService from '../services/analyticsService';
import facebookTrackingService from '../services/facebookTrackingService';
// import LogRocket from '@logrocket/react-native'; // Temporarily disabled due to build issues

// Create context
const AuthContext = createContext();

// API URL Configuration - Comment/Uncomment as needed
// Local Development
// const API_URL = 'http://192.168.29.107:5000/api/v1';

// Production
//const API_URL = 'http://3.110.171.85/api/v1';

const API_URL = 'https://jyotishcallbackend-2uxrv.ondigitalocean.app/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false); // For API operations
  const [initialLoading, setInitialLoading] = useState(true); // For initial auth check
  const [error, setError] = useState(null);

  // Check if user is logged in on app start (crash-safe)
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        console.log('🔐 [AuthContext] Loading stored authentication data...');
        
        // Wrap AsyncStorage calls in try-catch to prevent crashes
        let storedToken, storedUser;
        try {
          storedToken = await AsyncStorage.getItem('userToken');
          storedUser = await AsyncStorage.getItem('userData');
        } catch (storageError) {
          console.error('🚨 [AuthContext] AsyncStorage read failed:', storageError);
          // Continue with null values - don't crash
          storedToken = null;
          storedUser = null;
        }
        
        if (storedToken && storedUser) {
          // Validate and parse user data safely
          let parsedUser;
          try {
            parsedUser = JSON.parse(storedUser);
            
            // Validate user data structure
            if (!parsedUser || typeof parsedUser !== 'object') {
              throw new Error('Invalid user data structure');
            }
            
            // Validate required user fields
            if (!parsedUser._id && !parsedUser.id) {
              throw new Error('User data missing required ID field');
            }
            
          } catch (parseError) {
            console.error('🚨 [AuthContext] Corrupted user data detected:', parseError);
            console.log('🧹 [AuthContext] Clearing corrupted storage data...');
            
            // Clear corrupted data safely
            try {
              await AsyncStorage.multiRemove(['userToken', 'userData']);
              console.log('✅ [AuthContext] Corrupted data cleared successfully');
            } catch (clearError) {
              console.error('❌ [AuthContext] Failed to clear corrupted data:', clearError);
              // Try individual removal as fallback
              try {
                await AsyncStorage.removeItem('userToken');
                await AsyncStorage.removeItem('userData');
              } catch (individualError) {
                console.error('❌ [AuthContext] Individual clear failed:', individualError);
                // Continue anyway - don't crash the app
              }
            }
            
            // Don't proceed with corrupted data
            return;
          }
          
          // Validate token format (basic check)
          if (typeof storedToken !== 'string' || storedToken.length < 10) {
            console.error('🚨 [AuthContext] Invalid token format detected');
            try {
              await AsyncStorage.multiRemove(['userToken', 'userData']);
            } catch (clearError) {
              console.error('❌ [AuthContext] Failed to clear invalid token:', clearError);
            }
            return;
          }
          
          console.log('✅ [AuthContext] Valid auth data found, restoring session...');
          
          setToken(storedToken);
          setUser(parsedUser);
          
          // Identify user with LogRocket (crash-safe)
          try {
            identifyUserToLogRocket(parsedUser);
          } catch (logRocketError) {
            console.warn('LogRocket identification failed:', logRocketError);
          }
          
          // Set axios default header safely
          try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          } catch (axiosError) {
            console.error('Axios header setup failed:', axiosError);
          }
          
          console.log('✅ [AuthContext] User session restored successfully');
        } else {
          console.log('ℹ️ [AuthContext] No stored auth data found - fresh start');
        }
      } catch (error) {
        console.error('🚨 [AuthContext] Critical error loading auth data:', error);
        
        // Attempt to clear potentially corrupted data (with additional safety)
        try {
          console.log('🧹 [AuthContext] Attempting to clear all auth data due to critical error...');
          await AsyncStorage.multiRemove(['userToken', 'userData']);
          console.log('✅ [AuthContext] Auth data cleared after critical error');
        } catch (clearError) {
          console.error('❌ [AuthContext] Failed to clear auth data after critical error:', clearError);
          // Try individual removal as fallback
          try {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            console.log('✅ [AuthContext] Auth data cleared individually after multiRemove failed');
          } catch (individualClearError) {
            console.error('❌ [AuthContext] Individual clear also failed:', individualClearError);
            // Continue anyway - don't crash the app
          }
        }
        
        // Reset axios headers to prevent issues (crash-safe)
        try {
          delete axios.defaults.headers.common['Authorization'];
        } catch (axiosError) {
          console.error('Axios header cleanup failed:', axiosError);
        }
        
      } finally {
        // Always set initialLoading to false when done
        console.log('✅ [AuthContext] Auth initialization complete');
        setInitialLoading(false);
      }
    };

    // Execute with additional crash protection
    try {
      loadStoredData();
    } catch (syncError) {
      console.error('🚨 [AuthContext] Synchronous error in loadStoredData setup:', syncError);
      setInitialLoading(false);
    }
  }, []);

  // Identify user to LogRocket safely
  const identifyUserToLogRocket = (user) => {
    try {
      if (false && __DEV__) { // Temporarily disabled
        // LogRocket.identify(user._id || user.id, {
        //   name: user.name,
        //   email: user.email,
        //   mobile: user.mobile,
        //   role: 'user'
        // });
        console.log('LogRocket identify disabled temporarily:', user._id || user.id);
      }
    } catch (error) {
      console.warn('LogRocket identify failed:', error);
    }
  };

  // Request OTP
  const requestOtp = async (phoneNumber) => {
    setLoading(true);
    setError(null);
    
    const requestUrl = `${API_URL}/auth/request-otp`;
    console.log('Making OTP request to:', requestUrl);
    console.log('Request payload:', { mobile: phoneNumber, role: 'user' });
    
    try {
      // Call backend API to request OTP
      const response = await axios.post(requestUrl, { mobile: phoneNumber, role: 'user' });
      
      console.log('OTP request response:', response.data);
      
      if (response.data.success) {
        // OTP sent via SMS - no longer displayed in app for security
        setLoading(false);
        return { success: true, message: response.data.message || 'OTP sent successfully to your mobile number' };
      } else {
        setLoading(false);
        setError(response.data.message || 'Failed to send OTP');
        console.log('OTP request failed:', response.data.message);
        return { success: false, message: response.data.message || 'Failed to send OTP' };
      }
    } catch (error) {
      console.log('OTP request error:', error);
      console.log('Error details:', error.response?.data || error.message);
      console.log('Error status:', error.response?.status);
      console.log('Error config:', error.config);
      console.log('Network error:', error.code);
      
      setLoading(false);
      
      // More detailed error message for debugging
      let errorMessage = 'Failed to send OTP';
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error - request was made but no response received
        errorMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Verify OTP
  const verifyOtp = async (phoneNumber, otp) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call backend API to verify OTP
      const response = await axios.post(`${API_URL}/auth/verify-otp`, { mobile: phoneNumber, otp, role: 'user' });
      
      if (response.data.success) {
        // Get user data and token from response
        const userData = response.data.data.user;
        const authToken = response.data.data.token;
        
        // Store user data and token
        try {
          await AsyncStorage.setItem('userToken', authToken);
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        } catch (storageError) {
          console.error('AsyncStorage error:', storageError);
        }
        
        // Update state
        setUser(userData);
        setToken(authToken);
        
        // Identify user with LogRocket
        identifyUserToLogRocket(userData);
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        
        // Track login success event for Firebase Analytics
        try {
          await analyticsService.trackLoginSuccess(userData._id || userData.id, 'phone');
          console.log('🔥 [AUTH] Login success event tracked for user:', userData._id || userData.id);
        } catch (analyticsError) {
          console.error('🔥 [AUTH] Failed to track login success:', analyticsError);
        }

        // Track user registration/login with Facebook SDK
        try {
          await facebookTrackingService.initialize();
          await facebookTrackingService.trackUserRegistration({
            id: userData._id || userData.id,
            name: userData.name,
            mobile: userData.mobile,
            createdAt: userData.createdAt
          });
          
          // Set user properties for better targeting
          await facebookTrackingService.setUserProperties({
            id: userData._id || userData.id,
            createdAt: userData.createdAt,
            walletBalance: userData.walletBalance || 0,
            totalConsultations: userData.totalConsultations || 0
          });

          console.log('📊 [FB-TRACKING] User registration/login tracked');
        } catch (fbError) {
          console.error('❌ [FB-TRACKING] Failed to track user registration:', fbError);
        }
        
        setLoading(false);
        return { success: true, user: userData, token: authToken };
      } else {
        setLoading(false);
        
        // Extract detailed error information
        const errorMessage = response.data.message || 'Failed to verify OTP';
        const errorDetails = response.data.error || {};
        
        // Set error with more context
        setError(errorMessage);
        
        // Return detailed error information to the component
        return { 
          success: false, 
          message: errorMessage,
          errorDetails: errorDetails,
          errorCode: errorDetails.reason || 'unknown_error'
        };
      }
    } catch (error) {
      console.error('Error in verifyOtp:', error);
      console.log('Error details:', error.response?.data || error.message);
      console.log('Error status:', error.response?.status);
      console.log('Error config:', error.config);
      console.log('Network error:', error.code);
      
      setLoading(false);
      
      // More detailed error message for debugging
      let errorMessage = 'Failed to verify OTP';
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Network error - request was made but no response received
        errorMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'Unknown error occurred';
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // Update user data
  const updateUser = async (userData) => {
    try {
      // Merge new data with existing user data
      const updatedUser = { ...user, ...userData };
      
      // Update state
      setUser(updatedUser);
      
      // Update AsyncStorage
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.log('Error updating user data:', error);
      return { success: false, message: 'Failed to update user data' };
    }
  };

  // Update wallet balance
  const updateWalletBalance = async () => {
    try {
      console.log('Updating wallet balance...');
      const response = await walletAPI.getBalance();
      
      if (response.success && response.data) {
        const walletBalance = response.data.balance;
        console.log('New wallet balance:', walletBalance);
        
        // Update user data with new wallet balance
        const updatedUser = { ...user, walletBalance };
        setUser(updatedUser);
        
        // Update AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        
        return { success: true, balance: walletBalance };
      } else {
        console.log('Failed to fetch wallet balance:', response);
        return { success: false, message: 'Failed to fetch wallet balance' };
      }
    } catch (error) {
      console.log('Error updating wallet balance:', error);
      return { success: false, message: 'Error updating wallet balance' };
    }
  };

  // Check if user profile is complete
  const isProfileComplete = () => {
    if (!user) return false;
    
    console.log('Checking profile completion for user:', user.name);
    console.log('User data:', {
      name: user.name,
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      birthLocation: user.birthLocation,
      gender: user.gender,
      isTimeOfBirthUnknown: user.isTimeOfBirthUnknown
    });
    
    // Core required fields that must always be present
    const coreRequiredFields = ['name', 'birthDate', 'birthLocation'];
    
    // Check core required fields
    const coreFieldsValid = coreRequiredFields.every(field => {
      const value = user[field];
      const isValid = value !== null && value !== undefined && value !== '';
      console.log(`Core field ${field}: ${value} - Valid: ${isValid}`);
      return isValid;
    });
    
    // Check birth time - either it should have a value OR isTimeOfBirthUnknown should be true
    const birthTimeValid = user.isTimeOfBirthUnknown === true || 
                          (user.birthTime !== null && user.birthTime !== undefined && user.birthTime !== '');
    
    // For gender, be flexible - if it's missing, consider profile complete for existing users
    // This handles backward compatibility for users who completed profile before gender was required
    const genderValid = user.gender !== null && user.gender !== undefined && user.gender !== '';
    
    console.log('Birth time validation:', {
      isTimeOfBirthUnknown: user.isTimeOfBirthUnknown,
      birthTime: user.birthTime,
      birthTimeValid: birthTimeValid
    });
    
    console.log('Gender validation:', {
      gender: user.gender,
      genderValid: genderValid
    });
    
    console.log('Core fields valid:', coreFieldsValid);
    console.log('Birth time valid:', birthTimeValid);
    
    // Profile is complete if core fields and birth time are valid
    // Gender is optional for backward compatibility
    const isComplete = coreFieldsValid && birthTimeValid;
    console.log('Profile complete:', isComplete);
    
    return isComplete;
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      console.log('🔄 [AUTH] Attempting to refresh token...');
      
      if (!token) {
        console.log('❌ [AUTH] No token available for refresh');
        return { success: false, message: 'No token available' };
      }
      
      // Call backend to refresh token
      const response = await axios.post(`${API_URL}/auth/refresh-token`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const newToken = response.data.data.token;
        const updatedUser = response.data.data.user || user;
        
        // Update stored token and user data
        await AsyncStorage.setItem('userToken', newToken);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
        
        // Update state
        setToken(newToken);
        setUser(updatedUser);
        
        // Update axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        console.log('✅ [AUTH] Token refreshed successfully');
        return { success: true, token: newToken, user: updatedUser };
      } else {
        console.log('❌ [AUTH] Token refresh failed:', response.data.message);
        return { success: false, message: response.data.message || 'Failed to refresh token' };
      }
    } catch (error) {
      console.log('❌ [AUTH] Token refresh error:', error.message);
      
      // If refresh fails due to invalid token, logout user
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('🔑 [AUTH] Token refresh failed with auth error, logging out user');
        await logout();
        return { success: false, message: 'Session expired, please login again', shouldLogout: true };
      }
      
      return { success: false, message: 'Failed to refresh token' };
    }
  };
  
  // Get valid token (refresh if needed)
  const getValidToken = async () => {
    try {
      if (!token) {
        return { success: false, message: 'No token available' };
      }
      
      // First try to use current token
      // If it fails with 401, we'll refresh it
      return { success: true, token };
    } catch (error) {
      console.log('❌ [AUTH] Error getting valid token:', error.message);
      return { success: false, message: 'Failed to get valid token' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Clear storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // Clear state
      setUser(null);
      setToken(null);
      
      // Clear LogRocket session
      try {
        console.log('LogRocket session URL before logout:', LogRocket.sessionURL);
      } catch (error) {
        console.warn('LogRocket session access failed:', error);
      }
      
      // Clear axios default header
      delete axios.defaults.headers.common['Authorization'];
      
      return { success: true };
    } catch (error) {
      console.log('Error during logout:', error);
      return { success: false, message: 'Failed to logout' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        initialLoading,
        error,
        isLoggedIn: !!token,
        requestOtp,
        verifyOtp,
        updateUser,
        updateWalletBalance,
        logout,
        refreshToken,
        getValidToken,
        isProfileComplete,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
