import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { astrologersAPI } from '../services/api';
import { initiateRealTimeBooking } from '../services/socketService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const AstrologerProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { astrologerId } = route.params || {};
  
  const [astrologer, setAstrologer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConsultationType, setSelectedConsultationType] = useState('chat');

  // Fetch astrologer details
  useEffect(() => {
    const fetchAstrologerDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the astrologersAPI service instead of direct axios call
        const response = await astrologersAPI.getById(astrologerId);
        if (response && response.data) {
          console.log('Astrologer data fetched successfully:', response.data);
          setAstrologer(response.data);
        } else {
          throw new Error('Invalid response format');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching astrologer details:', error);
        setLoading(false);
        setError('Failed to load astrologer details');
      }
    };
    
    if (astrologerId) {
      fetchAstrologerDetails();
    } else {
      setLoading(false);
      setError('No astrologer ID provided');
    }
  }, [astrologerId]);

  // Handle booking now
  const handleBookNow = async (bookingData, type) => {
    try {
      // Validate astrologer data is available
      if (!astrologer || !astrologer.name || !astrologer._id) {
        console.error('Invalid astrologer data:', astrologer);
        Alert.alert(
          'Booking Error',
          'Astrologer information is not available. Please try again.'
        );
        return;
      }
      
      console.log('Booking initiated for:', astrologer.name, 'Type:', type);
      
      // Show confirmation dialog before initiating booking
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Show confirmation dialog with correct astrologer name and session type
      Alert.alert(
        'Confirm Booking',
        `Schedule a ${type} session with ${astrologer.name} at ${formattedTime}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                // Send booking request via socket
                const response = await initiateRealTimeBooking(bookingData);
                
                console.log('Booking response:', response);
                
                if (response.status === 'accepted') {
                  // Navigate to consultation room
                  navigation.navigate('ConsultationRoom', {
                    booking: {
                      _id: response.bookingId,
                      astrologer: astrologer,
                      type: type,
                      rate: astrologer.rates[type]
                    },
                    roomId: response.roomId,
                    sessionId: response.sessionId
                  });
                } else if (response.status === 'rejected') {
                  Alert.alert(
                    'Booking Rejected',
                    response.message || 'Astrologer is not available right now.'
                  );
                }
              } catch (error) {
                console.error('Booking request error:', error);
                
                Alert.alert(
                  'Booking Error',
                  error.message || 'Failed to send booking request. Please try again.'
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Booking preparation error:', error);
      
      Alert.alert(
        'Booking Error',
        error.message || 'Failed to prepare booking request. Please try again.'
      );
    }
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading astrologer profile...</Text>
      </View>
    );
  }

  // Render error state
  if (error || !astrologer) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error || 'Astrologer not found'}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image
          source={
            astrologer.profileImage
              ? { uri: astrologer.profileImage }
              : require('../assets/default-avatar.png')
          }
          style={styles.profileImage}
        />
        
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{astrologer.name}</Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={16} color="#FFC107" />
            <Text style={styles.rating}>
              {astrologer.rating || '4.5'} ({astrologer.reviewCount || '120'} reviews)
            </Text>
          </View>
          <View style={styles.specialtyContainer}>
            <Icon name="category" size={16} color="#F97316" />
            <Text style={styles.specialty}>
              {astrologer.specialties ? astrologer.specialties.join(', ') : 'Vedic Astrology'}
            </Text>
          </View>
          <View style={styles.experienceContainer}>
            <Icon name="history" size={16} color="#F97316" />
            <Text style={styles.experience}>
              {astrologer.experience || '5'} years experience
            </Text>
          </View>
        </View>
      </View>
      
      {/* Status Badge */}
      <View style={[styles.statusBadge, astrologer.status === 'online' ? styles.onlineBadge : styles.offlineBadge]}>
        <Text style={styles.statusText}>
          {astrologer.status === 'online' ? 'Online' : 'Offline'}
        </Text>
      </View>
      
      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          {astrologer.bio || 'Experienced astrologer specializing in Vedic astrology, horoscope reading, and life path guidance.'}
        </Text>
      </View>
      
      {/* Consultation Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consultation Types</Text>
        
        <View style={styles.consultationTypes}>
          {/* Chat Consultation */}
          <TouchableOpacity
            style={[
              styles.consultationType,
              selectedConsultationType === 'chat' && styles.selectedConsultationType
            ]}
            onPress={() => setSelectedConsultationType('chat')}
          >
            <Icon
              name="chat"
              size={24}
              color={selectedConsultationType === 'chat' ? '#FFFFFF' : '#673AB7'}
            />
            <Text
              style={[
                styles.consultationTypeText,
                selectedConsultationType === 'chat' && styles.selectedConsultationTypeText
              ]}
            >
              Chat
            </Text>
            <Text
              style={[
                styles.consultationTypePrice,
                selectedConsultationType === 'chat' && styles.selectedConsultationTypeText
              ]}
            >
              ₹{astrologer.rates?.chat || '100'}/min
            </Text>
          </TouchableOpacity>
          
          {/* Voice Consultation */}
          <TouchableOpacity
            style={[
              styles.consultationType,
              selectedConsultationType === 'voice' && styles.selectedConsultationType
            ]}
            onPress={() => setSelectedConsultationType('voice')}
          >
            <Icon
              name="call"
              size={24}
              color={selectedConsultationType === 'voice' ? '#FFFFFF' : '#673AB7'}
            />
            <Text
              style={[
                styles.consultationTypeText,
                selectedConsultationType === 'voice' && styles.selectedConsultationTypeText
              ]}
            >
              Voice
            </Text>
            <Text
              style={[
                styles.consultationTypePrice,
                selectedConsultationType === 'voice' && styles.selectedConsultationTypeText
              ]}
            >
              ₹{astrologer.rates?.voice || '150'}/min
            </Text>
          </TouchableOpacity>
          
          {/* Video Consultation */}
          <TouchableOpacity
            style={[
              styles.consultationType,
              selectedConsultationType === 'video' && styles.selectedConsultationType
            ]}
            onPress={() => setSelectedConsultationType('video')}
          >
            <Icon
              name="videocam"
              size={24}
              color={selectedConsultationType === 'video' ? '#FFFFFF' : '#673AB7'}
            />
            <Text
              style={[
                styles.consultationTypeText,
                selectedConsultationType === 'video' && styles.selectedConsultationTypeText
              ]}
            >
              Video
            </Text>
            <Text
              style={[
                styles.consultationTypePrice,
                selectedConsultationType === 'video' && styles.selectedConsultationTypeText
              ]}
            >
              ₹{astrologer.rates?.video || '200'}/min
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Languages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages</Text>
        <View style={styles.languageContainer}>
          {(astrologer.languages || ['Hindi', 'English']).map((language, index) => (
            <View key={index} style={styles.languageBadge}>
              <Text style={styles.languageText}>{language}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Real-Time Booking Buttons */}
      <View style={styles.bookingSection}>
        <TouchableOpacity
          style={[styles.bookingButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => {
            // Directly call handleBookNow with the booking data
            const bookingData = {
              astrologerId: astrologer?._id,
              type: 'chat',
              notes: 'Instant chat consultation request'
            };
            handleBookNow(bookingData, 'chat');
          }}
        >
          <Icon name="chat" size={20} color="#FFFFFF" style={styles.bookingButtonIcon} />
          <Text style={styles.bookingButtonText}>Book Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bookingButton, { backgroundColor: '#2196F3' }]}
          onPress={() => {
            // Directly call handleBookNow with the booking data
            const bookingData = {
              astrologerId: astrologer?._id,
              type: 'voice',
              notes: 'Instant voice consultation request'
            };
            handleBookNow(bookingData, 'voice');
          }}
        >
          <Icon name="call" size={20} color="#FFFFFF" style={styles.bookingButtonIcon} />
          <Text style={styles.bookingButtonText}>Book Voice Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bookingButton, { backgroundColor: '#FF5722' }]}
          onPress={() => {
            // Directly call handleBookNow with the booking data
            const bookingData = {
              astrologerId: astrologer?._id,
              type: 'video',
              notes: 'Instant video consultation request'
            };
            handleBookNow(bookingData, 'video');
          }}
        >
          <Icon name="videocam" size={20} color="#FFFFFF" style={styles.bookingButtonIcon} />
          <Text style={styles.bookingButtonText}>Book Video Call</Text>
        </TouchableOpacity>
      </View>
      
      {/* Schedule Button */}
      <TouchableOpacity
        style={styles.scheduleButton}
        onPress={() => navigation.navigate('ScheduleConsultation', { astrologer })}
      >
        <Text style={styles.scheduleButtonText}>Schedule for Later</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#673AB7',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginVertical: 16,
    textAlign: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#757575',
  },
  specialtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  specialty: {
    marginLeft: 4,
    fontSize: 14,
    color: '#757575',
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experience: {
    marginLeft: 4,
    fontSize: 14,
    color: '#757575',
  },
  statusBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineBadge: {
    backgroundColor: '#4CAF50',
  },
  offlineBadge: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  consultationTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  consultationType: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#673AB7',
    marginHorizontal: 4,
  },
  selectedConsultationType: {
    backgroundColor: '#673AB7',
  },
  consultationTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#673AB7',
  },
  consultationTypePrice: {
    marginTop: 4,
    fontSize: 12,
    color: '#757575',
  },
  selectedConsultationTypeText: {
    color: '#FFFFFF',
  },
  languageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  languageBadge: {
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  languageText: {
    color: '#673AB7',
    fontWeight: '500',
    fontSize: 12,
  },
  bookingSection: {
    padding: 16,
    gap: 10,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
  },
  bookingButtonIcon: {
    marginRight: 8,
  },
  bookingButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  scheduleButton: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#673AB7',
  },
  scheduleButtonText: {
    color: '#673AB7',
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#673AB7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AstrologerProfileScreen;
