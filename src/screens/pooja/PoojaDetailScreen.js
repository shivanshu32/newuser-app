import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import poojaAPI from '../../services/poojaAPI';
import { useAuth } from '../../context/AuthContext';
import RenderHtml from 'react-native-render-html';

const { width } = Dimensions.get('window');

const PoojaDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { poojaId } = route.params;
  
  const [pooja, setPooja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  
  useEffect(() => {
    fetchPoojaDetails();
  }, [poojaId]);
  
  const fetchPoojaDetails = async () => {
    try {
      setLoading(true);
      const response = await poojaAPI.getPoojaDetails(poojaId);
      if (response.success) {
        setPooja(response.data);
        // Auto-select first package
        if (response.data.packages && response.data.packages.length > 0) {
          setSelectedPackage(response.data.packages[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching pooja details:', error);
      Alert.alert('Error', 'Failed to load pooja details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleBookNow = async () => {
    if (!selectedPackage) {
      Alert.alert('Select Package', 'Please select a package to continue');
      return;
    }
    
    if (!user) {
      Alert.alert('Login Required', 'Please login to book a pooja');
      navigation.navigate('Login');
      return;
    }
    
    // Validate required user details (only name and mobile are required)
    if (!user.name || !user.mobile) {
      Alert.alert(
        'Incomplete Profile', 
        'Please update your profile with name and mobile number before booking.'
      );
      return;
    }
    
    try {
      setBookingLoading(true);
      
      // Prepare user details (use 'mobile' from user object, map to 'mobileNumber' for API)
      const userDetails = {
        name: user.name,
        email: user.email,
        mobileNumber: user.mobile, // User model has 'mobile', API expects 'mobileNumber'
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        pincode: user.pincode || ''
      };
      
      // Create order
      const response = await poojaAPI.createPoojaOrder(
        poojaId,
        selectedPackage._id,
        userDetails,
        specialRequests
      );
      
      if (response.success) {
        const { order, booking, transaction, pooja: poojaData } = response.data;
        
        console.log('✅ [POOJA_BOOKING] Order created successfully:', {
          orderId: order?.id,
          bookingId: booking?.id,
          transactionId: transaction?.id
        });
        
        // Navigate to Razorpay payment screen
        navigation.navigate('RazorpayPayment', {
          order: {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            transactionId: transaction.id
          },
          config: {
            key: 'rzp_live_7EGPTOGoJ2TPWL',
            name: 'JyotishCall',
            description: `Pooja Booking: ${poojaData.mainHeading}`,
            image: 'https://your-logo-url.com/logo.png',
            prefill: {
              name: user.name,
              email: user.email,
              contact: user.mobile // Use 'mobile' from user object
            },
            theme: {
              color: '#FF6B35'
            }
          },
          finalAmount: booking.totalAmount,
          user: {
            name: user.name,
            email: user.email,
            mobileNumber: user.mobile // Use 'mobile' from user object
          },
          paymentType: 'pooja_booking',
          bookingId: booking.id
        });
      }
    } catch (error) {
      console.error('❌ [POOJA_BOOKING] Error creating booking:', error);
      console.error('❌ [POOJA_BOOKING] Error details:', {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create booking. Please try again.';
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setBookingLoading(false);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </SafeAreaView>
    );
  }
  
  if (!pooja) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Pooja not found</Text>
      </SafeAreaView>
    );
  }
  
  const calculateTotal = () => {
    if (!selectedPackage) return { packagePrice: 0, gst: 0, total: 0 };
    const packagePrice = selectedPackage.price;
    const gst = Math.round(packagePrice * 0.18);
    const total = packagePrice + gst;
    return { packagePrice, gst, total };
  };
  
  const { packagePrice, gst, total } = calculateTotal();
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pooja Details</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Featured Image */}
        <Image
          source={{ uri: pooja.featuredImage?.url }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        
        {/* Content */}
        <View style={styles.content}>
          {/* Catchy Heading */}
          {pooja.catchyHeading && (
            <Text style={styles.catchyHeading}>{pooja.catchyHeading}</Text>
          )}
          
          {/* Main Heading */}
          <Text style={styles.mainHeading}>{pooja.mainHeading}</Text>
          
          {/* Sub Heading */}
          {pooja.subHeading && (
            <Text style={styles.subHeading}>{pooja.subHeading}</Text>
          )}
          
          {/* Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.infoCardText}>{pooja.location}</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="calendar" size={20} color="#FF6B35" />
              <Text style={styles.infoCardText}>{formatDate(pooja.dateTime)}</Text>
            </View>
          </View>
          
          {/* About Pooja */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Pooja</Text>
            <RenderHtml
              contentWidth={width - 32}
              source={{ html: pooja.aboutPooja }}
              tagsStyles={{
                p: { color: '#666', fontSize: 14, lineHeight: 22, marginBottom: 8 },
                h1: { color: '#1a1a1a', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
                h2: { color: '#1a1a1a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
                li: { color: '#666', fontSize: 14, marginBottom: 4 }
              }}
            />
          </View>
          
          {/* Packages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Package</Text>
            {pooja.packages && pooja.packages.map((pkg) => (
              <TouchableOpacity
                key={pkg._id}
                style={[
                  styles.packageCard,
                  selectedPackage?._id === pkg._id && styles.packageCardSelected
                ]}
                onPress={() => setSelectedPackage(pkg)}
                activeOpacity={0.7}
              >
                <View style={styles.packageHeader}>
                  <View style={styles.radioButton}>
                    {selectedPackage?._id === pkg._id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packagePeople}>
                      {pkg.numberOfPeople} {pkg.numberOfPeople === 1 ? 'Person' : 'People'}
                    </Text>
                  </View>
                  <Text style={styles.packagePrice}>₹{pkg.price}</Text>
                </View>
                
                {pkg.description && (
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                )}
                
                {pkg.features && pkg.features.length > 0 && (
                  <View style={styles.packageFeatures}>
                    {pkg.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Special Requests */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any special requirements or requests..."
              value={specialRequests}
              onChangeText={setSpecialRequests}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          
          {/* Price Breakdown */}
          {selectedPackage && (
            <View style={styles.priceBreakdown}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Package Price</Text>
                <Text style={styles.priceValue}>₹{packagePrice}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>GST (18%)</Text>
                <Text style={styles.priceValue}>₹{gst}</Text>
              </View>
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{total}</Text>
              </View>
            </View>
          )}
          
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
      
      {/* Bottom Button */}
      {selectedPackage && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.bottomBarContent}>
            <View>
              <Text style={styles.bottomBarLabel}>Total Amount</Text>
              <Text style={styles.bottomBarPrice}>₹{total}</Text>
            </View>
            <TouchableOpacity
              style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]}
              onPress={handleBookNow}
              disabled={bookingLoading}
            >
              {bookingLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.bookButtonText}>Book Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  featuredImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  content: {
    padding: 16,
  },
  catchyHeading: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 32,
  },
  subHeading: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  infoCards: {
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  packageCard: {
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F2',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  packagePeople: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  packageFeatures: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 100,
  },
  priceBreakdown: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomBarLabel: {
    fontSize: 12,
    color: '#666',
  },
  bottomBarPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  bookButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PoojaDetailScreen;
