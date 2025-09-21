@echo off
echo ========================================
echo Upgrading Jyotish Call User App to Expo SDK 54
echo ========================================
echo.

echo Step 1: Stopping any running Metro processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul
echo.

echo Step 2: Cleaning all caches...
echo Clearing Metro cache...
rd /s /q .expo 2>nul
rd /s /q node_modules\.cache 2>nul
rd /s /q %TEMP%\metro-* 2>nul
rd /s /q %TEMP%\react-* 2>nul
echo.

echo Step 3: Clearing npm cache...
npm cache clean --force
echo.

echo Step 4: Removing node_modules...
rd /s /q node_modules 2>nul
echo.

echo Step 5: Installing Expo SDK 54 dependencies...
npm install
echo.

echo Step 6: Running Expo install to fix compatibility...
npx expo install --fix
echo.

echo Step 7: Installing updated vector icons...
npx expo install @expo/vector-icons
echo.

echo Step 8: Prebuild for native compatibility...
npx expo prebuild --clean
echo.

echo ========================================
echo Expo SDK 54 Upgrade Complete!
echo ========================================
echo.
echo Changes made:
echo - Expo SDK: 53.0.22 → 54.0.0
echo - React: 19.0.0 → 19.1.0  
echo - React Native: 0.79.5 → 0.81.0
echo - @expo/vector-icons: 14.0.0 → 15.0.2
echo - Android target SDK: 35 → 36
echo - App version: 5.2.9 → 5.3.0
echo.
echo Your Ionicons should now work properly!
echo.
echo To test: npx expo start --clear-cache
echo.
pause
