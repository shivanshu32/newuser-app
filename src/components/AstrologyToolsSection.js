import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, shadows, typography } from '../theme';

// Optional haptics import - will fail gracefully if not installed
let Haptics;
try {
  Haptics = require('expo-haptics');
} catch (error) {
  console.log('expo-haptics not available, haptic feedback disabled');
  Haptics = null;
}

const { width } = Dimensions.get('window');

// Service data structure
const ASTROLOGY_SERVICES = [
  // Tier 1: Hero Services (always visible)
  {
    id: 'horoscope',
    name: 'Daily Horoscope',
    shortName: 'Horoscope',
    icon: 'sunny-outline',
    category: 'Daily Astrology',
    tier: 1,
    badge: 'Popular',
    description: 'Your daily cosmic guidance',
    requiresProfile: true,
    personalizedLabel: 'My Horoscope',
  },
  {
    id: 'kundali',
    name: 'Kundali',
    shortName: 'Kundali',
    icon: 'grid-outline',
    category: 'Kundali & Compatibility',
    tier: 1,
    description: 'Your complete birth chart',
    requiresProfile: true,
    personalizedLabel: 'My Kundali',
  },
  {
    id: 'match-making',
    name: 'Match Making',
    shortName: 'Match Making',
    icon: 'heart-outline',
    category: 'Kundali & Compatibility',
    tier: 1,
    description: 'Find your perfect match',
    requiresProfile: true,
    personalizedLabel: 'Match with Partner',
  },
  // Tier 2: Category Services (carousel)
  {
    id: 'panchang',
    name: 'Panchang',
    shortName: 'Panchang',
    icon: 'calendar-clear-outline',
    category: 'Daily Astrology',
    tier: 2,
    description: 'Daily planetary positions',
  },
  {
    id: 'muhurat',
    name: 'Muhurat',
    shortName: 'Muhurat',
    icon: 'checkmark-circle-outline',
    category: 'Daily Astrology',
    tier: 2,
    description: 'Auspicious timings',
  },
  {
    id: 'mangal-dosha',
    name: 'Mangal Dosha',
    shortName: 'Mangal Dosha',
    icon: 'flame-outline',
    category: 'Dosha Analysis',
    tier: 2,
    description: 'Mars position analysis',
  },
  {
    id: 'kaal-sarp-dosha',
    name: 'Kaal Sarp Dosha',
    shortName: 'Kaal Sarp',
    icon: 'infinite-outline',
    category: 'Dosha Analysis',
    tier: 2,
    description: 'Snake Dosha analysis',
  },
  {
    id: 'sade-sati',
    name: 'Sade Sati',
    shortName: 'Sade Sati',
    icon: 'hourglass-outline',
    category: 'Dosha Analysis',
    tier: 2,
    description: 'Saturn transit analysis',
  },
  {
    id: 'gemstone',
    name: 'Gemstone Recommendation',
    shortName: 'Gemstone',
    icon: 'diamond-outline',
    category: 'Premium Reports',
    tier: 2,
    description: 'Your lucky gemstone',
  },
  {
    id: 'dasha-report',
    name: 'Dasha Report',
    shortName: 'Dasha',
    icon: 'document-text-outline',
    category: 'Premium Reports',
    tier: 2,
    description: 'Planetary periods analysis',
  },
  {
    id: 'career-report',
    name: 'Career Report',
    shortName: 'Career',
    icon: 'briefcase-outline',
    category: 'Premium Reports',
    tier: 2,
    description: 'Career predictions',
  },
  {
    id: 'marriage-prediction',
    name: 'Marriage Prediction',
    shortName: 'Marriage',
    icon: 'heart-circle-outline',
    category: 'Premium Reports',
    tier: 2,
    description: 'Marriage timing analysis',
  },
];

// Categories for filtering
const CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'Daily Astrology', name: 'Daily' },
  { id: 'Kundali & Compatibility', name: 'Kundali' },
  { id: 'Dosha Analysis', name: 'Dosha' },
  { id: 'Premium Reports', name: 'Reports' },
];

const AstrologyToolsSection = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showExpanded, setShowExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pressedCard, setPressedCard] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnims = useRef(ASTROLOGY_SERVICES.map(() => new Animated.Value(1))).current;
  const glowAnims = useRef(ASTROLOGY_SERVICES.map(() => new Animated.Value(0))).current;

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Staggered card animations
  useEffect(() => {
    scaleAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 50),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  // Start glow animations for popular items
  useEffect(() => {
    ASTROLOGY_SERVICES.forEach((service, index) => {
      if (service.badge) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnims[index], {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnims[index], {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    });
  }, []);

  // Haptic feedback helper
  const triggerHaptic = async (type = 'light') => {
    if (!Haptics) return; // Skip if haptics not available
    
    if (Platform.OS === 'ios') {
      try {
        switch (type) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
        }
      } catch (error) {
        // Haptics not available, silently fail
      }
    }
  };

  // Filter services based on category
  const filteredServices = ASTROLOGY_SERVICES.filter(service => {
    if (selectedCategory === 'all') return true;
    return service.category === selectedCategory;
  });

  // Separate hero services and carousel services
  const heroServices = ASTROLOGY_SERVICES.filter(s => s.tier === 1);
  const carouselServices = filteredServices.filter(s => s.tier === 2);

  const handleServicePress = (service) => {
    console.log('🔮 [ASTROLOGY_TOOLS] Service pressed:', service.name);
    
    // Trigger haptic feedback
    triggerHaptic('medium');
    
    // Animate press
    const index = ASTROLOGY_SERVICES.findIndex(s => s.id === service.id);
    if (index !== -1) {
      Animated.sequence([
        Animated.timing(scaleAnims[index], {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnims[index], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Check if user has profile for personalized services
    if (!user?.dateOfBirth && ['horoscope', 'kundali', 'match-making'].includes(service.id)) {
      navigation.navigate('AddUserProfile', { 
        isRequired: true,
        fromService: service.id 
      });
      return;
    }

    // Navigate to appropriate screen
    switch (service.id) {
      case 'horoscope':
        navigation.navigate('DailyHoroscope');
        break;
      default:
        // Navigate to generic tool screen for all other services
        navigation.navigate('AstrologyTool', { service });
    }
  };

  const handleViewAll = () => {
    setShowExpanded(!showExpanded);
  };

  const handleCategoryPress = (categoryId) => {
    triggerHaptic('light');
    setSelectedCategory(categoryId);
  };

  const renderHeroCard = (service) => {
    const index = ASTROLOGY_SERVICES.findIndex(s => s.id === service.id);
    const scaleAnim = scaleAnims[index] || new Animated.Value(1);
    const glowAnim = glowAnims[index] || new Animated.Value(0);
    
    // Personalization: Show personalized label if user has profile
    const isPersonalized = service.requiresProfile && user?.dateOfBirth;
    const displayLabel = isPersonalized ? service.personalizedLabel : service.shortName;
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          key={service.id}
          style={styles.heroCard}
          onPress={() => handleServicePress(service)}
          activeOpacity={0.9}
        >
          {service.badge && (
            <Animated.View 
              style={[
                styles.heroCardGlow,
                { opacity: glowAnim }
              ]}
            />
          )}
          <LinearGradient
            colors={service.badge ? ['#C8A46A', '#A68B5B'] : ['#1A1A1A', '#222222']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCardGradient}
          >
            <View style={styles.heroCardIconContainer}>
              <Ionicons 
                name={service.icon} 
                size={28} 
                color={service.badge ? '#111111' : colors.primary} 
              />
            </View>
            
            {service.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{service.badge}</Text>
              </View>
            )}

            {isPersonalized && (
              <View style={styles.personalizedBadge}>
                <Ionicons name="person" size={8} color={colors.primary} />
              </View>
            )}

            <Text style={[
              styles.heroCardTitle,
              service.badge && styles.heroCardTitlePopular
            ]} numberOfLines={1}>
              {displayLabel}
            </Text>
            <Text style={styles.heroCardSubtitle} numberOfLines={1}>
              {service.category}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCarouselCard = (service) => {
    const index = ASTROLOGY_SERVICES.findIndex(s => s.id === service.id);
    const scaleAnim = scaleAnims[index] || new Animated.Value(1);
    
    // Determine if premium report
    const isPremium = service.category === 'Premium Reports';
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          key={service.id}
          style={[
            styles.carouselCard,
            isPremium && styles.carouselCardPremium
          ]}
          onPress={() => handleServicePress(service)}
          activeOpacity={0.9}
        >
          {isPremium && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={8} color={colors.primary} />
            </View>
          )}
          
          <View style={[
            styles.carouselCardIconContainer,
            isPremium && styles.carouselCardIconContainerPremium
          ]}>
            <Ionicons 
              name={service.icon} 
              size={22} 
              color={isPremium ? colors.primary : colors.secondary} 
            />
          </View>

          <Text style={styles.carouselCardTitle} numberOfLines={1}>
            {service.shortName}
          </Text>
          
          <View style={[
            styles.categoryPill,
            isPremium && styles.categoryPillPremium
          ]}>
            <Text style={[
              styles.categoryPillText,
              isPremium && styles.categoryPillTextPremium
            ]}>
              {service.category.split(' ')[0]}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryPill = (category) => {
    const isSelected = selectedCategory === category.id;
    return (
      <TouchableOpacity
        key={category.id}
        style={[
          styles.categoryPill,
          isSelected && styles.categoryPillActive
        ]}
        onPress={() => handleCategoryPress(category.id)}
        activeOpacity={0.7}
      >
        {isSelected && (
          <LinearGradient
            colors={['rgba(200, 164, 106, 0.2)', 'rgba(200, 164, 106, 0.05)']}
            style={styles.categoryPillGradient}
          />
        )}
        <Text style={[
          styles.categoryPillText,
          isSelected && styles.categoryPillTextActive
        ]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.sectionTitleIcon} />
            <Text style={styles.sectionTitle}>Astrology Tools</Text>
          </View>
        </View>
        <View style={styles.skeletonContainer}>
          {/* Hero row skeleton */}
          <View style={styles.heroRow}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonHeroCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonBadge} />
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
              </View>
            ))}
          </View>
          {/* Category pills skeleton */}
          <View style={styles.categoryPillsContainer}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.skeletonPill} />
            ))}
          </View>
          {/* Carousel skeleton */}
          <View style={styles.carouselContainer}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.skeletonCarouselCard}>
                <View style={styles.skeletonIcon} />
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonPill} />
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="sparkles" size={20} color={colors.primary} style={styles.sectionTitleIcon} />
          <Text style={styles.sectionTitle}>Astrology Tools</Text>
        </View>
        <TouchableOpacity
          onPress={handleViewAll}
          style={styles.viewAllButton}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>
            {showExpanded ? 'Show Less' : 'View All'}
          </Text>
          <Ionicons 
            name={showExpanded ? 'chevron-up' : 'chevron-forward'} 
            size={14} 
            color={colors.textMuted} 
          />
        </TouchableOpacity>
      </View>

      {/* Hero Row - Always Visible */}
      <View style={styles.heroRow}>
        {heroServices.map(renderHeroCard)}
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryPillsContainer}
        style={styles.categoryPillsScroll}
      >
        {CATEGORIES.map(renderCategoryPill)}
      </ScrollView>

      {/* Service Carousel */}
      {!showExpanded ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContainer}
          decelerationRate="fast"
          snapToInterval={108}
          snapToAlignment="start"
        >
          {carouselServices.map(renderCarouselCard)}
        </ScrollView>
      ) : (
        /* Expanded Grid View */
        <View style={styles.expandedGrid}>
          {carouselServices.map(renderCarouselCard)}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitleIcon: {
    opacity: 0.8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: 4,
    textTransform: 'none',
  },
  // Hero Row
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
  },
  heroCard: {
    width: (width - 48 - 24) / 3, // (screen width - padding - gaps) / 3
    height: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    opacity: 0.3,
    filter: 'blur(20px)',
  },
  heroCardGradient: {
    width: '100%',
    height: '100%',
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(200, 164, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 8,
    fontWeight: '700',
  },
  personalizedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primaryMuted,
    borderRadius: 8,
    padding: 4,
  },
  heroCardTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroCardTitlePopular: {
    color: '#111111',
  },
  heroCardSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Category Pills
  categoryPillsScroll: {
    marginBottom: spacing.lg,
  },
  categoryPillsContainer: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  categoryPillGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryPillActive: {
    borderColor: colors.primary,
  },
  categoryPillText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  categoryPillTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Carousel
  carouselContainer: {
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  carouselCard: {
    width: 100,
    height: 120,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  carouselCardPremium: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 2,
  },
  carouselCardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  carouselCardIconContainerPremium: {
    backgroundColor: colors.primaryMuted,
  },
  carouselCardTitle: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  // Expanded Grid
  expandedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  // Loading
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  // Skeleton Loading
  skeletonContainer: {
    paddingHorizontal: spacing.xxl,
  },
  skeletonHeroCard: {
    width: (width - 48 - 24) / 3,
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceTertiary,
    marginBottom: spacing.sm,
  },
  skeletonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 16,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
  },
  skeletonTitle: {
    width: 60,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.surfaceTertiary,
    marginBottom: 4,
  },
  skeletonSubtitle: {
    width: 40,
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.surfaceTertiary,
  },
  skeletonPill: {
    width: 60,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.sm,
  },
  skeletonCarouselCard: {
    width: 100,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
});

export default AstrologyToolsSection;
