import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import APP_CONFIG from '../config/appConfig';
import versionService from '../services/versionService';

const UpdateScreen = ({ navigation, route }) => {
  const { currentVersion, latestVersion } = route.params || {};

  useEffect(() => {
    // Prevent back navigation
    const backAction = () => {
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const handleUpdatePress = async () => {
    Alert.alert(
      'Update App',
      'You will be redirected to the app store to update the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            console.log('🔄 Opening store for update...');
            
            // Use centralized version service with robust fallback handling
            // This will try multiple store URLs and provide user-friendly fallbacks
            const success = await versionService.openStore();
            
            if (!success) {
              console.log('⚠️ All store URLs failed, fallback handling already shown to user');
              // The versionService.openStore() method already handles all fallbacks
              // and shows appropriate user prompts, so no additional error handling needed
            } else {
              console.log('✅ Successfully opened store for update');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="refresh-circle" size={100} color="#4CAF50" />
        </View>
        
        <Text style={styles.title}>Update Required</Text>
        
        <Text style={styles.subtitle}>
          A new version of the app is available with important updates and improvements.
        </Text>
        
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            Current Version: <Text style={styles.versionNumber}>{currentVersion}</Text>
          </Text>
          <Text style={styles.versionText}>
            Latest Version: <Text style={styles.versionNumber}>{latestVersion}</Text>
          </Text>
        </View>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What's New:</Text>
          <Text style={styles.featureItem}>• Bug fixes and performance improvements</Text>
          <Text style={styles.featureItem}>• Enhanced user experience</Text>
          <Text style={styles.featureItem}>• New features and functionality</Text>
          <Text style={styles.featureItem}>• Security enhancements</Text>
        </View>
        
        <TouchableOpacity style={styles.updateButton} onPress={handleUpdatePress}>
          <Ionicons name="download" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          Please update to continue using the app
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  versionContainer: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  versionText: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 5,
  },
  versionNumber: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  featuresContainer: {
    backgroundColor: '#2a2a3e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 40,
    width: '100%',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  featureItem: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
    lineHeight: 20,
  },
  updateButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonIcon: {
    marginRight: 10,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UpdateScreen;
