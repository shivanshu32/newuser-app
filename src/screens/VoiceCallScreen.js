import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  BackHandler, 
  Alert, 
  ActivityIndicator,
  Text,
  SafeAreaView,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSocket, SocketProvider } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as Device from 'expo-device';
import { Audio } from 'expo-av';

// Outer component that provides the socket context
const VoiceCallScreen = () => {
  return (
    <SocketProvider>
      <VoiceCallScreenInner />
    </SocketProvider>
  );
};

// Inner component that uses the socket context
const VoiceCallScreenInner = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { socket } = useSocket();
  const { user } = useAuth();
  const webViewRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlUri, setHtmlUri] = useState('');
  const [sessionInfo, setSessionInfo] = useState({
    duration: 0,
    currentAmount: 0
  });
  const [isLocalWebRTCConnected, setIsLocalWebRTCConnected] = useState(false);
  const [isRemoteWebRTCReadyForTimer, setIsRemoteWebRTCReadyForTimer] = useState(false);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [webRTCLogs, setWebRTCLogs] = useState([]);
  const [webRTCConnectionState, setWebRTCConnectionState] = useState('new');
  const [webRTCIceState, setWebRTCIceState] = useState('new');
  const [warning, setWarning] = useState(null);
  const [socketReady, setSocketReady] = useState(false);
  const [isWebViewReady, setIsWebViewReady] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [offerCreated, setOfferCreated] = useState(false); // Track if offer has been created
  const [audioRecording, setAudioRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Get booking details from route params
  const { bookingId, sessionId, roomId, eventData } = route.params || {};
  
  // Debug logging for route params
  useEffect(() => {
    console.log('VoiceCallScreen: Route params received:', { bookingId, sessionId, roomId });
    console.log('VoiceCallScreen: eventData present:', eventData ? 'YES' : 'NO');
    if (eventData) {
      console.log('VoiceCallScreen: eventData content:', JSON.stringify(eventData));
    }
  }, [bookingId, sessionId, roomId, eventData]);

  // Join consultation room when socket is ready
  useEffect(() => {
    if (socket && socket.connected && bookingId) {
      console.log('[USER-APP] Socket connected, joining consultation room...');
      console.log('[USER-APP] Booking ID:', bookingId);
      console.log('[USER-APP] Room ID:', roomId);
      
      const roomIdToJoin = roomId || `consultation:${bookingId}`;
      console.log('[USER-APP] Joining room:', roomIdToJoin);
      
      socket.emit('join_consultation_room', {
        bookingId: bookingId,
        roomId: roomIdToJoin
      }, (response) => {
        console.log('[USER-APP] join_consultation_room response:', response);
        if (response?.success) {
          console.log('[USER-APP] Successfully joined consultation room:', roomIdToJoin);
          setSocketReady(true);
        } else {
          console.error('[USER-APP] Failed to join consultation room:', response);
          setError('Failed to join consultation room');
        }
      });
    } else {
      console.log('[USER-APP] Waiting for socket connection or booking ID...', {
        socketConnected: socket?.connected,
        bookingId: bookingId
      });
    }
  }, [socket, bookingId, roomId]);

  // Load HTML content using expo-asset
  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        console.log('[USER-APP] Loading voice-webrtc.html');
        
        const asset = Asset.fromModule(require('../assets/voice-webrtc.html'));
        await asset.downloadAsync();
        
        const htmlContent = await FileSystem.readAsStringAsync(asset.localUri);
        
        console.log('[USER-APP] Voice HTML content loaded successfully, length:', htmlContent.length);
        
        setHtmlContent(htmlContent);
        setLoading(false);
      } catch (error) {
        console.error('[USER-APP] Error loading voice-webrtc.html:', error);
        setError('Failed to load voice call interface');
        setLoading(false);
      }
    };

    loadHtmlContent();
  }, []);

  // Socket event listeners
  useEffect(() => {
    // Check if socket is available and connected
    if (!socket) {
      console.log('[USER-APP] No socket instance available yet');
      return;
    }

    if (!socket.connected) {
      console.log('[USER-APP] Socket connection status check:', socket.connected);
      console.log('[USER-APP] Socket not initially connected, setting up connect listener');
      
      // Set up a one-time listener for when socket connects
      const handleConnect = () => {
        console.log('[USER-APP] Socket connected for voice call');
      };
      
      socket.on('connect', handleConnect);
      
      // Cleanup
      return () => {
        socket.off('connect', handleConnect);
      };
    } else {
      // Socket is already connected
      console.log('[USER-APP] Socket already connected, setting up listeners immediately');
      setSocketReady(true);
    }
  }, [socket]);

  // Socket event listeners - separate useEffect that depends on socketReady
  useEffect(() => {
    if (!socket || !socket.connected || !socketReady) {
      console.log('[USER-APP] Socket is not connected or not ready, cannot set up event listeners');
      return;
    }
    
    console.log('[USER-APP] Setting up voice call socket listeners');
    
    // Use unified signal protocol to match backend and astrologer-app
    const handleSignal = (data) => {
      console.log('[USER-APP] Received unified signal:', data);
      if (webViewRef.current && data.signal) {
        // Forward the signal to WebView with appropriate type based on signal content
        let messageType = 'signal';
        if (data.signal.type === 'offer') {
          messageType = 'offer';
        } else if (data.signal.type === 'answer') {
          messageType = 'answer';
        } else if (data.signal.candidate) {
          messageType = 'ice-candidate';
        }
        
        webViewRef.current.postMessage(JSON.stringify({
          type: messageType,
          [messageType === 'ice-candidate' ? 'candidate' : messageType]: data.signal,
          sessionId: data.sessionId
        }));
      }
    };

    const handleStartVoiceCall = (data) => {
      console.log('[USER-APP] Start voice call event received:', JSON.stringify(data));
      console.log('[USER-APP] WebView ready status:', !!webViewRef.current);
      console.log('[USER-APP] Socket ID when receiving start_voice_call:', socket.id);
      
      // Astrologer is ready, we can now create the offer
      if (webViewRef.current && !offerCreated) {
        console.log('[USER-APP] Instructing WebView to create voice offer');
        webViewRef.current.postMessage(JSON.stringify({
          type: 'create_voice_offer'
        }));
        
        webViewRef.current.postMessage(JSON.stringify({
          type: 'participant_info',
          data: {
            participantName: data.astrologerName || 'Astrologer',
            participantType: 'astrologer'
          }
        }));
        
        setOfferCreated(true); // Mark that an offer has been created
      } else {
        console.log('[USER-APP] WebView not ready when start_voice_call received or offer already created');
      }
    };

    const handleVoiceCallEnded = (data) => {
      console.log('[USER-APP] Voice call ended:', data);
      Alert.alert(
        'Call Ended',
        `The voice call has ended. Duration: ${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    };
    
    // Handle when the other client is ready for timer
    const handleWebRTCClientReadyForTimer = (data) => {
      console.log('[USER-APP] Remote client is ready for timer:', data);
      if (data && data.bookingId === bookingId) {
        setIsRemoteWebRTCReadyForTimer(true);
      }
    };

    // Handle ICE restart initiated by astrologer
    const handleIceRestartInitiated = (data) => {
      console.log('[USER-APP] Received ice_restart_initiated event:', data);
      
      // Verify this is for our current call
      if (data.bookingId === bookingId) {
        console.log('[USER-APP] Astrologer initiated ICE restart, attempting to restart our ICE connection');
        
        // Instruct WebView to restart ICE
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'restart_ice'
          }));
        }
      }
    };

    const handleVoiceCallOffer = (data) => {
      console.log('[USER-APP] Received voice call offer (legacy):', data);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'offer',
          offer: data.signal || data,
          sessionId: data.sessionId
        }));
      }
    };

    const handleVoiceCallAnswer = (data) => {
      console.log('[USER-APP] Received voice call answer (legacy):', data);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'answer',
          answer: data.signal || data,
          sessionId: data.sessionId
        }));
      }
    };

    const handleVoiceIceCandidate = (data) => {
      console.log('[USER-APP] Received voice ICE candidate (legacy):', data);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'ice-candidate',
          candidate: data.signal || data.candidate || data,
          sessionId: data.sessionId
        }));
      }
    };

    socket.on('signal', handleSignal);
    socket.on('start_voice_call', handleStartVoiceCall);
    socket.on('voice_call_ended', handleVoiceCallEnded);
    socket.on('webrtc_client_ready_for_timer', handleWebRTCClientReadyForTimer);
    socket.on('ice_restart_initiated', handleIceRestartInitiated);
    socket.on('voice_call_offer', handleVoiceCallOffer);
    socket.on('voice_call_answer', handleVoiceCallAnswer);
    socket.on('voice_ice_candidate', handleVoiceIceCandidate);

    // Cleanup listeners
    return () => {
      socket.off('signal', handleSignal);
      socket.off('start_voice_call', handleStartVoiceCall);
      socket.off('voice_call_ended', handleVoiceCallEnded);
      socket.off('webrtc_client_ready_for_timer', handleWebRTCClientReadyForTimer);
      socket.off('ice_restart_initiated', handleIceRestartInitiated);
      socket.off('voice_call_offer', handleVoiceCallOffer);
      socket.off('voice_call_answer', handleVoiceCallAnswer);
      socket.off('voice_ice_candidate', handleVoiceIceCandidate);
    };
  }, [socket, socketReady, bookingId, sessionId, roomId, user]);

  // Track WebRTC connection state changes
  useEffect(() => {
    if (webRTCIceState === 'failed') {
      console.error('[USER-APP] WebRTC ICE connection failed');
      setError('WebRTC connection failed. Please check your network connection and try again.');
      
      // Try to restart ICE
      if (webViewRef.current) {
        console.log('[USER-APP] Attempting to restart ICE connection');
        webViewRef.current.postMessage(JSON.stringify({
          type: 'restart_ice'
        }));
      }
      
      // Notify astrologer app about ICE failure
      if (socket && socket.connected) {
        socket.emit('ice_connection_failed', {
          bookingId: bookingId,
          sessionId: sessionId,
          roomId: roomId,
          fromUser: true,
          to: 'astrologer'
        });
      }
    } else if (webRTCIceState === 'checking' && webRTCConnectionState === 'connected') {
      // This is a special case where ICE is still checking but the connection is established
      // This can happen in some WebRTC implementations and might be recoverable
      console.log('[USER-APP] WebRTC connection is established but ICE is still checking');
      
      // Set a timeout to check if ICE remains in checking state
      const iceCheckingTimeout = setTimeout(() => {
        if (webRTCIceState === 'checking') {
          console.log('[USER-APP] ICE still in checking state after timeout, attempting restart');
          if (webViewRef.current) {
            webViewRef.current.postMessage(JSON.stringify({
              type: 'restart_ice'
            }));
          }
        }
      }, 10000); // 10 seconds
      
      return () => clearTimeout(iceCheckingTimeout);
    } else if (webRTCIceState === 'connected' || webRTCIceState === 'completed') {
      console.log('[USER-APP] WebRTC ICE connection established');
      setError(null);
    }
  }, [webRTCIceState, webRTCConnectionState, socket, bookingId, sessionId, roomId]);

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[USER-APP] WebView message:', message);
      
      // Log all WebRTC-related messages for debugging
      if (message.type && message.type.includes('webrtc')) {
        console.log('[USER-APP] WebRTC message received:', message.type, message.data);
      }

      switch (message.type) {
        case 'webrtc_log':
          // Store WebRTC logs for debugging
          const newLog = {
            level: message.data.level,
            message: message.data.message,
            timestamp: new Date().toISOString()
          };
          console.log(`[USER-APP] WebRTC Log (${newLog.level}): ${newLog.message}`);
          setWebRTCLogs(prevLogs => [...prevLogs, newLog].slice(-100)); // Keep last 100 logs
          break;
          
        case 'webrtc_connection_state':
          console.log('[USER-APP] WebRTC connection state changed:', message.data.state);
          setWebRTCConnectionState(message.data.state);
          
          // Reset offer created flag if connection fails or disconnects to allow retry
          if (message.data.state === 'failed' || message.data.state === 'disconnected' || message.data.state === 'closed') {
            console.log('[USER-APP] Connection failed/disconnected, resetting offerCreated flag for retry');
            setOfferCreated(false);
          }
          break;
          
        case 'webrtc_ice_state':
          console.log('[USER-APP] WebRTC ICE state changed:', message.data.state);
          setWebRTCIceState(message.data.state);
          break;
          
        case 'webrtc_error':
          console.error('[USER-APP] WebRTC error:', message.data.error);
          console.error('[USER-APP] WebRTC error details:', message.data.details || 'No additional details');
          
          // Set error state to display in UI
          setError(`WebRTC Error: ${message.data.error}\n${message.data.details || ''}\n\nPlease ensure microphone permissions are granted and try again.`);
          
          // Show alert with more helpful information
          Alert.alert(
            'Voice Call Error', 
            `${message.data.error}\n\n${message.data.details || ''}\n\nThe call will continue, but audio quality may be affected.`,
            [{ text: 'Continue' }],
            { cancelable: true }
          );
          break;
          
        case 'webrtc_ready':
          console.log('[USER-APP] WebRTC is ready');
          break;
          
        case 'request_audio_stream':
          // Handle request for audio stream from WebView
          console.log('[USER-APP] WebView requesting audio stream');
          startAudioRecording();
          break;

        case 'remote_audio_received':
          // Handle remote audio received notification
          console.log('[USER-APP] Remote audio received in WebView');
          break;

        case 'voice_call_offer':
          // Send offer to astrologer via socket using unified signal protocol
          if (socket && socket.connected) {
            console.log('[USER-APP] Sending voice call offer via unified signal protocol');
            socket.emit('signal', {
              signal: message.data, // Use the complete signal data
              bookingId: bookingId,
              sessionId: sessionId,
              roomId: roomId,
              fromUser: true,
              to: 'astrologer' // Add routing information for backend
            });
          } else {
            console.error('[USER-APP] Socket not connected, cannot send voice call offer');
          }
          break;

        case 'voice_call_answer':
          // Send answer to astrologer via socket using unified signal protocol
          if (socket && socket.connected) {
            console.log('[USER-APP] Sending voice call answer via unified signal protocol');
            socket.emit('signal', {
              signal: message.data, // Use the complete signal data
              bookingId: bookingId,
              sessionId: sessionId,
              roomId: roomId,
              fromUser: true,
              to: 'astrologer' // Add routing information for backend
            });
          } else {
            console.error('[USER-APP] Socket not connected, cannot send voice call answer');
          }
          break;

        case 'voice_ice_candidate':
          // Send ICE candidate to astrologer via socket using unified signal protocol
          if (socket && socket.connected) {
            console.log('[USER-APP] Sending voice ICE candidate via unified signal protocol');
            socket.emit('signal', {
              signal: message.data, // Use the complete candidate data
              bookingId: bookingId,
              sessionId: sessionId,
              roomId: roomId,
              fromUser: true,
              to: 'astrologer' // Add routing information for backend
            });
          } else {
            console.error('[USER-APP] Socket not connected, cannot send voice ICE candidate');
          }
          break;

        case 'webrtc_local_connection_established':
          console.log('[USER-APP] Local WebRTC connection established');
          setIsLocalWebRTCConnected(true);
          
          // Notify the other client that we're ready for timer
          if (socket && socket.connected) {
            console.log('[USER-APP] Emitting webrtc_client_ready_for_timer');
            socket.emit('webrtc_client_ready_for_timer', {
              bookingId: bookingId,
              sessionId: sessionId,
              roomId: roomId,
              fromUser: true
            });
          }
          break;

        case 'timer_update':
          setSessionInfo(prev => ({
            ...prev,
            duration: message.data.duration
          }));
          break;

        case 'call_ended':
          handleCallEnd(message.data.reason);
          break;

        case 'webrtc_info':
          // Handle WebRTC info messages (e.g., when using mock audio)
          console.log('[USER-APP] WebRTC Info:', message.data.info);
          if (message.data.details) {
            console.log('[USER-APP] WebRTC Info details:', message.data.details);
            
            // Display a toast or notification to the user about audio implementation
            if (message.data.info.includes('oscillator') || message.data.info.includes('mock')) {
              // Set a warning state for UI display
              setWarning(message.data.info + '\n' + message.data.details);
              
              // Show a non-blocking alert that doesn't force navigation
              Alert.alert(
                'Audio Information',
                `${message.data.info}\n\n${message.data.details}\n\nThe call will continue, but audio quality may be affected.`,
                [{ text: 'Continue' }],
                { cancelable: true }
              );
            }
            console.log('[USER-APP] WebRTC Details:', message.data.details);
          }
          break;
          
        case 'permission_granted':
          console.log('[USER-APP] Permission granted:', message.data.permission);
          if (message.data.permission === 'microphone') {
            setWarning(null); // Clear any previous warnings
            console.log('[USER-APP] Microphone permission granted, WebRTC should now use real audio');
            
            // Notify the WebView to reinitialize WebRTC with real audio
            if (webViewRef.current) {
              webViewRef.current.postMessage(JSON.stringify({
                type: 'reinitialize_webrtc',
                data: { useRealAudio: true }
              }));
            }
          }
          break;
          
        case 'permission_denied':
          console.log('[USER-APP] Permission denied:', message.data.permission, message.data.error);
          if (message.data.permission === 'microphone') {
            setWarning(`Microphone access denied: ${message.data.error}. Using synthetic audio instead.`);
            
            // Show a more detailed alert
            Alert.alert(
              'Microphone Access Denied',
              'Your microphone is not accessible. The call will continue with synthetic audio, but the other person will not be able to hear you clearly.\n\nTo fix this, please grant microphone permissions in your device settings and restart the app.',
              [{ text: 'Continue' }],
              { cancelable: true }
            );
          }
          break;
          
        case 'webrtc_reinitialized':
          console.log('[USER-APP] WebRTC reinitialized with new audio settings');
          
          // Clear any warnings if we've successfully reinitialized
          if (message.data && message.data.success) {
            setWarning(null);
            
            // Show a brief notification
            Alert.alert(
              'Audio Connection Updated',
              'Your microphone is now active. The other person should be able to hear you.',
              [{ text: 'OK' }],
              { cancelable: true }
            );
            
            // If we have a connection, we might need to create a new offer
            if (webRTCConnectionState === 'connected' && webViewRef.current) {
              console.log('[USER-APP] Connection already established, checking if we need to update the offer');
              // The WebView's reinitializeWebRTC function already handles this case
            }
          } else {
            console.log('[USER-APP] WebRTC reinitialization reported failure or no success flag');
          }
          break;

        case 'log':
          // Handle logging from WebView
          break;

        default:
          console.log('[USER-APP] Unknown WebView message type:', message.type);
      }
    } catch (error) {
      console.error('[USER-APP] Error parsing WebView message:', error);
    }
  };

  // Audio recording functions for React Native Audio Bridge
  const startAudioRecording = async () => {
    try {
      console.log('[USER-APP] Starting audio recording for WebRTC bridge...');
      
      // Request audio permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[USER-APP] Audio permission denied');
        return false;
      }

      // Configure audio mode for voice calls
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      // Start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      
      setAudioRecording(recording);
      setIsRecording(true);
      
      console.log('[USER-APP] Audio recording started successfully');
      
      // Notify WebView that audio stream is ready
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'audio_stream_ready',
          data: { ready: true }
        }));
      }
      
      return true;
    } catch (error) {
      console.error('[USER-APP] Failed to start audio recording:', error);
      return false;
    }
  };

  const stopAudioRecording = async () => {
    try {
      if (audioRecording) {
        console.log('[USER-APP] Stopping audio recording...');
        await audioRecording.stopAndUnloadAsync();
        setAudioRecording(null);
        setIsRecording(false);
        console.log('[USER-APP] Audio recording stopped');
      }
    } catch (error) {
      console.error('[USER-APP] Error stopping audio recording:', error);
    }
  };

  // Handle call end
  const handleCallEnd = (reason) => {
    console.log('[USER-APP] Voice call ended, reason:', reason);
    
    // Emit call ended event
    socket.emit('voice_call_ended', {
      bookingId: bookingId,
      sessionId: sessionId,
      roomId: roomId,
      duration: sessionInfo.duration,
      endedBy: 'user',
      reason: reason
    });

    // Navigate back with session info
    navigation.goBack();
  };

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'End Voice Call',
        'Are you sure you want to end the voice call?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'End Call', 
            style: 'destructive',
            onPress: () => handleCallEnd('user_ended')
          }
        ]
      );
      return true;
    });

    return () => backHandler.remove();
  }, [sessionInfo.duration]);

  // Cleanup audio recording on unmount
  useEffect(() => {
    return () => {
      if (audioRecording) {
        stopAudioRecording();
      }
    };
  }, [audioRecording]);

  // Effect to start timer when both sides are ready
  useEffect(() => {
    if (isLocalWebRTCConnected && isRemoteWebRTCReadyForTimer && !isTimerStarted && webViewRef.current) {
      console.log('[USER-APP] Both clients ready, starting timer');
      
      // Tell the WebView to start the timer
      webViewRef.current.postMessage(JSON.stringify({
        type: 'start_the_timer'
      }));
      
      setIsTimerStarted(true);
    }
  }, [isLocalWebRTCConnected, isRemoteWebRTCReadyForTimer, isTimerStarted, webViewRef]);

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Setting up voice call...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerContainer}>
            <Text style={styles.headerText}>Voice Consultation</Text>
            <Text style={styles.timerText}>
              {Math.floor(sessionInfo.duration / 60)}:{(sessionInfo.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          
          <View style={styles.webViewContainer}>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback={true}
              useWebkit={true}
              androidLayerType="hardware"
              androidHardwareAccelerationDisabled={false}
              cacheEnabled={false}
              domStorageEnabled={true}
              startInLoadingState={true}
              onShouldStartLoadWithRequest={() => true}
              onError={(error) => console.error('WebView error:', error)}
              onLoadEnd={() => {
                console.log('[USER-APP] WebView load ended');
                console.log('[USER-APP] WebView loaded - no polyfill injection, relying on native getUserMedia');
              }}
            />
          </View>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>
              {isLocalWebRTCConnected ? 'Connected to call' : 'Connecting to call...'}
            </Text>
            <Text style={styles.connectionStateText}>
              Connection: {webRTCConnectionState} | ICE: {webRTCIceState}
            </Text>
            {warning && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#6200ee'
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold'
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  webViewContainer: {
    flex: 1
  },
  statusContainer: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5
  },
  connectionStateText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666'
  },
  warningContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffeeba'
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center'
  }
});

export default VoiceCallScreen;
