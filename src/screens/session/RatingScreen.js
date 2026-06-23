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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, astrologersAPI, ratingsAPI } from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

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
        
        // API interceptor returns response.data directly, so bookingResponse is already the data
        if (bookingResponse && bookingResponse.success) {
          // Backend returns { success: true, data: booking } but interceptor strips outer response
          booking = bookingResponse.data;
          astrologerData = booking.astrologer; // Astrologer is populated in the booking
          console.log('✅ Booking data found:', booking);
          console.log('✅ Astrologer data found:', astrologerData);
        } else {
          console.log('❌ Invalid booking response:', bookingResponse);
        }
      }
      
      console.log('🔍 Final booking validation - booking exists:', !!booking);
      console.log('🔍 Final astrologer validation - astrologer exists:', !!astrologerData);
      
      if (!booking) {
        console.log('❌ Booking validation failed - booking is:', booking);
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
      console.log('🔍 Error details for debugging:', {
        status: error.response?.status,
        message: error.message,
        code: error.code,
        data: error.response?.data
      });
      
      // Check if it's a 404 error (booking not found) - multiple ways to detect
      const is404Error = 
        error.response?.status === 404 || 
        error.status === 404 ||
        error.message?.includes('404') ||
        error.message?.includes('Request failed with status code 404') ||
        (error.response?.data && error.response.data.error?.includes('not found')) ||
        (error.data && error.data.error?.includes('not found'));
      
      if (is404Error) {
        Alert.alert(
          'Booking Not Found', 
          'This consultation session is no longer available for rating. It may have been removed or is not eligible for rating.',
          [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        Alert.alert(
          'Error', 
          'Failed to load consultation details. Please check your internet connection and try again.',
          [
            { text: 'Retry', onPress: fetchBookingAndAstrologerDetails },
            { text: 'Go Back', onPress: () => navigation.goBack() }
          ]
        );
      }
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
      
      // Call the ratings API endpoint using the proper API service
      console.log('📤 Submitting rating data:', ratingData);
      
      // Backend expects: { bookingId, rating, comment }
      const response = await ratingsAPI.submit(
        bookingData._id, // bookingId
        rating,
        review // comment
      );
      
      console.log('✅ Rating submission response:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Failed to submit rating');
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
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading consultation details...</Text>
      </View>
    );
  }

  if (!bookingData || !astrologer) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Consultation</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.sessionSummary}>
        <View style={styles.astrologerInfo}>
          <Image 
            source={{ 
              uri: astrologer.imageUrl || astrologer.profileImage || astrologer.image || 'https://via.placeholder.com/100' 
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
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              Duration: {formatDuration(bookingData.actualDuration || bookingData.duration)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>
              Amount: ₹{bookingData.totalAmount || bookingData.amount || 0}
            </Text>
          </View>
          {bookingData.scheduledAt && (
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
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
                color={rating >= star ? colors.warning : colors.surfaceTertiary}
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
          <ActivityIndicator color={colors.textInverse} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.sm,
    marginBottom: 12,
  },
  retryButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  goBackButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  goBackButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  sessionSummary: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.md,
    ...shadows.card,
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
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sessionType: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  specialties: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    marginLeft: 8,
  },
  ratingContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadows.card,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reviewContainer: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.md,
    ...shadows.card,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginVertical: 8,
    paddingVertical: 16,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    marginHorizontal: spacing.lg,
    marginBottom: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

export default RatingScreen;
