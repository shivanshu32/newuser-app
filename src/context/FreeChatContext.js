import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';

/**
 * FreeChatContext - Global state management for free chat sessions
 * Provides persistent message state that survives component remounts
 */

// Action types
const ACTIONS = {
  INITIALIZE_SESSION: 'INITIALIZE_SESSION',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  SET_SESSION_STATUS: 'SET_SESSION_STATUS',
  SET_TIMER_DATA: 'SET_TIMER_DATA',
  CLEAR_SESSION: 'CLEAR_SESSION',
  SET_LOADING: 'SET_LOADING',
  MERGE_BACKEND_MESSAGES: 'MERGE_BACKEND_MESSAGES'
};

// Initial state
const initialState = {
  sessions: {}, // freeChatId -> session data
  currentSessionId: null,
  loading: false
};

// Session initial state
const createSessionState = (freeChatId) => ({
  freeChatId,
  messages: [],
  sessionActive: false,
  sessionEnded: false,
  sessionEndReason: null,
  timerData: {
    elapsed: 0,
    duration: 180,
    timeRemaining: 180,
    isActive: false,
    startTime: null
  },
  isTyping: false,
  astrologerTyping: false,
  connected: false,
  initialized: false,
  lastMessageTimestamp: null,
  persistenceLoaded: false
});

// Reducer with crash safety
function freeChatReducer(state, action) {
  try {
    if (!action || !action.type) {
      console.error('❌ [FREE_CHAT_REDUCER] Invalid action received:', action);
      return state;
    }
    
    switch (action.type) {
    case ACTIONS.INITIALIZE_SESSION: {
      const { freeChatId } = action.payload;
      return {
        ...state,
        currentSessionId: freeChatId,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...createSessionState(freeChatId),
            ...state.sessions[freeChatId], // Preserve existing data
            initialized: true
          }
        }
      };
    }

    case ACTIONS.SET_MESSAGES: {
      const { freeChatId, messages } = action.payload;
      if (!state.sessions[freeChatId]) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...state.sessions[freeChatId],
            messages: [...messages],
            lastMessageTimestamp: messages.length > 0 
              ? Math.max(...messages.map(m => new Date(m.timestamp).getTime()))
              : null,
            persistenceLoaded: true
          }
        }
      };
    }

    case ACTIONS.ADD_MESSAGE: {
      const { freeChatId, message } = action.payload;
      if (!state.sessions[freeChatId]) return state;

      const currentMessages = state.sessions[freeChatId].messages;
      
      // Check for duplicates
      const isDuplicate = currentMessages.some(existing => 
        existing.id === message.id ||
        (existing.content === message.content && 
         existing.senderId === message.senderId &&
         Math.abs(new Date(existing.timestamp).getTime() - new Date(message.timestamp).getTime()) < 1000)
      );

      if (isDuplicate) return state;

      const newMessages = [...currentMessages, message];
      
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...state.sessions[freeChatId],
            messages: newMessages,
            lastMessageTimestamp: new Date(message.timestamp).getTime()
          }
        }
      };
    }

    case ACTIONS.UPDATE_MESSAGE: {
      const { freeChatId, messageId, updates } = action.payload;
      if (!state.sessions[freeChatId]) return state;

      const updatedMessages = state.sessions[freeChatId].messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      );

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...state.sessions[freeChatId],
            messages: updatedMessages
          }
        }
      };
    }

    case ACTIONS.MERGE_BACKEND_MESSAGES: {
      const { freeChatId, backendMessages } = action.payload;
      if (!state.sessions[freeChatId]) return state;

      const currentMessages = state.sessions[freeChatId].messages;
      const existingIds = new Set(currentMessages.map(m => m.id));
      
      // Add only new messages
      const newMessages = backendMessages.filter(msg => !existingIds.has(msg.id));
      
      if (newMessages.length === 0) return state;

      const mergedMessages = [...currentMessages, ...newMessages]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...state.sessions[freeChatId],
            messages: mergedMessages,
            lastMessageTimestamp: Math.max(...mergedMessages.map(m => new Date(m.timestamp).getTime()))
          }
        }
      };
    }

    case ACTIONS.SET_SESSION_STATUS: {
      const { freeChatId, updates } = action.payload;
      if (!state.sessions[freeChatId]) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...state.sessions[freeChatId],
            ...updates
          }
        }
      };
    }

    case ACTIONS.SET_TIMER_DATA: {
      const { freeChatId, timerData } = action.payload;
      if (!state.sessions[freeChatId]) return state;

      return {
        ...state,
        sessions: {
          ...state.sessions,
          [freeChatId]: {
            ...state.sessions[freeChatId],
            timerData: { ...state.sessions[freeChatId].timerData, ...timerData }
          }
        }
      };
    }

    case ACTIONS.CLEAR_SESSION: {
      const { freeChatId } = action.payload;
      const newSessions = { ...state.sessions };
      delete newSessions[freeChatId];

      return {
        ...state,
        sessions: newSessions,
        currentSessionId: state.currentSessionId === freeChatId ? null : state.currentSessionId
      };
    }

    case ACTIONS.SET_LOADING: {
      return {
        ...state,
        loading: action.payload
      };
    }

    default:
      console.warn('⚠️ [FREE_CHAT_REDUCER] Unknown action type:', action.type);
      return state;
    }
  } catch (error) {
    console.error('❌ [FREE_CHAT_REDUCER] Critical error in reducer:', error);
    return state;
  }
}

// Context
const FreeChatContext = createContext();

// Provider component with comprehensive error tracking
export function FreeChatProvider({ children }) {
  try {
    console.log('🚀 [FREE_CHAT_CONTEXT] FreeChatProvider rendering...');
    console.log('🚀 [FREE_CHAT_CONTEXT] Children type:', typeof children);
    console.log('🚀 [FREE_CHAT_CONTEXT] Children:', children);
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error in initial console.log:', e);
  }
  
  // IMPORTANT: Do NOT wrap hooks in try-catch - this violates Rules of Hooks
  // Hooks must be called unconditionally in the same order every render
  // Any errors from the reducer are caught by the reducer's own try-catch and ContextErrorBoundary
  
  let state, dispatch;
  try {
    console.log('🔄 [FREE_CHAT_CONTEXT] About to call useReducer...');
    console.log('🔄 [FREE_CHAT_CONTEXT] freeChatReducer:', typeof freeChatReducer);
    console.log('🔄 [FREE_CHAT_CONTEXT] initialState:', JSON.stringify(initialState));
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error logging before useReducer:', e);
  }
  
  // Call useReducer - if this throws, the error boundary will catch it
  [state, dispatch] = useReducer(freeChatReducer, initialState);
  
  try {
    console.log('✅ [FREE_CHAT_CONTEXT] useReducer succeeded');
    console.log('✅ [FREE_CHAT_CONTEXT] State:', JSON.stringify(state));
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error logging after useReducer:', e);
  }
  
  let persistenceRef;
  try {
    console.log('🔄 [FREE_CHAT_CONTEXT] About to call useRef...');
    persistenceRef = useRef({
      saveMessages: async () => { console.log('📦 [FREE_CHAT_CONTEXT] Persistence not initialized yet'); },
      loadMessages: async () => { console.log('📦 [FREE_CHAT_CONTEXT] Persistence not initialized yet'); return []; },
      addMessage: async () => { console.log('📦 [FREE_CHAT_CONTEXT] Persistence not initialized yet'); return []; },
      mergeMessages: async (freeChatId, messages) => { console.log('📦 [FREE_CHAT_CONTEXT] Persistence not initialized yet'); return messages || []; },
      clearMessages: async () => { console.log('📦 [FREE_CHAT_CONTEXT] Persistence not initialized yet'); },
      getCacheStats: () => ({ status: 'not_initialized' })
    });
    console.log('✅ [FREE_CHAT_CONTEXT] useRef succeeded');
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error in useRef:', e);
    console.error('❌ [FREE_CHAT_CONTEXT] Error stack:', e.stack);
    throw e; // Re-throw to trigger error boundary
  }

  try {
    console.log('✅ [FREE_CHAT_CONTEXT] State and refs initialized successfully');
    console.log('✅ [FREE_CHAT_CONTEXT] About to setup useEffect hooks...');
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error in final console.log:', e);
  }

  // Initialize persistence service with error handling
  useEffect(() => {
    const initializePersistence = async () => {
      try {
        console.log('🔄 [FREE_CHAT_CONTEXT] Starting persistence service initialization...');
        
        // Dynamically import the persistence service to avoid import-time errors
        const { default: FreeChatMessagePersistence } = await import('../services/FreeChatMessagePersistence');
        
        if (!FreeChatMessagePersistence) {
          throw new Error('FreeChatMessagePersistence module loaded but is undefined');
        }
        
        persistenceRef.current = FreeChatMessagePersistence;
        console.log('✅ [FREE_CHAT_CONTEXT] FreeChatMessagePersistence initialized successfully');
      } catch (error) {
        console.error('❌ [FREE_CHAT_CONTEXT] Failed to initialize FreeChatMessagePersistence:', error);
        console.error('❌ [FREE_CHAT_CONTEXT] Error details:', error.message, error.stack);
        console.log('ℹ️ [FREE_CHAT_CONTEXT] Continuing with fallback no-op persistence service');
        // Keep the fallback service - app will continue without persistence
      }
    };

    // Wrap in try-catch to prevent any synchronous errors from crashing the context
    try {
      initializePersistence().catch(error => {
        console.error('❌ [FREE_CHAT_CONTEXT] Async initialization error:', error);
      });
    } catch (syncError) {
      console.error('❌ [FREE_CHAT_CONTEXT] Synchronous initialization error:', syncError);
    }
  }, []);

  // Auto-save messages to persistence when they change
  useEffect(() => {
    const saveSessionMessages = async () => {
      try {
        if (!persistenceRef.current) {
          console.warn('📦 [FREE_CHAT_CONTEXT] Persistence service not available for auto-save');
          return;
        }

        for (const [freeChatId, session] of Object.entries(state.sessions)) {
          if (session.messages.length > 0 && session.persistenceLoaded) {
            try {
              await persistenceRef.current.saveMessages(freeChatId, session.messages);
            } catch (error) {
              console.error(`❌ [FREE_CHAT_CONTEXT] Error auto-saving messages for ${freeChatId}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('❌ [FREE_CHAT_CONTEXT] Error in auto-save effect:', error);
      }
    };

    // Debounce saves
    const timer = setTimeout(saveSessionMessages, 1000);
    return () => clearTimeout(timer);
  }, [state.sessions]);

  // Initialize session with crash safety
  const initializeSession = useCallback(async (freeChatId) => {
    try {
      console.log('🏗️ [FREE_CHAT_CONTEXT] Initializing session:', freeChatId);
      
      if (!freeChatId) {
        console.error('❌ [FREE_CHAT_CONTEXT] Cannot initialize session: freeChatId is null/undefined');
        return;
      }
      
      dispatch({ type: ACTIONS.INITIALIZE_SESSION, payload: { freeChatId } });
      
      // Load persisted messages with error handling
      try {
        if (!persistenceRef.current) {
          console.warn('📦 [FREE_CHAT_CONTEXT] Persistence service not available for loading messages');
          dispatch({ 
            type: ACTIONS.SET_SESSION_STATUS, 
            payload: { freeChatId, updates: { persistenceLoaded: true } } 
          });
          return;
        }

        const persistedMessages = await persistenceRef.current.loadMessages(freeChatId);
        if (persistedMessages && persistedMessages.length > 0) {
          console.log(`🏗️ [FREE_CHAT_CONTEXT] Loaded ${persistedMessages.length} persisted messages for ${freeChatId}`);
          dispatch({ 
            type: ACTIONS.SET_MESSAGES, 
            payload: { freeChatId, messages: persistedMessages } 
          });
        } else {
          // Mark as loaded even if no messages
          dispatch({ 
            type: ACTIONS.SET_SESSION_STATUS, 
            payload: { freeChatId, updates: { persistenceLoaded: true } } 
          });
        }
      } catch (error) {
        console.error('❌ [FREE_CHAT_CONTEXT] Error loading persisted messages:', error);
        dispatch({ 
          type: ACTIONS.SET_SESSION_STATUS, 
          payload: { freeChatId, updates: { persistenceLoaded: true } } 
        });
      }
    } catch (error) {
      console.error('❌ [FREE_CHAT_CONTEXT] Critical error in initializeSession:', error);
    }
  }, []);

  // Add message with crash safety
  const addMessage = useCallback(async (freeChatId, message) => {
    try {
      if (!freeChatId || !message) {
        console.error('❌ [FREE_CHAT_CONTEXT] Cannot add message: freeChatId or message is null/undefined');
        return;
      }
      
      console.log('💬 [FREE_CHAT_CONTEXT] Adding message to context:', message.id);
      
      dispatch({ type: ACTIONS.ADD_MESSAGE, payload: { freeChatId, message } });
      
      // Also save to persistence immediately for new messages
      try {
        if (persistenceRef.current && typeof persistenceRef.current.addMessage === 'function') {
          await persistenceRef.current.addMessage(freeChatId, message);
        } else {
          console.warn('📦 [FREE_CHAT_CONTEXT] Persistence service not available for adding message');
        }
      } catch (error) {
        console.error('❌ [FREE_CHAT_CONTEXT] Error persisting new message:', error);
      }
    } catch (error) {
      console.error('❌ [FREE_CHAT_CONTEXT] Critical error in addMessage:', error);
    }
  }, []);

  // Merge backend messages with crash safety
  const mergeBackendMessages = useCallback(async (freeChatId, backendMessages) => {
    try {
      if (!freeChatId) {
        console.error('❌ [FREE_CHAT_CONTEXT] Cannot merge messages: freeChatId is null/undefined');
        return [];
      }
      
      if (!Array.isArray(backendMessages)) {
        console.error('❌ [FREE_CHAT_CONTEXT] Cannot merge messages: backendMessages is not an array');
        return [];
      }
      
      console.log(`🔄 [FREE_CHAT_CONTEXT] Merging ${backendMessages.length} backend messages for ${freeChatId}`);
      
      // Use persistence service to merge intelligently
      try {
        if (persistenceRef.current && typeof persistenceRef.current.mergeMessages === 'function') {
          const mergedMessages = await persistenceRef.current.mergeMessages(freeChatId, backendMessages);
          dispatch({ 
            type: ACTIONS.SET_MESSAGES, 
            payload: { freeChatId, messages: mergedMessages } 
          });
          return mergedMessages;
        } else {
          console.warn('📦 [FREE_CHAT_CONTEXT] Persistence service not available for merging messages');
          // Fallback to simple merge
          dispatch({ 
            type: ACTIONS.MERGE_BACKEND_MESSAGES, 
            payload: { freeChatId, backendMessages } 
          });
          return backendMessages;
        }
      } catch (error) {
        console.error('❌ [FREE_CHAT_CONTEXT] Error merging backend messages:', error);
        // Fallback to simple merge
        dispatch({ 
          type: ACTIONS.MERGE_BACKEND_MESSAGES, 
          payload: { freeChatId, backendMessages } 
        });
        return backendMessages;
      }
    } catch (error) {
      console.error('❌ [FREE_CHAT_CONTEXT] Critical error in mergeBackendMessages:', error);
      return [];
    }
  }, []);

  // Update message
  const updateMessage = useCallback((freeChatId, messageId, updates) => {
    dispatch({ type: ACTIONS.UPDATE_MESSAGE, payload: { freeChatId, messageId, updates } });
  }, []);

  // Set session status
  const setSessionStatus = useCallback((freeChatId, updates) => {
    dispatch({ type: ACTIONS.SET_SESSION_STATUS, payload: { freeChatId, updates } });
  }, []);

  // Set timer data
  const setTimerData = useCallback((freeChatId, timerData) => {
    dispatch({ type: ACTIONS.SET_TIMER_DATA, payload: { freeChatId, timerData } });
  }, []);

  // Clear session with crash safety
  const clearSession = useCallback(async (freeChatId) => {
    try {
      if (!freeChatId) {
        console.error('❌ [FREE_CHAT_CONTEXT] Cannot clear session: freeChatId is null/undefined');
        return;
      }
      
      console.log('🗑️ [FREE_CHAT_CONTEXT] Clearing session:', freeChatId);
      
      dispatch({ type: ACTIONS.CLEAR_SESSION, payload: { freeChatId } });
      
      // Also clear from persistence
      try {
        if (persistenceRef.current && typeof persistenceRef.current.clearMessages === 'function') {
          await persistenceRef.current.clearMessages(freeChatId);
        } else {
          console.warn('📦 [FREE_CHAT_CONTEXT] Persistence service not available for clearing messages');
        }
      } catch (error) {
        console.error('❌ [FREE_CHAT_CONTEXT] Error clearing persisted messages:', error);
      }
    } catch (error) {
      console.error('❌ [FREE_CHAT_CONTEXT] Critical error in clearSession:', error);
    }
  }, []);

  // Get session data
  const getSession = useCallback((freeChatId) => {
    return state.sessions[freeChatId] || null;
  }, [state.sessions]);

  // Get messages for session
  const getMessages = useCallback((freeChatId) => {
    return state.sessions[freeChatId]?.messages || [];
  }, [state.sessions]);

  // Check if session is initialized
  const isSessionInitialized = useCallback((freeChatId) => {
    return state.sessions[freeChatId]?.initialized || false;
  }, [state.sessions]);

  // Get persistence stats for debugging
  const getPersistenceStats = useCallback(() => {
    try {
      if (persistenceRef.current && typeof persistenceRef.current.getCacheStats === 'function') {
        return persistenceRef.current.getCacheStats();
      } else {
        return { error: 'Persistence service not available' };
      }
    } catch (error) {
      console.error('❌ [FREE_CHAT_CONTEXT] Error getting persistence stats:', error);
      return { error: error.message };
    }
  }, []);

  let contextValue;
  try {
    console.log('🔄 [FREE_CHAT_CONTEXT] Creating context value...');
    contextValue = {
      // State
      sessions: state.sessions,
      currentSessionId: state.currentSessionId,
      loading: state.loading,
      
      // Actions
      initializeSession,
      addMessage,
      mergeBackendMessages,
      updateMessage,
      setSessionStatus,
      setTimerData,
      clearSession,
      
      // Getters
      getSession,
      getMessages,
      isSessionInitialized,
      getPersistenceStats
    };
    console.log('✅ [FREE_CHAT_CONTEXT] Context value created successfully');
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error creating context value:', e);
    console.error('❌ [FREE_CHAT_CONTEXT] Error stack:', e.stack);
    throw e;
  }

  try {
    console.log('🔄 [FREE_CHAT_CONTEXT] About to return Provider...');
    return (
      <FreeChatContext.Provider value={contextValue}>
        {children}
      </FreeChatContext.Provider>
    );
  } catch (e) {
    console.error('❌ [FREE_CHAT_CONTEXT] Error returning Provider:', e);
    console.error('❌ [FREE_CHAT_CONTEXT] Error stack:', e.stack);
    throw e;
  }
}

// Hook to use the context
export function useFreeChatContext() {
  const context = useContext(FreeChatContext);
  if (!context) {
    throw new Error('useFreeChatContext must be used within a FreeChatProvider');
  }
  return context;
}

export default FreeChatContext;
