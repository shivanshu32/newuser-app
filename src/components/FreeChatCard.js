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
      checkEligibility();
    }, [])
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
        {/* Gradient Background Overlay */}
        <View style={styles.gradientOverlay} />
        
        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <MaterialIcons name="chat" size={28} color="#fff" />
              </View>
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            </View>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>🎁 Claim Your Free Chat</Text>
              <Text style={styles.subtitle}>3 minutes with expert astrologers</Text>
            </View>
          </View>

          <Text style={styles.description}>
            Get personalized insights about your life, career, and relationships. 
            Perfect introduction to our premium services!
          </Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="time-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.featureText}>3 minutes duration</Text>
            </View>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="star-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.featureText}>Expert astrologers</Text>
            </View>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="gift-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.featureText}>Completely free</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, requesting && styles.buttonDisabled]} 
            onPress={handleStartFreeChat}
            disabled={requesting}
          >
            {requesting ? (
              <>
                <ActivityIndicator color="#fff" size="small" style={styles.buttonLoader} />
                <Text style={styles.buttonText}>Connecting...</Text>
              </>
            ) : (
              <>
                <View style={styles.buttonIconContainer}>
                  <MaterialIcons name="chat-bubble" size={22} color="#fff" />
                </View>
                <Text style={styles.buttonText}>Start Free Chat Now</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
          
          {/* Trust indicators */}
          <View style={styles.trustIndicators}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.trustText}>100% Secure</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="people" size={16} color="#10B981" />
              <Text style={styles.trustText}>10,000+ Happy Users</Text>
            </View>
          </View>
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
              <MaterialIcons name="hourglass-empty" size={48} color="#F97316" />
              <Text style={styles.modalTitle}>Finding Astrologer</Text>
            </View>
            
            <Text style={styles.modalMessage}>{waitingMessage}</Text>
            
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F97316" />
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
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: '#F97316',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  freeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: '#fff',
  },
  freeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: '400',
  },
  features: {
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  button: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonIconContainer: {
    marginRight: 8,
  },
  buttonLoader: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  trustIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  loadingContainer: {
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default FreeChatCard;
