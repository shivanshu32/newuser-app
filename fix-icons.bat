@echo off
echo Fixing icon display issues in user-app...
echo.

echo Step 1: Stopping any running Metro processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.

echo Step 2: Clearing all caches...
echo Clearing Metro cache...
rd /s /q .expo 2>nul
rd /s /q node_modules\.cache 2>nul
echo.

echo Step 3: Clearing npm cache...
npm cache clean --force
echo.

echo Step 4: Reinstalling dependencies...
echo Removing node_modules...
rd /s /q node_modules 2>nul
echo.

echo Installing fresh dependencies...
npm install --legacy-peer-deps
echo.

echo Step 5: Installing Expo modules with correct versions...
npx expo install --fix
echo.

echo Step 6: Installing required Expo packages...
npx expo install expo-asset expo-av expo-constants expo-dev-client expo-device expo-font expo-linear-gradient expo-notifications expo-status-bar expo-system-ui expo-updates
echo.

echo Step 7: Ensuring vector icons are properly installed...
npx expo install @expo/vector-icons
echo.

echo Step 8: Clearing Metro bundler cache...
npx expo start --clear-cache
echo.

echo Icon fix script completed!
echo The app should now display icons properly.
echo If issues persist, try: npx expo run:android --clear
pause
