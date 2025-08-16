import React, { createContext, useContext, useState, useEffect } from 'react';

const BookingPopupContext = createContext();

export const useBookingPopup = () => {
  const context = useContext(BookingPopupContext);
  if (!context) {
    throw new Error('useBookingPopup must be used within a BookingPopupProvider');
  }
  return context;
};

export const BookingPopupProvider = ({ children }) => {
  const [popupData, setPopupData] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('🔄 [BookingPopupContext] State changed:');
    console.log('🔄   - isVisible:', isVisible);
    console.log('🔄   - popupData:', popupData ? 'present' : 'null');
    console.log('🔄   - popupData keys:', popupData ? Object.keys(popupData) : 'none');
    if (popupData) {
      console.log('🔄   - popupData content:', JSON.stringify(popupData, null, 2));
    }
  }, [isVisible, popupData]);

  const showBookingAcceptedPopup = (bookingData) => {
    try {
      console.log('🟢 [BookingPopupContext] showBookingAcceptedPopup called');
      console.log('🟢 [BookingPopupContext] Previous state - isVisible:', isVisible, 'popupData:', !!popupData);
      console.log('🟢 [BookingPopupContext] New bookingData received:', bookingData);
      console.log('🟢 [BookingPopupContext] New bookingData type:', typeof bookingData);
      console.log('🟢 [BookingPopupContext] New bookingData keys:', bookingData ? Object.keys(bookingData) : 'none');
      
      if (!bookingData) {
        console.error('❌ [BookingPopupContext] ERROR: Attempting to show popup with null/undefined bookingData!');
        return;
      }
      
      // Validate required fields to prevent crashes
      if (!bookingData.bookingId) {
        console.error('❌ [BookingPopupContext] ERROR: bookingData missing required bookingId');
        return;
      }
      
      console.log('🟢 [BookingPopupContext] Setting popup data and visibility...');
      setPopupData(bookingData);
      setIsVisible(true);
      console.log('🟢 [BookingPopupContext] State update calls completed');
    } catch (error) {
      console.error('❌ [BookingPopupContext] Error in showBookingAcceptedPopup:', error);
    }
  };

  const hideBookingAcceptedPopup = () => {
    try {
      console.log('🔴 [BookingPopupContext] hideBookingAcceptedPopup called');
      console.log('🔴 [BookingPopupContext] Previous state - isVisible:', isVisible, 'popupData:', !!popupData);
      console.log('🔴 [BookingPopupContext] Hiding popup and clearing data...');
      setIsVisible(false);
      setPopupData(null);
      console.log('🔴 [BookingPopupContext] Hide state update calls completed');
    } catch (error) {
      console.error('❌ [BookingPopupContext] Error in hideBookingAcceptedPopup:', error);
    }
  };

  // Listen for global event emitter events from socketService
  // This ensures booking acceptance works regardless of which screen user is on
  useEffect(() => {
    console.log('🔍 [BookingPopupContext] Setting up global event listeners...');
    
    const handleShowBookingAcceptedPopup = (eventData) => {
      try {
        console.log('📡 [BookingPopupContext] Received showBookingAcceptedPopup event from socketService');
        
        if (!eventData) {
          console.error('❌ [BookingPopupContext] Received null/undefined eventData');
          return;
        }
        
        console.log('📡 [BookingPopupContext] Event data:', JSON.stringify(eventData, null, 2));
        
        // Transform socketService data to BookingAcceptedPopup format with validation
        const transformedData = {
          bookingId: eventData.bookingId,
          sessionId: eventData.sessionId,
          roomId: eventData.roomId,
          astrologerId: eventData.astrologerId,
          astrologerName: eventData.astrologerName || 'Unknown Astrologer',
          bookingType: eventData.bookingType || 'chat',
          rate: eventData.rate || 0,
          message: eventData.message || ''
        };
        
        // Validate critical fields
        if (!transformedData.bookingId) {
          console.error('❌ [BookingPopupContext] Critical error: No bookingId in event data');
          return;
        }
        
        console.log('🔄 [BookingPopupContext] Transformed data for popup:', JSON.stringify(transformedData, null, 2));
        showBookingAcceptedPopup(transformedData);
      } catch (error) {
        console.error('❌ [BookingPopupContext] Error handling showBookingAcceptedPopup event:', error);
      }
    };
    
    try {
      if (global.eventEmitter) {
        console.log('✅ [BookingPopupContext] Global event emitter found, adding listener');
        global.eventEmitter.on('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
      } else {
        console.warn('⚠️ [BookingPopupContext] Global event emitter not found!');
      }
    } catch (error) {
      console.error('❌ [BookingPopupContext] Error setting up event listeners:', error);
    }
    
    return () => {
      try {
        console.log('🧽 [BookingPopupContext] Cleaning up global event listeners...');
        if (global.eventEmitter) {
          global.eventEmitter.off('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
        }
      } catch (error) {
        console.error('❌ [BookingPopupContext] Error cleaning up event listeners:', error);
      }
    };
  }, []); // Empty dependency array - only run once

  const value = {
    popupData,
    isVisible,
    showBookingAcceptedPopup,
    hideBookingAcceptedPopup,
  };

  return (
    <BookingPopupContext.Provider value={value}>
      {children}
    </BookingPopupContext.Provider>
  );
};

export default BookingPopupContext;
