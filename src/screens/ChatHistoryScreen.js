import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Image,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatHistoryAPI } from '../services/api';

const ChatHistoryScreen = ({ navigation, route }) => {
  const { sessionId, bookingId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [chatData, setChatData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChatHistory();
  }, [sessionId]);

  const fetchChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📜 [CHAT_HISTORY] Fetching chat history for session:', sessionId);
      console.log('📜 [CHAT_HISTORY] Route params:', { sessionId, bookingId });
      
      const response = await chatHistoryAPI.getChatHistory(sessionId);
      
      console.log('📜 [CHAT_HISTORY] Raw API response:', response);
      
      // API interceptor extracts response.data, so we get the backend response directly
      if (response && response.success && response.data) {
        console.log('📜 [CHAT_HISTORY] Successfully fetched chat history:', response.data);
        console.log('📜 [CHAT_HISTORY] Session data:', response.data.session);
        console.log('📜 [CHAT_HISTORY] Booking data:', response.data.booking);
        console.log('📜 [CHAT_HISTORY] Duration from session:', response.data.session?.duration);
        console.log('📜 [CHAT_HISTORY] Duration from booking:', response.data.booking?.duration);
        console.log('📜 [CHAT_HISTORY] Amount from booking:', response.data.booking?.amount);
        console.log('📜 [CHAT_HISTORY] TotalAmount from booking:', response.data.booking?.totalAmount);
        console.log('📜 [CHAT_HISTORY] Is Free Chat:', response.data.session?.isFreeChat);
        setChatData(response.data);
        setMessages(response.data.messages || []);
      } else {
        console.error('📜 [CHAT_HISTORY] Unexpected response structure:', response);
        throw new Error(response?.message || 'Failed to fetch chat history');
      }
    } catch (error) {
      console.error('📜 [CHAT_HISTORY] Error fetching chat history:', error);
      console.error('📜 [CHAT_HISTORY] Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load chat history';
      setError(errorMessage);
      
      Alert.alert(
        'Error',
        `Failed to load chat history: ${errorMessage}`,
        [
          { text: 'Retry', onPress: fetchChatHistory },
          { text: 'Go Back', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatDuration = (totalSeconds) => {
    if (!totalSeconds) return 'N/A';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.sender.type === 'user';
    const isLastMessage = index === messages.length - 1;
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.astrologerMessage,
        isLastMessage && styles.lastMessage
      ]}>
        <View style={styles.messageHeader}>
          <Text style={[
            styles.senderName,
            isUser ? styles.userSenderName : styles.astrologerSenderName
          ]}>
            {item.sender.name}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        
        <Text style={[
          styles.messageContent,
          isUser ? styles.userMessageContent : styles.astrologerMessageContent
        ]}>
          {item.content}
        </Text>
        
        {item.attachments && item.attachments.length > 0 && (
          <View style={styles.attachmentsContainer}>
            {item.attachments.map((attachment, idx) => (
              <View key={idx} style={styles.attachment}>
                <Ionicons 
                  name={attachment.type === 'image' ? 'image' : 'document'} 
                  size={16} 
                  color="#666" 
                />
                <Text style={styles.attachmentName}>
                  {attachment.name || `${attachment.type} attachment`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSessionSummary = () => {
    if (!chatData) return null;
    
    const { session, participants, booking } = chatData;
    
    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Session Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Astrologer:</Text>
          <Text style={styles.summaryValue}>{participants.astrologer.name}</Text>
        </View>
        
        {session.startedAt && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Started:</Text>
            <Text style={styles.summaryValue}>
              {new Date(session.startedAt).toLocaleString()}
            </Text>
          </View>
        )}
        
        {session.endedAt && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ended:</Text>
            <Text style={styles.summaryValue}>
              {new Date(session.endedAt).toLocaleString()}
            </Text>
          </View>
        )}
        
        {(session.duration || booking?.duration) && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>
              {formatDuration(
                session.duration || (booking?.duration ? booking.duration * 60 : 0)
              )}
            </Text>
          </View>
        )}
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Amount:</Text>
          <Text style={styles.summaryValue}>
            {session.isFreeChat ? 'Free Chat' : 
             (booking?.amount !== undefined ? `₹${booking.amount}` : 'N/A')}
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Messages:</Text>
          <Text style={styles.summaryValue}>{chatData.messageCount}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat History</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading chat history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat History</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Unable to Load Chat History</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchChatHistory}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat History</Text>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Messages Found</Text>
          <Text style={styles.emptyMessage}>
            This consultation session doesn't have any chat messages.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderSessionSummary()}
          
          <View style={styles.messagesHeader}>
            <Text style={styles.messagesTitle}>Messages ({chatData.messageCount})</Text>
          </View>
          
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.messagesList}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  messagesHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#4A90E2',
  },
  astrologerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  lastMessage: {
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
  },
  userSenderName: {
    color: '#fff',
  },
  astrologerSenderName: {
    color: '#4A90E2',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageContent: {
    color: '#fff',
  },
  astrologerMessageContent: {
    color: '#333',
  },
  attachmentsContainer: {
    marginTop: 8,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  attachmentName: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ChatHistoryScreen;
