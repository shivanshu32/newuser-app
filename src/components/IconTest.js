import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartIcon from './SmartIcon';
import FallbackIcon from './FallbackIcon';

const IconTest = () => {
  const testIcons = [
    { name: 'home', label: 'Home' },
    { name: 'calendar', label: 'Calendar' },
    { name: 'wallet', label: 'Wallet' },
    { name: 'person', label: 'Person' },
    { name: 'send', label: 'Send' },
    { name: 'arrow-back', label: 'Back' },
  ];

  useEffect(() => {
    console.log('🔤 [IconTest] Component mounted');
    console.log('🔤 [IconTest] Testing multiple icon approaches');
    
    // Try to force icon font loading
    setTimeout(() => {
      console.log('🔤 [IconTest] Delayed check - icons should be loaded now');
    }, 2000);
  }, []);

  const handleRunFixScript = () => {
    console.log('📝 [IconTest] User should run: fix-icons.bat');
    alert('Please run the fix-icons.bat script from the user-app folder to fix icon loading issues.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Icon Test Component</Text>
      <Text style={styles.subtitle}>Testing multiple icon approaches...</Text>
      
      {/* Original Ionicons Test */}
      <Text style={styles.sectionTitle}>1. Original Ionicons:</Text>
      <View style={styles.iconGrid}>
        {testIcons.map((icon, index) => (
          <View key={`ionicons-${index}`} style={styles.iconItem}>
            <View style={styles.iconBox}>
              <Ionicons name={icon.name} size={24} color="#333" />
            </View>
            <Text style={styles.iconLabel}>{icon.label}</Text>
          </View>
        ))}
      </View>

      {/* Smart Icon Test */}
      <Text style={styles.sectionTitle}>2. Smart Icons (Auto-fallback):</Text>
      <View style={styles.iconGrid}>
        {testIcons.map((icon, index) => (
          <View key={`smart-${index}`} style={styles.iconItem}>
            <View style={styles.iconBox}>
              <SmartIcon name={icon.name} size={24} color="#333" />
            </View>
            <Text style={styles.iconLabel}>{icon.label}</Text>
          </View>
        ))}
      </View>

      {/* Fallback Icon Test */}
      <Text style={styles.sectionTitle}>3. Fallback Icons (Always work):</Text>
      <View style={styles.iconGrid}>
        {testIcons.map((icon, index) => (
          <View key={`fallback-${index}`} style={styles.iconItem}>
            <View style={styles.iconBox}>
              <FallbackIcon name={icon.name} size={24} color="#333" />
            </View>
            <Text style={styles.iconLabel}>{icon.label}</Text>
          </View>
        ))}
      </View>
      
      <Text style={styles.note}>
        ✅ If you see icons in any section: That approach works{'\n'}
        ❌ If you see empty boxes: That approach failed{'\n'}
        🎯 Use the working approach for your app
      </Text>
      
      <TouchableOpacity style={styles.fixButton} onPress={handleRunFixScript}>
        <Text style={styles.fixButtonText}>🔧 Run Icon Fix Script</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconItem: {
    alignItems: 'center',
    margin: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#333',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  fixButton: {
    backgroundColor: '#F97316',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  fixButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default IconTest;
