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

const PendingConsultationsScreen = ({ navigation }) => {
  const [consultations, setConsultations] = useState([]);

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

  const handleJoinConsultation = (consultation) => {
    console.log('Joining consultation:', consultation.booking._id);
    // Remove from pending list
    removePendingConsultation(consultation.booking._id);
    // Navigate to consultation room
    navigation.navigate('ConsultationRoom', consultation);
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
