import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import prepaidOffersAPI from '../services/prepaidOffersAPI';
import Text from './ui/Text';
import { colors, spacing, radius, shadows } from '../theme';
import { API_BASE } from '../services/api';

const PrepaidOfferCard = ({ offer, onOfferUsed, onRefresh }) => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleProceedToPay = () => {
    if (offer.isPaid) {
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
      console.log('🚀 [PREPAID_OFFER_CARD] Starting prepaid chat for offer:', offer.offerId);
      const response = await prepaidOffersAPI.startPrepaidChat(offer.offerId);
      console.log('✅ [PREPAID_OFFER_CARD] API response:', response);
      
      if (response.success) {
        // Navigate to waiting screen for astrologer acceptance
        navigation.navigate('BookingWaiting', {
          sessionId: response.data.sessionId,
          sessionIdentifier: response.data.sessionIdentifier,
          astrologer: response.data.astrologer,
          sessionType: 'prepaid_offer',
          duration: response.data.duration,
          totalAmount: response.data.totalAmount,
          isPrepaidOffer: true,
          bookingType: 'chat'
        });
        
        // Don't refresh offers yet - wait for astrologer acceptance
        // onOfferUsed will be called after successful session completion
      } else {
        Alert.alert('Error', response.message || 'Failed to start chat session');
      }
    } catch (error) {
      console.error('❌ [PREPAID_OFFER_CARD] Error starting offer chat:', error);
      console.error('❌ [PREPAID_OFFER_CARD] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // CRITICAL FIX: Extract error message from backend response
      const errorMessage = error.response?.data?.message || error.message || 'Failed to start offer chat session';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOffer = async () => {
    // Prevent removal of paid offers
    if (offer.isPaid) {
      Alert.alert(
        'Cannot Remove',
        'This offer has been paid for and cannot be removed. Please contact support if you need assistance.',
        [{ text: 'OK' }]
      );
      return;
    }

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
              const errorMessage = error.response?.data?.message || 'Failed to remove offer';
              Alert.alert('Error', errorMessage);
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

  const timeLeft = getTimeRemaining();
  const isReady = offer.isPaid && offer.isAvailableToUse;
  const isExpired = timeLeft === 'Expired';

  // Resolve astrologer image URL robustly
  const astrologer = offer?.astrologer || {};
  const baseHost = API_BASE?.replace('/api/v1', '') || '';
  const resolvedImage = (() => {
    const normalize = (u) => {
      if (!u) return null;
      if (typeof u !== 'string') return null;
      if (u.startsWith('http')) return u;
      if (u.startsWith('/')) return `${baseHost}${u}`;
      return `${baseHost}/${u}`;
    };
    // STRICT PRIORITY: imageUrl first
    if (typeof astrologer.imageUrl === 'string' && astrologer.imageUrl) {
      return normalize(astrologer.imageUrl);
    }
    // Then profileImage (string or object.url)
    const img = astrologer.profileImage;
    if (typeof img === 'string' && img) {
      return normalize(img);
    }
    if (img && typeof img === 'object' && typeof img.url === 'string') {
      return normalize(img.url);
    }
    return null;
  })();

  // Resolve specializations to a compact string (up to 2)
  const resolvedSpecs = (() => {
    const primary = astrologer.specializations || astrologer.specialties || [];
    let names = Array.isArray(primary)
      ? primary.map(s => {
          if (!s) return null;
          if (typeof s === 'string') return s;
          if (typeof s === 'object') return s.name || s.title || null;
          return null;
        }).filter(Boolean)
      : [];
    // Fallback: legacy singular 'specialization'
    if (names.length === 0 && typeof astrologer.specialization === 'string' && astrologer.specialization.trim()) {
      names = [astrologer.specialization.trim()];
    }
    // Fallback: categoryRefs (objects with name)
    if (names.length === 0 && Array.isArray(astrologer.categoryRefs)) {
      names = astrologer.categoryRefs
        .map(c => (c && typeof c === 'object' ? (c.name || null) : null))
        .filter(Boolean);
    }
    if (names.length === 0) return null;
    return names.slice(0, 2).join(' · ');
  })();

  // Debug once if critical fields missing
  if (!resolvedImage || !resolvedSpecs) {
    console.log('🔎 [PREPAID_OFFER_CARD] Missing fields debug:', {
      offerId: offer?.offerId,
      imageFrom: {
        profileImage: astrologer?.profileImage,
        imageUrl: astrologer?.imageUrl,
      },
      specializations: astrologer?.specializations,
      specialties: astrologer?.specialties,
      specialization: astrologer?.specialization,
      categoryRefs: astrologer?.categoryRefs,
    });
  }

  return (
    <TouchableOpacity
      style={[styles.container, isExpired && styles.containerExpired]}
      onPress={handleProceedToPay}
      disabled={loading || (offer.isPaid && !offer.isAvailableToUse) || isExpired}
      activeOpacity={0.85}
    >
      {/* Glow effect for ready offers */}
      {isReady && (
        <View style={styles.glowEffect} />
      )}
      
      {/* Left gradient border */}
      <View style={[styles.leftBorder, isReady && styles.leftBorderReady, isExpired && styles.leftBorderExpired]} />
      
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        {resolvedImage ? (
          <Image
            source={{ uri: resolvedImage }}
            style={styles.avatar}
            resizeMode="cover"
            onError={() => console.log('🖼️ [PREPAID_OFFER_CARD] Image failed to load:', resolvedImage)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(astrologer?.name || 'A')[0].toUpperCase()}
            </Text>
          </View>
        )}
        {/* Online indicator */}
        {isReady && (
          <View style={styles.onlineIndicator} />
        )}
      </View>

      {/* Info block */}
      <View style={styles.info}>
        <Text style={styles.astrologerName} numberOfLines={1}>
          {offer.astrologer?.name}
        </Text>
        {!!resolvedSpecs && (
          <Text style={styles.specialization} numberOfLines={1}>
            {resolvedSpecs}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.highlightedText} numberOfLines={1}>
            {offer.durationMinutes} min
          </Text>
          <Text style={styles.highlightedText} numberOfLines={1}>
            · ₹{offer.basePrice}
          </Text>
        </View>
      </View>

      {/* CTA */}
      <View style={[styles.ctaButton, isExpired ? styles.ctaExpired : isReady ? styles.ctaReady : styles.ctaPay]}>
        {loading ? (
          <ActivityIndicator color={isReady ? '#111111' : colors.primary} size="small" />
        ) : isExpired ? (
          <Text style={styles.ctaExpiredText}>Expired</Text>
        ) : isReady ? (
          <View style={styles.ctaReadyContent}>
            <Ionicons name="chatbubble" size={14} color="#0F0F0F" />
            <Text style={styles.ctaReadyText}>Start</Text>
          </View>
        ) : (
          <Text style={styles.ctaText}>
            {offer.isPaid ? 'Paid' : 'Pay'}
          </Text>
        )}
      </View>

      {/* Dismiss (unpaid only) */}
      {!offer.isPaid && (
        <TouchableOpacity onPress={handleRemoveOffer} style={styles.dismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <MaterialIcons name="close" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(200, 164, 106, 0.15)',
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  containerExpired: {
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
    opacity: 0.7,
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 164, 106, 0.08)',
    borderRadius: 16,
  },
  leftBorder: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    backgroundColor: 'rgba(200, 164, 106, 0.3)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  leftBorderReady: {
    backgroundColor: '#C8A46A',
    shadowColor: '#C8A46A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  leftBorderExpired: {
    backgroundColor: '#FF5252',
  },
  avatarWrap: {
    flexShrink: 0,
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  avatarFallback: {
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#1A1A1A',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  astrologerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  specialization: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  highlightedText: {
    fontSize: 12,
    color: '#C8A46A',
    fontWeight: '700',
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
  },
  expiredText: {
    color: '#FF5252',
    fontWeight: '700',
  },
  ctaButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
    flexShrink: 0,
  },
  ctaReady: {
    backgroundColor: '#C8A46A',
    shadowColor: '#C8A46A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  ctaReadyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaReadyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F0F0F',
  },
  ctaPay: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ctaExpired: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.4)',
  },
  ctaExpiredText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5252',
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  dismiss: {
    padding: 2,
    flexShrink: 0,
  },
});

export default PrepaidOfferCard;
