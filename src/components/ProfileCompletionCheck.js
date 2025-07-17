import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const ProfileCompletionCheck = ({ children }) => {
  const { user, isProfileComplete } = useAuth();
  const navigation = useNavigation();
  const [hasChecked, setHasChecked] = useState(false);

  // Use useFocusEffect to check profile completion when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Add a small delay to ensure all contexts are properly initialized
      const checkProfile = () => {
        if (user && !hasChecked) {
          console.log('Checking profile completion for user:', user.name || user.mobile);
          
          if (!isProfileComplete()) {
            console.log('Profile incomplete, redirecting to AddUserProfile');
            setHasChecked(true);
            
            // Use setTimeout to ensure navigation happens after current render cycle
            setTimeout(() => {
              navigation.navigate('AddUserProfile', { isRequired: true });
            }, 100);
          } else {
            console.log('Profile is complete');
            setHasChecked(true);
          }
        }
      };

      // Add a small delay to ensure socket and other contexts are initialized
      const timer = setTimeout(checkProfile, 500);
      
      return () => {
        clearTimeout(timer);
      };
    }, [user, isProfileComplete, navigation, hasChecked])
  );

  // Reset hasChecked when user changes (logout/login)
  useEffect(() => {
    setHasChecked(false);
  }, [user?.mobile]); // Use mobile as unique identifier

  // Always render children - the navigation will handle the redirect
  return children;
};

export default ProfileCompletionCheck;
