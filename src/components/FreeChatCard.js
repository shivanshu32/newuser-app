import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { freeChatAPI } from '../services/api';
import { colors, spacing, radius, shadows } from '../theme';

const FreeChatCard = ({ navigation }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [showWaitingModal, setShowWaitingModal] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for an astrologer to join...');

  // Check eligibility on component mount
  useEffect(() => {
    checkEligibility();
  }, [user]);

  // Re-check eligibility when screen comes into focus (e.g., returning from chat session)
  useFocusEffect(
    React.useCallback(() => {
     // console.log('🆓 [FREE_CHAT_CARD] Screen focused - re-checking eligibility');
      // CRITICAL FIX: Only check eligibility if user is authenticated
      // This prevents API calls without token when screen focuses before auth is ready
      if (user && user._id) {
        checkEligibility();
      }
    }, [user])
  );

  // Socket event listeners for free chat
  useEffect(() => {
    if (!socket) return;

    const handleFreeChatRequested = (data) => {
      console.log('🆓 Free chat requested:', data);
      setShowWaitingModal(true);
      setWaitingMessage('Waiting for an astrologer to join...');
    };

    const handleFreeChatAccepted = (data) => {
      console.log('✅ Free chat accepted:', data);
      setShowWaitingModal(false);
      setRequesting(false);
      
      // Navigate to free chat screen
      navigation.navigate('FixedFreeChatScreen', {
        freeChatId: data.freeChatId,
        sessionId: data.sessionId,
        astrologerId: data.astrologer.id,
        astrologer: data.astrologer,
        isFreeChat: true,
        userProfile: user
      });
    };

    const handleFreeChatExpired = (data) => {
      console.log('⏰ Free chat expired:', data);
      
      // Only show alert if user is currently waiting (not in active session)
      // If showWaitingModal is false and requesting is false, user is not actively waiting
      const isCurrentlyWaiting = showWaitingModal || requesting;
      
      console.log('⏰ Free chat expired - Currently waiting:', isCurrentlyWaiting);
      console.log('⏰ Free chat expired - showWaitingModal:', showWaitingModal, 'requesting:', requesting);
      
      setShowWaitingModal(false);
      setRequesting(false);
      
      // Only show "No Astrologers Available" alert if user was actually waiting
      if (isCurrentlyWaiting) {
        console.log('⏰ Showing "No Astrologers Available" alert - user was waiting');
        Alert.alert(
          'No Astrologers Available',
          data.message || 'No astrologers are currently available for free chat. Please try again later.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('⏰ Skipping "No Astrologers Available" alert - user not waiting (likely in active session)');
      }
    };

    const handleFreeChatError = (data) => {
      console.log('❌ Free chat error:', data);
      setShowWaitingModal(false);
      setRequesting(false);
      
      if (data.requiresProfile) {
        Alert.alert(
          'Complete Your Profile',
          data.message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Complete Profile', 
              onPress: () => navigation.navigate('AddUserProfile', { isRequired: true })
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message, [{ text: 'OK' }]);
      }
    };

    // Register socket listeners
    socket.on('free_chat_requested', handleFreeChatRequested);
    socket.on('free_chat_accepted', handleFreeChatAccepted);
    socket.on('free_chat_expired', handleFreeChatExpired);
    socket.on('free_chat_error', handleFreeChatError);

    return () => {
      // Cleanup listeners
      socket.off('free_chat_requested', handleFreeChatRequested);
      socket.off('free_chat_accepted', handleFreeChatAccepted);
      socket.off('free_chat_expired', handleFreeChatExpired);
      socket.off('free_chat_error', handleFreeChatError);
    };
  }, [socket, navigation, user]);

  const checkEligibility = async () => {
    try {
     // console.log('🆓 [FREE_CHAT_CARD] Starting eligibility check...');
      // console.log('🆓 [FREE_CHAT_CARD] User:', user);
      // console.log('🆓 [FREE_CHAT_CARD] User ID:', user?._id);
      
      // CRITICAL FIX: Skip eligibility check if user is not authenticated
      // This prevents "No token provided" errors when component mounts before auth is ready
      if (!user || !user._id) {
        console.log('🆓 [FREE_CHAT_CARD] Skipping eligibility check - user not authenticated');
        setLoading(false);
        setIsEligible(false);
        return;
      }
      
      setLoading(true);
      const response = await freeChatAPI.checkEligibility();
      
      // console.log('🆓 [FREE_CHAT_CARD] Eligibility API response:', response);
      
      if (response.success) {
        // console.log('🆓 [FREE_CHAT_CARD] Eligibility check successful');
        // console.log('🆓 [FREE_CHAT_CARD] Is eligible:', response.data.isEligible);
        // console.log('🆓 [FREE_CHAT_CARD] Response data:', response.data);
        setIsEligible(response.data.isEligible);
      } else {
        // console.log('🆓 [FREE_CHAT_CARD] Eligibility check failed:', response.message);
        setIsEligible(false);
      }
    } catch (error) {
       console.error('🆓 [FREE_CHAT_CARD] Error checking free chat eligibility:', error);
       console.error('🆓 [FREE_CHAT_CARD] Error details:', error.response?.data || error.message);
      setIsEligible(false);
    } finally {
      // console.log('🆓 [FREE_CHAT_CARD] Eligibility check complete. Loading:', false, 'Eligible:', isEligible);
      setLoading(false);
    }
  };

  const handleStartFreeChat = async () => {
    // Navigate to the pre-chat form for free chat
    navigation.navigate('FreeChatPreForm');
  };

  const handleCancelWaiting = () => {
    setShowWaitingModal(false);
    setRequesting(false);
    
    // Optionally emit cancel event to backend
    if (socket) {
      socket.emit('cancel_free_chat_request');
    }
  };

  // Debug logging for render logic
  // console.log('🆓 [FREE_CHAT_CARD] Render check - Loading:', loading, 'Eligible:', isEligible);
  
  // Don't render if loading or not eligible
  if (loading || !isEligible) {
    // console.log('🆓 [FREE_CHAT_CARD] Not rendering - Loading:', loading, 'Not eligible:', !isEligible);
    return null;
  }
  
  // console.log('🆓 [FREE_CHAT_CARD] Rendering FreeChatCard component');

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.badgeLabel}>CLAIM FREE CHAT</Text>
          <Text style={styles.title}>Ask your First Free Question</Text>
          <Text style={styles.subtitle}>A brief introduction to our advisors</Text>

          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Ionicons name="star-outline" size={16} color={colors.primary} />
              <Text style={styles.featureText} numberOfLines={1}>Expert Advisors</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="lock-closed-outline" size={16} color={colors.primary} />
              <Text style={styles.featureText} numberOfLines={1}>Private Session</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, requesting && styles.buttonDisabled]}
            onPress={handleStartFreeChat}
            disabled={requesting}
            activeOpacity={0.85}
          >
            {requesting ? (
              <ActivityIndicator color="#111111" size="small" />
            ) : (
              <Text style={styles.buttonText}>Begin Session</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Waiting Modal */}
      <Modal
        visible={showWaitingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelWaiting}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="hourglass-empty" size={40} color={colors.primary} />
              <Text style={styles.modalTitle}>Finding Astrologer</Text>
            </View>

            <Text style={styles.modalMessage}>{waitingMessage}</Text>

            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelWaiting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    padding: 24,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '400',
    marginBottom: 20,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: colors.surface,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 28,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  loadingContainer: {
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
});

export default FreeChatCard;
