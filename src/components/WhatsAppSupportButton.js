import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const WhatsAppSupportButton = ({ 
  style,
  size = 56,
  iconSize = 28,
  position = 'bottom-right',
  message = 'Hi, I need help with JyotishCall app.',
}) => {
  const phoneNumber = '919755824884'; // WhatsApp support number

  const handleWhatsAppSupport = async () => {
    try {
      // Try WhatsApp first
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp if app is not installed
        const webWhatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webWhatsappUrl);
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert(
        'WhatsApp Support',
        `Unable to open WhatsApp. Please contact support at: +91 9755824884`,
        [
          {
            text: 'Copy Number',
            onPress: () => {
              Alert.alert('Support Number', '+91 9755824884\n(WhatsApp Only)');
            }
          },
          { text: 'OK' }
        ]
      );
    }
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute',
      zIndex: 1000,
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyle, bottom: 20, right: 20 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 20, left: 20 };
      case 'top-right':
        return { ...baseStyle, top: 60, right: 20 };
      case 'top-left':
        return { ...baseStyle, top: 60, left: 20 };
      default:
        return { ...baseStyle, bottom: 20, right: 20 };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.floatingButton,
        getPositionStyle(),
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      onPress={handleWhatsAppSupport}
      activeOpacity={0.8}
    >
      <Ionicons name="logo-whatsapp" size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});

export default WhatsAppSupportButton;
