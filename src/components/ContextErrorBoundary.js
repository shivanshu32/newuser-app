import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

class ContextErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for debugging
    console.error(`🚨 [${this.props.contextName}] Context Error:`, error);
    console.error(`🚨 [${this.props.contextName}] Error Info:`, errorInfo);
    
    // Don't crash the entire app - just this context
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Don't render children when there's an error - this prevents rendering loops
      // Only show error UI without the failed context
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>
            {this.props.contextName} Error
          </Text>
          <Text style={styles.errorMessage}>
            {this.props.fallbackMessage || 'Something went wrong with this service'}
          </Text>
          {this.state.error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorActual} numberOfLines={3}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}
          <Text style={styles.errorDetails}>
            The app will continue without this feature.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.errorMuted,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: colors.errorMuted,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    maxWidth: '100%',
  },
  errorActual: {
    fontSize: 11,
    color: colors.error,
    fontFamily: 'monospace',
  },
  errorDetails: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ContextErrorBoundary;
