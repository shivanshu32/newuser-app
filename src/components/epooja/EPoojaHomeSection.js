import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { epoojaAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75;

const EPoojaHomeSection = () => {
  const navigation = useNavigation();
  const [popularPoojas, setPopularPoojas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPopularPoojas();
  }, []);

  const fetchPopularPoojas = async () => {
    try {
      const response = await epoojaAPI.getPopularPoojas();
      if (response.success) {
        setPopularPoojas(response.data);
      }
    } catch (error) {
      console.error('Error fetching popular e-poojas:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderQuickActionCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.quickActionCard}
      onPress={() => navigation.navigate('EPoojaCategories', { filter: item.filter })}
    >
      <View style={styles.quickActionIcon}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.quickActionText}>{item.title}</Text>
    </TouchableOpacity>
  );

  const renderEPoojaCard = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.epoojaCard,
        {
          marginLeft: index === 0 ? 20 : 0,
          marginRight: index === popularPoojas.length - 1 ? 20 : 12
        }
      ]}
      onPress={() => navigation.navigate('EPoojaDetails', { pooja: item })}
    >
      <Image 
        source={{ uri: item.image_url || 'https://via.placeholder.com/300x200' }} 
        style={styles.poojaImage}
        resizeMode="cover"
      />
      
      {item.is_popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Popular</Text>
        </View>
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.poojaName} numberOfLines={2}>{item.name}</Text>
        {item.sanskrit_name && (
          <Text style={styles.sanskritName} numberOfLines={1}>{item.sanskrit_name}</Text>
        )}
        <Text style={styles.benefits} numberOfLines={2}>
          {item.benefits}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>₹{item.starting_price || item.base_price}</Text>
          </View>
          
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.rating}>
              {item.avg_rating ? parseFloat(item.avg_rating).toFixed(1) : '4.5'}
            </Text>
            <Text style={styles.reviewCount}>
              ({item.review_count || 0})
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const quickActions = [
    {
      id: 'festival',
      title: 'Festival Pujas',
      icon: 'calendar',
      color: '#FF6B35',
      filter: 'festival'
    },
    {
      id: 'remedial',
      title: 'Remedial Pujas',
      icon: 'shield-checkmark',
      color: '#4ECDC4',
      filter: 'remedial'
    },
    {
      id: 'planetary',
      title: 'Planetary Pujas',
      icon: 'planet',
      color: '#9B59B6',
      filter: 'planetary'
    },
    {
      id: 'special',
      title: 'Special Pujas',
      icon: 'star',
      color: '#FFD700',
      filter: 'special'
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading E-Pooja Services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.sectionTitle}>E-Pooja Booking</Text>
         
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('EPoojaCategories')}
          style={styles.viewAllButton}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#F97316" />
        </TouchableOpacity>
      </View>

      {/* Quick Action Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickActionsContainer}
        contentContainerStyle={styles.quickActionsContent}
      >
        {quickActions.map((action) => (
          <TouchableOpacity 
            key={action.id}
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('EPoojaCategories', { filter: action.filter })}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
              <Ionicons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.quickActionText}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Popular E-Poojas */}
      {popularPoojas.length > 0 && (
        <>
          <View style={styles.popularHeader}>
            <Text style={styles.popularTitle}>Popular E-Poojas</Text>
            <Text style={styles.popularSubtitle}>
              Book authentic Vedic rituals from home
            </Text>
          </View>
          
          <FlatList
            horizontal
            data={popularPoojas}
            renderItem={renderEPoojaCard}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.poojasList}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    marginRight: 4,
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsContent: {
    paddingHorizontal: 20,
  },
  quickActionCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 16,
  },
  popularHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  popularTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  popularSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  poojasList: {
    paddingLeft: 20,
  },
  epoojaCard: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 8,
  },
  poojaImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  poojaName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 22,
  },
  sanskritName: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '500',
    marginBottom: 8,
  },
  benefits: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F97316',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 2,
  },
});

export default EPoojaHomeSection;
