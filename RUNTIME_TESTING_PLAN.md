# 🧪 Runtime Testing Plan - Crash-on-First-Start Validation

## Test Matrix Overview

### Device Testing Requirements
| Android Version | Memory | Network | Install Method | Priority |
|----------------|--------|---------|----------------|----------|
| Android 15 | 8GB+ | WiFi | Play Store | HIGH |
| Android 14 | 4GB | Mobile Data | Play Store | HIGH |
| Android 13 | 2GB | Slow 2G | APK Direct | HIGH |
| Android 12 | 1GB | Offline | Play Store | CRITICAL |
| Android 11 | 4GB | WiFi | Play Store | MEDIUM |
| Android 10 | 2GB | Mobile Data | APK Direct | MEDIUM |
| Android 9 | 1GB | Offline | Play Store | LOW |
| Android 8 | 512MB | Slow 2G | APK Direct | LOW |

---

## 🔴 Critical Test Scenarios (Must Pass)

### 1. Fresh Install Cold Start
```bash
# Test Commands
adb uninstall com.jyotishtalk
adb install -r app-release.apk
adb shell am start -n com.jyotishtalk/.MainActivity
adb logcat | grep -E "(FATAL|JyotishCall|AndroidRuntime)"
```

**Expected Behavior:**
- App launches within 3 seconds
- Splash screen appears immediately
- No crashes or ANRs
- Login screen renders successfully
- No FATAL errors in logcat

### 2. Android 12+ Compatibility Test
```bash
# Test on Android 12+ devices
adb shell getprop ro.build.version.sdk
# Should be 31+ for Android 12+

# Monitor for exported activity issues
adb logcat | grep -E "(exported|SecurityException)"
```

**Expected Behavior:**
- No SecurityException for exported activities
- Proper notification permission handling
- No storage permission crashes

### 3. Low Memory Stress Test
```bash
# Simulate low memory conditions
adb shell dumpsys meminfo com.jyotishtalk
adb shell am kill-all  # Kill background apps
adb shell am start -n com.jyotishtalk/.MainActivity
```

**Expected Behavior:**
- App starts even with limited memory
- Graceful handling of memory pressure
- No OutOfMemoryError crashes

### 4. Network Failure Test
```bash
# Disable network during app start
adb shell svc wifi disable
adb shell svc data disable
adb shell am start -n com.jyotishtalk/.MainActivity
# Wait 10 seconds
adb shell svc wifi enable
adb shell svc data enable
```

**Expected Behavior:**
- App starts without network
- Version check fails gracefully
- No network-related crashes
- UI remains responsive

### 5. Corrupted Storage Test
```bash
# Corrupt AsyncStorage data
adb shell run-as com.jyotishtalk
# Navigate to app data directory
# Corrupt stored auth data
echo "invalid_json_data" > databases/AsyncStorage
exit
adb shell am start -n com.jyotishtalk/.MainActivity
```

**Expected Behavior:**
- App detects corrupted data
- Clears corrupted storage
- Continues with fresh state
- No JSON parsing crashes

---

## 🟡 Moderate Test Scenarios

### 6. Permission Denial Test
- Deny all permissions during first launch
- Verify app doesn't crash
- Check graceful permission handling

### 7. Deep Link Launch Test
- Launch app via deep link on first install
- Verify proper navigation handling
- No deep link processing crashes

### 8. Background App Launch Test
- Install app but don't open
- Launch via notification or background service
- Verify proper initialization

### 9. Storage Full Test
- Fill device storage to 95%+
- Attempt app installation and launch
- Verify graceful storage handling

### 10. Rapid Launch/Kill Test
- Launch app and immediately force-kill
- Repeat 10 times rapidly
- Check for state corruption issues

---

## 📊 Instrumentation & Monitoring

### Logcat Monitoring Commands
```bash
# Monitor all app logs
adb logcat | grep "JyotishCall"

# Monitor crashes only
adb logcat | grep -E "(FATAL|AndroidRuntime)"

# Monitor memory issues
adb logcat | grep -E "(OutOfMemory|GC_|lowmemorykiller)"

# Monitor React Native bridge issues
adb logcat | grep -E "(ReactNative|JSI|Hermes)"

# Monitor network issues
adb logcat | grep -E "(Network|HTTP|Socket)"
```

### Key Metrics to Track
```javascript
// Add to analytics tracking
const crashMetrics = {
  // Time-based metrics
  time_to_splash: Date.now() - app_start_time,
  time_to_login_screen: Date.now() - app_start_time,
  time_to_interactive: Date.now() - app_start_time,
  
  // Success metrics
  splash_screen_shown: true/false,
  login_screen_rendered: true/false,
  auth_context_loaded: true/false,
  version_check_completed: true/false,
  
  // Error metrics
  auth_loading_errors: count,
  version_check_errors: count,
  network_errors: count,
  storage_errors: count,
  
  // Device info
  android_version: Build.VERSION.SDK_INT,
  available_memory: Runtime.getRuntime().maxMemory(),
  device_model: Build.MODEL,
  app_version: "5.1.6"
};
```

---

## 🎯 Success Criteria

### Critical KPIs (Must Achieve)
- **Crash-free first sessions**: ≥ 99.8%
- **Time to login screen**: ≤ 3 seconds
- **Android 12+ compatibility**: 100%
- **Low memory handling**: No crashes on 1GB RAM devices

### Performance KPIs
- **App start time**: ≤ 2 seconds (cold start)
- **Memory usage**: ≤ 150MB on startup
- **Network timeout handling**: Graceful failures
- **Storage error recovery**: 100% success rate

### User Experience KPIs
- **Install to first open**: ≥ 85%
- **First open to login screen**: ≥ 95%
- **Login screen interaction**: ≥ 90%
- **Successful login completion**: ≥ 80%

---

## 🚀 Testing Execution Plan

### Phase 1: Automated Testing (Week 1)
```bash
# Run validation script
node CRASH_VALIDATION_SCRIPT.js

# Build release APK
npx expo build:android --type apk

# Automated device testing
for device in emulator-5554 emulator-5556 emulator-5558; do
  echo "Testing on $device"
  adb -s $device uninstall com.jyotishtalk
  adb -s $device install app-release.apk
  adb -s $device shell am start -n com.jyotishtalk/.MainActivity
  sleep 10
  adb -s $device logcat -d | grep -E "(FATAL|JyotishCall)" > "test_results_$device.log"
done
```

### Phase 2: Manual Testing (Week 1-2)
- Test on 5+ physical devices (Android 8-15)
- Vary network conditions and memory states
- Test different installation methods
- Validate user flows end-to-end

### Phase 3: Production Validation (Week 2-3)
- Deploy to 10% of users via staged rollout
- Monitor crash-free session rate in real-time
- Compare install-to-login conversion rates
- Analyze crash reports and performance metrics

---

## 📈 Attribution Analysis & Tracking

### Current Attribution Issues Identified

1. **Install Referrer Implementation Missing**
   ```javascript
   // Add to App.js or separate service
   import { getInstallReferrerInfo } from 'react-native-install-referrer';
   
   useEffect(() => {
     const trackInstallReferrer = async () => {
       try {
         const referrerInfo = await getInstallReferrerInfo();
         console.log('Install referrer:', referrerInfo);
         
         // Send to analytics
         analyticsService.logEvent('install_referrer_received', {
           referrer_url: referrerInfo.installReferrer,
           click_timestamp: referrerInfo.referrerClickTimestamp,
           install_timestamp: referrerInfo.appInstallTimestamp
         });
       } catch (error) {
         console.error('Install referrer failed:', error);
       }
     };
     
     trackInstallReferrer();
   }, []);
   ```

2. **First Open vs Install Event Mismatch**
   ```javascript
   // Track first app open properly
   const trackFirstOpen = async () => {
     const isFirstOpen = await AsyncStorage.getItem('app_first_opened');
     
     if (!isFirstOpen) {
       await AsyncStorage.setItem('app_first_opened', 'true');
       
       // Track first open event
       analyticsService.logEvent('first_open', {
         timestamp: new Date().toISOString(),
         platform: 'android',
         version: '5.1.6'
       });
     }
   };
   ```

3. **Attribution Window Analysis**
   - Google Ads: 30-day click, 1-day view attribution
   - Firebase: 30-day click, 1-day view attribution
   - Recommended: Align attribution windows

### Attribution Funnel Tracking
```javascript
// Implement comprehensive funnel tracking
const attributionFunnel = {
  // Stage 1: App Install (Google Play)
  app_installed: {
    source: 'google_play',
    campaign: utm_campaign,
    timestamp: install_timestamp
  },
  
  // Stage 2: First Open (App Launch)
  first_open: {
    timestamp: first_open_timestamp,
    time_since_install: first_open_timestamp - install_timestamp
  },
  
  // Stage 3: Splash Screen Shown
  splash_shown: {
    timestamp: splash_timestamp,
    time_since_open: splash_timestamp - first_open_timestamp
  },
  
  // Stage 4: Login Screen Rendered
  login_screen_shown: {
    timestamp: login_screen_timestamp,
    time_since_splash: login_screen_timestamp - splash_timestamp
  },
  
  // Stage 5: Login Attempted
  login_attempted: {
    timestamp: login_attempt_timestamp,
    method: 'phone_otp'
  },
  
  // Stage 6: Login Successful
  login_success: {
    timestamp: login_success_timestamp,
    user_id: user_id
  }
};
```

---

## 🔧 Rollout Strategy

### Staged Rollout Plan
1. **Internal Testing** (Days 1-3): Team devices only
2. **Alpha Testing** (Days 4-7): 1% of users
3. **Beta Testing** (Days 8-14): 10% of users
4. **Production Rollout** (Days 15-21): 100% of users

### Rollback Criteria
- Crash-free sessions drop below 99.5%
- Install-to-login conversion drops by >10%
- Critical crashes on Android 12+
- User complaints increase significantly

### Monitoring Dashboard
- Real-time crash rate by Android version
- Install-to-login conversion funnel
- Performance metrics (startup time, memory usage)
- Attribution tracking accuracy
- User feedback and ratings

---

## ✅ Final Validation Checklist

Before production deployment:

- [ ] All critical fixes applied and validated
- [ ] Error boundary catches all crashes
- [ ] AuthContext handles corrupted data
- [ ] Version check fails gracefully
- [ ] ProGuard rules prevent minification issues
- [ ] Android 12+ compatibility verified
- [ ] Low memory scenarios tested
- [ ] Network failure handling validated
- [ ] Attribution tracking implemented
- [ ] Monitoring dashboard configured
- [ ] Rollback plan prepared
- [ ] Team trained on incident response

**Estimated Impact**: 60-80% reduction in first-launch crashes, 20-30% improvement in install-to-login conversion rate.
