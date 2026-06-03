# 🧪 Testing Script - Event Verification

## 📱 Setup Instructions

### 1. Enable Firebase Debug Mode
```bash
# Connect your Android device via USB
adb devices

# Enable debug mode for your app
adb shell setprop debug.firebase.analytics.app com.jyotishtalk

# Verify it's enabled
adb shell getprop debug.firebase.analytics.app
# Should output: com.jyotishtalk
```

### 2. Open Firebase Console
1. Go to: https://console.firebase.google.com
2. Select project: **jyotish2-dd398**
3. Navigate to: **Analytics → DebugView**
4. You should see your device listed

### 3. Start Monitoring Logs
```bash
# In a separate terminal, monitor logs
adb logcat | grep -E "TRACKING|GA4|Firebase|Analytics"
```

---

## ✅ Test Scenario 1: New User Complete Journey

### Step 1: Fresh Install & Sign Up
**Action:** Install app and sign up with new phone number

**Expected Events:**
- ✅ `sign_up` (GA4) + `CompleteRegistration` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Sign up event tracked
```

**Verify in Firebase DebugView:**
- Event: `sign_up`
- Parameters: `method`, `user_id`, `timestamp`

---

### Step 2: Complete Profile
**Action:** Fill out profile form and save

**Expected Events:**
- ✅ `profile_completed` (GA4) + `ProfileCompleted` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Profile completed
```

**Verify in Firebase DebugView:**
- Event: `profile_completed`
- Parameters: `has_birth_date`, `has_birth_time`, `has_birth_location`, `gender`, `is_required`

---

### Step 3: View Astrologer Profile
**Action:** Browse and open an astrologer's profile

**Expected Events:**
- ✅ `view_astrologer_profile` (GA4) + `ViewContent` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Astrologer profile viewed: [Astrologer Name]
```

**Verify in Firebase DebugView:**
- Event: `view_astrologer_profile`
- Parameters: `astrologer_id`, `astrologer_name`, `astrologer_rating`, `is_online`, `chat_rate`, `voice_rate`

---

### Step 4: Initiate Chat Booking
**Action:** Click "Book Chat" button

**Expected Events:**
- ✅ `chat_booking_initiated` (GA4) + `ChatBookingInitiated` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Chat booking initiated: [Booking Type]
```

**Verify in Firebase DebugView:**
- Event: `chat_booking_initiated`
- Parameters: `astrologer_id`, `astrologer_name`, `chat_rate`, `specialties`

---

### Step 5: Booking Request Sent
**Action:** Proceed to waiting screen

**Expected Events:**
- ✅ `booking_request_sent` (GA4) + `BookingRequestSent` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Booking request sent: [Booking Type]
```

**Verify in Firebase DebugView:**
- Event: `booking_request_sent`
- Parameters: `booking_id`, `session_id`, `astrologer_id`, `booking_type`, `is_prepaid_offer`

---

### Step 6: Begin Checkout (Wallet Recharge)
**Action:** Proceed to payment for wallet top-up

**Expected Events:**
- ✅ `begin_checkout` (GA4) + `InitiateCheckout` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Begin checkout tracked (GA4 + Meta): { value: [Amount], bonus: [Bonus] }
```

**Verify in Firebase DebugView:**
- Event: `begin_checkout`
- Parameters: `currency`, `value`, `items`, `bonus_amount`, `total_wallet_credit`

---

### Step 7: Complete Purchase (First Payment)
**Action:** Complete payment via Razorpay

**Expected Events:**
- ✅ `purchase` (GA4) + `Purchase` (Meta)
- ✅ `first_payment` (GA4) + `FirstPayment` (Meta) [ONLY if first payment]

**Verify in Logs:**
```
📊 [TRACKING] Purchase tracked: [Transaction ID]
📊 [TRACKING] First payment tracked for user: [User ID]
```

**Verify in Firebase DebugView:**
- Event: `purchase`
  - Parameters: `transaction_id`, `value`, `currency`, `items`, `payment_method`
- Event: `first_payment` (if first time)
  - Parameters: `transaction_id`, `value`, `currency`, `payment_method`

**CRITICAL CHECK:**
- ✅ Verify `transaction_id` is unique
- ✅ Verify NO duplicate purchase events
- ✅ Verify `first_payment` only fires once per user

---

### Step 8: Chat Session Started
**Action:** Astrologer accepts, chat session begins

**Expected Events:**
- ✅ `chat_session_started` (GA4) + `ChatSessionStarted` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Chat session started: [Booking ID]
```

**Verify in Firebase DebugView:**
- Event: `chat_session_started`
- Parameters: `booking_id`, `session_id`, `astrologer_id`, `session_type`, `is_prepaid`, `duration`

---

### Step 9: Chat Session Completed
**Action:** Session ends (timer expires or manual end)

**Expected Events:**
- ✅ `chat_session_completed` (GA4) + `ChatSessionCompleted` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Chat session completed: [Booking ID]
```

**Verify in Firebase DebugView:**
- Event: `chat_session_completed`
- Parameters: `booking_id`, `session_duration`, `ended_by`, `is_prepaid`, `message_count`

---

## ✅ Test Scenario 2: Returning User Purchase

### Step 1: Login
**Action:** Login with existing account

**Expected Events:**
- ✅ `login` (GA4) + `fb_mobile_login_success` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Login event tracked
```

**Verify in Firebase DebugView:**
- Event: `login`
- Parameters: `method`, `user_id`

---

### Step 2-9: Repeat Consultation Flow
Follow steps 3-9 from Scenario 1

**CRITICAL CHECK:**
- ✅ Verify `first_payment` does NOT fire (returning user)
- ✅ Verify `purchase` event fires correctly
- ✅ Verify all other events fire as expected

---

## ✅ Test Scenario 3: Ecommerce Purchase

### Step 1: Login
**Action:** Login to app

**Expected Events:**
- ✅ `login`

---

### Step 2: Add to Cart
**Action:** Browse shop, add product to cart

**Expected Events:**
- ✅ `add_to_cart` (GA4) + `AddToCart` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Add to cart tracked: [Product Name]
```

**Verify in Firebase DebugView:**
- Event: `add_to_cart`
- Parameters: `currency`, `value`, `items` (with `item_id`, `item_name`, `item_category`, `price`, `quantity`)

---

### Step 3: Begin Checkout
**Action:** Navigate to checkout screen

**Expected Events:**
- ✅ `begin_checkout` (GA4) + `InitiateCheckout` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Begin checkout tracked (ecommerce): { items: [Count], value: [Total] }
```

**Verify in Firebase DebugView:**
- Event: `begin_checkout`
- Parameters: `currency`, `value`, `tax`, `shipping`, `items`

---

### Step 4: Complete Purchase
**Action:** Complete payment (Razorpay, Wallet, or COD)

**Expected Events:**
- ✅ `purchase` (GA4) + `Purchase` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] Ecommerce purchase tracked: { order_id: [ID], value: [Total], items: [Count] }
```

**Verify in Firebase DebugView:**
- Event: `purchase`
- Parameters: `transaction_id`, `value`, `currency`, `tax`, `shipping`, `items`

---

## ✅ Test Scenario 4: WhatsApp Support

### Step 1: Contact Support
**Action:** Click WhatsApp support button

**Expected Events:**
- ✅ `contact_whatsapp` (GA4) + `Contact` (Meta)

**Verify in Logs:**
```
📊 [TRACKING] WhatsApp contact initiated
```

**Verify in Firebase DebugView:**
- Event: `contact_whatsapp`
- Parameters: `contact_method`, `phone_number`, `message_preview`

---

## 🔍 Verification Checklist

### Firebase Analytics (GA4)
- [ ] All 15 events appear in DebugView
- [ ] Events appear within 1-2 seconds of action
- [ ] All event parameters are present and correct
- [ ] No duplicate purchase events
- [ ] All purchases have unique `transaction_id`
- [ ] `first_payment` only fires once per user
- [ ] User properties are set correctly

### Meta Events Manager
- [ ] Open: https://business.facebook.com/events_manager2
- [ ] Go to: Test Events tab
- [ ] All 15 events appear within 20 minutes
- [ ] Event Match Quality shows "Good" or "Great"
- [ ] No errors or warnings
- [ ] Parameters are correctly formatted

### Production Logs
- [ ] No "❌ [TRACKING]" errors
- [ ] All "📊 [TRACKING]" success messages appear
- [ ] No app crashes related to tracking
- [ ] App performance is normal

---

## 📊 Event Count Verification

After testing all scenarios, verify event counts:

### Expected Event Counts (After All 4 Scenarios)
| Event | Expected Count | Actual Count | Status |
|-------|----------------|--------------|--------|
| `sign_up` | 1 | ___ | ___ |
| `login` | 3 | ___ | ___ |
| `profile_completed` | 1 | ___ | ___ |
| `view_astrologer_profile` | 2 | ___ | ___ |
| `chat_booking_initiated` | 2 | ___ | ___ |
| `booking_request_sent` | 2 | ___ | ___ |
| `begin_checkout` | 4 | ___ | ___ |
| `purchase` | 4 | ___ | ___ |
| `first_payment` | 1 | ___ | ___ |
| `chat_session_started` | 2 | ___ | ___ |
| `chat_session_completed` | 2 | ___ | ___ |
| `add_to_cart` | 1 | ___ | ___ |
| `contact_whatsapp` | 1 | ___ | ___ |

**Total Events:** 26 events across 13 unique event types

---

## 🚨 Common Issues & Solutions

### Issue: Events not appearing in Firebase DebugView
**Solutions:**
1. Verify debug mode: `adb shell getprop debug.firebase.analytics.app`
2. Check device is listed in DebugView
3. Wait 1-2 minutes and refresh
4. Check internet connection
5. Verify Firebase app ID in `firebase.js`

### Issue: "❌ [TRACKING]" errors in logs
**Solutions:**
1. Check error message details
2. Verify Firebase Analytics is initialized
3. Check `analyticsService.js` for issues
4. Verify `react-native-fbsdk-next` is installed
5. Check network connectivity

### Issue: Duplicate purchase events
**Solutions:**
1. Check `transaction_id` is unique
2. Verify only one tracking call in payment success
3. Review `RazorpayPaymentScreen.js` line 313-389
4. Check AsyncStorage for `first_payment_tracked` flag

### Issue: first_payment fires multiple times
**Solutions:**
1. Check AsyncStorage flag: `await AsyncStorage.getItem('first_payment_tracked')`
2. Verify flag is set after first payment
3. Clear app data and test fresh install
4. Check backend transaction count

---

## ✅ Success Criteria

### All Tests Pass When:
- ✅ All 15 events appear in Firebase DebugView
- ✅ All 15 events appear in Meta Test Events
- ✅ No duplicate purchase events
- ✅ `first_payment` fires only once per user
- ✅ All event parameters are complete
- ✅ No tracking errors in logs
- ✅ Event counts match expected values
- ✅ App performance is normal

---

## 📞 Next Steps After Testing

### If All Tests Pass:
1. ✅ Mark testing complete in deployment checklist
2. ✅ Deploy to production
3. ✅ Monitor production events for 7 days
4. ✅ Proceed to Week 2: Platform Integration

### If Issues Found:
1. Document specific issues
2. Review relevant code files
3. Fix issues and re-test
4. Verify fixes in DebugView
5. Repeat testing until all pass

---

**Testing Date:** ___________
**Tester:** ___________
**Device:** ___________
**App Version:** ___________
**Status:** ⬜ Pass / ⬜ Fail

**Notes:**
_______________________________________
_______________________________________
_______________________________________
