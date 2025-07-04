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
    console.log('🟢 [BookingPopupContext] showBookingAcceptedPopup called');
    console.log('🟢 [BookingPopupContext] Previous state - isVisible:', isVisible, 'popupData:', !!popupData);
    console.log('🟢 [BookingPopupContext] New bookingData received:', bookingData);
    console.log('🟢 [BookingPopupContext] New bookingData type:', typeof bookingData);
    console.log('🟢 [BookingPopupContext] New bookingData keys:', bookingData ? Object.keys(bookingData) : 'none');
    
    if (!bookingData) {
      console.error('❌ [BookingPopupContext] ERROR: Attempting to show popup with null/undefined bookingData!');
      return;
    }
    
    console.log('🟢 [BookingPopupContext] Setting popup data and visibility...');
    setPopupData(bookingData);
    setIsVisible(true);
    console.log('🟢 [BookingPopupContext] State update calls completed');
  };

  const hideBookingAcceptedPopup = () => {
    console.log('🔴 [BookingPopupContext] hideBookingAcceptedPopup called');
    console.log('🔴 [BookingPopupContext] Previous state - isVisible:', isVisible, 'popupData:', !!popupData);
    console.log('🔴 [BookingPopupContext] Hiding popup and clearing data...');
    setIsVisible(false);
    setPopupData(null);
    console.log('🔴 [BookingPopupContext] Hide state update calls completed');
  };

  // Listen for global event emitter events from socketService
  // This ensures booking acceptance works regardless of which screen user is on
  useEffect(() => {
    console.log('🔍 [BookingPopupContext] Setting up global event listeners...');
    
    const handleShowBookingAcceptedPopup = (eventData) => {
      console.log('📡 [BookingPopupContext] Received showBookingAcceptedPopup event from socketService');
      console.log('📡 [BookingPopupContext] Event data:', JSON.stringify(eventData, null, 2));
      
      // Transform socketService data to BookingAcceptedPopup format
      const transformedData = {
        bookingId: eventData.bookingId,
        sessionId: eventData.sessionId,
        roomId: eventData.roomId,
        astrologerId: eventData.astrologerId,
        astrologerName: eventData.astrologerName,
        bookingType: eventData.bookingType || 'chat',
        rate: eventData.rate,
        message: eventData.message
      };
      
      console.log('🔄 [BookingPopupContext] Transformed data for popup:', JSON.stringify(transformedData, null, 2));
      showBookingAcceptedPopup(transformedData);
    };
    
    if (global.eventEmitter) {
      console.log('✅ [BookingPopupContext] Global event emitter found, adding listener');
      global.eventEmitter.on('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
    } else {
      console.warn('⚠️ [BookingPopupContext] Global event emitter not found!');
    }
    
    return () => {
      console.log('🧽 [BookingPopupContext] Cleaning up global event listeners...');
      if (global.eventEmitter) {
        global.eventEmitter.off('showBookingAcceptedPopup', handleShowBookingAcceptedPopup);
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
