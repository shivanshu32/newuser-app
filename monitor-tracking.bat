@echo off
echo ========================================
echo Tracking Events Monitor
echo ========================================
echo.
echo Monitoring tracking events in real-time...
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

adb logcat | findstr /C:"[TRACKING]" /C:"GA4" /C:"Firebase"
