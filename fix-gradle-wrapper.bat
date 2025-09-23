@echo off
echo Fixing Gradle Wrapper properties file...
echo.

echo Step 1: Creating correct gradle-wrapper.properties...
echo distributionBase=GRADLE_USER_HOME > android\gradle\wrapper\gradle-wrapper.properties
echo distributionPath=wrapper/dists >> android\gradle\wrapper\gradle-wrapper.properties
echo distributionUrl=https\://services.gradle.org/distributions/gradle-8.10.2-all.zip >> android\gradle\wrapper\gradle-wrapper.properties
echo networkTimeout=10000 >> android\gradle\wrapper\gradle-wrapper.properties
echo validateDistributionUrl=true >> android\gradle\wrapper\gradle-wrapper.properties
echo zipStoreBase=GRADLE_USER_HOME >> android\gradle\wrapper\gradle-wrapper.properties
echo zipStorePath=wrapper/dists >> android\gradle\wrapper\gradle-wrapper.properties
echo.

echo Step 2: Testing Gradle wrapper...
cd android
call gradlew --version
echo.

echo Step 3: Cleaning build cache...
call gradlew clean
cd ..
echo.

echo Gradle wrapper fix completed!
echo You should now be able to build successfully.
pause
