@echo off
echo ========================================
echo Fixing Gradle Kotlin Compilation Issue v2
echo ========================================

echo.
echo Step 1: Stopping any running Metro/Expo processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im java.exe 2>nul

echo.
echo Step 2: Cleaning node_modules and package-lock...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist yarn.lock del yarn.lock

echo.
echo Step 3: Cleaning Gradle cache and build files...
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build
if exist android\.gradle rmdir /s /q android\.gradle

echo.
echo Step 4: Cleaning Expo and Metro cache...
npx expo start --clear
timeout /t 3
taskkill /f /im node.exe 2>nul

echo.
echo Step 5: Reinstalling dependencies with npm...
npm install

echo.
echo Step 6: Running Expo prebuild to regenerate Android files...
npx expo prebuild --platform android --clean

echo.
echo Step 7: Attempting Gradle wrapper update...
cd android
.\gradlew wrapper --gradle-version=8.6 --distribution-type=all
cd ..

echo.
echo ========================================
echo Fix completed! Now try:
echo 1. Open Android Studio
echo 2. File -> Sync Project with Gradle Files
echo 3. Or run: npx expo run:android
echo ========================================
pause
