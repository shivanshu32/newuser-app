import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  BackHandler, 
  Alert, 
  ActivityIndicator,
  Text,
  SafeAreaView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const VideoConsultationScreen = () => {
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
  
  // Get booking details from route params
  const { bookingId, sessionId, roomId, eventData } = route.params || {};
  
  // Debug logging for route params
  useEffect(() => {
    console.log('VideoConsultationScreen: Route params received:', { bookingId, sessionId, roomId });
    console.log('VideoConsultationScreen: eventData present:', eventData ? 'YES' : 'NO');
    if (eventData) {
      console.log('VideoConsultationScreen: eventData content:', JSON.stringify(eventData));
    }
  }, [bookingId, sessionId, roomId, eventData]);

  // Load HTML content using expo-asset and expo-file-system
  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        console.log('[USER-APP] Starting to load webrtc.html');
        
        // Get the asset module
        const asset = Asset.fromModule(require('../assets/webrtc.html'));
        
        // Download the asset if needed
        if (!asset.downloaded) {
          console.log('[USER-APP] Downloading asset...');
          await asset.downloadAsync();
        }
        
        console.log('[USER-APP] Asset downloaded, reading file content...');
        
        // Read the file content
        const content = await FileSystem.readAsStringAsync(asset.localUri);
        console.log('[USER-APP] HTML content loaded successfully, length:', content.length);
        console.log('[USER-APP] HTML local URI:', asset.localUri);
        
        // Store both the content and the URI
        setHtmlContent(content);
        setHtmlUri(asset.localUri);
        setLoading(false);
      } catch (err) {
        console.error('[USER-APP] Failed to load HTML file:', err);
        setError('Failed to load video call interface');
        setLoading(false);
      }
    };
    
    loadHtmlContent();
  }, []);

  // Handle back button press
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'End Call',
        'Are you sure you want to end this call?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => {} },
          { 
            text: 'End Call', 
            style: 'destructive', 
            onPress: () => {
              // Leave the room
              if (socket && roomId) {
                socket.emit('leave_consultation_room', { bookingId, roomId });
              }
              navigation.goBack();
            } 
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation, socket, bookingId, roomId]);

  // Initialize socket connection if needed
  useEffect(() => {
    if (!socket) {
      console.log('VideoConsultationScreen: Socket is NULL - this is a critical issue');
      return;
    }
    
    if (!bookingId) {
      console.log('VideoConsultationScreen: Cannot proceed - bookingId is null');
      return;
    }
    
    console.log('VideoConsultationScreen: Socket available:', !!socket);
    console.log('VideoConsultationScreen: Socket connected:', socket?.connected);
  }, [socket, bookingId]);

  // Join consultation room when socket is available and connected
  useEffect(() => {
    if (!socket || !socket.connected || !bookingId) {
      console.log('VideoConsultationScreen: Cannot join consultation room - socket not ready or missing bookingId');
      return;
    }
    
    console.log('VideoConsultationScreen: Socket is connected, proceeding with room join');
    
    // Join the room for this consultation
    socket.emit('join_consultation_room', { bookingId }, (response) => {
      console.log(`VideoConsultationScreen: join_consultation_room response:`, response);
      
      if (response && response.success) {
        console.log(`VideoConsultationScreen: Successfully joined consultation room for booking: ${bookingId}`);
        
        // Start session timer when user joins
        console.log('VideoConsultationScreen: Starting session timer');
        socket.emit('start_session_timer', { bookingId });
        
        // If we have eventData from PendingConsultationsScreen, emit the user_joined_consultation event
        if (eventData) {
          console.log('VideoConsultationScreen: Found eventData, emitting user_joined_consultation event');
          
          socket.emit('user_joined_consultation', eventData, (response) => {
            console.log(`VideoConsultationScreen: user_joined_consultation response:`, response);
            
            if (response && response.success) {
              console.log('VideoConsultationScreen: Successfully notified astrologer about joining video consultation');
            } else {
              console.error('VideoConsultationScreen: Failed to notify astrologer:', response?.error || 'Unknown error');
            }
          });
        }
      } else {
        console.error('VideoConsultationScreen: Failed to join consultation room:', response?.error || 'Unknown error');
      }
    });
    
    return () => {
      // Leave the room when component unmounts
      if (socket && socket.connected) {
        console.log(`VideoConsultationScreen: Leaving consultation room for booking: ${bookingId}`);
        socket.emit('leave_consultation_room', { bookingId });
      }
    };
  }, [socket?.connected, bookingId, eventData]);

  // Listen for session timer updates
  useEffect(() => {
    if (!socket || !bookingId || !roomId) return;
    
    // Listen for session timer updates
    socket.on('session_timer', (data) => {
      setSessionInfo({
        duration: data.durationSeconds,
        currentAmount: data.currentAmount
      });
    });
    
    // Listen for session status updates
    socket.on('session_status', (data) => {
      if (data.status === 'disconnected') {
        Alert.alert(
          'Call Ended',
          'The consultation has ended.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    });
    
    // Listen for incoming WebRTC signaling messages
    socket.on('signal', (data) => {
      console.log('[USER-APP] Received signal from backend:', JSON.stringify(data, null, 2));
      // Forward the complete signal data to the WebView for processing
      if (data.signal && webViewRef.current) {
        console.log('[USER-APP] Forwarding signal to WebView:', data.signal.type);
        sendMessageToWebView(data);
      }
    });
    
    // Clean up listeners when component unmounts
    return () => {
      socket.off('session_timer');
      socket.off('session_status');
      socket.off('signal');
      
      // Leave the room when component unmounts
      socket.emit('leave_consultation_room', { bookingId, roomId });
    };
  }, [socket, bookingId, roomId, navigation]);

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'log':
          console.log(`[WebRTC-LOG] ${message.log}`);
          return; // Don't process further
          
        case 'ready':
          console.log('[USER-APP] WebView is ready, sending initialization data');
          console.log('[USER-APP] Socket state - available:', !!socket, 'connected:', socket?.connected);
          console.log('[USER-APP] Current user object:', JSON.stringify(user, null, 2));
          console.log('[USER-APP] User role check:', user.role, 'equals user?', user.role === 'user');
          
          // WebView is ready, send initial data
          sendMessageToWebView({
            type: 'init',
            userId: user.id,
            bookingId,
            sessionId,
            roomId
          });
          
          // User doesn't create offer, waits for astrologer's offer
          console.log('[USER-APP] User app initialized, waiting for astrologer offer');
          break;
          
        case 'offer':
          console.log('Received WebRTC offer from WebView, forwarding to server');
          // Forward offer to server
          if (socket) {
            socket.emit('signal', {
              roomId,
              sessionId,
              bookingId,
              signal: message,
              to: 'astrologer'
            });
          }
          break;
          
        case 'answer':
          console.log('Received WebRTC answer from WebView, forwarding to server');
          // Forward answer to server
          if (socket) {
            socket.emit('signal', {
              roomId,
              sessionId,
              bookingId,
              signal: message,
              to: 'astrologer'
            });
          }
          break;
          
        case 'ice-candidate':
          console.log('Received ICE candidate from WebView, forwarding to server');
          // Forward ICE candidate to server
          if (socket) {
            socket.emit('signal', {
              roomId,
              sessionId,
              bookingId,
              signal: message,
              to: 'astrologer'
            });
          }
          break;
          
        case 'end-call-request':
          console.log('User requested to end call from WebView');
          // User requested to end call from WebView
          Alert.alert(
            'End Call',
            'Are you sure you want to end this call?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => {} },
              { 
                text: 'End Call', 
                style: 'destructive', 
                onPress: () => {
                  console.log('User confirmed end call, leaving room');
                  // Leave the room
                  if (socket && roomId) {
                    socket.emit('leave_consultation_room', { bookingId, roomId });
                  }
                  navigation.goBack();
                } 
              }
            ]
          );
          break;
          
        case 'error':
          console.error('WebRTC error:', message.error);
          setError(`Video call error: ${message.error}`);
          break;
          
        case 'call-ended':
          console.log('Call ended from WebView');
          // Call ended from WebView
          if (socket && roomId) {
            socket.emit('leave_consultation_room', { bookingId, roomId });
          }
          navigation.goBack();
          break;
          
        default:
          console.log(`Unhandled message type from WebView: ${message.type}`);
      }
    } catch (err) {
      console.error('Error handling WebView message:', err, event.nativeEvent.data);
    }
  };

  // Send message to WebView
  const sendMessageToWebView = (message) => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  };

  // Listen for WebRTC signaling from server
  useEffect(() => {
    if (!socket) return;
    
    const handleSignal = (data) => {
      if (data.roomId === roomId) {
        sendMessageToWebView({
          ...data.signal,
          from: data.from
        });
      }
    };
    
    socket.on('signal', handleSignal);
    
    return () => {
      socket.off('signal', handleSignal);
    };
  }, [socket, roomId]);

  // Show loading indicator while HTML content is being loaded
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Setting up video call...</Text>
      </View>
    );
  }

  // Show error message if there was an error loading the HTML content
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{
          html: htmlContent,
          baseUrl: FileSystem.documentDirectory
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={handleWebViewMessage}
        onError={(err) => {
          console.error('WebView error:', err);
          setError(`WebView error: ${err}`);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#ff0000',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default VideoConsultationScreen;
