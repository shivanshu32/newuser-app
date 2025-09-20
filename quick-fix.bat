@echo off
echo Quick Fix for Build Issues...
echo.

echo Step 1: Stop Gradle daemon...
cd android
.\gradlew --stop
cd ..

echo Step 2: Clean build directories...
if exist android\app\build rmdir /s /q android\app\build

echo Step 3: Try simple release build...
cd android
.\gradlew clean
.\gradlew assembleRelease --no-daemon
cd ..

echo Done!
pause
