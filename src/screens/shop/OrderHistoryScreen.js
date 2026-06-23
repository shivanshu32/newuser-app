import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { colors } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';

const OrderHistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadOrders(true);
    }, [filter])
  );

  const loadOrders = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      }

      const currentPage = reset ? 1 : page;
      const response = await productAPI.getOrders({
        status: filter === 'all' ? undefined : filter,
        page: currentPage,
        limit: 10
      });

      if (reset) {
        setOrders(response.data);
      } else {
        setOrders(prev => [...prev, ...response.data]);
      }

      setHasMore(currentPage < response.pages);
      if (!reset) setPage(currentPage + 1);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadOrders(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'processing': return '#8B5CF6';
      case 'shipped': return '#06B6D4';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'processing': return 'sync-outline';
      case 'shipped': return 'airplane-outline';
      case 'delivered': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'refunded': return 'arrow-undo-outline';
      default: return 'ellipse-outline';
    }
  };

  const renderOrder = ({ item }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate('OrderDetail', { orderId: item._id })}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderNumber}>{item.orderNumber}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.orderStatus)}20` }]}>
          <Ionicons name={getStatusIcon(item.orderStatus)} size={16} color={getStatusColor(item.orderStatus)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.orderStatus) }]}>
            {item.orderStatus.charAt(0).toUpperCase() + item.orderStatus.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsLabel}>
          {item.items.length} item{item.items.length > 1 ? 's' : ''}
        </Text>
        <Text style={styles.itemNames} numberOfLines={1}>
          {item.items.map(i => i.name).join(', ')}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{item.total}</Text>
        </View>
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyText}>No orders found</Text>
      <Text style={styles.emptySubtext}>
        {filter === 'all' ? 'Start shopping to see your orders here' : `No ${filter} orders`}
      </Text>
      {filter === 'all' && (
        <TouchableOpacity
          style={styles.shopButton}
          onPress={() => navigation.navigate('ShopHome')}
        >
          <Text style={styles.shopButtonText}>Start Shopping</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#FBBF24" />
      </View>
    );
  };

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>My Orders</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterTab, filter === status && styles.filterTabActive]}
                onPress={() => setFilter(status)}
              >
                <Text style={[styles.filterTabText, filter === status && styles.filterTabTextActive]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading && page === 1 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FBBF24" />
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FBBF24']} />
            }
            contentContainerStyle={orders.length === 0 ? styles.emptyList : styles.list}
          />
        )}
      </SafeAreaView>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  backButton: {
    padding: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  placeholder: {
    width: 32
  },
  filterTabs: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 8
  },
  filterTabActive: {
    backgroundColor: '#FBBF24'
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8'
  },
  filterTabTextActive: {
    color: '#0B0F2F'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  list: {
    padding: 16
  },
  emptyList: {
    flexGrow: 1
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4
  },
  orderDate: {
    fontSize: 12,
    color: '#94A3B8'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  orderItems: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  itemsLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4
  },
  itemNames: {
    fontSize: 14,
    color: '#F3F4F6'
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12
  },
  totalSection: {
    flex: 1
  },
  totalLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBBF24'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center'
  }
});

export default OrderHistoryScreen;
