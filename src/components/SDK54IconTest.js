import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SDK54IconTest = () => {
  const testIcons = [
    { name: 'home', label: 'Home' },
    { name: 'calendar', label: 'Calendar' },
    { name: 'wallet', label: 'Wallet' },
    { name: 'person', label: 'Person' },
    { name: 'send', label: 'Send' },
    { name: 'arrow-back', label: 'Back' },
    { name: 'star', label: 'Star' },
    { name: 'checkmark', label: 'Check' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 SDK 54 Icon Test</Text>
      <Text style={styles.subtitle}>Testing Ionicons with React 19.1 + Expo SDK 54</Text>
      
      <View style={styles.iconGrid}>
        {testIcons.map((icon, index) => (
          <View key={index} style={styles.iconItem}>
            <View style={styles.iconBox}>
              <Ionicons name={icon.name} size={24} color="#F97316" />
            </View>
            <Text style={styles.iconLabel}>{icon.label}</Text>
          </View>
        ))}
      </View>
      
      <Text style={styles.note}>
        ✅ If you see icons: SDK 54 upgrade successful!{'\n'}
        ❌ If you see empty boxes: Fallback to FallbackIcon system{'\n'}
        🎯 React 19.1 + Expo SDK 54 should fix icon loading
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#F97316',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
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
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F97316',
    marginBottom: 8,
  },
  iconLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
});

export default SDK54IconTest;
