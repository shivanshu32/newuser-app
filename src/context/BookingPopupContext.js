import React, { createContext, useContext, useState } from 'react';

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

  const showBookingAcceptedPopup = (bookingData) => {
    console.log(' [BookingPopupContext] Showing booking accepted popup with data:', bookingData);
    setPopupData(bookingData);
    setIsVisible(true);
  };

  const hideBookingAcceptedPopup = () => {
    console.log(' [BookingPopupContext] Hiding booking accepted popup');
    setIsVisible(false);
    setPopupData(null);
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
