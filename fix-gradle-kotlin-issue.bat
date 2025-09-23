@echo off
echo ========================================
echo Fixing Gradle Kotlin Compilation Issue
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
echo Step 4: Cleaning Gradle wrapper cache...
if exist "%USERPROFILE%\.gradle\caches" rmdir /s /q "%USERPROFILE%\.gradle\caches"
if exist "%USERPROFILE%\.gradle\wrapper" rmdir /s /q "%USERPROFILE%\.gradle\wrapper"

echo.
echo Step 5: Cleaning Expo cache...
npx expo install --fix
npx expo r -c

echo.
echo Step 6: Reinstalling dependencies...
npm install

echo.
echo Step 7: Running Expo doctor to check for issues...
npx expo doctor

echo.
echo Step 8: Attempting to prebuild Android...
npx expo prebuild --platform android --clean

echo.
echo ========================================
echo Fix completed! Try running:
echo npx expo run:android
echo ========================================
pause
