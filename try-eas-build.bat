@echo off
echo Trying EAS Build as alternative...
echo.

echo Step 1: Clean node_modules...
if exist node_modules rmdir /s /q node_modules
npm install

echo Step 2: Try EAS build (cloud-based)...
npx eas build --platform android --profile preview --non-interactive

echo EAS build submitted!
echo Check your EAS dashboard for build status.
pause
