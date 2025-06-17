import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPendingConsultations, removePendingConsultation } from '../../utils/pendingConsultationsStore';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const PendingConsultationsScreen = ({ navigation }) => {
  const [consultations, setConsultations] = useState([]);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Load pending consultations when the screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadConsultations();
    });

    return unsubscribe;
  }, [navigation]);

  // Initial load
  useEffect(() => {
    loadConsultations();
  }, []);

  const loadConsultations = () => {
    const pendingConsultations = getPendingConsultations();
    console.log('Loaded pending consultations:', pendingConsultations.length);
    setConsultations(pendingConsultations);
  };

  // Initialize socket connection if needed and monitor socket status
  useEffect(() => {
    if (!socket && user) {
      console.log('PendingConsultationsScreen: Socket not initialized, attempting to initialize from context');
      // The useSocket hook should handle initialization, but we'll log this for debugging
    } else if (socket) {
      console.log('PendingConsultationsScreen: Socket is available, connected status:', socket.connected);
      console.log('PendingConsultationsScreen: Socket ID:', socket.id || 'No ID available');
    }
  }, [socket, user]);
  
  // Store pending video consultation data for retry mechanism
  const [pendingVideoConsultation, setPendingVideoConsultation] = useState(null);
  
  // Retry emitting user_joined_consultation event when socket becomes available
  useEffect(() => {
    if (pendingVideoConsultation && socket && socket.connected) {
      console.log('PendingConsultationsScreen: Socket now available and connected, attempting to emit pending event');
      emitUserJoinedConsultation(pendingVideoConsultation);
    }
  }, [socket, pendingVideoConsultation]);

  // Function to emit user_joined_consultation event
  const emitUserJoinedConsultation = (consultationData) => {
    const { bookingId, eventData, roomId } = consultationData;
    
    if (!socket || !socket.connected) {
      console.error('emitUserJoinedConsultation: Socket not available or not connected, storing for retry');
      setPendingVideoConsultation(consultationData);
      return false;
    }
    
    console.log(`emitUserJoinedConsultation: Emitting user_joined_consultation event for booking: ${bookingId}, type: video`);
    console.log('emitUserJoinedConsultation: Socket connected:', socket.connected);
    
    // First join the room
    console.log(`emitUserJoinedConsultation: Joining room: ${roomId}`);
    socket.emit('join_room', { bookingId }, (joinResponse) => {
      if (joinResponse && joinResponse.success) {
        console.log(`emitUserJoinedConsultation: Successfully joined room for booking: ${bookingId}`);
        
        // Now emit the user_joined_consultation event
        console.log('emitUserJoinedConsultation: Emitting user_joined_consultation event');
        socket.emit('user_joined_consultation', eventData, (response) => {
          if (response && response.success) {
            console.log('emitUserJoinedConsultation: Successfully notified astrologer about joining video consultation');
            
            // Also emit the alternate event as a fallback
            console.log('emitUserJoinedConsultation: Emitting join_consultation event as fallback');
            socket.emit('join_consultation', eventData);
            
            // Also emit direct notification to astrologer
            console.log('emitUserJoinedConsultation: Emitting direct_astrologer_notification event as fallback');
            socket.emit('direct_astrologer_notification', eventData);
            
            // Clear the pending consultation since we've successfully emitted the event
            setPendingVideoConsultation(null);
            
            // Navigate to VideoCall screen after getting the real sessionId from backend
            navigation.navigate('VideoCall', {
              bookingId,
              sessionId: eventData.sessionId,
              roomId,
              eventData
            });
          } else {
            console.error('emitUserJoinedConsultation: Failed to notify astrologer:', response?.error || 'Unknown error');
          }
        });
      } else {
        console.error('emitUserJoinedConsultation: Failed to join room:', joinResponse?.error || 'Unknown error');
      }
    });
    
    return true;
  };
  
  const handleJoinConsultation = (consultation) => {
    console.log('Joining consultation:', consultation.booking._id, 'Type:', consultation.booking.type);
    // Remove from pending list
    removePendingConsultation(consultation.booking._id);
    
    const bookingId = consultation.booking._id;
    const sessionId = consultation.sessionId || bookingId; // Fallback to bookingId only if sessionId is missing
    const roomId = `consultation:${bookingId}`;
    
    // Check consultation type and navigate to appropriate screen
    if (consultation.booking.type === 'video') {
      // For video consultations, navigate to VideoConsultationScreen
      
      // Prepare event data regardless of socket availability
      const eventData = {
        bookingId,
        userId: user?.id,
        astrologerId: consultation.booking.astrologer,
        sessionId,
        roomId,
        type: 'video',  // Explicitly set the consultation type
        consultationType: 'video'  // Add this for backward compatibility
      };
      
      console.log('PendingConsultationsScreen: Video call event data:', JSON.stringify(eventData));
      
      // Create consultation data object for emission and retry
      const consultationData = {
        bookingId,
        eventData,
        roomId
      };
      
      // Don't navigate immediately - wait for the real sessionId from backend
      // The navigation will happen in the emitUserJoinedConsultation callback
      
      // Attempt to emit user_joined_consultation event
      const emitSuccess = emitUserJoinedConsultation(consultationData);
      
      if (!emitSuccess) {
        console.log('PendingConsultationsScreen: Event emission queued for retry when socket is available');
        // If socket is not available, navigate with the current sessionId as fallback
        navigation.navigate('VideoCall', {
          bookingId,
          sessionId,
          roomId,
          eventData
        });
      }
    } else if (consultation.booking.type === 'voice') {
      // For voice consultations, navigate to VoiceCallScreen
      console.log('PendingConsultationsScreen: Handling voice call consultation');
      
      // Prepare event data for voice call
      const eventData = {
        bookingId,
        userId: user?.id,
        astrologerId: consultation.booking.astrologer,
        sessionId,
        roomId,
        type: 'voice',
        consultationType: 'voice'
      };
      
      console.log('PendingConsultationsScreen: Voice call event data:', JSON.stringify(eventData));
      
      // IMPORTANT CHANGE: Navigate to VoiceCallScreen FIRST, then handle socket events
      // This ensures the navigation happens regardless of socket callback issues
      console.log('PendingConsultationsScreen: Navigating to VoiceCall screen FIRST');
      try {
        navigation.navigate('VoiceCall', {
          bookingId,
          sessionId,
          roomId,
          eventData
        });
        console.log('PendingConsultationsScreen: Navigation to VoiceCall initiated successfully');
        
        // After navigation, handle socket events if socket is available
        if (socket && socket.connected) {
          console.log(`PendingConsultationsScreen: Joining consultation room for voice call: ${bookingId}`);
          
          // Join the consultation room
          console.log(`PendingConsultationsScreen: Emitting join_consultation_room with bookingId: ${bookingId}, roomId: ${roomId}`);
          socket.emit('join_consultation_room', { bookingId, roomId }, (joinResponse) => {
            if (joinResponse && joinResponse.success) {
              console.log(`PendingConsultationsScreen: Successfully joined consultation room for voice call: ${bookingId}`);
              
              // Now emit user_joined_consultation event
              console.log('PendingConsultationsScreen: Emitting user_joined_consultation for voice call');
              console.log('PendingConsultationsScreen: Socket ID before emit:', socket.id);
              console.log('PendingConsultationsScreen: Socket namespace:', socket.nsp?.name || 'unknown');
              console.log('PendingConsultationsScreen: Socket auth:', JSON.stringify(socket.auth || {}));
              
              const eventData = {
                bookingId: bookingId,
                sessionId: sessionId,
                roomId: roomId,
                userId: user?.id,
                astrologerId: consultation.booking.astrologer,
                userName: user?.name,
                consultationType: 'voice',
                type: 'voice'
              };
              
              console.log('PendingConsultationsScreen: user_joined_consultation payload:', JSON.stringify(eventData));
              
              socket.emit('user_joined_consultation', eventData, (response) => {
                console.log('PendingConsultationsScreen: user_joined_consultation callback received:', JSON.stringify(response));
              });
            } else {
              console.error('PendingConsultationsScreen: Failed to join consultation room for voice call:', joinResponse?.error || 'Unknown error');
            }
          });
        } else {
          console.error('PendingConsultationsScreen: Socket not available for voice call after navigation');
        }
      } catch (navError) {
        console.error('PendingConsultationsScreen: Error navigating to VoiceCall:', navError);
      }
    } else {
      // For chat consultations, navigate to ChatScreen
      navigation.navigate('Chat', {
        booking: consultation.booking,
        bookingId: consultation.booking._id
      });
    }
  };

  const renderConsultationItem = ({ item }) => {
    const astrologer = item.astrologer || {};
    const booking = item.booking || {};

    return (
      <View style={styles.consultationCard}>
        <View style={styles.consultationHeader}>
          <Image
            source={
              astrologer.imageUrl
                ? { uri: astrologer.imageUrl }
                : require('../../../assets/images/default-astrologer.png')
            }
            style={styles.astrologerImage}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.astrologerName}>{astrologer.displayName || 'Astrologer'}</Text>
            <Text style={styles.consultationType}>
              {booking.type === 'chat' ? 'Chat Consultation' :
                booking.type === 'voice' ? 'Voice Call' : 'Video Call'}
            </Text>
          </View>
        </View>

        <View style={styles.consultationDetails}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={styles.detailValue}>Ready to Join</Text>
        </View>

        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => handleJoinConsultation(item)}
        >
          <Text style={styles.joinButtonText}>Join Now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Consultations</Text>
        <View style={{ width: 24 }} />
      </View>

      {consultations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No pending consultations</Text>
          <Text style={styles.emptySubtext}>
            When an astrologer accepts your booking request, it will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={consultations}
          renderItem={renderConsultationItem}
          keyExtractor={(item) => item.booking._id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  consultationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  astrologerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  consultationType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  consultationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  joinButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PendingConsultationsScreen;
