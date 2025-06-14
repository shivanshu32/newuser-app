import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AstrologerProfileScreen = ({ route, navigation }) => {
  const [astrologer, setAstrologer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get astrologer ID from navigation params
  const { astrologerId } = route.params;

  useEffect(() => {
    fetchAstrologerDetails();
  }, []);

  const fetchAstrologerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const API_URL = `http://192.168.29.107:5000/api/v1/astrologers/${astrologerId}`;
      
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch astrologer details');
      }

      setAstrologer(result.data);
    } catch (err) {
      console.error('Error fetching astrologer details:', err);
      setError('Failed to load astrologer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookChat = () => {
    navigation.navigate('Bookings', { 
      astrologer,
      bookingType: 'chat'
    });
  };

  const handleBookVoiceCall = () => {
    navigation.navigate('Bookings', { 
      astrologer,
      bookingType: 'voice'
    });
  };

  const handleBookVideoCall = () => {
    navigation.navigate('Bookings', { 
      astrologer,
      bookingType: 'video'
    });
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
        <Text style={styles.loadingText}>Loading astrologer profile...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchAstrologerDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render no data state
  if (!astrologer) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No astrologer data available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Format languages as a comma-separated string
  const languagesText = Array.isArray(astrologer.languages) 
    ? astrologer.languages.join(', ') 
    : astrologer.languages || 'Not specified';

  // Format specialties as a comma-separated string
  const specialtiesText = Array.isArray(astrologer.specialties) 
    ? astrologer.specialties.join(', ') 
    : astrologer.specialties || 'Not specified';

  // Format rating
  let ratingText = 'Not rated yet';
  let ratingCount = 0;
  
  if (astrologer.rating) {
    if (typeof astrologer.rating === 'object' && astrologer.rating.average) {
      ratingText = astrologer.rating.average.toFixed(1);
      ratingCount = astrologer.rating.count || 0;
    } else if (typeof astrologer.rating === 'number') {
      ratingText = astrologer.rating.toFixed(1);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: astrologer.imageUrl || astrologer.profileImage }} 
            style={styles.profileImage}
            accessibilityLabel={`Profile picture of ${astrologer.displayName || astrologer.name}`}
          />
          
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{astrologer.displayName || astrologer.name}</Text>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{ratingText}</Text>
              {ratingCount > 0 && (
                <Text style={styles.ratingCount}>({ratingCount} reviews)</Text>
              )}
            </View>
            
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: astrologer.status === 'Online' ? '#4CAF50' : '#F44336' },
                ]}
              />
              <Text style={styles.statusText}>{astrologer.status || 'Offline'}</Text>
            </View>
          </View>
        </View>

        {/* Profile Details */}
        <View style={styles.detailsContainer}>
          {/* Bio/Description */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{astrologer.bio || astrologer.description || 'No bio available'}</Text>
          </View>

          {/* Specialties */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Specialties</Text>
            <Text style={styles.detailText}>{specialtiesText}</Text>
          </View>

          {/* Languages */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text style={styles.detailText}>{languagesText}</Text>
          </View>

          {/* Experience */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.detailText}>{astrologer.experience || 'Not specified'} years</Text>
          </View>

          {/* Charges */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Consultation Charges</Text>
            <View style={styles.chargesContainer}>
              <View style={styles.chargeItem}>
                <Ionicons name="chatbubble-outline" size={20} color="#8A2BE2" />
                <Text style={styles.chargeLabel}>Chat</Text>
                <Text style={styles.chargeValue}>
                  ₹{astrologer.chatPrice || astrologer.price || '20'}/min
                </Text>
              </View>
              
              <View style={styles.chargeItem}>
                <Ionicons name="call-outline" size={20} color="#8A2BE2" />
                <Text style={styles.chargeLabel}>Voice Call</Text>
                <Text style={styles.chargeValue}>
                  ₹{astrologer.voicePrice || astrologer.price || '30'}/min
                </Text>
              </View>
              
              <View style={styles.chargeItem}>
                <Ionicons name="videocam-outline" size={20} color="#8A2BE2" />
                <Text style={styles.chargeLabel}>Video Call</Text>
                <Text style={styles.chargeValue}>
                  ₹{astrologer.videoPrice || astrologer.price || '40'}/min
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Booking Buttons */}
        <View style={styles.bookingButtonsContainer}>
          <TouchableOpacity 
            style={[styles.bookingButton, styles.chatButton]} 
            onPress={handleBookChat}
            accessibilityLabel="Book Chat Consultation"
          >
            <Ionicons name="chatbubble" size={24} color="#fff" />
            <Text style={styles.bookingButtonText}>Book Chat</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.bookingButton, styles.voiceButton]} 
            onPress={handleBookVoiceCall}
            accessibilityLabel="Book Voice Call Consultation"
          >
            <Ionicons name="call" size={24} color="#fff" />
            <Text style={styles.bookingButtonText}>Book Voice Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.bookingButton, styles.videoButton]} 
            onPress={handleBookVideoCall}
            accessibilityLabel="Book Video Call Consultation"
          >
            <Ionicons name="videocam" size={24} color="#fff" />
            <Text style={styles.bookingButtonText}>Book Video Call</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 16,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  detailText: {
    fontSize: 16,
    color: '#444',
  },
  chargesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  chargeItem: {
    alignItems: 'center',
    width: '30%',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
  },
  chargeLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  chargeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  bookingButtonsContainer: {
    marginBottom: 20,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
  },
  voiceButton: {
    backgroundColor: '#2196F3',
  },
  videoButton: {
    backgroundColor: '#FF6B00',
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default AstrologerProfileScreen;
