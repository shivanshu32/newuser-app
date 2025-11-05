import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import poojaAPI from '../../services/poojaAPI';

const PoojaListScreen = () => {
  const navigation = useNavigation();
  const [poojas, setPoojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  useEffect(() => {
    fetchPoojas();
  }, []);
  
  const fetchPoojas = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }
      
      const response = await poojaAPI.getPublishedPoojas({
        page: pageNum,
        limit: 10
      });
      
      if (response.success) {
        const newPoojas = response.data || [];
        if (pageNum === 1) {
          setPoojas(newPoojas);
        } else {
          setPoojas(prev => [...prev, ...newPoojas]);
        }
        setHasMore(newPoojas.length === 10);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching poojas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    fetchPoojas(1, true);
  };
  
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPoojas(page + 1);
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
  
  const renderPoojaItem = ({ item }) => {
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
          {item.catchyHeading && (
            <Text style={styles.catchyHeading} numberOfLines={1}>
              {item.catchyHeading}
            </Text>
          )}
          <Text style={styles.mainHeading} numberOfLines={2}>
            {item.mainHeading}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.infoText}>
              {formatDate(item.dateTime)}
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
  
  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FF6B35" />
      </View>
    );
  };
  
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No poojas available</Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sacred Poojas</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={poojas}
          renderItem={renderPoojaItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B35']}
              tintColor="#FF6B35"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    padding: 16,
  },
  catchyHeading: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  mainHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  priceContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#999',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
});

export default PoojaListScreen;
