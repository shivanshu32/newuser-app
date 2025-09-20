@echo off
echo Fixing JyotishCall User App Build Issues...
echo.

echo Step 1: Cleaning node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo Step 2: Cleaning Android build cache...
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build
if exist android\.gradle rmdir /s /q android\.gradle

echo Step 3: Installing dependencies...
npm install

echo Step 4: Running prebuild to regenerate Android project...
npx expo prebuild --platform android --clean

echo Step 5: Attempting Android build...
cd android
.\gradlew clean
.\gradlew assembleRelease
cd ..

echo Build fix complete!
echo If build succeeded, you can find the APK in android\app\build\outputs\apk\release\
pause
