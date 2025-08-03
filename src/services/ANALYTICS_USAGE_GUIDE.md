# Firebase Analytics Usage Guide for JyotishCall User App

## Overview
This guide explains how to use Firebase Analytics for install attribution and custom event tracking in the JyotishCall user app.

## Key Features Implemented

### 1. Install Attribution Events
- **`first_open`**: Automatically tracked on first app launch
- **`app_install`**: Automatically tracked on first app installation
- **`app_open`**: Tracked on every app launch for session tracking

### 2. Custom Events
- **`login_success`**: Tracked after successful OTP verification
- **`consultation_*`**: Various consultation-related events
- **`purchase`**: Revenue tracking for wallet recharges

## Automatic Tracking

The following events are tracked automatically:

### App Launch Events
```javascript
// These are tracked automatically when the app starts
- first_open (only once per install)
- app_install (only once per install)  
- app_open (every app launch)
```

### Login Events
```javascript
// Tracked automatically in AuthContext after successful OTP verification
- login_success (with user_id, login_method, is_first_login)
- login (standard Firebase event)
```

## Manual Event Tracking

### Basic Event Tracking
```javascript
import analyticsService from '../services/analyticsService';

// Track a simple event
await analyticsService.logEvent('button_clicked', {
  button_name: 'start_consultation',
  screen_name: 'home'
});
```

### Consultation Events
```javascript
// Track consultation start
await analyticsService.trackConsultationEvent('started', {
  type: 'video', // 'video', 'voice', 'chat'
  astrologer_id: 'astrologer123',
  amount: 100
});

// Track consultation completion
await analyticsService.trackConsultationEvent('completed', {
  type: 'video',
  astrologer_id: 'astrologer123',
  duration: 600, // seconds
  amount: 100
});
```

### Purchase Events
```javascript
// Track wallet recharge
await analyticsService.trackPurchase({
  amount: 500,
  transactionId: 'txn_123456',
  category: 'wallet_recharge',
  paymentMethod: 'razorpay'
});
```

## Install Attribution

### How It Works
1. **Firebase automatically tracks install sources** (Google Ads, organic, etc.)
2. **`first_open` and `app_install` events** are crucial for attribution
3. **`login_success` event** helps measure post-install engagement
4. **Custom events** help measure user quality and LTV

### Attribution Chain
```
Install → first_open → app_install → login_success → consultation_started → purchase
```

### Key Metrics for Attribution
- **Install-to-Login Rate**: % of installs that result in login
- **Install-to-Consultation Rate**: % of installs that result in consultations
- **Install-to-Purchase Rate**: % of installs that result in purchases

## Google Ads Integration

### Campaign Tracking
Firebase automatically tracks:
- Campaign source
- Campaign medium  
- Campaign name
- Ad group
- Creative
- Keyword (for search campaigns)

### Custom Parameters
You can add custom parameters to track specific campaigns:
```javascript
await analyticsService.logEvent('campaign_interaction', {
  campaign_id: 'summer_2024',
  ad_creative: 'video_testimonial',
  user_segment: 'new_user'
});
```

## Debugging and Testing

### Check Analytics Status
```javascript
const status = await analyticsService.getAnalyticsStatus();
console.log('Analytics Status:', status);
```

### Reset Analytics Data (for testing)
```javascript
// Only use this during development/testing
await analyticsService.resetAnalyticsData();
```

### Enable/Disable Analytics
```javascript
// For privacy compliance
await analyticsService.setAnalyticsEnabled(false); // Disable
await analyticsService.setAnalyticsEnabled(true);  // Enable
```

## Best Practices

### 1. Event Naming
- Use snake_case for event names
- Be descriptive but concise
- Group related events with prefixes (e.g., `consultation_started`, `consultation_ended`)

### 2. Parameters
- Keep parameter names consistent
- Use meaningful values
- Include timestamp for time-based analysis

### 3. User Privacy
- Don't track PII (personally identifiable information)
- Use user IDs instead of phone numbers/emails
- Respect user privacy settings

## Firebase Console

### Viewing Events
1. Go to Firebase Console → Analytics → Events
2. Look for custom events like `login_success`, `consultation_started`
3. Check real-time events in DebugView (for debug builds)

### Attribution Reports
1. Go to Firebase Console → Analytics → Attribution
2. View install attribution by source/medium/campaign
3. Analyze conversion funnels from install to key events

### Audience Building
1. Create audiences based on events (e.g., users who completed login)
2. Use audiences for remarketing campaigns
3. Export audiences to Google Ads

## Implementation Checklist

- [x] Firebase Analytics plugin added to app.json
- [x] Analytics service created and initialized
- [x] App launch events (first_open, app_install) tracked
- [x] Login success event tracked after OTP verification
- [x] Purchase events ready for wallet recharge tracking
- [x] Consultation events ready for session tracking
- [ ] Test events in Firebase Console DebugView
- [ ] Verify attribution data in Firebase Console
- [ ] Set up conversion tracking in Google Ads

## Troubleshooting

### Events Not Showing
1. Check if Firebase Analytics is enabled in Firebase Console
2. Verify google-services.json is correct
3. Check app logs for analytics errors
4. Use DebugView for real-time event testing

### Attribution Not Working
1. Ensure first_open and app_install events are firing
2. Check if Google Ads campaigns are properly tagged
3. Verify Firebase project is linked to Google Ads
4. Allow 24-48 hours for attribution data to appear

## Next Steps

1. **Test the implementation** by installing the app and checking Firebase Console
2. **Set up conversion tracking** in Google Ads using Firebase events
3. **Create custom audiences** based on user behavior
4. **Monitor attribution reports** to optimize ad campaigns
5. **Add more custom events** as needed for business insights
