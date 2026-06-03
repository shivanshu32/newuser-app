# User App UI Integration Guide - Conversion Funnel

## 🎨 New UI Components Created

### 1. **DiscountBanner.js**
Animated banner that displays discount offers with countdown timer.

**Features:**
- Gradient background based on discount value
- Real-time countdown timer
- Pulse animation for urgency
- Slide-in animation on mount
- Dismissible
- Tap to view offer details

### 2. **EnhancedPrepaidOfferModal.js**
Enhanced modal for displaying prepaid offers with discount information.

**Features:**
- Shows original price vs discounted price
- Countdown timer for offer expiry
- Feature list (duration, benefits)
- Coupon code display
- Trust indicators
- Smooth animations

---

## 📱 Integration Steps

### Step 1: Add Socket Event Listeners

In your free chat screen (e.g., `EnhancedFixedFreeChatScreen.js`), add listeners for discount events:

```javascript
import { useState, useEffect } from 'react';
import DiscountBanner from '../components/DiscountBanner';
import EnhancedPrepaidOfferModal from '../components/EnhancedPrepaidOfferModal';

const EnhancedFixedFreeChatScreen = () => {
  const [discountOffer, setDiscountOffer] = useState(null);
  const [prepaidOffer, setPrepaidOffer] = useState(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  useEffect(() => {
    // Listen for discount coupon events
    socket.on('discount_coupon_offered', (data) => {
      console.log('💰 Discount coupon received:', data);
      setDiscountOffer({
        code: data.code,
        discountValue: data.discountValue,
        validUntil: data.validUntil,
        remainingMinutes: data.remainingMinutes,
        message: data.message
      });
    });

    // Listen for prepaid offer events
    socket.on('prepaid_offer_available', (data) => {
      console.log('🎁 Prepaid offer received:', data);
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
    });

    return () => {
      socket.off('discount_coupon_offered');
      socket.off('prepaid_offer_available');
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Your existing chat UI */}
      
      {/* Discount Banner - Show at top of screen */}
      {discountOffer && (
        <DiscountBanner
          code={discountOffer.code}
          discountValue={discountOffer.discountValue}
          validUntil={discountOffer.validUntil}
          remainingMinutes={discountOffer.remainingMinutes}
          message={discountOffer.message}
          onPress={() => {
            // Show prepaid offer modal when banner is tapped
            if (prepaidOffer) {
              setShowOfferModal(true);
            }
          }}
          onDismiss={() => {
            // Dismiss banner but keep offer available
            setDiscountOffer(null);
          }}
        />
      )}

      {/* Enhanced Prepaid Offer Modal */}
      <EnhancedPrepaidOfferModal
        visible={showOfferModal}
        offer={prepaidOffer}
        astrologerName={astrologerName}
        onAccept={handleAcceptOffer}
        onDecline={() => setShowOfferModal(false)}
      />
    </View>
  );
};
```

### Step 2: Handle Offer Acceptance

```javascript
const handleAcceptOffer = async () => {
  try {
    if (!prepaidOffer) return;

    // Navigate to payment screen with offer details
    navigation.navigate('PrepaidOfferPayment', {
      offerId: prepaidOffer.offerId,
      astrologerId: prepaidOffer.astrologerId,
      amount: prepaidOffer.finalAmount,
      originalAmount: prepaidOffer.totalAmount,
      discountAmount: prepaidOffer.discountAmount,
      couponCode: prepaidOffer.couponCode,
      duration: prepaidOffer.duration
    });

    setShowOfferModal(false);
  } catch (error) {
    console.error('Error accepting offer:', error);
    Alert.alert('Error', 'Failed to process offer. Please try again.');
  }
};
```

### Step 3: Update Chat Screen Layout

Position the discount banner at the top of your chat screen:

```javascript
<View style={styles.container}>
  {/* Discount Banner - Fixed at top */}
  {discountOffer && (
    <View style={styles.bannerContainer}>
      <DiscountBanner
        code={discountOffer.code}
        discountValue={discountOffer.discountValue}
        validUntil={discountOffer.validUntil}
        message={discountOffer.message}
        onPress={() => setShowOfferModal(true)}
        onDismiss={() => setDiscountOffer(null)}
      />
    </View>
  )}

  {/* Chat Messages */}
  <FlatList
    data={messages}
    renderItem={renderMessage}
    style={styles.messageList}
  />

  {/* Input Area */}
  <View style={styles.inputContainer}>
    {/* Your message input */}
  </View>
</View>

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000
  },
  messageList: {
    flex: 1,
    paddingTop: discountOffer ? 100 : 0 // Add padding when banner is visible
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff'
  }
});
```

---

## 🎯 Event Data Structures

### discount_coupon_offered Event
```javascript
{
  code: "MED123456789",           // Coupon code
  discountValue: 10,              // Discount percentage
  validUntil: "2026-06-02T14:30:00Z", // ISO timestamp
  remainingMinutes: 30,           // Minutes remaining
  message: "Special 10% discount for next 30 minutes!"
}
```

### prepaid_offer_available Event
```javascript
{
  offerId: "60f7b3c4d5e6f7g8h9i0j1k2",
  astrologerId: "60f7b3c4d5e6f7g8h9i0j1k3",
  basePrice: 100,
  totalAmount: 118,               // Including GST
  discountAmount: 23.6,           // Discount applied
  finalAmount: 94.4,              // Final price after discount
  duration: 15,                   // Minutes
  discountPercentage: 20,         // Percentage
  couponCode: "STR123456789",     // Applied coupon
  message: "Your free chat has ended. Special 20% discount offer available!",
  validUntil: "2026-06-02T14:30:00Z",
  sessionId: "session123",
  timestamp: "2026-06-02T14:00:00Z"
}
```

---

## 🎨 Customization Options

### DiscountBanner Customization

```javascript
// Change gradient colors based on discount
const getGradientColors = () => {
  if (discountValue >= 20) {
    return ['#dc2626', '#b91c1c']; // Red for high discount
  } else if (discountValue >= 10) {
    return ['#ea580c', '#c2410c']; // Orange for medium
  } else {
    return ['#8b5cf6', '#7c3aed']; // Purple for low
  }
};

// Adjust urgency thresholds
const getUrgencyLevel = () => {
  if (remainingTime.minutes < 5) return 'high';   // Last 5 minutes
  if (remainingTime.minutes < 15) return 'medium'; // Last 15 minutes
  return 'low';
};
```

### Modal Customization

```javascript
// Change modal colors
<LinearGradient
  colors={hasDiscount ? 
    ['#8b5cf6', '#7c3aed', '#6d28d9'] :  // Purple for discount
    ['#4f46e5', '#4338ca']                // Blue for regular
  }
  style={styles.gradient}
>
```

---

## 🧪 Testing Checklist

### Visual Testing
- [ ] Banner slides in smoothly
- [ ] Countdown timer updates every second
- [ ] Pulse animation works on high urgency
- [ ] Modal scales in with spring animation
- [ ] Discount calculations display correctly
- [ ] Trust indicators show properly

### Functional Testing
- [ ] Banner dismisses when X is tapped
- [ ] Banner opens modal when tapped
- [ ] Modal closes when "Maybe Later" is tapped
- [ ] Accept button navigates to payment
- [ ] Timer expires correctly
- [ ] Expired offers are hidden

### Edge Cases
- [ ] Multiple discount events (should update existing banner)
- [ ] Offer expires while modal is open
- [ ] User dismisses banner but offer is still valid
- [ ] Network disconnection during offer display
- [ ] App backgrounding/foregrounding

---

## 📊 Analytics Integration

Track user interactions with discount offers:

```javascript
import analyticsService from '../services/analyticsService';

// Track banner view
useEffect(() => {
  if (discountOffer) {
    analyticsService.logEvent('discount_banner_viewed', {
      discount_value: discountOffer.discountValue,
      coupon_code: discountOffer.code,
      remaining_minutes: discountOffer.remainingMinutes
    });
  }
}, [discountOffer]);

// Track banner tap
const handleBannerTap = () => {
  analyticsService.logEvent('discount_banner_tapped', {
    discount_value: discountOffer.discountValue,
    coupon_code: discountOffer.code
  });
  setShowOfferModal(true);
};

// Track modal view
useEffect(() => {
  if (showOfferModal && prepaidOffer) {
    analyticsService.logEvent('prepaid_offer_modal_viewed', {
      offer_id: prepaidOffer.offerId,
      discount_amount: prepaidOffer.discountAmount,
      final_amount: prepaidOffer.finalAmount
    });
  }
}, [showOfferModal]);

// Track offer acceptance
const handleAcceptOffer = () => {
  analyticsService.logEvent('prepaid_offer_accepted', {
    offer_id: prepaidOffer.offerId,
    discount_amount: prepaidOffer.discountAmount,
    final_amount: prepaidOffer.finalAmount,
    coupon_code: prepaidOffer.couponCode
  });
  // Navigate to payment...
};

// Track offer decline
const handleDeclineOffer = () => {
  analyticsService.logEvent('prepaid_offer_declined', {
    offer_id: prepaidOffer.offerId,
    discount_amount: prepaidOffer.discountAmount
  });
  setShowOfferModal(false);
};
```

---

## 🚀 Performance Optimization

### Memoization
```javascript
import { useMemo } from 'react';

const memoizedOffer = useMemo(() => prepaidOffer, [prepaidOffer?.offerId]);
```

### Lazy Loading
```javascript
const DiscountBanner = lazy(() => import('../components/DiscountBanner'));
const EnhancedPrepaidOfferModal = lazy(() => import('../components/EnhancedPrepaidOfferModal'));
```

### Cleanup
```javascript
useEffect(() => {
  return () => {
    // Clear timers and animations on unmount
    setDiscountOffer(null);
    setPrepaidOffer(null);
    setShowOfferModal(false);
  };
}, []);
```

---

## 🎯 User Experience Best Practices

### 1. **Non-Intrusive Display**
- Banner appears at top, doesn't block chat
- Modal only shows when session ends or user taps banner
- User can dismiss banner but offer remains available

### 2. **Clear Value Proposition**
- Show original price vs discounted price
- Display savings amount prominently
- List all benefits clearly

### 3. **Urgency Without Pressure**
- Countdown timer creates urgency
- "Maybe Later" option always available
- No forced acceptance

### 4. **Trust Building**
- Show trust indicators (secure payment, privacy)
- Display feature list
- Professional design and animations

### 5. **Accessibility**
- Large tap targets (44x44 minimum)
- High contrast text
- Clear call-to-action buttons

---

## 📝 Next Steps

1. **Integrate components** into your free chat screen
2. **Test socket events** with backend
3. **Verify animations** on different devices
4. **Track analytics** for optimization
5. **Gather user feedback** and iterate

---

## 🐛 Common Issues & Solutions

### Issue: Banner not showing
**Solution:** Check socket connection and event listener registration

### Issue: Timer not updating
**Solution:** Verify `validUntil` is a valid ISO timestamp

### Issue: Modal not opening
**Solution:** Ensure `prepaidOffer` state is set before showing modal

### Issue: Animations laggy
**Solution:** Use `useNativeDriver: true` for transform animations

### Issue: Discount calculation wrong
**Solution:** Verify backend is sending correct `discountAmount` and `finalAmount`

---

**Status:** ✅ UI Components Ready for Integration
**Estimated Integration Time:** 2-3 hours
**Testing Time:** 1-2 hours
