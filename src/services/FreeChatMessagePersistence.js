import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FreeChatMessagePersistence - Robust message persistence service
 * Provides multiple layers of message persistence to handle frequent component remounts
 */
class FreeChatMessagePersistence {
  constructor() {
    try {
      // In-memory cache for immediate access
      this.messageCache = new Map();
      
      // Session storage for current app session
      this.sessionCache = new Map();
      
      // Debounce timers for storage operations
      this.saveTimers = new Map();
      
      // Storage keys
      this.STORAGE_PREFIX = 'freechat_messages_';
      this.SESSION_PREFIX = 'freechat_session_';
      
      // Test AsyncStorage availability
      this.asyncStorageAvailable = true;
      this.testAsyncStorage();
      
      console.log('📦 [MESSAGE_PERSISTENCE] Service initialized successfully');
    } catch (error) {
      console.error('❌ [MESSAGE_PERSISTENCE] Failed to initialize service:', error);
      this.asyncStorageAvailable = false;
    }
  }

  /**
   * Test AsyncStorage availability
   */
  async testAsyncStorage() {
    try {
      const testKey = 'freechat_test_key';
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      this.asyncStorageAvailable = true;
      console.log('✅ [MESSAGE_PERSISTENCE] AsyncStorage is available');
    } catch (error) {
      console.error('❌ [MESSAGE_PERSISTENCE] AsyncStorage is not available:', error);
      this.asyncStorageAvailable = false;
    }
  }

  /**
   * Generate storage key for a free chat session
   */
  getStorageKey(freeChatId) {
    return `${this.STORAGE_PREFIX}${freeChatId}`;
  }

  getSessionKey(freeChatId) {
    return `${this.SESSION_PREFIX}${freeChatId}`;
  }

  /**
   * Save messages to all persistence layers
   */
  async saveMessages(freeChatId, messages, options = {}) {
    if (!freeChatId || !Array.isArray(messages)) {
      console.warn('📦 [MESSAGE_PERSISTENCE] Invalid parameters for saveMessages');
      return;
    }

    const { immediate = false, skipAsyncStorage = false } = options;

    try {
      // 1. Always save to in-memory cache (immediate)
      this.messageCache.set(freeChatId, [...messages]);
      
      // 2. Save to session cache (immediate)
      this.sessionCache.set(freeChatId, {
        messages: [...messages],
        timestamp: Date.now(),
        lastUpdated: new Date().toISOString()
      });

      console.log(`📦 [MESSAGE_PERSISTENCE] Saved ${messages.length} messages to cache for ${freeChatId}`);

      // 3. Save to AsyncStorage (debounced or immediate)
      if (!skipAsyncStorage && this.asyncStorageAvailable) {
        if (immediate) {
          await this.saveToAsyncStorage(freeChatId, messages);
        } else {
          this.debouncedSaveToAsyncStorage(freeChatId, messages);
        }
      } else if (!this.asyncStorageAvailable) {
        console.warn('📦 [MESSAGE_PERSISTENCE] AsyncStorage not available, skipping persistent save');
      }

    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error saving messages:', error);
    }
  }

  /**
   * Debounced save to AsyncStorage to prevent excessive writes
   */
  debouncedSaveToAsyncStorage(freeChatId, messages) {
    // Clear existing timer
    if (this.saveTimers.has(freeChatId)) {
      clearTimeout(this.saveTimers.get(freeChatId));
    }

    // Set new timer
    const timer = setTimeout(async () => {
      await this.saveToAsyncStorage(freeChatId, messages);
      this.saveTimers.delete(freeChatId);
    }, 1000); // 1 second debounce

    this.saveTimers.set(freeChatId, timer);
  }

  /**
   * Save messages to AsyncStorage
   */
  async saveToAsyncStorage(freeChatId, messages) {
    try {
      const storageKey = this.getStorageKey(freeChatId);
      const data = {
        messages,
        timestamp: Date.now(),
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };

      await AsyncStorage.setItem(storageKey, JSON.stringify(data));
      console.log(`📦 [MESSAGE_PERSISTENCE] Saved ${messages.length} messages to AsyncStorage for ${freeChatId}`);
    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error saving to AsyncStorage:', error);
    }
  }

  /**
   * Load messages from all persistence layers (fastest to slowest)
   */
  async loadMessages(freeChatId) {
    if (!freeChatId) {
      console.warn('📦 [MESSAGE_PERSISTENCE] Invalid freeChatId for loadMessages');
      return [];
    }

    try {
      // 1. Try in-memory cache first (fastest)
      if (this.messageCache.has(freeChatId)) {
        const messages = this.messageCache.get(freeChatId);
        console.log(`📦 [MESSAGE_PERSISTENCE] Loaded ${messages.length} messages from memory cache for ${freeChatId}`);
        return [...messages];
      }

      // 2. Try session cache
      if (this.sessionCache.has(freeChatId)) {
        const sessionData = this.sessionCache.get(freeChatId);
        const messages = sessionData.messages || [];
        console.log(`📦 [MESSAGE_PERSISTENCE] Loaded ${messages.length} messages from session cache for ${freeChatId}`);
        
        // Also populate memory cache
        this.messageCache.set(freeChatId, [...messages]);
        return [...messages];
      }

      // 3. Try AsyncStorage (slowest but most persistent)
      if (this.asyncStorageAvailable) {
        const storageKey = this.getStorageKey(freeChatId);
        const storedData = await AsyncStorage.getItem(storageKey);
        
        if (storedData) {
          const data = JSON.parse(storedData);
          const messages = data.messages || [];
          
          console.log(`📦 [MESSAGE_PERSISTENCE] Loaded ${messages.length} messages from AsyncStorage for ${freeChatId}`);
          console.log(`📦 [MESSAGE_PERSISTENCE] Data last updated: ${data.lastUpdated}`);
          
          // Populate both caches
          this.messageCache.set(freeChatId, [...messages]);
          this.sessionCache.set(freeChatId, {
            messages: [...messages],
            timestamp: Date.now(),
            lastUpdated: new Date().toISOString()
          });
          
          return [...messages];
        }
      } else {
        console.warn('📦 [MESSAGE_PERSISTENCE] AsyncStorage not available, skipping persistent load');
      }

      console.log(`📦 [MESSAGE_PERSISTENCE] No persisted messages found for ${freeChatId}`);
      return [];

    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error loading messages:', error);
      return [];
    }
  }

  /**
   * Add a single message to persistence
   */
  async addMessage(freeChatId, message) {
    try {
      const existingMessages = await this.loadMessages(freeChatId);
      
      // Check for duplicates
      const isDuplicate = existingMessages.some(existing => 
        existing.id === message.id || 
        (existing.content === message.content && 
         existing.senderId === message.senderId && 
         Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
      );

      if (!isDuplicate) {
        const updatedMessages = [...existingMessages, message];
        await this.saveMessages(freeChatId, updatedMessages);
        console.log(`📦 [MESSAGE_PERSISTENCE] Added new message to ${freeChatId}`);
        return updatedMessages;
      } else {
        console.log(`📦 [MESSAGE_PERSISTENCE] Duplicate message ignored for ${freeChatId}`);
        return existingMessages;
      }
    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error adding message:', error);
      return [];
    }
  }

  /**
   * Merge messages from backend with persisted messages
   */
  async mergeMessages(freeChatId, backendMessages) {
    try {
      const persistedMessages = await this.loadMessages(freeChatId);
      
      // Create a map of existing messages for faster lookup
      const existingMap = new Map();
      persistedMessages.forEach(msg => {
        existingMap.set(msg.id, msg);
      });

      // Add new messages from backend
      const newMessages = [];
      backendMessages.forEach(msg => {
        if (!existingMap.has(msg.id)) {
          // Check for content-based duplicates
          const isDuplicate = persistedMessages.some(existing => 
            existing.content === msg.content && 
            existing.senderId === msg.senderId && 
            Math.abs(new Date(existing.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1000
          );
          
          if (!isDuplicate) {
            newMessages.push(msg);
          }
        }
      });

      if (newMessages.length > 0) {
        const mergedMessages = [...persistedMessages, ...newMessages]
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        await this.saveMessages(freeChatId, mergedMessages);
        console.log(`📦 [MESSAGE_PERSISTENCE] Merged ${newMessages.length} new messages for ${freeChatId}`);
        return mergedMessages;
      }

      return persistedMessages;
    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error merging messages:', error);
      return backendMessages || [];
    }
  }

  /**
   * Clear messages for a specific session
   */
  async clearMessages(freeChatId) {
    try {
      // Clear from all caches
      this.messageCache.delete(freeChatId);
      this.sessionCache.delete(freeChatId);
      
      // Clear from AsyncStorage
      if (this.asyncStorageAvailable) {
        const storageKey = this.getStorageKey(freeChatId);
        await AsyncStorage.removeItem(storageKey);
      }
      
      console.log(`📦 [MESSAGE_PERSISTENCE] Cleared all messages for ${freeChatId}`);
    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error clearing messages:', error);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    return {
      memoryCacheSize: this.messageCache.size,
      sessionCacheSize: this.sessionCache.size,
      activeTimers: this.saveTimers.size,
      asyncStorageAvailable: this.asyncStorageAvailable,
      memoryCacheKeys: Array.from(this.messageCache.keys()),
      sessionCacheKeys: Array.from(this.sessionCache.keys())
    };
  }

  /**
   * Cleanup old sessions (call periodically)
   */
  async cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
    try {
      const now = Date.now();
      
      // Cleanup session cache
      for (const [key, data] of this.sessionCache.entries()) {
        if (now - data.timestamp > maxAge) {
          this.sessionCache.delete(key);
          console.log(`📦 [MESSAGE_PERSISTENCE] Cleaned up session cache for ${key}`);
        }
      }

      // Cleanup AsyncStorage (more expensive, do less frequently)
      if (this.asyncStorageAvailable) {
        const keys = await AsyncStorage.getAllKeys();
        const freeChatKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
        
        for (const key of freeChatKeys) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (now - parsed.timestamp > maxAge) {
                await AsyncStorage.removeItem(key);
                console.log(`📦 [MESSAGE_PERSISTENCE] Cleaned up AsyncStorage for ${key}`);
              }
            }
          } catch (error) {
            // If we can't parse the data, remove it
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('📦 [MESSAGE_PERSISTENCE] Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export default new FreeChatMessagePersistence();
