@echo off
echo Fixing Bundle and Updates Issues...
echo.

echo Step 1: Clean everything...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Step 2: Clean Android build...
cd android
.\gradlew --stop
if exist build rmdir /s /q build
if exist app\build rmdir /s /q app\build
if exist .gradle rmdir /s /q .gradle
cd ..

echo Step 3: Install dependencies...
npm install

echo Step 4: Prebuild with minimal configuration...
npx expo prebuild --platform android --clean

echo Step 5: Try building with minimal Gradle options...
cd android
.\gradlew clean
.\gradlew assembleRelease --no-daemon --no-build-cache
cd ..

echo Build attempt complete!
pause
