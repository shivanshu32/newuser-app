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

const VoiceCallScreen = () => {
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
    console.log('VoiceCallScreen: Route params received:', { bookingId, sessionId, roomId });
    console.log('VoiceCallScreen: eventData present:', eventData ? 'YES' : 'NO');
    if (eventData) {
      console.log('VoiceCallScreen: eventData content:', JSON.stringify(eventData));
    }
  }, [bookingId, sessionId, roomId, eventData]);

  // Load HTML content using expo-asset and expo-file-system
  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        console.log('[USER-APP] Starting to load voice-webrtc.html');
        
        // Download the asset first
        const asset = Asset.fromModule(require('../assets/voice-webrtc.html'));
        await asset.downloadAsync();
        
        // Read the HTML content
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
    if (!socket) return;

    const handleVoiceCallOffer = (data) => {
      console.log('[USER-APP] Received voice call offer:', data);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'voice_call_offer',
          data: data
        }));
      }
    };

    const handleVoiceCallAnswer = (data) => {
      console.log('[USER-APP] Received voice call answer:', data);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'voice_call_answer',
          data: data
        }));
      }
    };

    const handleVoiceIceCandidate = (data) => {
      console.log('[USER-APP] Received voice ICE candidate:', data);
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'voice_ice_candidate',
          data: data
        }));
      }
    };

    const handleStartVoiceCall = (data) => {
      console.log('[USER-APP] Start voice call event received:', data);
      console.log('[USER-APP] WebView ready status:', !!webViewRef.current);
      
      // Astrologer is ready, we can now create the offer
      if (webViewRef.current) {
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
      } else {
        console.error('[USER-APP] WebView not ready when start_voice_call received');
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

    // Add socket listeners
    socket.on('voice_call_offer', handleVoiceCallOffer);
    socket.on('voice_call_answer', handleVoiceCallAnswer);
    socket.on('voice_ice_candidate', handleVoiceIceCandidate);
    socket.on('start_voice_call', handleStartVoiceCall);
    socket.on('voice_call_ended', handleVoiceCallEnded);

    // Cleanup listeners
    return () => {
      socket.off('voice_call_offer', handleVoiceCallOffer);
      socket.off('voice_call_answer', handleVoiceCallAnswer);
      socket.off('voice_ice_candidate', handleVoiceIceCandidate);
      socket.off('start_voice_call', handleStartVoiceCall);
      socket.off('voice_call_ended', handleVoiceCallEnded);
    };
  }, [socket, navigation]);

  // Emit user joined consultation when component mounts
  useEffect(() => {
    if (socket && bookingId && sessionId && roomId) {
      console.log('[USER-APP] Joining consultation room first, then emitting user_joined_consultation');
      console.log('[USER-APP] Room details:', { bookingId, roomId, socketConnected: socket.connected });
      
      // First join the consultation room
      socket.emit('join_consultation_room', { bookingId }, (response) => {
        console.log('[USER-APP] join_consultation_room response:', response);
        
        if (response && response.success) {
          console.log(`[USER-APP] Successfully joined consultation room for booking: ${bookingId}`);
          
          // Now emit user_joined_consultation event
          console.log('[USER-APP] Emitting user_joined_consultation for voice call');
          socket.emit('user_joined_consultation', {
            bookingId: bookingId,
            sessionId: sessionId,
            roomId: roomId,
            userId: user?.id,
            userName: user?.name,
            consultationType: 'voice'
          });
        } else {
          console.error('[USER-APP] Failed to join consultation room:', response?.error || 'Unknown error');
          console.error('[USER-APP] Cannot emit user_joined_consultation without joining room first');
        }
      });

      // Add a timeout to detect if the callback never fires
      setTimeout(() => {
        console.log('[USER-APP] join_consultation_room timeout check - if no response logged above, the server may not be responding');
      }, 5000);
    } else {
      console.error('[USER-APP] Cannot join consultation room - missing required data:', {
        hasSocket: !!socket,
        bookingId,
        sessionId,
        roomId,
        socketConnected: socket?.connected
      });
    }
  }, [socket, bookingId, sessionId, roomId, user]);

  // Handle messages from WebView
  const handleWebViewMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[USER-APP] WebView message:', message);

      switch (message.type) {
        case 'voice_call_offer':
          // Send offer to astrologer via socket
          socket.emit('voice_call_offer', {
            ...message.data,
            bookingId: bookingId,
            sessionId: sessionId,
            roomId: roomId,
            fromUser: true
          });
          break;

        case 'voice_call_answer':
          // Send answer to astrologer via socket
          socket.emit('voice_call_answer', {
            ...message.data,
            bookingId: bookingId,
            sessionId: sessionId,
            roomId: roomId,
            fromUser: true
          });
          break;

        case 'voice_ice_candidate':
          // Send ICE candidate to astrologer via socket
          socket.emit('voice_ice_candidate', {
            ...message.data,
            bookingId: bookingId,
            sessionId: sessionId,
            roomId: roomId,
            fromUser: true
          });
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

        case 'webrtc_ready':
          console.log('[USER-APP] Voice WebRTC is ready');
          break;

        case 'webrtc_error':
          console.error('[USER-APP] Voice WebRTC error:', message.data.error);
          Alert.alert('Voice Call Error', message.data.error);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading Voice Call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
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
        onLoadStart={() => console.log('[USER-APP] WebView load started')}
        onLoadEnd={() => console.log('[USER-APP] WebView load ended')}
        onError={(err) => {
          console.error('[USER-APP] WebView error:', err);
          setError(`WebView error: ${err.nativeEvent.description}`);
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
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#f44336',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default VoiceCallScreen;
