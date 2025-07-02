import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, astrologersAPI } from '../../services/api';

const RatingScreen = ({ route, navigation }) => {
  const { bookingId, consultation } = route.params || {};
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [astrologer, setAstrologer] = useState(null);
  const { user } = useAuth();
  
  // Format duration from minutes to readable format
  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return 'N/A';
    
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    } else {
      return `${mins}m`;
    }
  };

  // Format consultation type for display
  const formatConsultationType = (type) => {
    switch (type) {
      case 'video':
        return 'Video Call';
      case 'voice':
        return 'Voice Call';
      case 'chat':
        return 'Chat';
      default:
        return 'Consultation';
    }
  };

  useEffect(() => {
    fetchBookingAndAstrologerDetails();
  }, []);

  const fetchBookingAndAstrologerDetails = async () => {
    try {
      setLoading(true);
      
      let booking = null;
      let astrologerData = null;
      
      // If consultation object is passed directly, use it
      if (consultation) {
        booking = consultation.booking;
        astrologerData = consultation.astrologer;
      } else if (bookingId) {
        // Fetch booking details by ID
        console.log('🔍 Fetching booking details for ID:', bookingId);
        const bookingResponse = await bookingsAPI.getById(bookingId);
        console.log('📋 Booking response:', JSON.stringify(bookingResponse, null, 2));
        
        if (bookingResponse.data && bookingResponse.data.success) {
          // Backend returns { success: true, data: booking }
          booking = bookingResponse.data.data;
          astrologerData = booking.astrologer; // Astrologer is populated in the booking
          console.log('✅ Booking data found:', booking);
          console.log('✅ Astrologer data found:', astrologerData);
        }
      }
      
      if (!booking) {
        throw new Error('Booking data not found');
      }
      
      // If we don't have astrologer data, fetch it separately
      if (!astrologerData && (booking.astrologer || booking.astrologerId)) {
        const astrologerId = booking.astrologer?._id || booking.astrologer || booking.astrologerId;
        console.log('🔍 Fetching astrologer data for ID:', astrologerId);
        const astrologerResponse = await astrologersAPI.getById(astrologerId);
        if (astrologerResponse.data && astrologerResponse.data.success) {
          astrologerData = astrologerResponse.data.data;
          console.log('✅ Astrologer data fetched separately:', astrologerData);
        }
      }
      
      setBookingData(booking);
      setAstrologer(astrologerData);
      
    } catch (error) {
      console.error('Error fetching booking/astrologer details:', error);
      Alert.alert(
        'Error', 
        'Failed to load consultation details. Please try again.',
        [
          { text: 'Retry', onPress: fetchBookingAndAstrologerDetails },
          { text: 'Go Back', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRating = (value) => {
    setRating(value);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting.');
      return;
    }
    
    if (!bookingData) {
      Alert.alert('Error', 'Booking information not available.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Submit rating via API
      const ratingData = {
        bookingId: bookingData._id,
        astrologerId: bookingData.astrologerId,
        rating,
        review: review.trim() || null,
        consultationType: bookingData.type,
        duration: bookingData.actualDuration || bookingData.duration,
        amount: bookingData.totalAmount || bookingData.amount
      };
      
      // Call the ratings API endpoint
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(ratingData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit rating');
      }
      
      setSubmitting(false);
      
      Alert.alert(
        'Thank You!',
        'Your rating has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      setSubmitting(false);
      Alert.alert('Error', error.message || 'Failed to submit rating. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading consultation details...</Text>
      </View>
    );
  }

  if (!bookingData || !astrologer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Unable to Load Details</Text>
        <Text style={styles.errorMessage}>
          We couldn't load the consultation details. Please try again.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchBookingAndAstrologerDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Consultation</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.sessionSummary}>
        <View style={styles.astrologerInfo}>
          <Image 
            source={{ 
              uri: astrologer.profileImage || astrologer.image || 'https://via.placeholder.com/100' 
            }} 
            style={styles.astrologerImage} 
          />
          <View style={styles.astrologerDetails}>
            <Text style={styles.astrologerName}>
              {astrologer.displayName || astrologer.name || 'Unknown Astrologer'}
            </Text>
            <Text style={styles.sessionType}>
              {formatConsultationType(bookingData.type)}
            </Text>
            {astrologer.specialties && astrologer.specialties.length > 0 && (
              <Text style={styles.specialties}>
                {astrologer.specialties.slice(0, 2).join(', ')}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.sessionDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Duration: {formatDuration(bookingData.actualDuration || bookingData.duration)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              Amount: ₹{bookingData.totalAmount || bookingData.amount || 0}
            </Text>
          </View>
          {bookingData.scheduledAt && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Date: {new Date(bookingData.scheduledAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingTitle}>How was your experience?</Text>
        
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => handleRating(star)}
              style={styles.starButton}
            >
              <Ionicons
                name={rating >= star ? 'star' : 'star-outline'}
                size={40}
                color={rating >= star ? '#FFD700' : '#ccc'}
              />
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.ratingText}>
          {rating === 0
            ? 'Tap to rate'
            : rating === 1
            ? 'Poor'
            : rating === 2
            ? 'Fair'
            : rating === 3
            ? 'Good'
            : rating === 4
            ? 'Very Good'
            : 'Excellent'}
        </Text>
      </View>
      
      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>Write a review (optional)</Text>
        <TextInput
          style={styles.reviewInput}
          placeholder={`Share your experience with ${astrologer.displayName || astrologer.name}...`}
          multiline
          numberOfLines={5}
          value={review}
          onChangeText={setReview}
          maxLength={500}
        />
        <Text style={styles.charCount}>{review.length}/500</Text>
      </View>
      
      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.disabledButton]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Rating</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => navigation.navigate('Home')}
        disabled={submitting}
      >
        <Text style={styles.skipButtonText}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goBackButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  sessionSummary: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  astrologerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  astrologerDetails: {
    flex: 1,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '500',
    marginBottom: 2,
  },
  specialties: {
    fontSize: 12,
    color: '#666',
  },
  sessionDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  ratingContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  reviewContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#F97316',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default RatingScreen;
