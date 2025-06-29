// Mock implementation for react-native-audio-record in Expo Go
// This avoids the native module error when running in Expo Go

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

// Check if we're running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Create a mock AudioRecord implementation for Expo Go
const AudioRecordMock = {
  init: (options) => {
    console.log('[AudioRecordMock] Initialized with options:', options);
    return Promise.resolve();
  },
  
  start: () => {
    console.log('[AudioRecordMock] Recording started');
    return Promise.resolve();
  },
  
  stop: () => {
    console.log('[AudioRecordMock] Recording stopped');
    // Return a mock file path that would be compatible with Expo's file system
    return Promise.resolve('file:///mock-recording.wav');
  },
  
  pause: () => {
    console.log('[AudioRecordMock] Recording paused');
    return Promise.resolve();
  },
  
  resume: () => {
    console.log('[AudioRecordMock] Recording resumed');
    return Promise.resolve();
  },
  
  // Additional methods if needed
  on: (event, callback) => {
    console.log(`[AudioRecordMock] Registered listener for event: ${event}`);
    // We don't actually call the callback in the mock
    return () => {
      console.log(`[AudioRecordMock] Removed listener for event: ${event}`);
    };
  }
};

// Export the appropriate implementation based on environment
let AudioRecord;

try {
  // Try to import the real AudioRecord module
  if (!isExpoGo) {
    AudioRecord = require('react-native-audio-record').default;
  } else {
    // Use mock in Expo Go
    AudioRecord = AudioRecordMock;
  }
} catch (error) {
  // Fallback to mock if import fails
  console.log('Using AudioRecord mock implementation');
  AudioRecord = AudioRecordMock;
}

export default AudioRecord;
