import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Simple message persistence hook for free chat sessions
 * Provides basic message persistence without breaking existing functionality
 */
const useMessagePersistence = (freeChatId) => {
  const [persistedMessages, setPersistedMessages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef(null);

  const STORAGE_KEY = `freechat_messages_${freeChatId}`;

  // Load messages from AsyncStorage on mount
  useEffect(() => {
    if (!freeChatId) return;

    const loadMessages = async () => {
      try {
        console.log('📱 [MESSAGE_PERSISTENCE] Loading messages for:', freeChatId);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        
        if (stored) {
          const data = JSON.parse(stored);
          const messages = data.messages || [];
          console.log(`📱 [MESSAGE_PERSISTENCE] Loaded ${messages.length} persisted messages`);
          setPersistedMessages(messages);
        } else {
          console.log('📱 [MESSAGE_PERSISTENCE] No persisted messages found');
          setPersistedMessages([]);
        }
      } catch (error) {
        console.error('📱 [MESSAGE_PERSISTENCE] Error loading messages:', error);
        setPersistedMessages([]);
      } finally {
        setIsLoaded(true);
      }
    };

    loadMessages();
  }, [freeChatId, STORAGE_KEY]);

  // Save messages to AsyncStorage (debounced)
  const saveMessages = useCallback(async (messages) => {
    if (!freeChatId || !Array.isArray(messages)) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to prevent excessive writes
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const data = {
          messages,
          timestamp: Date.now(),
          lastUpdated: new Date().toISOString()
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        console.log(`📱 [MESSAGE_PERSISTENCE] Saved ${messages.length} messages for ${freeChatId}`);
        
        // Update local state
        setPersistedMessages([...messages]);
      } catch (error) {
        console.error('📱 [MESSAGE_PERSISTENCE] Error saving messages:', error);
      }
    }, 1000); // 1 second debounce
  }, [freeChatId, STORAGE_KEY]);

  // Add a single message
  const addMessage = useCallback(async (message) => {
    if (!message || !freeChatId) return;

    try {
      // Check for duplicates
      const isDuplicate = persistedMessages.some(existing => 
        existing.id === message.id ||
        (existing.content === message.content && 
         existing.senderId === message.senderId &&
         Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
      );

      if (!isDuplicate) {
        const updatedMessages = [...persistedMessages, message];
        await saveMessages(updatedMessages);
        console.log('📱 [MESSAGE_PERSISTENCE] Added new message:', message.id);
      } else {
        console.log('📱 [MESSAGE_PERSISTENCE] Duplicate message ignored:', message.id);
      }
    } catch (error) {
      console.error('📱 [MESSAGE_PERSISTENCE] Error adding message:', error);
    }
  }, [persistedMessages, saveMessages, freeChatId]);

  // Merge messages from backend
  const mergeBackendMessages = useCallback(async (backendMessages) => {
    if (!Array.isArray(backendMessages) || !freeChatId) return persistedMessages;

    try {
      console.log(`📱 [MESSAGE_PERSISTENCE] Merging ${backendMessages.length} backend messages`);
      
      // Create a map of existing messages for faster lookup
      const existingIds = new Set(persistedMessages.map(m => m.id));
      
      // Add new messages from backend
      const newMessages = backendMessages.filter(msg => {
        if (existingIds.has(msg.id)) return false;
        
        // Check for content-based duplicates
        const isDuplicate = persistedMessages.some(existing => 
          existing.content === msg.content && 
          existing.senderId === msg.senderId && 
          Math.abs(new Date(existing.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1000
        );
        
        return !isDuplicate;
      });

      if (newMessages.length > 0) {
        const mergedMessages = [...persistedMessages, ...newMessages]
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        await saveMessages(mergedMessages);
        console.log(`📱 [MESSAGE_PERSISTENCE] Merged ${newMessages.length} new messages`);
        return mergedMessages;
      }

      return persistedMessages;
    } catch (error) {
      console.error('📱 [MESSAGE_PERSISTENCE] Error merging messages:', error);
      return persistedMessages;
    }
  }, [persistedMessages, saveMessages, freeChatId]);

  // Clear all messages
  const clearMessages = useCallback(async () => {
    if (!freeChatId) return;

    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setPersistedMessages([]);
      console.log('📱 [MESSAGE_PERSISTENCE] Cleared all messages for:', freeChatId);
    } catch (error) {
      console.error('📱 [MESSAGE_PERSISTENCE] Error clearing messages:', error);
    }
  }, [freeChatId, STORAGE_KEY]);

  // Get current messages
  const getMessages = useCallback(() => {
    return [...persistedMessages];
  }, [persistedMessages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages: persistedMessages,
    isLoaded,
    addMessage,
    saveMessages,
    mergeBackendMessages,
    clearMessages,
    getMessages
  };
};

export default useMessagePersistence;
