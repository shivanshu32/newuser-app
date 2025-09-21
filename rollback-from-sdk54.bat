@echo off
echo ========================================
echo Rolling back from Expo SDK 54 to SDK 53
echo ========================================
echo.

echo Step 1: Stopping any running processes...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul
echo.

echo Step 2: Restoring package.json backup...
if exist package.json.backup (
    copy package.json.backup package.json
    echo package.json restored from backup
) else (
    echo ERROR: No backup found! Manual rollback required.
    pause
    exit /b 1
)
echo.

echo Step 3: Cleaning caches...
rd /s /q .expo 2>nul
rd /s /q node_modules 2>nul
npm cache clean --force
echo.

echo Step 4: Reinstalling SDK 53 dependencies...
npm install
echo.

echo Step 5: Running Expo install...
npx expo install --fix
echo.

echo Step 6: Restoring app.config.js settings...
echo You may need to manually restore:
echo - version: "5.3.0" → "5.2.9"
echo - versionCode: 55 → 54  
echo - compileSdkVersion: 36 → 35
echo - targetSdkVersion: 36 → 35
echo.

echo ========================================
echo Rollback Complete!
echo ========================================
echo.
echo Your app has been restored to Expo SDK 53
echo Don't forget to manually update app.config.js if needed
echo.
pause
