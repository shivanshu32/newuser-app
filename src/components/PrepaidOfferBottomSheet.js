import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import prepaidOffersAPI from '../services/prepaidOffersAPI';

const { height: screenHeight } = Dimensions.get('window');

const PrepaidOfferBottomSheet = ({ 
  visible, 
  onClose, 
  astrologer, 
  originalSessionId,
  onOfferCreated 
}) => {
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleProceedToPay = async () => {
    if (!astrologer?.id || !originalSessionId) {
      Alert.alert('Error', 'Missing required information to create offer');
      return;
    }

    setLoading(true);
    try {
      const response = await prepaidOffersAPI.createOffer(astrologer.id, originalSessionId);
      
      if (response.success) {
        onOfferCreated && onOfferCreated(response.data);
        onClose();
      } else {
        Alert.alert('Error', response.message || 'Failed to create offer');
      }
    } catch (error) {
      console.error('Error creating prepaid offer:', error);
      Alert.alert(
        'Error', 
        error.response?.data?.message || 'Failed to create offer. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Handle Bar */}
          <View style={styles.handleBar} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Continue Chat with {astrologer?.name || 'Astrologer'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Astrologer Info */}
          <View style={styles.astrologerInfo}>
            <Image 
              source={{ 
                uri: astrologer?.profileImage || 'https://via.placeholder.com/60x60' 
              }}
              style={styles.astrologerImage}
            />
            <View style={styles.astrologerDetails}>
              <Text style={styles.astrologerName}>{astrologer?.name}</Text>
              {astrologer?.specializations && (
                <Text style={styles.specializations}>
                  {astrologer.specializations.slice(0, 2).join(', ')}
                </Text>
              )}
            </View>
          </View>

          {/* Offer Details */}
          <View style={styles.offerContainer}>
            <View style={styles.offerHeader}>
              <Icon name="local-fire-department" size={24} color="#FF6B35" />
              <Text style={styles.offerTitle}>Special One-Time Offer!</Text>
            </View>
            
            <Text style={styles.offerDescription}>
              Get 5 more minutes of personalized guidance
            </Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Just</Text>
              <Text style={styles.price}>₹25</Text>
              <Text style={styles.gstNote}>(GST extra)</Text>
            </View>

            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.benefitText}>5 minutes of chat</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.benefitText}>Same astrologer</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <Text style={styles.benefitText}>Instant start</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.proceedButton, loading && styles.disabledButton]} 
              onPress={handleProceedToPay}
              disabled={loading}
            >
              <Text style={styles.proceedButtonText}>
                {loading ? 'Creating...' : 'Proceed to Pay'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            This is a one-time offer valid for 24 hours
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: screenHeight * 0.8,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  astrologerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  astrologerDetails: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  specializations: {
    fontSize: 14,
    color: '#666',
  },
  offerContainer: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  offerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginLeft: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  priceLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 8,
  },
  gstNote: {
    fontSize: 12,
    color: '#666',
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  proceedButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  proceedButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PrepaidOfferBottomSheet;
