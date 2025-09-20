@echo off
echo Getting detailed build error information...
echo.

cd android

echo Testing bundle creation directly...
echo.
node --print "require('path').dirname(require.resolve('expo/package.json'))"
echo.

echo Testing Expo CLI bundle command...
npx expo export:embed --platform android --dev false --minify true --bundle-output test-bundle.js --assets-dest test-assets
echo.

echo If bundle creation succeeded, trying Gradle build...
.\gradlew assembleRelease --stacktrace --debug > build-debug.log 2>&1

echo Build log saved to build-debug.log
echo Check the log file for detailed error information.

cd ..
pause
