@echo off
echo ========================================
echo Firebase Analytics Debug Mode Setup
echo ========================================
echo.

echo Checking for connected devices...
adb devices
echo.

echo Enabling Firebase Debug Mode for com.jyotishtalk...
adb shell setprop debug.firebase.analytics.app com.jyotishtalk
echo.

echo Verifying debug mode is enabled...
adb shell getprop debug.firebase.analytics.app
echo.

echo ========================================
echo Debug mode enabled successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Open Firebase Console: https://console.firebase.google.com
echo 2. Select project: jyotish2-dd398
echo 3. Go to: Analytics -^> DebugView
echo 4. You should see your device listed
echo.
echo To monitor logs, run:
echo adb logcat ^| findstr "TRACKING GA4 Firebase"
echo.
pause
