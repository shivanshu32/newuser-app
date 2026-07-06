# JyotishCall – Google App Campaign (UAC) Launch Guide

> **Package:** `com.jyotishtalk` | **Firebase Project:** `jyotish2-dd398`
> **Analytics SDK:** `@react-native-firebase/analytics ^20.5.0`
> **Attribution:** Firebase-only (no MMP required for v1)

---

## Part 1 – Tracking Audit Score

| Area | Status | Score |
|------|--------|-------|
| Firebase SDK installed & configured | ✅ | 20/20 |
| `google-services.json` in `/android/app` | ✅ | 10/10 |
| Analytics initialised on app open | ✅ (now fixed) | 10/10 |
| Custom conversion events instrumented | ✅ (now fixed) | 20/20 |
| Deep Links / App Links | ❌ not set up | 0/10 |
| Consent / CMP | ⚠️ not implemented | 5/10 |
| Google Ads ↔ Firebase link | **TBD – must verify** | –/10 |
| Play Console ↔ Firebase link | **TBD – must verify** | –/10 |
| **Provisional Total** | | **65/100** |

> Final score reaches 80–90 once console linkages and consent are verified.

---

## Part 2 – Events Now Instrumented

| GA4 Event | Where fired | UAC Role |
|-----------|-------------|----------|
| `first_open` | Auto (Firebase SDK) | Warm-up signal only |
| `app_open` | `App.js` on every launch | Session signal |
| `sign_up` | `AuthContext.verifyOtp` (new user) | Reporting only |
| `login` | `AuthContext.verifyOtp` (returning) | **Reporting only – NOT optimisation target** |
| `onboarding_complete` | `AddUserProfile` on save | Funnel depth |
| `first_free_question_sent` | `FixedFreeChatScreen.sendMessage` (once per user) | **PRIMARY CONVERSION** |
| `free_answer_received` | `FixedFreeChatScreen.handleIncomingMessage` (once per session) | Value-delivery confirmation |
| `continue_offer_shown` | `FixedFreeChatScreen.createPrepaidOfferAndShowModal` | Offer exposure |
| `continue_offer_clicked` | `PrepaidOfferBottomSheet.handleProceedToPay` | **Phase 2 optimisation target** |
| `continue_offer_purchased` | `RazorpayPaymentScreen` (paymentType=prepaid_offer) | **Phase 3 optimisation target** |
| `wallet_recharge` | `RazorpayPaymentScreen` (default) + `WalletTopUpSummaryScreen` | Monetisation |
| `chat_pack_purchase` | `RazorpayPaymentScreen` (prepaid_recharge_card) | Monetisation |
| `voice_pack_purchase` | `RazorpayPaymentScreen` (prepaid_voice_card) | Monetisation |
| `begin_checkout` | `WalletTopUpSummaryScreen` | Funnel |
| `purchase` | `WalletTopUpSummaryScreen` + `RazorpayPaymentScreen` | Revenue reporting |
| `first_purchase` | Once per device | High-value signal |
| `consultation_started` | `FixedChatScreen` + `FixedFreeChatScreen` | Engagement |
| `consultation_ended` | Same | Funnel depth |
| `search` | `AstrologersScreen` (≥3 chars, debounced 1s) | Intent signal |
| `rating_submitted` | `RatingScreen` | Quality signal |

### Events to Mark as Conversions in Firebase Console

**Primary (set immediately):**
1. `first_free_question_sent` ← PRIMARY UAC optimisation target (Phase 1)

**Secondary:**
2. `continue_offer_clicked` ← Phase 2 optimisation target
3. `continue_offer_purchased` ← Phase 3 optimisation target (with value)
4. `wallet_recharge` ← Monetisation signal (with value)
5. `chat_pack_purchase` ← Monetisation signal (with value)
6. `voice_pack_purchase` ← Monetisation signal (with value)

**Keep for reporting only (do NOT use as optimisation target):**
7. `login` ← reporting only
8. `purchase` ← revenue reporting

> ⚠️ Do NOT mark `login` as the primary conversion event. It does not represent app value delivery.

---

## Part 3 – Critical Issues Before Spending Money

### Issue 1 – Firebase ↔ Google Ads NOT linked (verify)
**Impact:** Without linking, conversions cannot be imported; UAC cannot optimise.
**Fix:**
1. Firebase Console → Project Settings → Integrations → Google Ads → Link
2. OR Google Ads → Tools & Settings → Linked Accounts → Firebase → Link

### Issue 2 – Play Console ↔ Google Ads NOT linked (verify)
**Impact:** App install numbers won't flow to Ads; store listing assets unavailable.
**Fix:** Google Ads → Tools → Linked Accounts → Google Play → Add

### Issue 3 – Play Console ↔ Firebase NOT linked (verify)
**Impact:** Install attribution may be incomplete.
**Fix:** Play Console → Setup → Services & APIs → Firebase → Link

### Issue 4 – No CMP / Consent Flow
**Impact:** If targeting EEA/UK, non-consented users' data will not flow to GA4 or Ads.
**Fix (non-EEA markets):** Add a simple privacy policy acknowledgement on first launch.
**Fix (EEA/UK):** Implement Google Consent Mode v2 with a CMP.

### Issue 5 – No Firebase Dynamic Links / App Links
**Impact:** Cannot deep-link users from ads directly to specific screens.
**Recommendation:** Set up App Links for production re-engagement later; not blocking for install campaign.

---

## Part 4 – Step-by-Step Google Ads Setup

### Step 1 – Create Google Ads Account
1. Go to ads.google.com → Create account
2. Select "Create a campaign without a goal's guidance" initially
3. Set currency to INR, timezone to Asia/Kolkata

### Step 2 – Configure Billing
1. Tools & Settings → Billing → Settings
2. Add payment method (UPI / credit card / bank transfer)
3. Set monthly spending limit (recommended: 1.5× your monthly budget to avoid throttling)

### Step 3 – Link Firebase to Google Ads
1. Firebase Console → Project Settings (gear icon) → Integrations
2. Click Google Ads → Link → Choose or create Ads account
3. Back in Google Ads → Tools → Linked Accounts → Firebase → confirm Active status

### Step 4 – Link Play Console to Google Ads
1. Google Ads → Tools → Linked Accounts → Google Play → Add
2. Enter Play Developer account email → Link
3. In Play Console → confirm link request

### Step 5 – Import Conversion Events
1. Google Ads → Tools → Conversions → + New conversion action
2. Select "App" → "Firebase" → choose your Firebase app (com.jyotishtalk)
3. Import these events:
   - `first_open` → Category: Install, Count: One, Include in "Conversions": YES
   - `login` → Category: Engagement, Count: One, Include in "Conversions": YES
   - `purchase` → Category: Purchase, Count: One, Value: Use event value, Currency: INR
   - `first_purchase` → Category: Purchase, Count: One, Value: Use event value
4. Wait for Status to change from "No recent conversions" to "Recording"
   - This requires a real device to fire the events (use your phone with a debug build)

### Step 6 – Verify Conversions in DebugView
1. Enable Firebase DebugView on your test device:
   ```bash
   adb shell setprop debug.firebase.analytics.app com.jyotishtalk
   ```
2. Firebase Console → Analytics → DebugView → select device
3. Verify these events appear: `first_open`, `app_open`, `first_free_question_sent`, `continue_offer_shown`, `continue_offer_clicked`, `continue_offer_purchased`
4. In Google Ads → Diagnostics → check conversion import shows "Active"

### Step 7 – Build GA4 Audiences
1. Firebase Console → Analytics → Audiences → Create Audience
   - **"All App Users"**: `first_open` (all users) — shares automatically
   - **"Logged In Users"**: `login` event fired
   - **"Purchasers"**: `purchase` event fired
   - **"First Free Question"**: `first_free_question_sent` fired
   - **"Offer Viewers"**: `continue_offer_shown` fired
   - **"High Intent"**: `continue_offer_clicked` fired
   - **"Purchasers"**: `continue_offer_purchased` or `wallet_recharge` fired
2. Share audiences to Google Ads (automatically available in Ads after ~24h)

### Step 8 – Prepare Creative Assets
**Text Assets (write 5+ of each):**

*Headlines (30 chars max):*
- "Talk to Expert Astrologers"
- "Free Jyotish Consultation"
- "Chat with Top Astrologers"
- "Get Accurate Predictions"
- "Vedic Astrology Experts"
- "Kundli Analysis Chat"

*Descriptions (90 chars max):*
- "Connect with verified Vedic astrologers. First chat free. Download JyotishCall now."
- "Get personalised horoscope & guidance. 500+ certified astrologers. Available 24/7."
- "Kundli, numerology, tarot & more. Chat or voice call. New user free consultation."
- "Trusted by thousands. Real-time predictions. Download and start your free session."
- "India's astrology consultation app. Pay per minute. Talk to experts anytime."

**Image Assets:** 1:1 (1200×1200), 1.91:1 (1200×628), portrait (400×500)
**Video Assets (recommended):** 15–30s demo video showing app screens and consultation flow

### Step 9 – Create the App Campaign
1. Google Ads → Campaigns → + → App (Android) → App Installs
2. App: search for "JyotishCall" or enter package name `com.jyotishtalk`
3. Campaign name: `JyotishCall_UAC_Android_Install_v1`
4. Location: India (or specific states if relevant)
5. Language: Hindi, English
6. Budget: ₹XXXX/day (see budget table below)
7. Bidding: Target CPI (set at 2–3× your acceptable CPI initially to get volume)
8. Ads: add all text assets + images + store listing URL
9. Enable "Use Google Play listings as ads" = YES
10. Click Publish

### Step 10 – Budget Recommendations

| Monthly Budget | Daily Budget | Target CPI Bid | Expected Installs/month |
|----------------|-------------|----------------|------------------------|
| ₹10,000 | ₹333 | ₹15–25 | 400–650 |
| ₹25,000 | ₹833 | ₹12–20 | 1,250–2,000 |
| ₹50,000 | ₹1,666 | ₹10–18 | 2,800–5,000 |

> Start with tCPI bidding. Once you accumulate 30+ conversions/week on `login`, switch to tCPA targeting `login`.

---

## Part 5 – Pre-Launch Checklist

- [ ] Firebase ↔ Google Ads linked (Status: Active)
- [ ] Play Console ↔ Google Ads linked
- [ ] `first_open` conversion visible in Google Ads (Status: Recording)
- [ ] `login` conversion visible in Google Ads (Status: Recording)
- [ ] `purchase` conversion with value visible in Google Ads
- [ ] DebugView shows `first_open`, `app_open`, `login` events on test device
- [ ] App status: Published (Production) OR Open Testing track
- [ ] Play Store listing complete: icon, screenshots, description, short desc
- [ ] Creative assets uploaded: 5+ headlines, 5+ descriptions, 2+ images
- [ ] Billing active in Google Ads
- [ ] Daily budget set
- [ ] Campaign status: Eligible (not Paused/Limited)

---

## Part 6 – Post-Launch Monitoring (First 14 Days)

### Daily Checks
- Cost, Impressions, Clicks, Install rate (IR), CPI
- Conversion rate: Install → `login` → `purchase`
- Store CVR (Play Console → Acquisition reports → Store listing)
- Creative performance (Assets tab → individual asset ratings)

### Day 3–5
- Verify campaign is out of "Learning" phase (usually after 50 installs)
- Check geo breakdown: are high-CPI geos delivering value?
- Device split: tablet vs phone (may want to exclude tablets)
- Check DebugView for any event errors

### Day 7
- If `login` conversions ≥ 30/week: create a new campaign optimising to `login` (tCPA)
- If `purchase` conversions ≥ 10/week: add `purchase` as secondary value bid
- Rotate in new creative assets; pause Weak-rated assets

### Day 10–14
- Evaluate D1 retention (Firebase Analytics → Retention report)
- Compare Login Rate across creatives (which ad drove most logins)
- If CPI > target: lower tCPI bid by 10–15%; allow 48h to re-learn
- If CPI < target and volume is good: scale up daily budget by 20%

### Week 3+
- Graduate best-performing campaign to tCPA with `login` as primary conversion
- Build Lookalike audiences in Google Ads from "Purchasers" GA4 audience
- A/B test video vs image assets
- Consider separate campaigns for Hindi vs English audiences

---

## Part 7 – Evidence Screenshots Needed

To finalise the audit and confirm all linkages, provide screenshots of:

1. **Firebase Console** → Project Settings → Integrations (show Google Ads integration status)
2. **Firebase Console** → Analytics → Events (show `first_open`, `login`, `purchase` in event list)
3. **Firebase Console** → Analytics → Conversions (show which events are marked as conversions)
4. **Firebase Console** → Analytics → DebugView (show at least one session with events firing)
5. **Google Play Console** → App dashboard (show publication status + package name)
6. **Google Play Console** → Setup → Services & APIs (show Firebase link status)
7. **Google Ads** → Linked Accounts (show Firebase + Play links with status)
8. **Google Ads** → Conversions (show imported Firebase conversions with status)

---

## Part 8 – Consent & Privacy Notes

- **India (no EEA targeting):** Minimum requirement: Privacy Policy URL in Play Store listing. Add `@react-native-firebase/analytics` consent mode if needed later.
- **EEA/UK users:** Must implement Google Consent Mode v2:
  ```javascript
  // Call before analytics initialisation
  analytics().setConsent({
    analyticsStorage: userConsented ? 'granted' : 'denied',
    adStorage: userConsented ? 'granted' : 'denied',
    adUserData: userConsented ? 'granted' : 'denied',
    adPersonalization: userConsented ? 'granted' : 'denied',
  });
  ```
- **Facebook SDK (`react-native-fbsdk-next`):** Already integrated; ensure `Settings.initializeSDK()` handles ATT prompt where required.

---

*Generated for JyotishCall user-app — Firebase project: jyotish2-dd398 — Package: com.jyotishtalk*
