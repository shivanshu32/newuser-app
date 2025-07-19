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
import { getPendingConsultations, removePendingConsultation } from '../../utils/pendingConsultationsStore';

const PendingConsultationsScreen = () => {
  const navigation = useNavigation();
  const [consultations, setConsultations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
      setConsultations(pendingConsultations);
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
        navigation.navigate('EnhancedConsultationRoom', {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Consultations</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={consultations}
        renderItem={renderConsultationItem}
        keyExtractor={(item) => item.booking._id}
        contentContainerStyle={consultations.length === 0 ? styles.emptyContainer : styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  refreshButton: {
    padding: 8,
  },
  listContainer: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    color: '#1C1C1E',
    marginBottom: 2,
  },
  consultationType: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  consultationStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  typeIcon: {
    marginLeft: 12,
  },
  consultationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
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
