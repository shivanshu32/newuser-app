package com.jyotishtalk

import android.os.Build
import android.os.Bundle
import android.webkit.WebView
import android.util.Log

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    
    // Enable WebView debugging for development
    if (BuildConfig.DEBUG) {
      WebView.setWebContentsDebuggingEnabled(true)
    }
    
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   * Enhanced with null-safety measures to prevent crashes during lifecycle transitions
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return try {
      ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ){
              // Override onWindowFocusChanged in delegate to add additional safety
              override fun onWindowFocusChanged(hasFocus: Boolean) {
                try {
                  super.onWindowFocusChanged(hasFocus)
                } catch (e: NullPointerException) {
                  Log.w("ReactActivityDelegate", "ReactDelegate null in delegate onWindowFocusChanged, ignoring", e)
                } catch (e: Exception) {
                  Log.e("ReactActivityDelegate", "Error in delegate onWindowFocusChanged", e)
                }
              }
            })
    } catch (e: Exception) {
      Log.e("MainActivity", "Error creating ReactActivityDelegate, falling back to default", e)
      // Fallback to a basic delegate if wrapper creation fails
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun onWindowFocusChanged(hasFocus: Boolean) {
          try {
            super.onWindowFocusChanged(hasFocus)
          } catch (e: Exception) {
            Log.w("MainActivity", "Error in fallback delegate onWindowFocusChanged", e)
          }
        }
      }
    }
  }

  /**
   * Override onWindowFocusChanged to prevent ReactDelegate NullPointerException crashes
   * This is a known issue with React Native/Expo apps during activity lifecycle transitions
   */
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    try {
      super.onWindowFocusChanged(hasFocus)
    } catch (e: NullPointerException) {
      // Log the error but don't crash the app
      Log.w("MainActivity", "ReactDelegate null during onWindowFocusChanged, ignoring", e)
    } catch (e: Exception) {
      // Catch any other unexpected exceptions during window focus changes
      Log.e("MainActivity", "Unexpected error in onWindowFocusChanged", e)
    }
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
