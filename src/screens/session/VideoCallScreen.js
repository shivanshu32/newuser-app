import React from 'react';
import { useRoute } from '@react-navigation/native';
import VideoConsultationScreen from '../VideoConsultationScreen';
import { SocketProvider, useSocket } from '../../context/SocketContext';

// Inner component that uses the socket context
const VideoCallScreenInner = () => {
  const route = useRoute();
  const { socket } = useSocket();
  
  // Log socket availability for debugging
  React.useEffect(() => {
    console.log('VideoCallScreenInner: Socket available:', socket ? 'YES' : 'NO');
    if (socket) {
      console.log('VideoCallScreenInner: Socket connected:', socket.connected);
    }
  }, [socket]);
  
  return <VideoConsultationScreen {...route.params} />;
};

// Outer component that provides the socket context
const VideoCallScreen = () => {
  return (
    <SocketProvider>
      <VideoCallScreenInner />
    </SocketProvider>
  );
};

export default VideoCallScreen;
