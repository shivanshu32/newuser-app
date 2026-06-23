import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { colors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { followUpMessagesAPI } from '../services/api';

const FollowUpMessagesSection = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);

  // Fetch unread messages
  const fetchUnreadMessages = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📨 [FOLLOW_UP_SECTION] Fetching unread messages...');
      
      const response = await followUpMessagesAPI.getUnread();
      
      if (response.success) {
        setMessages(response.data || []);
        setUnreadCount(response.count || 0);
        console.log('📨 [FOLLOW_UP_SECTION] Fetched unread messages:', response.count);
      }
    } catch (error) {
      console.error('📨 [FOLLOW_UP_SECTION] Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessages();
  }, [fetchUnreadMessages]);

  // Mark message as read
  const handleMarkAsRead = async (messageId) => {
    try {
      console.log('📨 [FOLLOW_UP_SECTION] Marking message as read:', messageId);
      await followUpMessagesAPI.markAsRead(messageId);
      
      // Update local state
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('📨 [FOLLOW_UP_SECTION] Error marking message as read:', error);
    }
  };

  // Open message modal
  const handleOpenMessage = (message) => {
    setSelectedMessage(message);
    setShowMessageModal(true);
  };

  // Close message modal and mark as read
  const handleCloseMessage = () => {
    if (selectedMessage) {
      handleMarkAsRead(selectedMessage._id);
    }
    setSelectedMessage(null);
    setShowMessageModal(false);
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  // Render individual message card
  const renderMessageCard = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.messageCard}
        onPress={() => handleOpenMessage(item)}
        activeOpacity={0.7}
      >
        <View style={styles.messageCardHeader}>
          <View style={styles.astrologerInfo}>
            <Image
              source={{ 
                uri: item.astrologer?.profileImage || 'https://freesvg.org/img/abstract-user-flat-4.png'
              }}
              style={styles.astrologerImage}
            />
            <View style={styles.astrologerDetails}>
              <Text style={styles.astrologerName} numberOfLines={1}>
                {item.astrologer?.name || 'Astrologer'}
              </Text>
              <View style={styles.remedyBadge}>
                <Ionicons name="medical" size={10} color={colors.textInverse} />
                <Text style={styles.remedyBadgeText}>REMEDY</Text>
              </View>
            </View>
          </View>
          <Text style={styles.messageTime}>{formatTimestamp(item.createdAt)}</Text>
        </View>
        
        <Text style={styles.messagePreview} numberOfLines={2}>
          {item.content}
        </Text>
        
        <View style={styles.tapToReadContainer}>
          <Text style={styles.tapToRead}>Tap to read full message</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.success} />
        </View>
      </TouchableOpacity>
    );
  };

  // Don't render if no messages and not loading
  if (!loading && messages.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="medical" size={20} color={colors.success} />
          <Text style={styles.sectionTitle}>Remedies from Astrologers</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.success} />
        </View>
      ) : (
        <FlatList
          data={messages}
          renderItem={renderMessageCard}
          keyExtractor={(item) => item._id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
        />
      )}

      {/* Message Detail Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseMessage}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalAstrologerInfo}>
                <Image
                  source={{ 
                    uri: selectedMessage?.astrologer?.profileImage || 'https://freesvg.org/img/abstract-user-flat-4.png'
                  }}
                  style={styles.modalAstrologerImage}
                />
                <View>
                  <Text style={styles.modalAstrologerName}>
                    {selectedMessage?.astrologer?.name || 'Astrologer'}
                  </Text>
                  <Text style={styles.modalTimestamp}>
                    {selectedMessage && formatTimestamp(selectedMessage.createdAt)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseMessage}
              >
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Remedy Badge */}
            <View style={styles.modalRemedyBadge}>
              <Ionicons name="medical" size={14} color={colors.textInverse} />
              <Text style={styles.modalRemedyBadgeText}>REMEDY / FOLLOW-UP MESSAGE</Text>
            </View>

            {/* Message Content */}
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalMessageText}>
                {selectedMessage?.content}
              </Text>
            </ScrollView>

            {/* Action Button */}
            <TouchableOpacity 
              style={styles.gotItButton}
              onPress={handleCloseMessage}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.textInverse} />
              <Text style={styles.gotItButtonText}>Got it, Thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  unreadBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
  },
  messageCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    width: 280,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  astrologerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  astrologerDetails: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  remedyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  remedyBadgeText: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 3,
  },
  messageTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  messagePreview: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginBottom: 10,
  },
  tapToReadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapToRead: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAstrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAstrologerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  modalAstrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalTimestamp: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  modalRemedyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  modalRemedyBadgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  modalContent: {
    maxHeight: 300,
    marginBottom: 16,
  },
  modalMessageText: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  gotItButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
  },
  gotItButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FollowUpMessagesSection;
