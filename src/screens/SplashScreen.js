import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Wait a bit for splash effect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      
      if (hasSeenOnboarding === 'true') {
        // User has seen onboarding, go to login
        navigation.replace('Login');
      } else {
        // First time user, show onboarding
        navigation.replace('Onboarding');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // On error, show onboarding to be safe
      navigation.replace('Onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradientPrimary}
        style={styles.gradient}
      >
        <ActivityIndicator size="large" color={colors.textInverse} />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SplashScreen;
