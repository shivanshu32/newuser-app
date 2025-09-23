@echo off
echo ========================================
echo Fixing Gradle Cache and Kotlin Issues
echo ========================================

echo.
echo Step 1: Stopping all Java/Gradle processes...
taskkill /f /im java.exe 2>nul
taskkill /f /im gradle.exe 2>nul
taskkill /f /im gradlew.exe 2>nul

echo.
echo Step 2: Force deleting Gradle cache (this may take a while)...
echo Deleting global Gradle cache...
rmdir /s /q "%USERPROFILE%\.gradle" 2>nul
if exist "%USERPROFILE%\.gradle" (
    echo Some files are locked, trying alternative method...
    rd /s /q "%USERPROFILE%\.gradle" 2>nul
)

echo.
echo Step 3: Deleting local Android build files...
if exist android\build rmdir /s /q android\build
if exist android\app\build rmdir /s /q android\app\build
if exist android\.gradle rmdir /s /q android\.gradle

echo.
echo Step 4: Cleaning node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo.
echo Step 5: Reinstalling dependencies...
npm install

echo.
echo Step 6: Running Expo prebuild with clean...
npx expo prebuild --platform android --clean

echo.
echo ========================================
echo Cache cleared! Now try Android Studio sync
echo ========================================
pause
