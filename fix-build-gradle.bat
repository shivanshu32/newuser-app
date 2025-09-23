@echo off
echo Fixing Android Gradle Plugin version in build.gradle...
echo.

echo Step 1: Backing up current build.gradle...
copy android\build.gradle android\build.gradle.backup
echo.

echo Step 2: Creating updated build.gradle with correct AGP version...
echo // Top-level build file where you can add configuration options common to all sub-projects/modules. > android\build.gradle
echo. >> android\build.gradle
echo. >> android\build.gradle
echo buildscript { >> android\build.gradle
echo   repositories { >> android\build.gradle
echo     google() >> android\build.gradle
echo     mavenCentral() >> android\build.gradle
echo   } >> android\build.gradle
echo   dependencies { >> android\build.gradle
echo     classpath('com.android.tools.build:gradle:8.10.0') >> android\build.gradle
echo     classpath('com.facebook.react:react-native-gradle-plugin') >> android\build.gradle
echo     classpath('org.jetbrains.kotlin:kotlin-gradle-plugin') >> android\build.gradle
echo   } >> android\build.gradle
echo } >> android\build.gradle
echo. >> android\build.gradle
echo. >> android\build.gradle
echo def reactNativeAndroidDir = new File( >> android\build.gradle
echo   providers.exec { >> android\build.gradle
echo     workingDir(rootDir) >> android\build.gradle
echo     commandLine("node", "--print", "require.resolve('react-native/package.json')") >> android\build.gradle
echo   }.standardOutput.asText.get().trim(), >> android\build.gradle
echo   "../android" >> android\build.gradle
echo ) >> android\build.gradle
echo. >> android\build.gradle
echo. >> android\build.gradle
echo allprojects { >> android\build.gradle
echo   repositories { >> android\build.gradle
echo     maven { >> android\build.gradle
echo       // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm >> android\build.gradle
echo       url(reactNativeAndroidDir) >> android\build.gradle
echo     } >> android\build.gradle
echo. >> android\build.gradle
echo. >> android\build.gradle
echo     google() >> android\build.gradle
echo     mavenCentral() >> android\build.gradle
echo     maven { url 'https://www.jitpack.io' } >> android\build.gradle
echo   } >> android\build.gradle
echo } >> android\build.gradle
echo. >> android\build.gradle
echo. >> android\build.gradle
echo apply plugin: "expo-root-project" >> android\build.gradle
echo apply plugin: "com.facebook.react.rootproject" >> android\build.gradle
echo.

echo Step 3: Updating Gradle Wrapper to compatible version...
echo distributionBase=GRADLE_USER_HOME > android\gradle\wrapper\gradle-wrapper.properties
echo distributionPath=wrapper/dists >> android\gradle\wrapper\gradle-wrapper.properties
echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-all.zip >> android\gradle\wrapper\gradle-wrapper.properties
echo networkTimeout=10000 >> android\gradle\wrapper\gradle-wrapper.properties
echo validateDistributionUrl=true >> android\gradle\wrapper\gradle-wrapper.properties
echo zipStoreBase=GRADLE_USER_HOME >> android\gradle\wrapper\gradle-wrapper.properties
echo zipStorePath=wrapper/dists >> android\gradle\wrapper\gradle-wrapper.properties
echo.

echo Step 4: Cleaning build cache...
cd android
call gradlew clean
cd ..
echo.

echo Build.gradle fix completed!
echo Key changes made:
echo - Android Gradle Plugin: 8.10.0 (compatible version)
echo - Gradle Wrapper: 8.10.2 (compatible version)
echo - Build cache cleared
echo.
echo You can now build your project successfully!
pause
