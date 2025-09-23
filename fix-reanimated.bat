@echo off
echo Fixing React Native Reanimated build issues...
echo.

echo Step 1: Stopping any running Metro processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Step 2: Cleaning node_modules and caches...
rd /s /q node_modules 2>nul
del package-lock.json 2>nul
del yarn.lock 2>nul
rd /s /q .expo 2>nul
echo.

echo Step 3: Installing dependencies with fixed reanimated version...
npm install --legacy-peer-deps
echo.

echo Step 4: Installing Expo's recommended reanimated version...
npx expo install react-native-reanimated
echo.

echo Step 5: Cleaning Android build cache...
cd android
call gradlew clean
cd ..
echo.

echo Step 6: Clearing Metro cache...
npx expo start --clear-cache
echo.

echo Reanimated fix completed!
echo Try running: npx expo run:android --clear
pause
