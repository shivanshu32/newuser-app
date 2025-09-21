@echo off
echo Fixing React 19 + Expo SDK 53 icon compatibility issues...
echo.

echo Step 1: Stopping all Metro processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul
echo.

echo Step 2: Clearing all caches and temporary files...
rd /s /q .expo 2>nul
rd /s /q node_modules\.cache 2>nul
rd /s /q %TEMP%\metro-* 2>nul
rd /s /q %TEMP%\react-* 2>nul
echo.

echo Step 3: Clearing npm and yarn caches...
npm cache clean --force
yarn cache clean 2>nul
echo.

echo Step 4: Removing node_modules completely...
rd /s /q node_modules 2>nul
echo.

echo Step 5: Installing React 19 compatible dependencies...
npm install
echo.

echo Step 6: Downgrading @expo/vector-icons for React 19 compatibility...
npm uninstall @expo/vector-icons
npm install @expo/vector-icons@13.0.0
echo.

echo Step 7: Installing additional font dependencies...
npm install react-native-vector-icons@10.0.3
echo.

echo Step 8: Running Expo install to fix compatibility...
npx expo install --fix
echo.

echo Step 9: Prebuild to ensure proper native linking...
npx expo prebuild --clean
echo.

echo Step 10: Final cache clear...
npx expo start --clear-cache
echo.

echo React 19 + Expo icon fix completed!
echo.
echo If icons still don't work:
echo 1. Use the FallbackIcon component (always works)
echo 2. Or try: npx expo run:android --clear
echo.
pause
