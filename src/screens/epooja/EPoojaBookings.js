import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { epoojaAPI } from '../../services/epoojaAPI';

const EPoojaBookings = () => {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  const filters = [
    { id: 'all', name: 'All', count: 0 },
    { id: 'upcoming', name: 'Upcoming', count: 0 },
    { id: 'completed', name: 'Completed', count: 0 },
    { id: 'cancelled', name: 'Cancelled', count: 0 },
  ];

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings();
    }, [selectedFilter])
  );

  const fetchBookings = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = {
        page: 1,
        limit: 50,
      };

      if (selectedFilter !== 'all') {
        params.status = selectedFilter;
      }

      const response = await epoojaAPI.getUserBookings(params);
      
      if (response.success) {
        setBookings(response.data);
        
        // Update filter counts
        const counts = {
          all: response.data.length,
          upcoming: response.data.filter(b => ['confirmed', 'in_progress'].includes(b.status)).length,
          completed: response.data.filter(b => b.status === 'completed').length,
          cancelled: response.data.filter(b => b.status === 'cancelled').length,
        };
        
        filters.forEach(filter => {
          filter.count = counts[filter.id] || 0;
        });
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchBookings(true);
  };

  const handleCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;

    try {
      const response = await epoojaAPI.cancelBooking(bookingToCancel.id, 'User requested cancellation');
      
      if (response.success) {
        Alert.alert(
          'Booking Cancelled',
          `Your booking has been cancelled and ₹${bookingToCancel.amount} has been refunded to your wallet.`
        );
        fetchBookings();
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', error.message || 'Failed to cancel booking');
    } finally {
      setShowCancelModal(false);
      setBookingToCancel(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'in_progress':
        return '#F59E0B';
      case 'completed':
        return '#6366F1';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const canCancelBooking = (booking) => {
    const bookingDate = new Date(booking.booking_date);
    const now = new Date();
    const hoursDiff = (bookingDate - now) / (1000 * 60 * 60);
    
    return booking.status === 'confirmed' && hoursDiff > 24;
  };

  const renderFilterTab = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterTab,
        selectedFilter === item.id && styles.activeFilterTab
      ]}
      onPress={() => setSelectedFilter(item.id)}
    >
      <Text style={[
        styles.filterTabText,
        selectedFilter === item.id && styles.activeFilterTabText
      ]}>
        {item.name} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  const renderBookingCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.bookingCard}
      onPress={() => navigation.navigate('EPoojaBookingDetails', { booking: item })}
    >
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: item.category_image || 'https://via.placeholder.com/60x60' }} 
          style={styles.poojaImage}
          resizeMode="cover"
        />
        
        <View style={styles.bookingInfo}>
          <Text style={styles.poojaName} numberOfLines={1}>{item.category_name}</Text>
          <Text style={styles.packageName} numberOfLines={1}>{item.package_name}</Text>
          <Text style={styles.templeName} numberOfLines={1}>{item.temple_name}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          <Text style={styles.bookingAmount}>₹{item.amount}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.scheduleInfo}>
          <View style={styles.scheduleItem}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.scheduleText}>
              {new Date(item.booking_date).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.scheduleItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.scheduleText}>{item.booking_time}</Text>
          </View>
          
          <View style={styles.scheduleItem}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.scheduleText}>{item.participant_name}</Text>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          {item.status === 'completed' && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('EPoojaReview', { booking: item })}
            >
              <Ionicons name="star-outline" size={16} color="#F97316" />
              <Text style={styles.actionButtonText}>Review</Text>
            </TouchableOpacity>
          )}
          
          {item.video_url && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('EPoojaVideo', { booking: item })}
            >
              <Ionicons name="play-circle-outline" size={16} color="#6366F1" />
              <Text style={styles.actionButtonText}>Watch Video</Text>
            </TouchableOpacity>
          )}
          
          {canCancelBooking(item) && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelBooking(item)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={[styles.actionButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Bookings Found</Text>
      <Text style={styles.emptyText}>
        {selectedFilter === 'all' 
          ? "You haven't booked any e-poojas yet."
          : `No ${selectedFilter} bookings found.`
        }
      </Text>
      {selectedFilter === 'all' && (
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('EPoojaCategories')}
        >
          <Text style={styles.browseButtonText}>Browse E-Poojas</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
        <Text style={styles.headerTitle}>My E-Pooja Bookings</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filter Tabs */}
      <FlatList
        data={filters}
        renderItem={renderFilterTab}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      />

      {/* Bookings List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookingsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#F97316']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalText}>
              Are you sure you want to cancel this booking? The amount will be refunded to your wallet.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={styles.modalCancelText}>Keep Booking</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={confirmCancelBooking}
              >
                <Text style={styles.modalConfirmText}>Cancel Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  activeFilterTab: {
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterTabText: {
    color: '#F97316',
    fontWeight: '600',
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
  bookingsList: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  poojaImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  bookingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  poojaName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  packageName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  templeName: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardBody: {
    padding: 16,
  },
  scheduleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  scheduleText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  cancelButton: {
    backgroundColor: '#FEF2F2',
  },
  cancelButtonText: {
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default EPoojaBookings;
