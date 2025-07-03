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
