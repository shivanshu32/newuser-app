import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Alert } from 'react-native';

// Create context
const AuthContext = createContext();

// API URL Configuration - Comment/Uncomment as needed
// Local Development
// const API_URL = 'http://192.168.29.107:5000/api/v1';

// Production
const API_URL = 'http://3.110.171.85/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false); // For API operations
  const [initialLoading, setInitialLoading] = useState(true); // For initial auth check
  const [error, setError] = useState(null);

  // Check if user is logged in on app start
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUser = await AsyncStorage.getItem('userData');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch (error) {
        console.log('Error loading stored auth data:', error);
      } finally {
        // Always set initialLoading to false when done
        setInitialLoading(false);
      }
    };

    loadStoredData();
  }, []);

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
        // Display OTP in alert - Backend returns OTP in response.data.data.otp
        if (response.data.data && response.data.data.otp) {
          Alert.alert(
            'OTP Generated', 
            `Your OTP is: ${response.data.data.otp}`,
            [{ text: 'OK' }]
          );
        }
        
        setLoading(false);
        return { success: true, message: 'OTP sent successfully' };
      } else {
        setLoading(false);
        setError(response.data.message || 'Failed to send OTP');
        console.log('OTP request failed:', response.data.message);
        return { success: false, message: response.data.message || 'Failed to send OTP' };
      }
    } catch (error) {
      console.log('OTP request error:', error);
      console.log('Error details:', error.response?.data || error.message);
      setLoading(false);
      setError(error.response?.data?.message || 'Failed to send OTP');
      return { success: false, message: error.response?.data?.message || 'Failed to send OTP' };
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
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        
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
      setLoading(false);
      setError(error.response?.data?.message || 'Failed to verify OTP');
      return { success: false, message: error.response?.data?.message || 'Failed to verify OTP' };
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

  // Logout
  const logout = async () => {
    try {
      // Clear storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // Clear state
      setUser(null);
      setToken(null);
      
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
        logout,
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
