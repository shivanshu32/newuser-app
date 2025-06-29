import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Mock RTCView component for Expo Go compatibility
 * This component replaces the native RTCView from react-native-webrtc
 * when running in Expo Go, which doesn't support native modules.
 */
const RTCViewMock = ({ streamURL, objectFit, style, zOrder, ...props }) => {
  // Determine what to display based on the stream URL
  const isLocalStream = streamURL && streamURL.includes('local');
  
  return (
    <View style={[styles.container, style]} {...props}>
      <View style={[styles.videoPlaceholder, { backgroundColor: isLocalStream ? '#2d4059' : '#4a6fa5' }]}>
        <Text style={styles.streamText}>
          {isLocalStream ? 'Local Video Stream' : 'Remote Video Stream'}
        </Text>
        <Text style={styles.mockText}>Mock Video in Expo Go</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  streamText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mockText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  }
});

export default RTCViewMock;
