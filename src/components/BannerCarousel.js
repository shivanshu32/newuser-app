import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import bannerAPI from '../services/bannerAPI';

const { width: screenWidth } = Dimensions.get('window');

const BannerCarousel = ({ onBannerPress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollViewRef = useRef(null);
  const impressionTracked = useRef(new Set());
  const navigation = useNavigation();

  // Fetch banners from API
  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await bannerAPI.getActiveBanners();
      
      if (result.success && result.data.length > 0) {
        setBanners(result.data);
        console.log(`🎠 [CAROUSEL] Loaded ${result.data.length} banners ${result.fromCache ? '(cached)' : '(fresh)'}`);
      } else {
        console.log('🎠 [CAROUSEL] No banners available');
        setBanners([]);
      }
    } catch (err) {
      console.error('❌ [CAROUSEL] Error fetching banners:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Track impression when banner is viewed
  useEffect(() => {
    if (banners.length > 0 && !impressionTracked.current.has(currentIndex)) {
      const banner = banners[currentIndex];
      if (banner && banner._id) {
        bannerAPI.trackImpression(banner._id);
        impressionTracked.current.add(currentIndex);
        console.log(`👁️ [CAROUSEL] Tracked impression for banner: ${banner.title}`);
      }
    }
  }, [currentIndex, banners]);

  // Auto-scroll functionality
  useEffect(() => {
    if (banners.length === 0) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % banners.length;
      setCurrentIndex(nextIndex);
      
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: nextIndex * screenWidth,
          animated: true,
        });
      }
    }, 4000); // Change slide every 4 seconds

    return () => clearInterval(interval);
  }, [currentIndex, banners.length]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / screenWidth);
    setCurrentIndex(index);
  };

  const handleBannerPress = async (banner, index) => {
    console.log(`🎯 [CAROUSEL] Banner pressed: ${banner.title}`);
    
    // Track click
    if (banner._id) {
      await bannerAPI.trackClick(banner._id);
    }

    // Handle navigation based on linkType
    try {
      switch (banner.linkType) {
        case 'screen':
          if (banner.linkValue && navigation) {
            console.log(`📱 [CAROUSEL] Navigating to screen: ${banner.linkValue}`);
            navigation.navigate(banner.linkValue);
          }
          break;

        case 'url':
          if (banner.linkValue) {
            console.log(`🌐 [CAROUSEL] Opening URL: ${banner.linkValue}`);
            const supported = await Linking.canOpenURL(banner.linkValue);
            if (supported) {
              await Linking.openURL(banner.linkValue);
            } else {
              console.error('❌ [CAROUSEL] Cannot open URL:', banner.linkValue);
            }
          }
          break;

        case 'offer':
          // Navigate to specific offer or promotion
          if (banner.linkValue && navigation) {
            console.log(`🎁 [CAROUSEL] Navigating to offer: ${banner.linkValue}`);
            // You can customize this based on your app's offer screen
            navigation.navigate('Wallet', { offerId: banner.linkValue });
          }
          break;

        case 'astrologer':
          // Navigate to astrologer profile
          if (banner.linkValue && navigation) {
            console.log(`👤 [CAROUSEL] Navigating to astrologer: ${banner.linkValue}`);
            navigation.navigate('AstrologerProfile', { astrologerId: banner.linkValue });
          }
          break;

        case 'none':
        default:
          console.log('ℹ️ [CAROUSEL] Banner has no link configured');
          break;
      }
    } catch (error) {
      console.error('❌ [CAROUSEL] Error handling banner press:', error);
    }

    // Call parent callback if provided
    if (onBannerPress) {
      onBannerPress(index);
    }
  };

  // Don't render if loading or no banners
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#F97316" />
      </View>
    );
  }

  if (error || banners.length === 0) {
    // Silently hide carousel if no banners or error
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.scrollView}
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner._id || index}
            style={styles.bannerContainer}
            onPress={() => handleBannerPress(banner, index)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.bannerImage}
              resizeMode="contain"
              onLoad={() => console.log(`🖼️ [CAROUSEL] Banner loaded: ${banner.title}`)}
              onError={(error) => console.log(`❌ [CAROUSEL] Banner failed to load: ${banner.title}`, error.nativeEvent.error)}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Pagination dots - overlay at bottom of images */}
      {banners.length > 1 && (
        <View style={styles.paginationOverlay}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginTop: -15, // Eliminate header's paddingBottom space
    marginBottom: 20, // Standard spacing below banner to match other sections
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginTop: -15,
    marginBottom: 20,
  },
  scrollView: {
    height: 180,
  },
  bannerContainer: {
    width: screenWidth,
    backgroundColor: '#f0f0f0', // Fallback background color
  },
  bannerImage: {
    width: screenWidth,
    height: 180,
  },
  paginationOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#F97316',
    width: 16,
    borderRadius: 3,
  },
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default BannerCarousel;
