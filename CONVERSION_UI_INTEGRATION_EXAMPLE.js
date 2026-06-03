/**
 * CONVERSION FUNNEL UI INTEGRATION EXAMPLE
 * 
 * This file shows how to integrate DiscountBanner and EnhancedPrepaidOfferModal
 * into your existing EnhancedFixedFreeChatScreen.js
 * 
 * INSTRUCTIONS:
 * 1. Copy the imports section to your EnhancedFixedFreeChatScreen.js
 * 2. Add the state variables to your component
 * 3. Add the socket event listeners to your useEffect
 * 4. Add the UI components to your render
 * 5. Implement the handler functions
 */

// ============================================================================
// STEP 1: ADD THESE IMPORTS
// ============================================================================

import DiscountBanner from '../../components/DiscountBanner';
import EnhancedPrepaidOfferModal from '../../components/EnhancedPrepaidOfferModal';

// ============================================================================
// STEP 2: ADD THESE STATE VARIABLES (inside your component)
// ============================================================================

const [discountOffer, setDiscountOffer] = useState(null);
const [prepaidOffer, setPrepaidOffer] = useState(null);
const [showOfferModal, setShowOfferModal] = useState(false);

// ============================================================================
// STEP 3: ADD THESE SOCKET EVENT LISTENERS (inside your useEffect)
// ============================================================================

useEffect(() => {
  if (!socketRef.current) return;

  // Listen for discount coupon events
  const handleDiscountCoupon = (data) => {
    console.log('💰 [CONVERSION] Discount coupon received:', data);
    
    setDiscountOffer({
      code: data.code,
      discountValue: data.discountValue,
      validUntil: data.validUntil,
      remainingMinutes: data.remainingMinutes,
      message: data.message
    });
  };

  // Listen for prepaid offer events
  const handlePrepaidOffer = (data) => {
    console.log('🎁 [CONVERSION] Prepaid offer received:', data);
    
    setPrepaidOffer({
      offerId: data.offerId,
      astrologerId: data.astrologerId,
      basePrice: data.basePrice,
      totalAmount: data.totalAmount,
      discountAmount: data.discountAmount || 0,
      finalAmount: data.finalAmount || data.totalAmount,
      duration: data.duration,
      discountPercentage: data.discountPercentage || 0,
      couponCode: data.couponCode,
      message: data.message,
      validUntil: data.validUntil
    });
    
    // Show modal automatically when offer is received
    setShowOfferModal(true);
  };

  socketRef.current.on('discount_coupon_offered', handleDiscountCoupon);
  socketRef.current.on('prepaid_offer_available', handlePrepaidOffer);

  return () => {
    socketRef.current?.off('discount_coupon_offered', handleDiscountCoupon);
    socketRef.current?.off('prepaid_offer_available', handlePrepaidOffer);
  };
}, []);

// ============================================================================
// STEP 4: ADD THESE HANDLER FUNCTIONS (inside your component)
// ============================================================================

// Handle banner tap - show offer modal
const handleBannerTap = useCallback(() => {
  if (prepaidOffer) {
    setShowOfferModal(true);
  }
}, [prepaidOffer]);

// Handle banner dismiss - hide banner but keep offer available
const handleBannerDismiss = useCallback(() => {
  setDiscountOffer(null);
}, []);

// Handle offer acceptance - navigate to payment
const handleAcceptOffer = useCallback(async () => {
  try {
    if (!prepaidOffer) return;

    console.log('✅ [CONVERSION] User accepted offer:', prepaidOffer.offerId);

    // Close modal
    setShowOfferModal(false);

    // Navigate to prepaid offer payment screen
    navigation.navigate('PrepaidOfferPayment', {
      offerId: prepaidOffer.offerId,
      astrologerId: prepaidOffer.astrologerId,
      amount: prepaidOffer.finalAmount,
      originalAmount: prepaidOffer.totalAmount,
      discountAmount: prepaidOffer.discountAmount,
      discountPercentage: prepaidOffer.discountPercentage,
      couponCode: prepaidOffer.couponCode,
      duration: prepaidOffer.duration,
      astrologerName: astrologer?.name || 'Astrologer'
    });

  } catch (error) {
    console.error('❌ [CONVERSION] Error accepting offer:', error);
    Alert.alert('Error', 'Failed to process offer. Please try again.');
  }
}, [prepaidOffer, navigation, astrologer]);

// Handle offer decline - just close modal
const handleDeclineOffer = useCallback(() => {
  console.log('⏭️ [CONVERSION] User declined offer');
  setShowOfferModal(false);
}, []);

// ============================================================================
// STEP 5: ADD THESE UI COMPONENTS TO YOUR RENDER
// ============================================================================

return (
  <SafeAreaView style={styles.container}>
    <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
    
    {/* Your existing header */}
    <View style={styles.header}>
      {/* ... existing header content ... */}
    </View>

    {/* CONVERSION FUNNEL: Discount Banner - Add at top of chat area */}
    {discountOffer && (
      <View style={styles.discountBannerContainer}>
        <DiscountBanner
          code={discountOffer.code}
          discountValue={discountOffer.discountValue}
          validUntil={discountOffer.validUntil}
          remainingMinutes={discountOffer.remainingMinutes}
          message={discountOffer.message}
          onPress={handleBannerTap}
          onDismiss={handleBannerDismiss}
        />
      </View>
    )}

    {/* Your existing chat messages */}
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={(item) => item._id || item.tempId}
      contentContainerStyle={[
        styles.messageList,
        // Add padding when banner is visible
        discountOffer && styles.messageListWithBanner
      ]}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
    />

    {/* Your existing input area */}
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.inputContainer}>
        {/* ... existing input content ... */}
      </View>
    </KeyboardAvoidingView>

    {/* CONVERSION FUNNEL: Enhanced Prepaid Offer Modal */}
    <EnhancedPrepaidOfferModal
      visible={showOfferModal}
      offer={prepaidOffer}
      astrologerName={astrologer?.name || 'Astrologer'}
      onAccept={handleAcceptOffer}
      onDecline={handleDeclineOffer}
    />
  </SafeAreaView>
);

// ============================================================================
// STEP 6: ADD THESE STYLES
// ============================================================================

const styles = StyleSheet.create({
  // ... your existing styles ...

  // New styles for conversion funnel
  discountBannerContainer: {
    position: 'absolute',
    top: 60, // Adjust based on your header height
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10
  },
  messageListWithBanner: {
    paddingTop: 120 // Add padding when banner is visible
  }
});

// ============================================================================
// COMPLETE INTEGRATION EXAMPLE
// ============================================================================

/**
 * Full example showing the complete component structure:
 */

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useFreeChatContext } from '../../context/FreeChatContext';

// CONVERSION FUNNEL IMPORTS
import DiscountBanner from '../../components/DiscountBanner';
import EnhancedPrepaidOfferModal from '../../components/EnhancedPrepaidOfferModal';

const EnhancedFixedFreeChatScreen = memo(({ route, navigation }) => {
  // ... your existing state and hooks ...

  // CONVERSION FUNNEL STATE
  const [discountOffer, setDiscountOffer] = useState(null);
  const [prepaidOffer, setPrepaidOffer] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // ... your existing useEffects ...

  // CONVERSION FUNNEL SOCKET LISTENERS
  useEffect(() => {
    if (!socketRef.current) return;

    const handleDiscountCoupon = (data) => {
      console.log('💰 [CONVERSION] Discount coupon received:', data);
      setDiscountOffer({
        code: data.code,
        discountValue: data.discountValue,
        validUntil: data.validUntil,
        remainingMinutes: data.remainingMinutes,
        message: data.message
      });
    };

    const handlePrepaidOffer = (data) => {
      console.log('🎁 [CONVERSION] Prepaid offer received:', data);
      setPrepaidOffer({
        offerId: data.offerId,
        astrologerId: data.astrologerId,
        basePrice: data.basePrice,
        totalAmount: data.totalAmount,
        discountAmount: data.discountAmount || 0,
        finalAmount: data.finalAmount || data.totalAmount,
        duration: data.duration,
        discountPercentage: data.discountPercentage || 0,
        couponCode: data.couponCode,
        message: data.message,
        validUntil: data.validUntil
      });
      setShowOfferModal(true);
    };

    socketRef.current.on('discount_coupon_offered', handleDiscountCoupon);
    socketRef.current.on('prepaid_offer_available', handlePrepaidOffer);

    return () => {
      socketRef.current?.off('discount_coupon_offered', handleDiscountCoupon);
      socketRef.current?.off('prepaid_offer_available', handlePrepaidOffer);
    };
  }, []);

  // CONVERSION FUNNEL HANDLERS
  const handleBannerTap = useCallback(() => {
    if (prepaidOffer) {
      setShowOfferModal(true);
    }
  }, [prepaidOffer]);

  const handleBannerDismiss = useCallback(() => {
    setDiscountOffer(null);
  }, []);

  const handleAcceptOffer = useCallback(async () => {
    try {
      if (!prepaidOffer) return;

      console.log('✅ [CONVERSION] User accepted offer:', prepaidOffer.offerId);
      setShowOfferModal(false);

      navigation.navigate('PrepaidOfferPayment', {
        offerId: prepaidOffer.offerId,
        astrologerId: prepaidOffer.astrologerId,
        amount: prepaidOffer.finalAmount,
        originalAmount: prepaidOffer.totalAmount,
        discountAmount: prepaidOffer.discountAmount,
        discountPercentage: prepaidOffer.discountPercentage,
        couponCode: prepaidOffer.couponCode,
        duration: prepaidOffer.duration,
        astrologerName: astrologer?.name || 'Astrologer'
      });

    } catch (error) {
      console.error('❌ [CONVERSION] Error accepting offer:', error);
      Alert.alert('Error', 'Failed to process offer. Please try again.');
    }
  }, [prepaidOffer, navigation, astrologer]);

  const handleDeclineOffer = useCallback(() => {
    console.log('⏭️ [CONVERSION] User declined offer');
    setShowOfferModal(false);
  }, []);

  // ... your existing render functions ...

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4f46e5" />
      
      {/* Your existing header */}
      <View style={styles.header}>
        {/* ... header content ... */}
      </View>

      {/* CONVERSION FUNNEL: Discount Banner */}
      {discountOffer && (
        <View style={styles.discountBannerContainer}>
          <DiscountBanner
            code={discountOffer.code}
            discountValue={discountOffer.discountValue}
            validUntil={discountOffer.validUntil}
            remainingMinutes={discountOffer.remainingMinutes}
            message={discountOffer.message}
            onPress={handleBannerTap}
            onDismiss={handleBannerDismiss}
          />
        </View>
      )}

      {/* Chat messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id || item.tempId}
        contentContainerStyle={[
          styles.messageList,
          discountOffer && styles.messageListWithBanner
        ]}
      />

      {/* Input area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputContainer}>
          {/* ... input content ... */}
        </View>
      </KeyboardAvoidingView>

      {/* CONVERSION FUNNEL: Prepaid Offer Modal */}
      <EnhancedPrepaidOfferModal
        visible={showOfferModal}
        offer={prepaidOffer}
        astrologerName={astrologer?.name || 'Astrologer'}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#4f46e5',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  discountBannerContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  messageListWithBanner: {
    paddingTop: 120
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  }
});

export default EnhancedFixedFreeChatScreen;

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/**
 * After integration, test these scenarios:
 * 
 * 1. ✅ Start free chat session
 * 2. ✅ Ask a real question (not greeting)
 * 3. ✅ Wait for AI to answer (2-4 bubbles)
 * 4. ✅ Send engagement message ("thanks" or "aur kya?")
 * 5. ✅ Verify discount banner appears at top
 * 6. ✅ Verify countdown timer updates
 * 7. ✅ Tap banner to open modal
 * 8. ✅ Verify modal shows discount details
 * 9. ✅ Test "Accept" button navigation
 * 10. ✅ Test "Decline" button closes modal
 * 11. ✅ Test banner dismiss button
 * 12. ✅ Verify session ends after final upsell
 * 13. ✅ Verify prepaid offer modal appears
 * 14. ✅ Test offer expiry (timer reaches 0)
 * 15. ✅ Test app backgrounding/foregrounding
 */

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/**
 * Common Issues:
 * 
 * 1. Banner not showing:
 *    - Check socket connection
 *    - Verify event listener is registered
 *    - Check backend logs for discount_coupon_offered event
 * 
 * 2. Modal not opening:
 *    - Ensure prepaidOffer state is set
 *    - Check showOfferModal state
 *    - Verify navigation params
 * 
 * 3. Timer not updating:
 *    - Check validUntil is valid ISO timestamp
 *    - Verify component is mounted
 *    - Check for console errors
 * 
 * 4. Discount calculation wrong:
 *    - Verify backend sends correct discountAmount
 *    - Check finalAmount calculation
 *    - Review prepaid offer data structure
 */
