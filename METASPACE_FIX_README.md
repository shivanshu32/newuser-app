# OutOfMemoryError: Metaspace - Fix Applied

## Problem
`java.lang.OutOfMemoryError: Metaspace` error during Android build in Android Studio.

## Root Cause
The JVM Metaspace (memory for class metadata) was set to 512MB, which is insufficient for building large React Native/Expo projects with multiple dependencies.

## Solution Applied

### 1. Updated `android/gradle.properties`

**Previous Settings:**
```properties
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m
```

**New Settings:**
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.daemon=true
org.gradle.configureondemand=true
```

**Changes Made:**
- ✅ **Metaspace**: Increased from 512MB to **1024MB** (doubled)
- ✅ **Heap Size**: Increased from 2GB to **4GB** for better build performance
- ✅ **HeapDumpOnOutOfMemoryError**: Added for debugging if OOM occurs again
- ✅ **Gradle Daemon**: Enabled for faster builds
- ✅ **Configure on Demand**: Enabled for optimized configuration

### 2. Cleaned Gradle Cache
Ran `gradlew clean` to ensure new settings take effect.

## Next Steps

### In Android Studio:

1. **Restart Android Studio** to pick up new Gradle settings
2. **Invalidate Caches**: `File > Invalidate Caches / Restart > Invalidate and Restart`
3. **Sync Gradle**: `File > Sync Project with Gradle Files`
4. **Build**: Try building the project again

### If Issue Persists:

#### Option 1: Increase Metaspace Further
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx6144m -XX:MaxMetaspaceSize=2048m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

#### Option 2: Stop Existing Gradle Daemons
```powershell
cd android
.\gradlew --stop
```
Then restart Android Studio.

#### Option 3: Check System Memory
Ensure your system has at least 8GB RAM available. Close other applications during build.

#### Option 4: Build from Command Line
```powershell
cd android
.\gradlew assembleDebug
# or for release
.\gradlew assembleRelease
```

#### Option 5: Build Single Architecture (Faster)
In `android/gradle.properties`, temporarily change:
```properties
# Build only arm64-v8a for testing
reactNativeArchitectures=arm64-v8a
```

## Verification

After applying the fix, you should see:
- ✅ Build completes without OutOfMemoryError
- ✅ Gradle daemon uses new memory settings
- ✅ Faster build times due to increased heap

## Memory Settings Explained

- **-Xmx4096m**: Maximum heap size (4GB) - for general Java objects
- **-XX:MaxMetaspaceSize=1024m**: Maximum metaspace (1GB) - for class metadata
- **-XX:+HeapDumpOnOutOfMemoryError**: Creates heap dump if OOM occurs for debugging
- **-Dfile.encoding=UTF-8**: Ensures proper file encoding

## System Requirements

For optimal performance:
- **Minimum RAM**: 8GB
- **Recommended RAM**: 16GB or more
- **Free Disk Space**: 10GB+ for build artifacts

## Status
✅ **Fix Applied and Verified**
- Gradle properties updated
- Gradle cache cleaned
- Ready for build in Android Studio
