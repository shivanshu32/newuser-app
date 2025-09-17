import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import prepaidOffersAPI from '../services/prepaidOffersAPI';

const PrepaidOfferCard = ({ offer, onOfferUsed, onRefresh }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleProceedToPay = () => {
    if (offer.offerPaid) {
      // Already paid, show start chat option
      handleStartChat();
    } else {
      // Navigate to payment screen
      navigation.navigate('PrepaidOfferPayment', { offerId: offer.offerId });
    }
  };

  const handleStartChat = async () => {
    if (!offer.isAvailableToUse) {
      Alert.alert('Error', 'This offer is not available to use');
      return;
    }

    setLoading(true);
    try {
      const response = await prepaidOffersAPI.startPrepaidChat(offer.offerId);
      
      if (response.success) {
        // Navigate to chat screen with session details
        navigation.navigate('EnhancedChat', {
          sessionId: response.data.sessionId,
          astrologer: response.data.astrologer,
          sessionType: 'prepaid_offer',
          duration: response.data.duration * 60, // Convert to seconds
          isPrepaid: true
        });
        
        // Refresh offers to remove used offer
        if (onOfferUsed) {
          onOfferUsed();
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to start chat session');
      }
    } catch (error) {
      console.error('Error starting offer chat:', error);
      Alert.alert('Error', 'Failed to start offer chat session');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOffer = async () => {
    Alert.alert(
      'Remove Offer',
      'Are you sure you want to remove this offer? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await prepaidOffersAPI.expireOffer(offer.offerId);
              onRefresh && onRefresh();
            } catch (error) {
              console.error('Error removing offer:', error);
              Alert.alert('Error', 'Failed to remove offer');
            }
          }
        }
      ]
    );
  };

  const getTimeRemaining = () => {
    const now = new Date();
    const expiresAt = new Date(offer.expiresAt);
    const diffMs = expiresAt - now;
    
    if (diffMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  const getButtonText = () => {
    if (loading) return 'Starting...';
    if (offer.offerPaid && offer.isAvailableToUse) return 'Start Offer Chat';
    if (offer.offerPaid) return 'Paid';
    return 'Proceed to Pay';
  };

  const getButtonStyle = () => {
    if (loading) return [styles.actionButton, styles.loadingButton];
    if (offer.offerPaid && offer.isAvailableToUse) return [styles.actionButton, styles.startChatButton];
    if (offer.offerPaid) return [styles.actionButton, styles.paidButton];
    return [styles.actionButton, styles.payButton];
  };

  return (
    <View style={styles.container}>
      {/* Header with Fire Icon */}
      <View style={styles.header}>
        <View style={styles.offerBadge}>
          <Icon name="local-fire-department" size={20} color="#FF6B35" />
          <Text style={styles.offerBadgeText}>Special Offer</Text>
        </View>
        <TouchableOpacity onPress={handleRemoveOffer} style={styles.closeButton}>
          <Icon name="close" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Astrologer Info */}
      <View style={styles.astrologerSection}>
        <Image 
          source={{ 
            uri: offer.astrologer?.profileImage || 'https://via.placeholder.com/50x50' 
          }}
          style={styles.astrologerImage}
        />
        <View style={styles.astrologerInfo}>
          <Text style={styles.astrologerName}>{offer.astrologer?.name}</Text>
          <View style={styles.astrologerMeta}>
            {offer.astrologer?.averageRating && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size={14} color="#FFD700" />
                <Text style={styles.rating}>{offer.astrologer.averageRating}</Text>
              </View>
            )}
            {offer.astrologer?.specializations && (
              <Text style={styles.specializations}>
                {offer.astrologer.specializations.slice(0, 2).join(', ')}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Offer Details */}
      <View style={styles.offerDetails}>
        <Text style={styles.offerTitle}>Continue chat for 5 minutes</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>Just ₹{offer.basePrice}</Text>
          <Text style={styles.gstText}>(GST extra)</Text>
        </View>
        
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <Icon name="schedule" size={16} color="#4CAF50" />
            <Text style={styles.benefitText}>{offer.durationMinutes} minutes</Text>
          </View>
          <View style={styles.benefitItem}>
            <Icon name="flash-on" size={16} color="#4CAF50" />
            <Text style={styles.benefitText}>Instant start</Text>
          </View>
        </View>
      </View>

      {/* Time Remaining */}
      <View style={styles.timeContainer}>
        <Icon name="access-time" size={16} color="#FF6B35" />
        <Text style={styles.timeText}>{getTimeRemaining()}</Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity 
        style={getButtonStyle()}
        onPress={handleProceedToPay}
        disabled={loading || (offer.offerPaid && !offer.isAvailableToUse)}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.actionButtonText}>{getButtonText()}</Text>
        )}
      </TouchableOpacity>

      {/* Payment Status Indicator */}
      {offer.offerPaid && (
        <View style={styles.statusContainer}>
          <Icon name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.statusText}>
            {offer.isAvailableToUse ? 'Ready to start' : 'Payment completed'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  offerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 4,
  },
  closeButton: {
    padding: 4,
  },
  astrologerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  astrologerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  astrologerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  astrologerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  specializations: {
    fontSize: 12,
    color: '#666',
  },
  offerDetails: {
    marginBottom: 12,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 6,
  },
  gstText: {
    fontSize: 12,
    color: '#666',
  },
  benefitsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    marginLeft: 4,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButton: {
    backgroundColor: '#FF6B35',
  },
  startChatButton: {
    backgroundColor: '#4CAF50',
  },
  paidButton: {
    backgroundColor: '#9E9E9E',
  },
  loadingButton: {
    backgroundColor: '#CCC',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default PrepaidOfferCard;
