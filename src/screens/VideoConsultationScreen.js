import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ScrollView,
  StyleSheet,
} from 'react-native';
// import { RTCView } from 'react-native-webrtc';
import Icon from 'react-native-vector-icons/MaterialIcons';
import WebRTCService from '../services/WebRTCService';
import { SocketContext, SocketProvider } from '../context/SocketContext';
import Constants from 'expo-constants';
import RTCViewMock from '../components/RTCViewMock';

// Determine if we're running in Expo Go
const isExpoGo = Constants.executionEnvironment === 'storeClient';

// Use mock RTCView in Expo Go
const RTCView = isExpoGo ? RTCViewMock : View; // Will be replaced with actual RTCView in production builds

const { width, height } = Dimensions.get('window');

// Inner component that uses the socket context
const VideoConsultationScreenInner = ({ route, navigation }) => {
  const socketContext = useContext(SocketContext);
  const { socket } = socketContext || {};
  const { bookingId, sessionId: routeSessionId, roomId: routeRoomId, eventData } = route.params || {};

  // Computed values
  const sessionId = routeSessionId || bookingId;
  const roomId = routeRoomId || `consultation:${bookingId}`;
  const userId = socket?.user?.id || socket?.user?._id;

  // Debug logging for parameters and initialization
  console.log('🚀 [VideoConsultationScreen] Component initialized');
  console.log('🚀 [VideoConsultationScreen] Route params:', JSON.stringify(route.params, null, 2));
  console.log('🚀 [VideoConsultationScreen] Extracted params:', {
    bookingId,
    sessionId,
    roomId,
    eventData
  });
  console.log('🚀 [VideoConsultationScreen] Socket available:', !!socket);
  console.log('🚀 [VideoConsultationScreen] SocketContext available:', !!socketContext);
  
  // CRITICAL: Add component mount debugging
  useEffect(() => {
    console.log('🎯 [VideoConsultationScreen] Component MOUNTED successfully');
    console.log('🎯 [VideoConsultationScreen] Current state on mount:', {
      hasSocket: !!socket,
      hasBookingId: !!bookingId,
      hasSocketContext: !!socketContext
    });
    
    return () => {
      console.log('🎯 [VideoConsultationScreen] Component UNMOUNTING');
    };
  }, []);
  
  // Emergency fallback check - if no bookingId, show error immediately
  if (!bookingId) {
    console.error('❌ [VideoConsultationScreen] CRITICAL: No bookingId provided in route params');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FF0000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#FF0000" />
        <View style={styles.initializingContainer}>
          <Text style={[styles.initializingText, { color: '#FFFFFF', fontSize: 20 }]}>❌ ERROR: Missing Booking Information</Text>
          <Text style={[styles.statusText, { color: '#FFFFFF', marginTop: 10 }]}>No booking ID provided. Please try again.</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: '#FFFFFF', marginTop: 20 }]} 
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.retryButtonText, { color: '#FF0000' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // State management
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('Initializing');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showDebugLogs, setShowDebugLogs] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Refs
  const callStartTime = useRef(null);
  const timerInterval = useRef(null);
  
  // Debug logging function
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { message: `[${timestamp}] ${message}`, type };
    console.log(`🔍 [VideoConsultationScreen] ${message}`);
    setDebugLogs(prev => [...prev.slice(-20), logEntry]); // Keep last 20 logs
  };

  useEffect(() => {
    try {
      addDebugLog('🚀 VideoConsultationScreen initialized');
      addDebugLog(`📋 Params: bookingId=${bookingId}, sessionId=${sessionId}, roomId=${roomId}`);
      
      // Check for SocketContext availability
      if (!socketContext) {
        const error = 'SocketContext not available - component may not be wrapped with SocketProvider';
        addDebugLog(`❌ ${error}`, 'error');
        setHasError(true);
        setErrorMessage(error);
        return;
      }

      if (!socket) {
        addDebugLog('⏳ Socket not available yet, waiting...', 'warning');
        setConnectionState('Waiting for connection...');
        // Don't return here, let it continue and try again when socket becomes available
      }

      // Only initialize if we have both socket and bookingId
      if (socket && bookingId) {
        initializeVideoCall();
      }

    } catch (error) {
      addDebugLog(`❌ Error in useEffect: ${error.message}`, 'error');
      setHasError(true);
      setErrorMessage(error.message);
    }

    return () => {
      addDebugLog('🧹 Cleaning up VideoConsultationScreen');
      cleanup();
    };
  }, [socket, bookingId]); // Add socket and bookingId as dependencies

  const initializeVideoCall = async () => {
    try {
      addDebugLog('🔧 Initializing video call...');
      setConnectionState('Setting up camera...');
      
      // Setup socket listeners first
      const cleanup = setupSocketListeners();
      
      // Initialize WebRTC
      await initializeWebRTC();
      
      // Join consultation room
      await joinConsultationRoom();
      
      addDebugLog('✅ Video call initialization complete');
      
    } catch (error) {
      addDebugLog(`❌ Failed to initialize video call: ${error.message}`, 'error');
      setConnectionState('Failed to initialize');
      Alert.alert('Error', 'Failed to initialize video call. Please try again.');
    }
  };

  const initializeWebRTC = async () => {
    try {
      addDebugLog('🎥 Initializing WebRTC service...');
      
      await WebRTCService.createPeerConnection(
        // onRemoteStream callback
        (stream) => {
          addDebugLog('📺 Remote stream received!', 'success');
          setRemoteStream(stream);
          setConnectionState('Connected');
          if (!callStartTime.current) {
            callStartTime.current = Date.now();
            startTimer();
          }
        },
        // onIceCandidate callback
        (candidate) => {
          addDebugLog('🧊 ICE candidate generated, emitting to backend');
          if (socket && socket.connected) {
            socket.emit('signal', {
              sessionId: sessionId,
              signal: {
                type: 'ice-candidate',
                candidate: candidate
              },
              to: 'astrologer',
              bookingId: bookingId
            });
            addDebugLog('✅ ICE candidate emitted successfully');
          } else {
            addDebugLog('❌ Cannot emit ICE candidate - socket not connected', 'error');
          }
        },
        // onConnectionStateChange callback
        (state) => {
          addDebugLog(`🔗 Connection state changed: ${state}`);
          setConnectionState(state);
        }
      );

      addDebugLog('📱 Getting local media stream...');
      const stream = await WebRTCService.getLocalStream();
      setLocalStream(stream);
      addDebugLog('✅ Local stream obtained successfully');
      
    } catch (error) {
      addDebugLog(`❌ WebRTC initialization failed: ${error.message}`, 'error');
      throw error;
    }
  };

  const joinConsultationRoom = async () => {
    addDebugLog('🚪 joinConsultationRoom function called');
    
    if (!socket) {
      addDebugLog('❌ Socket is null/undefined', 'error');
      return;
    }

    if (!socket.connected) {
      addDebugLog('❌ Socket not connected', 'error');
      addDebugLog(`🔍 Socket state: connected=${socket.connected}, id=${socket.id}`, 'error');
      return;
    }

    if (!bookingId) {
      addDebugLog('❌ Cannot join room - bookingId is null', 'error');
      return;
    }

    addDebugLog(`🚪 Joining consultation room: ${roomId}`);
    addDebugLog(`👤 User ID: ${userId}`);
    addDebugLog(`📋 Session ID: ${sessionId}`);
    addDebugLog(`🔌 Socket connected: ${socket.connected}, Socket ID: ${socket.id}`);

    try {
      const joinData = { 
        bookingId, 
        roomId: roomId, 
        userId: userId,
        userType: 'user',
        sessionId: sessionId // Add sessionId to prevent backend from setting it to null
      };

      addDebugLog(`📤 Emitting join_consultation_room with data: ${JSON.stringify(joinData)}`);
      
      socket.emit('join_consultation_room', joinData);

      addDebugLog(`✅ join_consultation_room emitted successfully for booking: ${bookingId}`);
      
      // Add a small delay to see if the backend receives it
      setTimeout(() => {
        addDebugLog('⏰ 2 seconds after join_consultation_room emission');
      }, 2000);
      
      // Notify astrologer if eventData is present
      if (eventData) {
        addDebugLog('📤 Found eventData, emitting user_joined_consultation event');
        addDebugLog(`📤 EventData: ${JSON.stringify(eventData)}`);
        socket.emit('user_joined_consultation', eventData);
        addDebugLog('✅ Successfully notified astrologer about joining video consultation');
      } else {
        addDebugLog('⚠️ No eventData found, skipping user_joined_consultation emission', 'warning');
      }

    } catch (error) {
      addDebugLog(`❌ Error joining consultation room: ${error.message}`, 'error');
      addDebugLog(`❌ Error stack: ${error.stack}`, 'error');
      Alert.alert('Error', 'Failed to join consultation room. Please try again.');
    }
  };

  const setupSocketListeners = () => {
    if (!socket) {
      addDebugLog('❌ Socket not available for listeners', 'error');
      return () => {};
    }

    addDebugLog('🎧 Setting up socket listeners');

    // Handle WebRTC signaling - unified signal event to match astrologer-app
    const handleSignal = async (data) => {
      addDebugLog(`📡 Received signal: ${JSON.stringify(data)}`);
      
      if (data.sessionId === sessionId) {
        addDebugLog(`✅ Signal sessionId matches (${data.sessionId}), processing...`);
        addDebugLog(`🔄 Signal type: ${data.signal.type}`);
        
        try {
          switch (data.signal.type) {
            case 'offer':
              addDebugLog('📥 Processing offer from astrologer');
              setConnectionState('Received offer, creating answer...');
              
              await WebRTCService.handleOffer(data.signal);
              addDebugLog('✅ Offer processed, remote description set');
              
              const answer = await WebRTCService.createAnswer();
              addDebugLog('📤 Answer created, emitting to backend');
              
              if (socket && socket.connected) {
                socket.emit('signal', {
                  sessionId: sessionId,
                  signal: answer,
                  to: 'astrologer',
                  bookingId: bookingId
                });
                addDebugLog('✅ Answer emitted successfully');
                setConnectionState('Answer sent, waiting for connection...');
              } else {
                addDebugLog('❌ Cannot emit answer - socket not connected', 'error');
              }
              break;

            case 'answer':
              addDebugLog('📥 Processing answer from astrologer');
              await WebRTCService.handleAnswer(data.signal);
              addDebugLog('✅ Answer processed successfully');
              break;

            case 'ice-candidate':
              addDebugLog('🧊 Processing ICE candidate from astrologer');
              await WebRTCService.handleIceCandidate(data.signal.candidate);
              addDebugLog('✅ ICE candidate processed successfully');
              break;

            default:
              addDebugLog(`⚠️ Unknown signal type: ${data.signal.type}`, 'warning');
          }
        } catch (error) {
          addDebugLog(`❌ Error processing signal: ${error.message}`, 'error');
        }
      } else {
        addDebugLog(`⚠️ Signal sessionId mismatch: received ${data.sessionId}, expected ${sessionId}`, 'warning');
      }
    };

    // Handle astrologer joined
    const handleAstrologerJoined = (data) => {
      addDebugLog(`👨‍⚕️ Astrologer joined: ${JSON.stringify(data)}`);
      if (data.sessionId === sessionId) {
        addDebugLog('✅ Astrologer joined our session, ready to start call');
        setConnectionState('Astrologer joined, starting call...');
      }
    };

    // Handle user joined (for confirmation)
    const handleUserJoined = (data) => {
      addDebugLog(`👤 User joined confirmation: ${JSON.stringify(data)}`);
    };

    // Register listeners
    socket.on('signal', handleSignal);
    socket.on('astrologer_joined_consultation', handleAstrologerJoined);
    socket.on('user_joined_consultation', handleUserJoined);

    addDebugLog('✅ Socket listeners registered successfully');

    // Return cleanup function
    return () => {
      addDebugLog('🧹 Cleaning up socket listeners');
      socket.off('signal', handleSignal);
      socket.off('astrologer_joined_consultation', handleAstrologerJoined);
      socket.off('user_joined_consultation', handleUserJoined);
    };
  };

  const startTimer = () => {
    timerInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);
  };

  const cleanup = () => {
    addDebugLog('🧹 Cleaning up resources');
    clearInterval(timerInterval.current);
    WebRTCService.cleanup();
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('Initializing');
  };

  const toggleAudio = async () => {
    try {
      await WebRTCService.toggleAudio();
      setIsAudioMuted(!isAudioMuted);
    } catch (error) {
      addDebugLog(`❌ Error toggling audio: ${error.message}`, 'error');
    }
  };

  const toggleVideo = async () => {
    try {
      await WebRTCService.toggleVideo();
      setIsVideoMuted(!isVideoMuted);
    } catch (error) {
      addDebugLog(`❌ Error toggling video: ${error.message}`, 'error');
    }
  };

  const switchCamera = async () => {
    try {
      await WebRTCService.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      addDebugLog(`❌ Error switching camera: ${error.message}`, 'error');
    }
  };

  const endCall = async () => {
    addDebugLog('📞 Ending call');
    
    // Leave the room
    if (socket && (roomId || bookingId)) {
      socket.emit('leave_consultation_room', { 
        bookingId, 
        roomId: roomId 
      });
    }
    
    cleanup();
    navigation.goBack();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'failed': return 'Connection Failed';
      default: return 'Waiting for connection...';
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FFA500';
      case 'failed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.initializingContainer}>
          <Text style={styles.initializingText}>Error occurred</Text>
          <Text style={styles.statusText}>{errorMessage}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setHasError(false);
              setErrorMessage('');
              if (socket && bookingId) {
                initializeVideoCall();
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
        {/* Debug Logs */}
        {showDebugLogs && (
          <ScrollView style={styles.debugLogsContainer}>
            {debugLogs.map((log, index) => (
              <Text key={index} style={[styles.debugLog, { color: log.type === 'error' ? '#F44336' : '#4CAF50' }]}>
                {log.message}
              </Text>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  if (!socket) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.initializingContainer}>
          <Text style={styles.initializingText}>Connecting...</Text>
          <Text style={styles.statusText}>Waiting for socket connection</Text>
        </View>
        {/* Debug Logs */}
        {showDebugLogs && (
          <ScrollView style={styles.debugLogsContainer}>
            {debugLogs.map((log, index) => (
              <Text key={index} style={[styles.debugLog, { color: log.type === 'error' ? '#F44336' : '#4CAF50' }]}>
                {log.message}
              </Text>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  if (connectionState === 'Initializing' || connectionState === 'Setting up camera...') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.initializingContainer}>
          <Text style={styles.initializingText}>Setting up video call...</Text>
          <Text style={styles.statusText}>{connectionState}</Text>
        </View>
        {/* Debug Logs */}
        {showDebugLogs && (
          <ScrollView style={styles.debugLogsContainer}>
            {debugLogs.map((log, index) => (
              <Text key={index} style={[styles.debugLog, { color: log.type === 'error' ? '#F44336' : '#4CAF50' }]}>
                {log.message}
              </Text>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* CRITICAL DEBUG OVERLAY - Remove after fixing white screen */}
      <View style={{
        position: 'absolute',
        top: 50,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 0, 0.9)',
        padding: 10,
        borderRadius: 5,
        zIndex: 1000
      }}>
        <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>
          🐛 DEBUG: VideoConsultationScreen Rendered
        </Text>
        <Text style={{ color: '#000', fontSize: 10 }}>
          BookingId: {bookingId} | Socket: {socket ? '✅' : '❌'} | State: {connectionState}
        </Text>
      </View>
      
      {/* Video Container */}
      <View style={styles.videoContainer}>
        {/* Remote Video (Full Screen) */}
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>Waiting for astrologer to join...</Text>
          </View>
        )}
        
        {/* Local Video (Picture in Picture) */}
        {localStream && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={isFrontCamera}
          />
        )}
        
        {/* Status Overlay */}
        <View style={styles.statusOverlay}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
            <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
          </View>
          {callDuration > 0 && (
            <Text style={styles.durationText}>{formatTime(callDuration)}</Text>
          )}
        </View>
      </View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isAudioMuted ? '#F44336' : '#4CAF50' }]}
          onPress={toggleAudio}
        >
          <Icon 
            name={isAudioMuted ? 'mic-off' : 'mic'} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: isVideoMuted ? '#F44336' : '#4CAF50' }]}
          onPress={toggleVideo}
        >
          <Icon 
            name={isVideoMuted ? 'videocam-off' : 'videocam'} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: '#2196F3' }]}
          onPress={switchCamera}
        >
          <Icon name="camera-reverse" size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={endCall}
        >
          <Icon name="call" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Debug Logs */}
      {showDebugLogs && (
        <ScrollView style={styles.debugLogsContainer}>
          {debugLogs.map((log, index) => (
            <Text key={index} style={[styles.debugLog, { color: log.type === 'error' ? '#F44336' : '#4CAF50' }]}>
              {log.message}
            </Text>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );

  
};

const VideoConsultationScreen = ({ route, navigation }) => {
  return (
    <SocketProvider>
      <VideoConsultationScreenInner route={route} navigation={navigation} />
    </SocketProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  initializingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  initializingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    width,
    height,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  localVideo: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
  },
  statusOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  durationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButton: {
    backgroundColor: '#F44336',
  },
  retryButton: {
    width: 80,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  debugLogsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
  },
  debugLog: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default VideoConsultationScreen;
