@echo off
echo Complete Build Fix for Expo SDK 54 + Icons...
echo.

echo Step 1: Stopping all processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im java.exe 2>nul
timeout /t 3 /nobreak >nul
echo.

echo Step 2: Cleaning all build artifacts...
rd /s /q node_modules 2>nul
rd /s /q .expo 2>nul
rd /s /q android\build 2>nul
rd /s /q android\.gradle 2>nul
del package-lock.json 2>nul
del yarn.lock 2>nul
echo.

echo Step 3: Installing dependencies without reanimated...
npm install --legacy-peer-deps
echo.

echo Step 4: Installing Expo packages...
npx expo install --fix
echo.

echo Step 5: Installing vector icons...
npx expo install @expo/vector-icons
echo.

echo Step 6: Cleaning Android build cache...
cd android
call gradlew clean
cd ..
echo.

echo Step 7: Creating gradle.properties with correct settings...
echo # Disable New Architecture to avoid compatibility issues > android\gradle.properties
echo newArchEnabled=false >> android\gradle.properties
echo hermesEnabled=true >> android\gradle.properties
echo org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m >> android\gradle.properties
echo android.useAndroidX=true >> android\gradle.properties
echo android.enableJetifier=true >> android\gradle.properties
echo.

echo Step 8: Starting development server...
echo Build fix completed! Starting Expo...
npx expo start --clear
echo.

pause
