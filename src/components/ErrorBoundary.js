import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    try {
      console.error('🚨 [ErrorBoundary] App crashed:', error);
      console.error('🚨 [ErrorBoundary] Error info:', errorInfo);
      
      this.setState({
        error,
        errorInfo
      });

      // Enhanced crash logging with device and app context
      const crashData = {
        error: {
          message: error?.message,
          stack: error?.stack,
          name: error?.name
        },
        errorInfo: {
          componentStack: errorInfo?.componentStack
        },
        timestamp: new Date().toISOString(),
        appVersion: '5.2.2',
        platform: Platform.OS,
        userAgent: navigator?.userAgent || 'unknown'
      };
      
      console.error('🚨 [ErrorBoundary] Detailed crash data:', JSON.stringify(crashData, null, 2));

      // Log to crash reporting service (when implemented)
      try {
        // TODO: Send to crash reporting service
        // crashReporting.recordError(crashData);
        
        // Store crash locally for debugging
        if (typeof AsyncStorage !== 'undefined') {
          AsyncStorage.setItem('lastCrash', JSON.stringify(crashData)).catch(storageError => {
            console.error('❌ [ErrorBoundary] Failed to store crash data:', storageError);
          });
        }
      } catch (reportingError) {
        console.error('❌ [ErrorBoundary] Failed to report crash:', reportingError);
      }
    } catch (boundaryError) {
      console.error('❌ [ErrorBoundary] Error in error boundary itself:', boundaryError);
    }
  }

  handleRestart = () => {
    try {
      console.log('🔄 [ErrorBoundary] User attempting to restart app');
      
      // Reset error boundary state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
      
      // Clear any cached data that might be causing issues
      if (typeof AsyncStorage !== 'undefined') {
        AsyncStorage.removeItem('lastCrash').catch(error => {
          console.warn('⚠️ [ErrorBoundary] Failed to clear crash data:', error);
        });
      }
      
      console.log('✅ [ErrorBoundary] App restarted successfully');
    } catch (restartError) {
      console.error('❌ [ErrorBoundary] Error during restart:', restartError);
      // Force a complete reload if restart fails
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="warning-outline" size={64} color="#F97316" />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              The app encountered an unexpected error. This has been logged for our team to investigate.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorText}>{this.state.errorInfo.componentStack}</Text>
                )}
              </View>
            )}
            
            <TouchableOpacity style={styles.restartButton} onPress={this.handleRestart}>
              <Text style={styles.restartButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#7F1D1D',
    fontFamily: 'monospace',
  },
  restartButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  restartButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
