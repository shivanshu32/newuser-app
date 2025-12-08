import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { homePopupAPI } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HomePopup = ({ navigation, visible, onClose }) => {
  const [popup, setPopup] = useState(null);
  const [loading, setLoading] = useState(true);

  const trackInteraction = useCallback(async (popupId, action) => {
    try {
      await homePopupAPI.trackInteraction(popupId, action);
      console.log(`✅ [HOME_POPUP] Tracked ${action} for popup:`, popupId);
    } catch (error) {
      console.error(`❌ [HOME_POPUP] Error tracking ${action}:`, error);
    }
  }, []);

  const fetchActivePopup = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 [HOME_POPUP] Fetching active popup...');
      
      const response = await homePopupAPI.getActivePopup();
      console.log('📥 [HOME_POPUP] API Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const popupData = response.data;
        console.log('✅ [HOME_POPUP] Active popup found:', popupData.title);
        
        // Check if user has already seen this popup
        const seenPopups = await AsyncStorage.getItem('seenPopups');
        const seenPopupIds = seenPopups ? JSON.parse(seenPopups) : [];
        console.log('👁️ [HOME_POPUP] Previously seen popups:', seenPopupIds);
        
        if (!seenPopupIds.includes(popupData._id)) {
          console.log('🆕 [HOME_POPUP] New popup - will display');
          setPopup(popupData);
          // Track view
          trackInteraction(popupData._id, 'view');
          
          // Mark as seen
          seenPopupIds.push(popupData._id);
          await AsyncStorage.setItem('seenPopups', JSON.stringify(seenPopupIds));
        } else {
          console.log('⏭️ [HOME_POPUP] Popup already seen - skipping');
          onClose();
        }
      } else {
        console.log('ℹ️ [HOME_POPUP] No active popup available');
        onClose();
      }
    } catch (error) {
      console.error('❌ [HOME_POPUP] Error fetching popup:', error);
      console.error('❌ [HOME_POPUP] Error details:', error.message);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose, trackInteraction]);

  useEffect(() => {
    if (visible) {
      fetchActivePopup();
    }
  }, [visible, fetchActivePopup]);

  const handleDismiss = () => {
    if (popup) {
      trackInteraction(popup._id, 'dismiss');
    }
    onClose();
  };

  const handlePopupClick = async () => {
    if (!popup) return;

    // Track click
    trackInteraction(popup._id, 'click');

    // Handle different link types
    switch (popup.linkType) {
      case 'none':
        // Just dismiss
        handleDismiss();
        break;

      case 'screen':
        // Navigate to screen
        onClose();
        if (popup.linkValue && navigation) {
          try {
            navigation.navigate(popup.linkValue);
          } catch (error) {
            console.error('❌ [HOME_POPUP] Navigation error:', error);
            Alert.alert('Error', 'Could not navigate to the specified screen');
          }
        }
        break;

      case 'url':
        // Open external URL
        if (popup.linkValue) {
          try {
            const supported = await Linking.canOpenURL(popup.linkValue);
            if (supported) {
              await Linking.openURL(popup.linkValue);
            } else {
              Alert.alert('Error', 'Cannot open this URL');
            }
          } catch (error) {
            console.error('❌ [HOME_POPUP] URL open error:', error);
            Alert.alert('Error', 'Could not open the URL');
          }
        }
        handleDismiss();
        break;

      case 'offer':
        // Navigate to offer details
        onClose();
        if (popup.linkValue && navigation) {
          navigation.navigate('PrepaidOfferDetails', { offerId: popup.linkValue });
        }
        break;

      case 'astrologer':
        // Navigate to astrologer profile
        onClose();
        if (popup.linkValue && navigation) {
          navigation.navigate('AstrologerProfile', { astrologerId: popup.linkValue });
        }
        break;

      case 'recharge':
        // Navigate to wallet recharge
        onClose();
        if (navigation) {
          navigation.navigate('Wallet');
        }
        break;

      default:
        handleDismiss();
    }
  };

  if (!visible || !popup || loading) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button - More Visible */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons name="close" size={24} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Card Container */}
          <View style={styles.card}>
            {/* Popup Image */}
            <TouchableOpacity
              onPress={handlePopupClick}
              activeOpacity={popup.linkType === 'none' ? 1 : 0.8}
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: popup.imageUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 450,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -15,
    right: -15,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 1, // Match the 3:1 aspect ratio of the image
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
    aspectRatio: 3 / 1,
  },
  titleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HomePopup;
