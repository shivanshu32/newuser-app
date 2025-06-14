import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Create context
const AuthContext = createContext();

// API URL
const API_URL = 'http://localhost:5000/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
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
      }
    };

    loadStoredData();
  }, []);

  // Request OTP
  const requestOtp = async (phoneNumber) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call backend API to request OTP
      const response = await axios.post(`${API_URL}/auth/request-otp`, { phoneNumber, role: 'user' });
      
      if (response.data.success) {
        setLoading(false);
        return { success: true, message: 'OTP sent successfully' };
      } else {
        setLoading(false);
        setError(response.data.message || 'Failed to send OTP');
        return { success: false, message: response.data.message || 'Failed to send OTP' };
      }
    } catch (error) {
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
      const response = await axios.post(`${API_URL}/auth/verify-otp`, { phoneNumber, otp, role: 'user' });
      
      if (response.data.success) {
        // Get user data and token from response
        const userData = response.data.user;
        const authToken = response.data.token;
        
        // Store user data and token
        await AsyncStorage.setItem('userToken', authToken);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setToken(authToken);
        
        // Set axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        
        setLoading(false);
        return { success: true, user: userData, token: authToken };
      } else {
        setLoading(false);
        setError(response.data.message || 'Failed to verify OTP');
        return { success: false, message: response.data.message || 'Failed to verify OTP' };
      }
      setLoading(false);
      return { success: false, message: error.response?.data?.message || 'Failed to verify OTP' };
    } catch (error) {
      setLoading(false);
      setError(error.response?.data?.message || 'Failed to verify OTP');
      return { success: false, message: error.response?.data?.message || 'Failed to verify OTP' };
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
        error,
        isLoggedIn: !!token,
        requestOtp,
        verifyOtp,
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
