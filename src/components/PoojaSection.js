import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, shadows } from '../theme';
import poojaAPI from '../services/poojaAPI';

const PoojaSection = () => {
  const navigation = useNavigation();
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchFeaturedPoojas();
  }, []);
  
  const fetchFeaturedPoojas = async () => {
    try {
      setLoading(true);
      // Temporarily fetch all published poojas (not just featured) until featured flag is set
      const response = await poojaAPI.getPublishedPoojas({ limit: 5 });
      if (response.success) {
        setPoojas(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching featured poojas:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };
  
  const renderPoojaCard = ({ item }) => {
    const startingPrice = item.packages && item.packages.length > 0
      ? Math.min(...item.packages.map(p => p.price))
      : null;
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('PoojaDetail', { poojaId: item._id })}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.featuredImage?.url }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={styles.catchyHeading} numberOfLines={1}>
            {item.catchyHeading}
          </Text>
          <Text style={styles.mainHeading} numberOfLines={2}>
            {item.mainHeading}
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.location} numberOfLines={1}>
              📍 {item.location}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.date} numberOfLines={1}>
              📅 {formatDate(item.dateTime)}
            </Text>
          </View>
          {startingPrice && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.price}>₹{startingPrice}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.sectionTitle}>Sacred Poojas</Text>
            <Text style={styles.sectionSubtitle}>Book divine ceremonies</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading poojas...</Text>
        </View>
      </View>
    );
  }
  
  if (poojas.length === 0) {
    console.log('🚫 [POOJA_SECTION] No poojas available');
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.sectionTitle}>Sacred Poojas</Text>
            <Text style={styles.sectionSubtitle}>Book divine ceremonies</Text>
          </View>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No poojas available at the moment.</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Sacred Poojas</Text>
          <Text style={styles.sectionSubtitle}>Book divine ceremonies</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('PoojaList')}>
          <Text style={styles.viewAll}>View All {'>'}</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={poojas}
        renderItem={renderPoojaCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  viewAll: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 24,
  },
  card: {
    width: 280,
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
  },
  cardContent: {
    padding: 14,
  },
  catchyHeading: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  location: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  priceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default PoojaSection;
