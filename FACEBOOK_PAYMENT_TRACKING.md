# Facebook SDK Payment Tracking Implementation

## Overview
This implementation adds comprehensive Facebook SDK payment tracking for Razorpay payments in the JyotishCall user-app, enabling proper attribution and conversion tracking for Facebook Ads campaigns.

## Features Implemented

### 1. **Facebook Tracking Service** (`src/services/facebookTrackingService.js`)
A comprehensive service that handles all Facebook SDK tracking events:

#### **Payment Events:**
- `InitiatedCheckout` - When user starts payment process
- `Purchase` - When payment is completed successfully
- `WalletRecharge` - Custom event for wallet top-ups
- `PaymentFailed` - When payment fails
- `PrepaidOfferPurchase` - Specific tracking for prepaid chat offers

#### **User Events:**
- `CompleteRegistration` - User registration/login
- `FirstPayment` - First payment milestone (important for attribution)
- `AppInstall` - App installation tracking
- `ConversionMilestone` - Custom conversion events

#### **User Properties:**
- User ID, registration date, wallet balance
- Total consultations, preferred consultation type
- Enhanced targeting data for Facebook Ads

### 2. **Payment Screen Integration**

#### **RazorpayPaymentScreen.js:**
- ✅ Tracks payment initiation when screen loads
- ✅ Tracks successful payments with detailed parameters
- ✅ Tracks payment failures with error details
- ✅ Handles both wallet recharge and prepaid offer payments
- ✅ Calculates bonus amounts and total wallet credits
- ✅ Tracks first payment milestone

#### **PrepaidOfferPaymentScreen.js:**
- Ready for integration (uses same RazorpayPaymentScreen)
- Automatically tracks prepaid offer purchases

### 3. **User Registration Tracking** (`AuthContext.js`)
- ✅ Tracks user registration/login events
- ✅ Sets user properties for better ad targeting
- ✅ Links payment events to user profiles

### 4. **App Install Tracking** (`App.js`)
- ✅ Tracks app installs on first launch
- ✅ Non-blocking initialization
- ✅ Crash-safe implementation

## Facebook Events Tracked

### **Standard Commerce Events:**
1. **InitiatedCheckout** - User starts payment
   - Amount, currency, payment type
   - Package details (if applicable)
   - Content ID and category

2. **Purchase** - Payment completed
   - Amount, currency, payment ID
   - Package bonus information
   - Total wallet credit amount

3. **CompleteRegistration** - User signs up
   - Registration method (phone_otp)
   - User ID and timestamp

### **Custom Events:**
1. **WalletRecharge** - Wallet top-up completed
   - Wallet credit amount
   - Payment method (razorpay)
   - Package bonus details

2. **PrepaidOfferPurchase** - Prepaid chat offer purchased
   - Astrologer name and duration
   - Consultation type (chat)
   - Offer-specific parameters

3. **PaymentFailed** - Payment failure
   - Error message and amount
   - Payment type and package info

4. **FirstPayment** - User's first payment
   - Important for attribution
   - Tracks conversion from install to payment

5. **ConversionMilestone** - Custom milestones
   - Flexible event for tracking key actions
   - Used for optimization

## Implementation Details

### **Event Parameters:**
All events include comprehensive parameters for better targeting:
- `fb_content_type` - Type of content/action
- `fb_content_id` - Unique identifier
- `fb_content_name` - Human-readable name
- `fb_content_category` - Category classification
- `fb_currency` - Currency (INR)
- `fb_num_items` - Number of items (usually 1)
- Custom parameters for business logic

### **Package Tracking:**
For recharge packages, tracks:
- Package ID and name
- Bonus percentage/amount
- Total wallet credit vs amount paid
- Package category

### **Prepaid Offer Tracking:**
For prepaid chat offers, tracks:
- Offer ID and astrologer name
- Duration and consultation type
- Specific offer parameters

### **Error Handling:**
- All tracking is non-blocking
- Failures don't affect payment flow
- Comprehensive error logging
- Graceful fallbacks

## Usage Examples

### **Manual Testing:**
```javascript
import FacebookTrackingTestButton from './src/components/FacebookTrackingTestButton';

// Add to any screen for testing
<FacebookTrackingTestButton />
```

### **Check Tracking Status:**
```javascript
import facebookTrackingService from './src/services/facebookTrackingService';

const status = facebookTrackingService.getStatus();
console.log('Facebook tracking status:', status);
```

## Facebook Ads Integration

### **Campaign Optimization:**
- Use `Purchase` events for conversion optimization
- Use `InitiatedCheckout` for checkout optimization
- Use `FirstPayment` for new customer acquisition

### **Audience Creation:**
- Create audiences based on `WalletRecharge` events
- Target users who completed `CompleteRegistration`
- Retarget users who triggered `InitiatedCheckout` but not `Purchase`

### **Attribution:**
- Track install-to-payment conversion funnel
- Measure campaign ROI with actual payment values
- Optimize for high-value users (package purchasers)

## Configuration Required

### **Facebook App Settings:**
1. Ensure Facebook App ID is correct in `app.config.js`
2. Enable App Events in Facebook App Dashboard
3. Configure conversion events for optimization
4. Set up attribution windows

### **Facebook Ads Manager:**
1. Create custom conversions based on events
2. Set up conversion tracking for campaigns
3. Configure attribution models
4. Enable automatic event matching

## Testing & Verification

### **Development Testing:**
1. Use `FacebookTrackingTestButton` component
2. Check console logs for event tracking
3. Verify events in Facebook Analytics

### **Production Verification:**
1. Monitor Facebook Events Manager
2. Check event delivery and matching
3. Verify attribution data
4. Monitor conversion tracking

## Benefits

### **For Marketing:**
- ✅ Accurate attribution of Facebook Ads to payments
- ✅ Detailed conversion tracking with actual revenue
- ✅ Better audience targeting based on payment behavior
- ✅ Optimized campaigns for high-value users

### **For Analytics:**
- ✅ Complete payment funnel tracking
- ✅ User behavior insights
- ✅ Package performance analysis
- ✅ First payment conversion rates

### **For Business:**
- ✅ ROI measurement for Facebook Ads
- ✅ Customer lifetime value tracking
- ✅ Payment success/failure analysis
- ✅ User acquisition cost optimization

## Files Modified/Created

### **New Files:**
- `src/services/facebookTrackingService.js` - Main tracking service
- `src/components/FacebookTrackingTestButton.js` - Testing component
- `FACEBOOK_PAYMENT_TRACKING.md` - This documentation

### **Modified Files:**
- `src/screens/main/RazorpayPaymentScreen.js` - Payment tracking integration
- `src/context/AuthContext.js` - User registration tracking
- `App.js` - App install tracking

## Next Steps

1. **Test Implementation:**
   - Add test button to development builds
   - Verify events in Facebook Analytics
   - Test with real payments

2. **Facebook Ads Setup:**
   - Configure conversion events
   - Set up attribution windows
   - Create optimized campaigns

3. **Monitor & Optimize:**
   - Track event delivery rates
   - Monitor attribution accuracy
   - Optimize based on performance data

## Support

For issues or questions:
1. Check console logs for tracking errors
2. Verify Facebook SDK configuration
3. Test with FacebookTrackingTestButton
4. Monitor Facebook Events Manager for event delivery
