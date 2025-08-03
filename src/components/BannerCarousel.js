import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  Image,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

const BannerCarousel = ({ onBannerPress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  // Banner images from assets folder
  const banners = [
    require('../../assets/appbanner1.png'),
    require('../../assets/appbanner2.png'),
    require('../../assets/appbanner3.png'),
    require('../../assets/appbanner4.png'),
  ];

  // Auto-scroll functionality
  useEffect(() => {
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

  const handleBannerPress = (index) => {
    if (onBannerPress) {
      onBannerPress(index);
    }
  };

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
            key={index}
            style={styles.bannerContainer}
            onPress={() => handleBannerPress(index)}
            activeOpacity={0.9}
          >
            <Image
              source={banner}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Pagination dots - overlay at bottom of images */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
  },
  scrollView: {
    height: 180,
  },
  bannerContainer: {
    width: screenWidth,
  },
  bannerImage: {
    width: screenWidth,
    height: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
});

export default BannerCarousel;
