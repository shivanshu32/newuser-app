import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Image,
  SafeAreaView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI } from '../../services/api';
import { getPendingConsultations, removePendingConsultation } from '../../utils/pendingConsultationsStore';

const PendingConsultationsScreen = () => {
  const navigation = useNavigation();
  const { socket } = useSocket();
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [inProgressConsultations, setInProgressConsultations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionTimers, setSessionTimers] = useState({}); // Track timer data for each session

  const loadConsultations = async () => {
    try {
      console.log('📱 [PendingConsultations] Loading consultations...');
      const pendingConsultations = await getPendingConsultations();
      console.log('📱 [PendingConsultations] Loaded consultations:', {
        count: pendingConsultations.length,
        consultations: pendingConsultations.map(c => ({
          id: c.booking._id,
          astrologer: c.booking.astrologer.displayName,
          type: c.booking.type,
          status: c.booking.status
        }))
      });
      
      // Separate pending and in-progress consultations
      const pending = [];
      const inProgress = [];
      
      for (const consultation of pendingConsultations) {
        // Check if this consultation has an active session
        if (consultation.booking.status === 'in-progress' || sessionTimers[consultation.booking._id]) {
          inProgress.push(consultation);
        } else {
          pending.push(consultation);
        }
      }
      
      setConsultations(pending);
      setInProgressConsultations(inProgress);
      
      console.log('📱 [PendingConsultations] Separated:', {
        pending: pending.length,
        inProgress: inProgress.length
      });
      
    } catch (error) {
      console.error('❌ [PendingConsultations] Error loading consultations:', error);
      Alert.alert('Error', 'Failed to load pending consultations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadConsultations();
  };

  // Socket event listeners for session timer updates
  useEffect(() => {
    if (!socket) return;

    const handleSessionTimer = (data) => {
      console.log('📱 [PendingConsultations] Received session_timer:', data);
      
      // Update timer data for the specific session
      setSessionTimers(prev => ({
        ...prev,
        [data.sessionId]: {
          elapsedSeconds: data.elapsedSeconds || 0,
          elapsedMinutes: data.elapsedMinutes || 0,
          remainingSeconds: data.remainingSeconds || 0,
          remainingMinutes: data.remainingMinutes || 0,
          currentAmount: data.currentAmount || 0,
          currency: data.currency || '₹',
          isCountdown: data.isCountdown || false,
          lastUpdate: Date.now()
        }
      }));
      
      // Refresh consultations to update status
      loadConsultations();
    };

    const handleSessionWarning = (data) => {
      console.log('⚠️ [PendingConsultations] Session warning:', data);
      Alert.alert(
        'Session Warning',
        data.message,
        [{ text: 'OK', style: 'default' }]
      );
    };

    const handleConsultationEnded = (data) => {
      console.log('🏁 [PendingConsultations] Consultation ended:', data);
      
      // Remove timer data for ended session
      setSessionTimers(prev => {
        const updated = { ...prev };
        delete updated[data.sessionId];
        return updated;
      });
      
      // Refresh consultations
      loadConsultations();
    };

    // Register socket event listeners
    socket.on('session_timer', handleSessionTimer);
    socket.on('session_warning', handleSessionWarning);
    socket.on('consultation_ended', handleConsultationEnded);
    socket.on('session_ended', handleConsultationEnded);

    // Cleanup listeners on unmount
    return () => {
      socket.off('session_timer', handleSessionTimer);
      socket.off('session_warning', handleSessionWarning);
      socket.off('consultation_ended', handleConsultationEnded);
      socket.off('session_ended', handleConsultationEnded);
    };
  }, [socket]);

  // Load consultations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadConsultations();
    }, [])
  );

  const handleJoinConsultation = async (consultation) => {
    try {
      console.log('📱 [PendingConsultations] Joining consultation:', {
        bookingId: consultation.booking._id,
        type: consultation.booking.type,
        astrologer: consultation.booking.astrologer.displayName
      });

      const astrologerId = consultation.booking.astrologer?._id || consultation.booking.astrologer;
      
      if (!astrologerId || astrologerId === 'unknown') {
        console.error('❌ [PendingConsultations] Invalid astrologer ID:', astrologerId);
        Alert.alert('Error', 'Cannot join consultation: Invalid astrologer information');
        return;
      }

      // Navigate to appropriate consultation screen based on type
      if (consultation.booking.type === 'chat') {
        navigation.navigate('FixedChatScreen', {
          sessionId: consultation.sessionId,
          roomId: consultation.roomId,
          astrologer: consultation.booking.astrologer,
          bookingId: consultation.booking._id
        });
      } else if (consultation.booking.type === 'video') {
        // Video calls are no longer supported
        console.log('Video call consultation - feature removed');
      } else if (consultation.booking.type === 'voice') {
        // Voice calls are now handled by Exotel - no navigation needed
        console.log('Voice call consultation - handled by Exotel');
      }

      // Remove from pending consultations after joining
      await removePendingConsultation(consultation.booking._id);
      loadConsultations(); // Refresh the list
    } catch (error) {
      console.error('❌ [PendingConsultations] Error joining consultation:', error);
      Alert.alert('Error', 'Failed to join consultation. Please try again.');
    }
  };

  const handleEndConsultation = async (consultation) => {
    try {
      console.log('🔴 [PendingConsultations] Ending consultation:', {
        bookingId: consultation.booking._id,
        sessionId: consultation.sessionId,
        type: consultation.booking.type
      });

      // Show confirmation dialog
      Alert.alert(
        'End Consultation',
        'Are you sure you want to end this consultation? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: async () => {
              try {
                if (!socket) {
                  Alert.alert('Error', 'Connection not available. Please try again.');
                  return;
                }

                // Emit end_session event (same as EnhancedChatScreen)
                console.log('📱 [PendingConsultations] Emitting end_session event');
                socket.emit('end_session', {
                  bookingId: consultation.booking._id,
                  sessionId: consultation.sessionId,
                  userId: user._id,
                  reason: 'user_ended_from_pending_screen'
                });

                // Remove from pending consultations
                await removePendingConsultation(consultation.booking._id);
                
                // Remove timer data
                setSessionTimers(prev => {
                  const updated = { ...prev };
                  delete updated[consultation.sessionId];
                  return updated;
                });

                // Refresh consultations list
                loadConsultations();

                Alert.alert(
                  'Session Ended', 
                  'The consultation has been ended successfully.',
                  [{ text: 'OK', style: 'default' }]
                );

              } catch (error) {
                console.error('❌ [PendingConsultations] Error ending consultation:', error);
                Alert.alert('Error', 'Failed to end consultation. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ [PendingConsultations] Error in handleEndConsultation:', error);
      Alert.alert('Error', 'Failed to end consultation. Please try again.');
    }
  };

  // Helper function to format timer display
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render in-progress consultation item with timer and end button
  const renderInProgressConsultationItem = ({ item }) => {
    const consultation = item;
    const astrologer = consultation.booking.astrologer;
    const bookingType = consultation.booking.type;
    const timerData = sessionTimers[consultation.sessionId] || {};
    const isTimerActive = timerData.lastUpdate && (Date.now() - timerData.lastUpdate < 10000); // Active if updated within 10s

    return (
      <View style={[styles.consultationCard, styles.inProgressCard]}>
        {/* In Progress Badge */}
        <View style={styles.statusBadge}>
          <View style={styles.statusIndicator} />
          <Text style={styles.statusText}>IN PROGRESS</Text>
        </View>

        <View style={styles.consultationHeader}>
          <Image 
            source={{ uri: astrologer.profileImage || 'https://via.placeholder.com/50' }}
            style={styles.astrologerImage}
          />
          <View style={styles.consultationInfo}>
            <Text style={styles.astrologerName}>
              {astrologer.displayName || astrologer.name || 'Astrologer'}
            </Text>
            <Text style={styles.consultationType}>
              {bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Consultation
            </Text>
            
            {/* Live Timer Display */}
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color="#007AFF" />
              <Text style={styles.timerText}>
                {isTimerActive ? (
                  timerData.isCountdown ? 
                    `${formatTimer(timerData.remainingSeconds || 0)} remaining` :
                    `${formatTimer(timerData.elapsedSeconds || 0)} elapsed`
                ) : 'Timer unavailable'}
              </Text>
            </View>
            
            {/* Billing Info */}
            {timerData.currentAmount && (
              <Text style={styles.billingText}>
                Current: {timerData.currency}{timerData.currentAmount}
              </Text>
            )}
          </View>
          <View style={styles.typeIcon}>
            <Ionicons 
              name={bookingType === 'chat' ? 'chatbubble' : bookingType === 'video' ? 'videocam' : 'call'} 
              size={24} 
              color="#007AFF" 
            />
          </View>
        </View>

        <View style={styles.consultationActions}>
          <TouchableOpacity 
            style={styles.rejoinButton}
            onPress={() => handleJoinConsultation(consultation)}
          >
            <Text style={styles.rejoinButtonText}>Rejoin</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.endButton}
            onPress={() => handleEndConsultation(consultation)}
          >
            <Text style={styles.endButtonText}>End Consultation</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render pending consultation item
  const renderConsultationItem = ({ item }) => {
    const consultation = item;
    const astrologer = consultation.booking.astrologer;
    const bookingType = consultation.booking.type;

    return (
      <View style={styles.consultationCard}>
        <View style={styles.consultationHeader}>
          <Image 
            source={{ uri: astrologer.profileImage || 'https://via.placeholder.com/50' }}
            style={styles.astrologerImage}
          />
          <View style={styles.consultationInfo}>
            <Text style={styles.astrologerName}>
              {astrologer.displayName || astrologer.name || 'Astrologer'}
            </Text>
            <Text style={styles.consultationType}>
              {bookingType.charAt(0).toUpperCase() + bookingType.slice(1)} Consultation
            </Text>
            <Text style={styles.consultationStatus}>Ready to join</Text>
          </View>
          <View style={styles.typeIcon}>
            <Ionicons 
              name={bookingType === 'chat' ? 'chatbubble' : bookingType === 'video' ? 'videocam' : 'call'} 
              size={24} 
              color="#007AFF" 
            />
          </View>
        </View>

        <View style={styles.consultationActions}>
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => handleJoinConsultation(consultation)}
          >
            <Text style={styles.joinButtonText}>Join Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#C7C7CC" />
      <Text style={styles.emptyStateTitle}>No Pending Consultations</Text>
      <Text style={styles.emptyStateSubtitle}>
        Your accepted booking requests will appear here
      </Text>
      <TouchableOpacity 
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.browseButtonText}>Browse Astrologers</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSectionHeader = (title, count) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {count > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );

  const hasAnyConsultations = inProgressConsultations.length > 0 || consultations.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultations</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {!hasAnyConsultations ? (
        <View style={styles.emptyContainer}>
          {renderEmptyState()}
        </View>
      ) : (
        <FlatList
          data={[
            // Add section headers and items
            ...(inProgressConsultations.length > 0 ? [
              { type: 'header', title: 'In Progress', count: inProgressConsultations.length },
              ...inProgressConsultations.map(item => ({ ...item, type: 'inProgress' }))
            ] : []),
            ...(consultations.length > 0 ? [
              { type: 'header', title: 'Pending', count: consultations.length },
              ...consultations.map(item => ({ ...item, type: 'pending' }))
            ] : [])
          ]}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return renderSectionHeader(item.title, item.count);
            } else if (item.type === 'inProgress') {
              return renderInProgressConsultationItem({ item });
            } else {
              return renderConsultationItem({ item });
            }
          }}
          keyExtractor={(item) => {
            if (item.type === 'header') {
              return `header-${item.title}`;
            }
            return item.booking._id;
          }}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  countBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Consultation Cards
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inProgressCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
    backgroundColor: '#F8FFF9',
  },
  // Status Badge for In-Progress
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  consultationInfo: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  consultationType: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  consultationStatus: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  // Timer Display
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  billingText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  typeIcon: {
    marginLeft: 12,
  },
  // Action Buttons
  consultationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  rejoinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  rejoinButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  endButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PendingConsultationsScreen;
