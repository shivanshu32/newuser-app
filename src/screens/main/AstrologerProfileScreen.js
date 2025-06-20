import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ToastAndroid,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { astrologersAPI } from '../../services/api';
import { initiateRealTimeBooking, listenForBookingStatusUpdates } from '../../services/socketService';
import { addPendingConsultation } from '../../utils/pendingConsultationsStore';

const AstrologerProfileScreen = ({ route, navigation }) => {
  const [astrologer, setAstrologer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingStatus, setBookingStatus] = useState(null); // null, 'pending', 'accepted', 'rejected'
  const [currentBookingId, setCurrentBookingId] = useState(null);
  
  // Use refs for values that need to persist across renders and be immune to stale closures
  const currentBookingIdRef = useRef(null);
  const currentBookingTypeRef = useRef(null);
  const statusListenerCleanup = useRef(null);
  
  // State for consultation notification
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [consultationData, setConsultationData] = useState(null);
  
  // Get astrologer ID from navigation params
  const { astrologerId } = route.params;

  useEffect(() => {
    fetchAstrologerDetails();
    
    // Set up booking status listener when component mounts
    setupBookingStatusListener();
    
    // Clean up listener when component unmounts
    return () => {
      if (statusListenerCleanup.current && typeof statusListenerCleanup.current === 'function') {
        statusListenerCleanup.current();
      }
    };
  }, []);
  
  // Reset booking state when booking status changes to accepted or rejected
  useEffect(() => {
    if (bookingStatus === 'accepted' || bookingStatus === 'rejected') {
      // Add a small delay to ensure all processing is complete
      const timer = setTimeout(() => {
        // Reset state variables
        setCurrentBookingId(null);
        setBookingStatus(null);
        
        // Reset ref variables
        currentBookingIdRef.current = null;
        currentBookingTypeRef.current = null;
        
        console.log('Reset booking state after status:', bookingStatus);
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, [bookingStatus]);
  
  // Set up listener for booking status updates
  const setupBookingStatusListener = async () => {
    try {
      const cleanup = await listenForBookingStatusUpdates(handleBookingStatusUpdate);
      statusListenerCleanup.current = cleanup;
    } catch (error) {
      console.error('Failed to set up booking status listener:', error);
    }
  };
  
  // Handler for booking status updates
  const handleBookingStatusUpdate = (data) => {
    console.log('Received booking status update:', data.status);
    
    // Check ref first, then state for booking ID
    const effectiveBookingId = currentBookingIdRef.current || currentBookingId;
    
    // Only process updates for the current booking
    if (effectiveBookingId && data.bookingId === effectiveBookingId) {
      setBookingStatus(data.status);
      
      if (data.status === 'accepted') {
        try {
          // Create a safe version of the astrologer object with fallbacks for all properties
          const safeAstrologer = {
            _id: astrologer?._id || data.astrologerId || 'unknown',
            displayName: astrologer?.displayName || 'Astrologer',
            imageUrl: astrologer?.imageUrl || null,
            rates: astrologer?.rates || { chat: 0, voice: 0, video: 0 }
          };
          
          // Use the ref value which is immune to stale closures
          const bookingType = currentBookingTypeRef.current || data.type || 'chat';
          console.log('Using booking type for consultation:', bookingType);
          
          // Store consultation data for later use with safe values
          const consultationData = {
            booking: {
              _id: data.bookingId,
              astrologer: safeAstrologer,
              type: bookingType, // Use the tracked booking type from ref
              rate: safeAstrologer.rates[bookingType] || 0
            },
            roomId: data.roomId,
            sessionId: data.sessionId
          };
          
          // Save consultation data to state or global for access when user decides to join
          global.pendingConsultation = consultationData;
          
          // Store the consultation in our global pending consultations store
          setConsultationData(consultationData);
          
          // Add to pending consultations store
          addPendingConsultation(consultationData);
        } catch (error) {
          console.error('Error creating consultation data:', error);
        }
        
        // Use direct navigation as a reliable notification method
        try {
          // Navigate to the pending consultations screen
          navigation.navigate('PendingConsultations');
          
          // Also show toast as a secondary notification
          if (Platform.OS === 'android') {
            ToastAndroid.showWithGravity(
              'Booking accepted! Check notifications to join.',
              ToastAndroid.LONG,
              ToastAndroid.CENTER
            );
          }
        } catch (navErr) {
          console.error('Navigation error:', navErr);
        }
        
        // Notify the user that they have a pending consultation
        global.pendingConsultationAdded = true;
        
        // Emit an event that can be listened to by the app's navigation container
        try {
          if (global.eventEmitter) {
            global.eventEmitter.emit('pendingConsultationAdded');
          }
        } catch (err) {
          console.error('Error emitting event:', err);
        }
        
        // Show a simple alert
        try {
          Alert.alert(
            'Booking Accepted',
            'Your booking has been accepted! You will be redirected to the pending consultations screen.',
            [{ text: 'OK' }]
          );
        } catch (alertErr) {
          console.error('Error showing alert:', alertErr);
        }
      } else if (data.status === 'rejected') {
        // Show rejection message
        try {
          Alert.alert(
            'Booking Rejected',
            data.message || 'Astrologer is not available right now.',
            [{ text: 'OK' }]
          );
        } catch (alertErr) {
          console.error('Error showing rejection alert:', alertErr);
        }
        
        // Reset booking state
        setBookingStatus(null);
        setCurrentBookingId(null);
      }
    } else {
      // Process anyway if we don't have a current booking ID but received a status update
      if ((!currentBookingId || currentBookingId !== data.bookingId) && data.status) {
        console.log('Processing booking status update for non-current booking ID');
        setCurrentBookingId(data.bookingId);
        setBookingStatus(data.status);
        
        if (data.status === 'accepted') {
          console.log('Booking accepted! Showing notification to join consultation...');
          // Store consultation data for later use
          const consultationData = {
            booking: {
              _id: data.bookingId,
              astrologer: astrologer,
              type: data.type || 'chat', // Default to chat if type is not provided
              rate: astrologer.rates ? astrologer.rates[data.type || 'chat'] : 0
            },
            roomId: data.roomId,
            sessionId: data.sessionId
          };
          
          // Save consultation data to state or global for access when user decides to join
          global.pendingConsultation = consultationData;
          
          // Store the consultation in our global pending consultations store
          setConsultationData(consultationData);
          console.log('Adding consultation to pending consultations store');
          
          // Add to pending consultations store
          const added = addPendingConsultation(consultationData);
          
          // Show a simple toast notification that works reliably
          if (Platform.OS === 'android') {
            ToastAndroid.show('Booking accepted! Check notifications to join.', ToastAndroid.LONG);
          } else {
            // For iOS, we'll rely on the notification badge in the app
            console.log('Booking accepted on iOS - notification badge should update');
          }
          
          // Notify the user that they have a pending consultation
          global.pendingConsultationAdded = true;
          
          // Emit an event that can be listened to by the app's navigation container
          if (global.eventEmitter) {
            console.log('Emitting pendingConsultationAdded event');
            global.eventEmitter.emit('pendingConsultationAdded', consultationData);
          }
        } else if (data.status === 'rejected') {
          console.log('Booking rejected! Showing alert...');
          // Show rejection message
          Alert.alert(
            'Booking Rejected',
            data.message || 'Astrologer is not available right now.'
          );
        }
      }
    }
  };

  const fetchAstrologerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the astrologersAPI service for consistent API handling
      const response = await astrologersAPI.getById(astrologerId);
      
      // Extract the actual astrologer data from the nested response structure
      let astrologerData = null;
      
      // Handle different response structures
      if (response?.data?.data) {
        // Nested data.data structure
        astrologerData = response.data.data;
      } else if (response?.data) {
        // Direct data property
        astrologerData = response.data;
      } else if (response && typeof response === 'object' && response._id) {
        // Response is the astrologer object itself
        astrologerData = response;
      } else {
        throw new Error('Invalid response format');
      }
      
      // Set the extracted astrologer data
      setAstrologer(astrologerData);
    } catch (err) {
      setError('Failed to load astrologer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle real-time booking via socket
  const handleBookNow = async (type) => {
    console.log(`handleBookNow called for session type: ${type}`);
    try {
      // If astrologer data isn't loaded yet, try fetching it again
      if (!astrologer) {
        console.log('No astrologer data, attempting to fetch details again');
        await fetchAstrologerDetails();
      }
      
      console.log('Current astrologer data:', JSON.stringify(astrologer));
      
      // Get the astrologer ID from the correct location in the object structure
      const astrologerId = astrologer?._id || astrologer?.id || (astrologer?.data && (astrologer.data._id || astrologer.data.id));
      console.log(`Resolved astrologerId: ${astrologerId}`);
      
      // Validate astrologer data is available after potential refetch
      if (!astrologer || !astrologerId) {
        console.error('Invalid astrologer data:', astrologer);
        Alert.alert(
          'Booking Error',
          'Astrologer information is not available. Please try again.'
        );
        return;
      }
      
      // Get the astrologer name for the confirmation dialog
      let astrologerName = 'the astrologer';
      
      if (astrologer) {
        if (typeof astrologer === 'object') {
          astrologerName = astrologer.name || astrologer.displayName || astrologer.fullName;
          
          // If name is still undefined, try to find it in nested properties
          if (!astrologerName && astrologer.data) {
            astrologerName = astrologer.data.name || astrologer.data.displayName || astrologer.data.fullName;
          }
          
          // If name is still undefined, use a generic name with ID
          if (!astrologerName) {
            astrologerName = `Astrologer #${astrologer._id || astrologer.id || 'Unknown'}`;
          }
        }
      }
      
      // Prepare for booking with resolved astrologer name
      
      // Show confirmation dialog before initiating booking
      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Show confirmation dialog with correct astrologer name and session type
      Alert.alert(
        'Confirm Booking',
        `Schedule a ${type} session with ${astrologerName} at ${formattedTime}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                // Prepare booking data
                const bookingData = {
                  astrologerId: astrologerId,
                  type: type,
                  notes: `Instant ${type} consultation request`
                };
                
                console.log('Prepared booking data:', JSON.stringify(bookingData));
                console.log('Calling initiateRealTimeBooking...');
                
                // Store the booking type in ref for later use
                currentBookingTypeRef.current = type;
                console.log('Setting current booking type ref:', type);
                
                // Send booking request via socket
                const response = await initiateRealTimeBooking(bookingData);
                
                // Store the booking ID for tracking status updates
                if (response && response.bookingId) {
                  // Update both state and ref
                  setCurrentBookingId(response.bookingId);
                  currentBookingIdRef.current = response.bookingId;
                  setBookingStatus('pending');
                }
                
                // The actual status updates will be handled by the socket listener
              } catch (error) {
                console.error('Booking request error:', error);
                console.error('Error details:', error.stack || 'No stack trace available');
                
                // Check if it's a socket connection error
                if (error.message && error.message.includes('Socket not connected')) {
                  console.log('Socket connection issue detected');
                  Alert.alert(
                    'Connection Error',
                    'Unable to connect to the booking service. Please check your internet connection and try again.'
                  );
                } else if (error.message && error.message.includes('timed out')) {
                  console.log('Booking request timed out');
                  Alert.alert(
                    'Booking Timeout',
                    'The booking request timed out. The astrologer may be unavailable at the moment.'
                  );
                } else {
                  Alert.alert(
                    'Booking Error',
                    error.message || 'Failed to send booking request. Please try again.'
                  );
                }
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
  
  // Legacy booking handlers - replaced with real-time booking
  const handleBookChat = () => {
    handleBookNow('chat');
  };

  const handleBookVoiceCall = () => {
    handleBookNow('voice');
  };

  const handleBookVideoCall = () => {
    handleBookNow('video');
  };

  // Booking request pending modal
  const renderBookingPendingModal = () => {
    return (
      <Modal
        visible={bookingStatus === 'pending'}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={styles.modalText}>Waiting for astrologer response...</Text>
            <Text style={styles.modalSubText}>This request will expire in 2 minutes if not answered</Text>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setBookingStatus(null);
                setCurrentBookingId(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
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

  // Render notification banner
  const renderNotificationBanner = () => {
    console.log('Rendering notification banner, showNotificationBanner:', showNotificationBanner);
    
    if (!showNotificationBanner) return null;
    
    return (
      <View style={styles.notificationBanner}>
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>Booking Accepted!</Text>
          <Text style={styles.notificationText}>
            Your consultation is ready to start.
          </Text>
        </View>
        <View style={styles.notificationButtonsContainer}>
          <TouchableOpacity 
            style={styles.joinButton}
            onPress={() => {
              setShowNotificationBanner(false);
              if (consultationData) {
                navigation.navigate('ConsultationRoom', consultationData);
              }
            }}
          >
            <Text style={styles.joinButtonText}>Join Now</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.laterButton}
            onPress={() => setShowNotificationBanner(false)}
          >
            <Text style={styles.laterButtonText}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Astrologer Profile</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Notification UI removed in favor of Alert */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: astrologer.imageUrl || astrologer.profileImage }} 
              style={styles.profileImage}
              accessibilityLabel={`Profile picture of ${astrologer.displayName || astrologer.name}`}
            />
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: astrologer.status === 'Online' ? '#4CAF50' : '#F44336' },
              ]}
            />
          </View>
          
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{astrologer.displayName || astrologer.name}</Text>
            <Text style={styles.specialization}>{astrologer.specialization || astrologer.specialties?.[0] || 'Astrologer'}</Text>
            
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{ratingText}</Text>
              {ratingCount > 0 && (
                <Text style={styles.ratingCount}>({ratingCount} reviews)</Text>
              )}
            </View>
            
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusText}>
                {astrologer.status === 'Online' ? 'Available now' : 'Currently unavailable'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{astrologer.experience || '0'}+</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{ratingText}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{astrologer.totalConsultations || '100'}+</Text>
            <Text style={styles.statLabel}>Consultations</Text>
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
            <View style={styles.tagsContainer}>
              {Array.isArray(astrologer.specialties) ? (
                astrologer.specialties.map((specialty, index) => (
                  <View key={`specialty-${index}`} style={styles.tagItem}>
                    <Text style={styles.tagText}>{specialty}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.detailText}>{specialtiesText}</Text>
              )}
            </View>
          </View>

          {/* Languages */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.tagsContainer}>
              {Array.isArray(astrologer.languages) ? (
                astrologer.languages.map((language, index) => (
                  <View key={`language-${index}`} style={styles.tagItem}>
                    <Text style={styles.tagText}>{language}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.detailText}>{languagesText}</Text>
              )}
            </View>
          </View>

          {/* Experience */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <View style={styles.experienceContainer}>
              <Ionicons name="briefcase-outline" size={20} color="#F97316" />
              <Text style={styles.detailText}>{astrologer.experience || 'Not specified'} years of professional experience</Text>
            </View>
          </View>

          {/* Charges */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Consultation Charges</Text>
            <View style={styles.chargesContainer}>
              <View style={styles.chargeCard}>
                <View style={styles.chargeIconContainer}>
                  <Ionicons name="chatbubble" size={22} color="#fff" />
                </View>
                <View style={styles.chargeContent}>
                  <Text style={styles.chargeLabel}>Chat Consultation</Text>
                  <Text style={styles.chargeValue}>
                    ₹{astrologer.chatPrice || astrologer.price || '20'}<Text style={styles.perMinText}>/min</Text>
                  </Text>
                </View>
              </View>
              
              <View style={styles.chargeCard}>
                <View style={[styles.chargeIconContainer, styles.voiceIconContainer]}>
                  <Ionicons name="call" size={22} color="#fff" />
                </View>
                <View style={styles.chargeContent}>
                  <Text style={styles.chargeLabel}>Voice Call</Text>
                  <Text style={styles.chargeValue}>
                    ₹{astrologer.voicePrice || astrologer.price || '30'}<Text style={styles.perMinText}>/min</Text>
                  </Text>
                </View>
              </View>
              
              <View style={styles.chargeCard}>
                <View style={[styles.chargeIconContainer, styles.videoIconContainer]}>
                  <Ionicons name="videocam" size={22} color="#fff" />
                </View>
                <View style={styles.chargeContent}>
                  <Text style={styles.chargeLabel}>Video Call</Text>
                  <Text style={styles.chargeValue}>
                    ₹{astrologer.videoPrice || astrologer.price || '40'}<Text style={styles.perMinText}>/min</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Booking Buttons */}
        <View style={styles.bookingSection}>
          <Text style={styles.bookingSectionTitle}>Book a Consultation</Text>
          <Text style={styles.bookingSubtitle}>
            {astrologer.status === 'Online' 
              ? 'Astrologer is available now. Choose a consultation type:' 
              : 'Astrologer is currently offline. The astrologer will be notified once they come online.'}
          </Text>
          
          <View style={styles.bookingButtonsContainer}>
            <TouchableOpacity 
              style={[styles.bookingButton, styles.chatButton]} 
              onPress={handleBookChat}
              accessibilityLabel="Book Chat Consultation"
            >
              <Ionicons 
                name="chatbubble" 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.bookingButtonText}>
                Chat
              </Text>
              <Text style={styles.bookingButtonPrice}>
                ₹{astrologer.chatPrice || astrologer.price || '20'}/min
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bookingButton, styles.voiceButton]} 
              onPress={handleBookVoiceCall}
              accessibilityLabel="Book Voice Call Consultation"
            >
              <Ionicons 
                name="call" 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.bookingButtonText}>
                Voice Call
              </Text>
              <Text style={styles.bookingButtonPrice}>
                ₹{astrologer.voicePrice || astrologer.price || '30'}/min
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.bookingButton, styles.videoButton]} 
              onPress={handleBookVideoCall}
              accessibilityLabel="Book Video Call Consultation"
            >
              <Ionicons 
                name="videocam" 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.bookingButtonText}>
                Video Call
              </Text>
              <Text style={styles.bookingButtonPrice}>
                ₹{astrologer.videoPrice || astrologer.price || '40'}/min
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Booking Pending Modal */}
      {renderBookingPendingModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalText: {
    fontSize: 16,
    marginVertical: 10,
    textAlign: 'center',
    color: '#333'
  },
  modalSubText: {
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666'
  },
  inPageNotification: {
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  notificationHeader: {
    backgroundColor: '#8A2BE2',
    padding: 10,
  },
  notificationHeaderText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationBody: {
    padding: 15,
  },
  notificationBodyText: {
    fontSize: 14,
    marginBottom: 15,
    color: '#333',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  joinNowButton: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  joinNowButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dismissButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 16,
    color: '#4B5563',
    marginVertical: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#4CAF50',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  rating: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 4,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  detailText: {
    fontSize: 16,
    color: '#4B5563',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4B5563',
    fontSize: 14,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chargesContainer: {
    marginTop: 8,
  },
  chargeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chargeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  voiceIconContainer: {
    backgroundColor: '#F97316',
  },
  videoIconContainer: {
    backgroundColor: '#10B981',
  },
  chargeContent: {
    flex: 1,
  },
  chargeLabel: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 4,
  },
  chargeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  perMinText: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#6B7280',
  },
  bookingSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  bookingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  bookingButtonsContainer: {
    marginBottom: 8,
  },
  bookingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chatButton: {
    backgroundColor: '#6366F1',
  },
  voiceButton: {
    backgroundColor: '#F97316',
  },
  videoButton: {
    backgroundColor: '#10B981',
  },
  disabledButton: {
    backgroundColor: '#F3F4F6',
  },
  bookingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  bookingButtonPrice: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
});

export default AstrologerProfileScreen;
