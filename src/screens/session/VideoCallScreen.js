import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import io from 'socket.io-client';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

const VideoCallScreen = ({ route, navigation }) => {
  const { bookingId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [astrologer, setAstrologer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const { user } = useAuth();
  
  const webViewRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const htmlContentRef = useRef(null);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Load the WebRTC HTML file
    loadWebRTCHtml();
    
    // Fetch booking details
    fetchBookingDetails();
    
    // Handle hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      endCall();
      return true;
    });

    return () => {
      // Clean up resources on unmount
      backHandler.remove();
      
      // Clean up socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Load the WebRTC HTML file from assets
  const loadWebRTCHtml = async () => {
    try {
      // In a real app, you'd use FileSystem to read the HTML file
      // For now, we'll use a direct import
      const htmlPath = require('../../assets/webrtc.html');
      htmlContentRef.current = htmlPath;
    } catch (error) {
      console.error('Error loading WebRTC HTML:', error);
      Alert.alert('Error', 'Failed to load video call resources.');
      navigation.goBack();
    }
  };

  const fetchBookingDetails = async () => {
    try {
      // Call backend API to get booking details
      const response = await bookingsAPI.getById(bookingId);
      
      if (!response.data || !response.data.booking) {
        throw new Error('Booking not found');
      }
      
      const { booking } = response.data;
      const { astrologer } = booking;
      
      setAstrologer(astrologer);
      setLoading(false);
      
      // Start the session
      await startSession(astrologer.id);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load booking details. Please try again.');
    }
  };
  
  const startSession = async (astrologerId) => {
    try {
      // Call backend API to start the session
      const response = await sessionsAPI.start(bookingId, 'video');
      
      if (!response.data || !response.data.success) {
        throw new Error('Failed to start session');
      }
      
      const { sessionId } = response.data;
      
      // Store the sessionId for later use (ending the session)
      setSessionActive(true);
      
      // Initialize socket connection
      initializeSocket(astrologerId);
      
      // Start local session timer as fallback
      timerRef.current = setInterval(() => {
        setSessionTime(prevTime => prevTime + 1);
      }, 1000);
      
      return sessionId;
    } catch (error) {
      console.error('Error starting session:', error);
      Alert.alert('Error', 'Failed to start video session. Please try again.');
      navigation.goBack();
    }
  };
  
  const initializeSocket = (astrologerId) => {
    // Connect to the Socket.IO server
    socketRef.current = io('http://localhost:5000', {
      query: {
        userId: user.id,
        astrologerId,
        bookingId,
        sessionType: 'video',
      },
    });
    
    // Set up socket event listeners
    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setConnecting(false);
    });
    
    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    // Listen for WebRTC signaling (to relay to WebView)
    socketRef.current.on('offer', (data) => {
      relayToWebView('offer', data);
    });
    
    socketRef.current.on('answer', (data) => {
      relayToWebView('answer', data);
    });
    
    socketRef.current.on('ice-candidate', (data) => {
      relayToWebView('ice-candidate', data);
    });
    
    // Listen for session timer updates
    socketRef.current.on('timer', (data) => {
      setSessionTime(data.seconds);
    });
    
    // Listen for session end event
    socketRef.current.on('session_end', (data) => {
      handleSessionEnd(data);
    });
  };
  
  // Relay messages from socket to WebView
  const relayToWebView = (type, data) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type,
        ...data
      }));
    }
  };
  
  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'ready':
          // WebView is ready to start WebRTC
          console.log('WebView WebRTC is ready');
          setConnecting(false);
          break;
          
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Relay WebRTC signaling to socket
          if (socketRef.current) {
            socketRef.current.emit(message.type, {
              ...message,
              bookingId,
              userId: user.id,
              astrologerId: astrologer.id,
            });
          }
          break;
          
        case 'mute-toggle':
          setIsMuted(message.isMuted);
          break;
          
        case 'camera-toggle':
          setIsCameraOff(message.isCameraOff);
          break;
          
        case 'end-call-request':
          endCall();
          break;
          
        case 'call-ended':
          handleCallEnded(message.sessionDuration);
          break;
          
        case 'error':
          console.error('WebRTC error:', message.error);
          Alert.alert('Video Call Error', 'There was an issue with the video call. Please try again.');
          break;
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  // Handle session end event from server
  const handleSessionEnd = (data) => {
    Alert.alert(
      'Session Ended',
      'The astrologer has ended the session.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to rating screen
            navigation.replace('Rating', {
              astrologer,
              sessionType: 'video',
              sessionDuration: sessionTime,
              bookingId,
            });
          }
        }
      ]
    );
  };
  
  // Handle call ended event from WebView
  const handleCallEnded = (duration) => {
    // Navigate to rating screen
    navigation.replace('Rating', {
      astrologer,
      sessionType: 'video',
      sessionDuration: duration || sessionTime,
      bookingId,
    });
  };

  const toggleMute = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'toggle-mic'
      }));
      setIsMuted(!isMuted);
    }
  };
  
  const toggleCamera = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'toggle-camera'
      }));
      setIsCameraOff(!isCameraOff);
    }
  };
  
  const endCall = () => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this video call?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Call backend API to end the session
              const activeSessionResponse = await sessionsAPI.getActive();
              
              if (activeSessionResponse.data && activeSessionResponse.data.session) {
                const { sessionId } = activeSessionResponse.data.session;
                await sessionsAPI.end(sessionId);
              }
              
              // Tell WebView to end call
              if (webViewRef.current) {
                webViewRef.current.postMessage(JSON.stringify({
                  type: 'end-call'
                }));
              }
              
              // Disconnect socket
              if (socketRef.current) {
                socketRef.current.disconnect();
              }
              
              // Clear timer
              if (timerRef.current) {
                clearInterval(timerRef.current);
              }
              
              setLoading(false);
              
              // Navigate to rating screen
              navigation.replace('Rating', {
                astrologer,
                sessionType: 'video',
                sessionDuration: sessionTime,
                bookingId,
              });
            } catch (error) {
              console.error('Error ending session:', error);
              setLoading(false);
              Alert.alert('Error', 'Failed to end session. Please try again.');
            }
          }
        }
      ]
    );
  };
  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A5ACD" />
        <Text style={styles.loadingText}>Setting up video call...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WebView for WebRTC */}
      <WebView
        ref={webViewRef}
        source={require('../../assets/webrtc.html')}
        style={styles.webview}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
        onError={(error) => console.error('WebView error:', error)}
      />

      {/* Session Timer */}
      {sessionActive && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(sessionTime)}</Text>
        </View>
      )}

      {/* Connecting Overlay */}
      {connecting && (
        <View style={styles.connectingOverlay}>
          {astrologer && astrologer.profilePicture ? (
            <Image
              source={{ uri: astrologer.profilePicture }}
              style={styles.astrologerImage}
            />
          ) : (
            <View style={styles.astrologerPlaceholder}>
              <Text style={styles.astrologerInitial}>
                {astrologer ? astrologer.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <Text style={styles.connectingText}>
            Connecting to {astrologer ? astrologer.name : 'astrologer'}...
          </Text>
          <ActivityIndicator size="small" color="white" />
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons
            name={isMuted ? 'mic-off' : 'mic'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Ionicons name="call" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
          onPress={toggleCamera}
        >
          <Ionicons
            name={isCameraOff ? 'videocam-off' : 'videocam'}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {/* Camera flip button is now handled in WebView */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  astrologerImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  astrologerPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6A5ACD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  astrologerInitial: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  connectingText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    zIndex: 5,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 5,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: '#6A5ACD',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    transform: [{ rotate: '135deg' }],
  },
});

export default VideoCallScreen;
