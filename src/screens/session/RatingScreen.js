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

const RatingScreen = ({ route, navigation }) => {
  const { bookingId, astrologerId, sessionType, duration, charges } = route.params || {};
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [astrologer, setAstrologer] = useState(null);
  const { user } = useAuth();
  
  // Format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else {
      return `${mins}m ${secs}s`;
    }
  };

  useEffect(() => {
    fetchAstrologerDetails();
  }, []);

  const fetchAstrologerDetails = async () => {
    try {
      // In a real app, this would call your backend API
      // const response = await axios.get(`${API_URL}/astrologers/${astrologerId}`);
      // setAstrologer(response.data);
      
      // Simulate API call with dummy data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const dummyAstrologer = {
        id: astrologerId || '1',
        name: astrologerId === '2' ? 'Jyotish Gupta' : 'Pandit Sharma',
        image: 'https://via.placeholder.com/100',
        specialties: astrologerId === '2' ? ['Palmistry', 'Tarot'] : ['Vedic', 'Numerology'],
        experience: astrologerId === '2' ? 10 : 15,
        rating: astrologerId === '2' ? 4.5 : 4.8,
        price: astrologerId === '2' ? 20 : 15,
      };
      
      setAstrologer(dummyAstrologer);
      setLoading(false);
    } catch (error) {
      console.log('Error fetching astrologer details:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load astrologer details. Please try again.');
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
    
    setSubmitting(true);
    
    try {
      // In a real app, this would call your backend API
      // await axios.post(`${API_URL}/ratings`, {
      //   bookingId,
      //   astrologerId,
      //   rating,
      //   review: review.trim() || null,
      // });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
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
      console.log('Error submitting rating:', error);
      setSubmitting(false);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rate Your Consultation</Text>
      </View>
      
      <View style={styles.sessionSummary}>
        <View style={styles.astrologerInfo}>
          <Image source={{ uri: astrologer?.image }} style={styles.astrologerImage} />
          <View>
            <Text style={styles.astrologerName}>{astrologer?.name}</Text>
            <Text style={styles.sessionType}>
              {sessionType === 'chat' ? 'Chat' : 'Video'} Consultation
            </Text>
          </View>
        </View>
        
        <View style={styles.sessionDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Duration: {formatTime(duration || 0)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Amount: ₹{charges || 0}</Text>
          </View>
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
          placeholder="Share your experience with this astrologer..."
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
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionSummary: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  astrologerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  astrologerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  astrologerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionType: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  ratingContainer: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  reviewContainer: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    marginTop: 5,
    color: '#666',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#8A2BE2',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    margin: 15,
    marginTop: 0,
    padding: 15,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default RatingScreen;
