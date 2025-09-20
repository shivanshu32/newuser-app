@echo off
echo Comprehensive Build Fix for JyotishCall User App...
echo.

echo Step 1: Stopping Gradle daemon to clear cache...
cd android
.\gradlew --stop
cd ..

echo Step 2: Cleaning all build artifacts...
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build
if exist android\.gradle rmdir /s /q android\.gradle
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Step 3: Cleaning Metro and Expo cache...
npx expo start --clear --no-dev --minify
timeout /t 3
taskkill /f /im node.exe 2>nul

echo Step 4: Regenerating Android project with clean prebuild...
npx expo prebuild --platform android --clean --no-install

echo Step 5: Installing dependencies fresh...
npm install

echo Step 6: Attempting build with verbose output...
cd android
.\gradlew assembleRelease --no-daemon --stacktrace
cd ..

echo.
echo Build process complete!
echo Check the output above for any remaining errors.
pause
