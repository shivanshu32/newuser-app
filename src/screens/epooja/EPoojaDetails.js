import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { epoojaAPI } from '../../services/epoojaAPI';

const { width } = Dimensions.get('window');

const EPoojaDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { pooja } = route.params;
  
  const [poojaDetails, setPoojaDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    fetchPoojaDetails();
  }, []);

  const fetchPoojaDetails = async () => {
    try {
      console.log('🔍 Using existing pooja data and fetching packages:', { pooja });
      const categoryId = pooja._id || pooja.id;
      
      // Use the existing pooja data instead of fetching category details
      // since the /categories/{id} endpoint doesn't exist on production
      const categoryData = {
        ...pooja,
        packages: [] // Will be populated below
      };
      
      // Fetch packages for this category using the existing endpoint
      const packagesResponse = await epoojaAPI.getCategoryPackages(categoryId);
      if (packagesResponse.success) {
        categoryData.packages = packagesResponse.data;
        // Auto-select first package if available
        if (packagesResponse.data && packagesResponse.data.length > 0) {
          setSelectedPackage(packagesResponse.data[0]);
        }
      }
      
      setPoojaDetails(categoryData);
    } catch (error) {
      console.error('Error fetching pooja details:', error);
      Alert.alert('Error', 'Failed to load pooja details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!selectedPackage) {
      Alert.alert('Select Package', 'Please select a package to continue');
      return;
    }

    navigation.navigate('EPoojaBooking', {
      pooja: poojaDetails,
      package: selectedPackage
    });
  };

  const renderPackageCard = (pkg, index) => (
    <TouchableOpacity
      key={pkg.id}
      style={[
        styles.packageCard,
        selectedPackage?.id === pkg.id && styles.selectedPackageCard
      ]}
      onPress={() => setSelectedPackage(pkg)}
    >
      <View style={styles.packageHeader}>
        <Text style={styles.packageName}>{pkg.package_name}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.packagePrice}>₹{pkg.price}</Text>
        </View>
      </View>
      
      <Text style={styles.packageDescription} numberOfLines={2}>
        {pkg.package_description}
      </Text>
      
      <View style={styles.packageDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{pkg.duration_minutes} min</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{pkg.brahmin_count} Brahmin{pkg.brahmin_count > 1 ? 's' : ''}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Ionicons name="flower-outline" size={16} color="#6B7280" />
          <Text style={styles.detailText}>{pkg.mantra_count} Mantras</Text>
        </View>
      </View>
      
      <View style={styles.templeInfo}>
        <Ionicons name="location-outline" size={14} color="#F97316" />
        <Text style={styles.templeName}>{pkg.temple_name}</Text>
      </View>
      
      {selectedPackage?.id === pkg.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderReviewCard = (review, index) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.user_name}</Text>
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, i) => (
            <Ionicons
              key={i}
              name="star"
              size={14}
              color={i < review.rating ? "#FFD700" : "#E5E7EB"}
            />
          ))}
        </View>
      </View>
      <Text style={styles.reviewText} numberOfLines={3}>
        {review.review_text}
      </Text>
      <Text style={styles.reviewDate}>
        {new Date(review.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!poojaDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load pooja details</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPoojaDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Pooja Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <Image 
          source={{ uri: poojaDetails.image_url || 'https://via.placeholder.com/400x250' }} 
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.poojaName}>{poojaDetails.name}</Text>
            {poojaDetails.sanskrit_name && (
              <Text style={styles.sanskritName}>{poojaDetails.sanskrit_name}</Text>
            )}
            
            <View style={styles.metaInfo}>
              <View style={styles.deityContainer}>
                <Ionicons name="flower" size={16} color="#F97316" />
                <Text style={styles.deityName}>{poojaDetails.deity_name}</Text>
              </View>
              
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.rating}>
                  {poojaDetails.avg_rating ? parseFloat(poojaDetails.avg_rating).toFixed(1) : '4.5'}
                </Text>
                <Text style={styles.reviewCount}>
                  ({poojaDetails.review_count || 0} reviews)
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Pooja</Text>
            <Text style={styles.description}>{poojaDetails.description}</Text>
          </View>

          {/* Benefits */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            <Text style={styles.benefits}>{poojaDetails.benefits}</Text>
          </View>

          {/* Packages */}
          {poojaDetails.packages && poojaDetails.packages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Package</Text>
              {poojaDetails.packages.map(renderPackageCard)}
            </View>
          )}

          {/* Reviews */}
          {poojaDetails.reviews && poojaDetails.reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Reviews</Text>
              {poojaDetails.reviews.slice(0, 3).map(renderReviewCard)}
              {poojaDetails.reviews.length > 3 && (
                <TouchableOpacity style={styles.viewAllReviews}>
                  <Text style={styles.viewAllReviewsText}>View All Reviews</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Book Now Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.bottomPrice}>
            ₹{selectedPackage?.price || poojaDetails.base_price}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.bookNowButton,
            !selectedPackage && styles.disabledButton
          ]}
          onPress={handleBookNow}
          disabled={!selectedPackage}
        >
          <Text style={styles.bookNowButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  heroImage: {
    width: '100%',
    height: 250,
  },
  content: {
    backgroundColor: 'white',
    marginTop: -20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  titleSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  poojaName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  sanskritName: {
    fontSize: 18,
    color: '#F97316',
    fontWeight: '600',
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deityName: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  benefits: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  packageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPackageCard: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  priceContainer: {
    marginLeft: 12,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F97316',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  templeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templeName: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '500',
    marginLeft: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  reviewCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  reviewText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  viewAllReviews: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  viewAllReviewsText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
  },
  bottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F97316',
  },
  bookNowButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 16,
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  bookNowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default EPoojaDetails;
