// Firebase configuration for Expo managed workflow
// Proper Firebase initialization for Analytics and other services
import { Platform } from 'react-native';

// Firebase configuration from Firebase Console
// This configuration is extracted from google-services.json and Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDM5_yykPFf7jgUia7jKpqjvXCdYWjuqzo",
  authDomain: "jyotish2-dd398.firebaseapp.com",
  projectId: "jyotish2-dd398",
  storageBucket: "jyotish2-dd398.firebasestorage.app",
  messagingSenderId: "225163383908",
  appId: "1:225163383908:android:401cf7f0a622281f083b71"
};

// Note: measurementId is optional for Firebase JS SDK in React Native
// Analytics will work without it for mobile apps

// Export configuration for use in analytics and other services
export { firebaseConfig };

// Helper function to check if Firebase is configured
export const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey && 
    firebaseConfig.projectId &&
    firebaseConfig.apiKey !== "your-api-key-here" &&
    firebaseConfig.projectId !== "your-project-id"
  );
};

// Validate Firebase configuration
export const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
  const missingFields = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('🔥 [FIREBASE] Missing required Firebase config fields:', missingFields);
    return false;
  }
  
  console.log('🔥 [FIREBASE] ✅ Firebase configuration is valid');
  return true;
};

// Get Firebase project info
export const getFirebaseProjectInfo = () => {
  return {
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    isConfigured: isFirebaseConfigured(),
    isValid: validateFirebaseConfig(),
    platform: Platform.OS
  };
};

// Log Firebase configuration status
console.log('🔥 [FIREBASE] Configuration loaded for project:', firebaseConfig.projectId);
console.log('🔥 [FIREBASE] Platform:', Platform.OS);
console.log('🔥 [FIREBASE] Configuration valid:', validateFirebaseConfig());
