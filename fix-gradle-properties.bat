@echo off
echo Fixing gradle.properties to disable New Architecture...
echo.

echo Step 1: Backing up current gradle.properties...
copy android\gradle.properties android\gradle.properties.backup
echo.

echo Step 2: Updating gradle.properties with newArchEnabled=false...
powershell -Command "(Get-Content android\gradle.properties) -replace 'newArchEnabled=true', 'newArchEnabled=false' | Set-Content android\gradle.properties"
echo.

echo Step 3: Adding additional compatibility settings...
echo. >> android\gradle.properties
echo # Additional compatibility settings for Expo SDK 54 >> android\gradle.properties
echo android.enableJetifier=true >> android\gradle.properties
echo org.gradle.parallel=true >> android\gradle.properties
echo org.gradle.configureondemand=true >> android\gradle.properties
echo.

echo Step 4: Cleaning build cache...
cd android
call gradlew clean
cd ..
echo.

echo Gradle.properties fix completed!
echo Key changes:
echo - newArchEnabled=false (disabled New Architecture)
echo - Added Jetifier support
echo - Enabled parallel builds
echo.
echo Your app should now build without Reanimated conflicts!
pause
