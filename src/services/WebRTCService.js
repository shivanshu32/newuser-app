// Mock WebRTC imports for Expo Go compatibility
// import {
//   RTCPeerConnection,
//   RTCIceCandidate,
//   RTCSessionDescription,
//   RTCView,
//   MediaStream,
//   MediaStreamTrack,
//   mediaDevices,
//   registerGlobals
// } from 'react-native-webrtc';

// Mock WebRTCService for Expo Go compatibility
class WebRTCService {
  constructor() {
    this.localStream = { toURL: () => 'mock://local-stream' };
    this.remoteStream = { toURL: () => 'mock://remote-stream' };
    this.peerConnection = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
    
    console.log('[WebRTCService Mock] Initialized');
  }

  async initializeLocalStream(isVideoCall = true) {
    try {
      console.log('[WebRTCService Mock] Requesting media access...');
      
      // Create mock stream
      this.localStream = {
        toURL: () => 'mock://local-stream',
        getVideoTracks: () => isVideoCall ? [{ enabled: true }] : [],
        getAudioTracks: () => [{ enabled: true }],
        getTracks: () => [
          { enabled: true, kind: 'audio' },
          ...(isVideoCall ? [{ enabled: true, kind: 'video' }] : [])
        ]
      };
      
      console.log('[WebRTCService Mock] Local stream initialized:', {
        videoTracks: isVideoCall ? 1 : 0,
        audioTracks: 1
      });
      
      return this.localStream;
    } catch (error) {
      console.error('[WebRTCService Mock] Error getting media stream:', error);
      throw error;
    }
  }

  async getLocalStream(isVideoCall = true) {
    if (!this.localStream) {
      return await this.initializeLocalStream(isVideoCall);
    }
    return this.localStream;
  }

  async createPeerConnection(onRemoteStream, onIceCandidate, onConnectionStateChange) {
    try {
      console.log('[WebRTCService Mock] Creating peer connection...');
      
      // Initialize local stream first if not already done
      if (!this.localStream) {
        console.log('[WebRTCService Mock] Local stream not initialized, initializing now...');
        await this.initializeLocalStream(true);
      }
      
      // Create mock peer connection
      this.peerConnection = {
        iceConnectionState: 'new',
        connectionState: 'new',
        localDescription: null,
        remoteDescription: null,
        candidates: [],
        addTrack: () => console.log('[WebRTCService Mock] Added track'),
        addIceCandidate: (candidate) => {
          console.log('[WebRTCService Mock] Added ICE candidate', candidate);
          return Promise.resolve();
        },
        setLocalDescription: (desc) => {
          console.log('[WebRTCService Mock] Set local description', desc);
          this.peerConnection.localDescription = desc;
          return Promise.resolve();
        },
        setRemoteDescription: (desc) => {
          console.log('[WebRTCService Mock] Set remote description', desc);
          this.peerConnection.remoteDescription = desc;
          return Promise.resolve();
        },
        createOffer: () => {
          console.log('[WebRTCService Mock] Created offer');
          return Promise.resolve({ type: 'offer', sdp: 'mock-sdp-offer' });
        },
        createAnswer: () => {
          console.log('[WebRTCService Mock] Created answer');
          return Promise.resolve({ type: 'answer', sdp: 'mock-sdp-answer' });
        },
        close: () => console.log('[WebRTCService Mock] Peer connection closed')
      };

      // Create mock remote stream
      setTimeout(() => {
        console.log('[WebRTCService Mock] Received remote stream');
        this.remoteStream = { toURL: () => 'mock://remote-stream' };
        if (onRemoteStream) {
          onRemoteStream(this.remoteStream);
        }
      }, 1000);

      // Simulate ICE candidate generation
      setTimeout(() => {
        console.log('[WebRTCService Mock] ICE candidate generated');
        if (onIceCandidate) {
          onIceCandidate({ candidate: 'mock-ice-candidate', sdpMid: '0', sdpMLineIndex: 0 });
        }
      }, 1500);

      // Simulate connection state change
      setTimeout(() => {
        console.log('[WebRTCService Mock] Connection state changed: connected');
        this.peerConnection.connectionState = 'connected';
        if (onConnectionStateChange) {
          onConnectionStateChange('connected');
        }
      }, 2000);
      
      // Simulate ICE connection state change
      setTimeout(() => {
        console.log('[WebRTCService Mock] ICE connection state changed: connected');
        this.peerConnection.iceConnectionState = 'connected';
      }, 2500);

      return this.peerConnection;
    } catch (error) {
      console.error('[WebRTC] Error creating peer connection:', error);
      throw error;
    }
  }

  async createOffer() {
    try {
      console.log('[WebRTCService Mock] Creating offer...');
      const offer = await this.peerConnection.createOffer();
      
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTCService Mock] Offer created and set as local description');
      
      return {
        type: 'offer',
        sdp: 'mock-sdp-offer'
      };
    } catch (error) {
      console.error('[WebRTCService Mock] Error creating offer:', error);
      throw error;
    }
  }

  async createAnswer(offer) {
    try {
      console.log('[WebRTCService Mock] Setting remote description (offer)...');
      await this.peerConnection.setRemoteDescription(offer);
      console.log('[WebRTCService Mock] Remote description set, creating answer...');
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('[WebRTCService Mock] Answer created and set as local description');
      
      return {
        type: 'answer',
        sdp: 'mock-sdp-answer'
      };
    } catch (error) {
      console.error('[WebRTCService Mock] Error creating answer:', error);
      throw error;
    }
  }

  async handleOffer(offer) {
    try {
      console.log('[WebRTCService Mock] Handling offer, setting remote description...');
      await this.peerConnection.setRemoteDescription(offer);
      console.log('[WebRTCService Mock] Offer set as remote description successfully');
    } catch (error) {
      console.error('[WebRTCService Mock] Error handling offer:', error);
      throw error;
    }
  }

  async handleAnswer(answer) {
    try {
      console.log('[WebRTCService Mock] Handling answer, setting remote description...');
      await this.peerConnection.setRemoteDescription(answer);
      console.log('[WebRTCService Mock] Answer set as remote description successfully');
    } catch (error) {
      console.error('[WebRTCService Mock] Error handling answer:', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      console.log('[WebRTCService Mock] Adding ICE candidate');
      await this.peerConnection.addIceCandidate(candidate);
      console.log('[WebRTCService Mock] ICE candidate added successfully');
    } catch (error) {
      console.error('[WebRTCService Mock] Error adding ICE candidate:', error);
      throw error;
    }
  }

  async setRemoteDescription(description) {
    try {
      console.log('[WebRTCService Mock] Setting remote description:', description.type);
      await this.peerConnection.setRemoteDescription(description);
      console.log('[WebRTCService Mock] Remote description set successfully');
    } catch (error) {
      console.error('[WebRTCService Mock] Error setting remote description:', error);
      throw error;
    }
  }

  async addIceCandidate(candidate) {
    try {
      console.log('[WebRTCService Mock] Adding ICE candidate');
      await this.peerConnection.addIceCandidate(candidate);
      console.log('[WebRTCService Mock] ICE candidate added successfully');
    } catch (error) {
      console.error('[WebRTCService Mock] Error adding ICE candidate:', error);
      throw error;
    }
  }

  toggleAudio() {
    if (this.localStream && this.localStream.getAudioTracks) {
      // Mock audio track toggle
      this.localStream.audioEnabled = !this.localStream.audioEnabled;
      console.log('[WebRTCService Mock] Audio toggled:', this.localStream.audioEnabled ? 'ON' : 'OFF');
      return this.localStream.audioEnabled;
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream && this.localStream.getVideoTracks) {
      // Mock video track toggle
      this.localStream.videoEnabled = !this.localStream.videoEnabled;
      console.log('[WebRTCService Mock] Video toggled:', this.localStream.videoEnabled ? 'ON' : 'OFF');
      return this.localStream.videoEnabled;
    }
    return false;
  }

  switchCamera() {
    // Mock camera switching
    console.log('[WebRTCService Mock] Switching camera...');
    this.localStream.facingMode = this.localStream.facingMode === 'user' ? 'environment' : 'user';
    console.log('[WebRTCService Mock] Camera switched to:', this.localStream.facingMode);
  }

  getConnectionStats() {
    if (this.peerConnection) {
      return {
        connectionState: this.peerConnection.connectionState || 'connected',
        iceConnectionState: this.peerConnection.iceConnectionState || 'connected',
        signalingState: 'stable'
      };
    }
    return null;
  }

  endCall() {
    console.log('[WebRTCService Mock] Ending call and cleaning up...');
    
    // Reset mock streams
    this.localStream = { toURL: () => 'mock://local-stream' };
    this.remoteStream = { toURL: () => 'mock://remote-stream' };
    
    // Close mock peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log('[WebRTC] Peer connection closed');
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    console.log('[WebRTC] Cleanup completed');
  }

  // Alias for cleanup method
  cleanup() {
    return this.endCall();
  }
}

// Export singleton instance
export default new WebRTCService();
