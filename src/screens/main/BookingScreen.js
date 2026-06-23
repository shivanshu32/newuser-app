import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { colors } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { bookingsAPI } from '../../services/api';

import BookingListHeader from '../../components/bookings/BookingListHeader';
import BookingTabs from '../../components/bookings/BookingTabs';
import ActiveSessionBanner from '../../components/bookings/ActiveSessionBanner';
import BookingCard from '../../components/bookings/BookingCard';
import BookingSkeleton from '../../components/bookings/BookingSkeleton';
import EmptyBookingState from '../../components/bookings/EmptyBookingState';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'waiting_for_user', 'in-progress'];
const HISTORY_STATUSES = ['completed', 'no_show', 'cancelled', 'rejected', 'expired'];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Oldest First' },
  { key: 'highest', label: 'Highest Price' },
  { key: 'lowest', label: 'Lowest Price' },
];

const SectionHeader = ({ title, count }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count > 0 && <Text style={styles.sectionCount}>{count}</Text>}
  </View>
);

const BookingScreen = ({ route, navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSegment, setActiveSegment] = useState('active');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTypeFilter, setActiveTypeFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const { user } = useAuth();
  const { socket } = useSocket();

  /* ─── Data fetching ─── */
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getAll();
      let data = [];
      if (response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      }
      data = data.map((b) => ({ ...b, astrologer: b.astrologer || {} }));
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  }, [fetchBookings]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  /* ─── Socket listeners ─── */
  useEffect(() => {
    if (!socket?.connected) return;
    const handleBookingUpdate = () => fetchBookings();
    const events = [
      'booking_accepted', 'booking_rejected', 'booking_expired',
      'booking_cancelled', 'booking_auto_cancelled', 'session_started',
      'session_completed', 'astrologer_joined_session', 'no_show_detected',
    ];
    events.forEach((e) => socket.on(e, handleBookingUpdate));
    socket.on('booking_reminder', (data) => {
      Alert.alert('Booking Reminder', `Your consultation with ${data.astrologerName} starts in 2 minutes!`, [{ text: 'OK' }]);
    });
    return () => {
      events.forEach((e) => socket.off(e, handleBookingUpdate));
      socket.off('booking_reminder');
    };
  }, [socket, fetchBookings]);

  /* ─── Derived data ─── */
  const activeBookings = useMemo(
    () => bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)),
    [bookings]
  );

  const historyBookings = useMemo(
    () => bookings.filter((b) => HISTORY_STATUSES.includes(b.status)),
    [bookings]
  );

  // The most actionable active booking for the banner (in-progress > confirmed > waiting > pending)
  const bannerBooking = useMemo(() => {
    const priority = ['in-progress', 'confirmed', 'waiting_for_user', 'pending'];
    for (const status of priority) {
      const found = activeBookings.find((b) => b.status === status);
      if (found) return found;
    }
    return null;
  }, [activeBookings]);

  const counts = useMemo(() => ({
    active: activeBookings.length,
    history: historyBookings.length,
  }), [activeBookings, historyBookings]);

  /* ─── Filtered + sorted list ─── */
  const displayedBookings = useMemo(() => {
    let base = activeSegment === 'active' ? activeBookings : historyBookings;

    // Status filter (history only)
    if (activeSegment === 'history' && activeFilter !== 'all') {
      if (activeFilter === 'completed') {
        base = base.filter((b) => ['completed', 'no_show'].includes(b.status));
      } else if (activeFilter === 'cancelled') {
        base = base.filter((b) => ['cancelled', 'rejected', 'expired'].includes(b.status));
      }
    }

    // Type filter
    if (activeTypeFilter) {
      base = base.filter((b) => b.type === activeTypeFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      base = base.filter((b) => {
        const name = (b.astrologer?.name || '').toLowerCase();
        const dName = (b.astrologer?.displayName || '').toLowerCase();
        return name.includes(q) || dName.includes(q);
      });
    }

    // Sort
    return [...base].sort((a, b) => {
      const dA = new Date(a.scheduledAt || a.createdAt || 0);
      const dB = new Date(b.scheduledAt || b.createdAt || 0);
      const pA = parseFloat(a.totalAmount) || 0;
      const pB = parseFloat(b.totalAmount) || 0;
      switch (sortBy) {
        case 'oldest': return dA - dB;
        case 'highest': return pB - pA;
        case 'lowest': return pA - pB;
        default: return dB - dA;
      }
    });
  }, [activeSegment, activeBookings, historyBookings, activeFilter, activeTypeFilter, searchQuery, sortBy]);

  /* ─── Grouped sections for history ─── */
  const listData = useMemo(() => {
    if (activeSegment === 'active' || displayedBookings.length === 0) {
      return displayedBookings;
    }
    const now = new Date();
    const groups = { today: [], thisWeek: [], earlier: [] };
    displayedBookings.forEach((b) => {
      const d = new Date(b.scheduledAt || b.createdAt || 0);
      const diffDays = Math.floor((now - d) / 86400000);
      if (diffDays < 1) groups.today.push(b);
      else if (diffDays < 7) groups.thisWeek.push(b);
      else groups.earlier.push(b);
    });
    const result = [];
    if (groups.today.length) {
      result.push({ _id: '__today__', isHeader: true, title: 'Today', count: groups.today.length });
      groups.today.forEach((b) => result.push(b));
    }
    if (groups.thisWeek.length) {
      result.push({ _id: '__week__', isHeader: true, title: 'This Week', count: groups.thisWeek.length });
      groups.thisWeek.forEach((b) => result.push(b));
    }
    if (groups.earlier.length) {
      result.push({ _id: '__earlier__', isHeader: true, title: 'Earlier', count: groups.earlier.length });
      groups.earlier.forEach((b) => result.push(b));
    }
    return result;
  }, [activeSegment, displayedBookings]);

  /* ─── Sort UI ─── */
  const handleSortPress = useCallback(() => {
    const options = SORT_OPTIONS.map((o) => o.label);
    if (Platform.OS === 'ios' && ActionSheetIOS.showActionSheetWithOptions) {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, 'Cancel'], cancelButtonIndex: options.length },
        (i) => { if (i < options.length) setSortBy(SORT_OPTIONS[i].key); }
      );
    } else {
      Alert.alert('Sort By', 'Choose a sort option', [
        ...SORT_OPTIONS.map((o) => ({ text: o.label, onPress: () => setSortBy(o.key) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, []);

  /* ─── Actions ─── */
  const handleJoinSession = useCallback(async (booking) => {
    try {
      if (!booking._id) { Alert.alert('Error', 'Invalid booking data.'); return; }
      const { joinConsultationRoom } = require('../../services/socketService');
      await joinConsultationRoom({
        bookingId: booking._id,
        sessionId: booking.sessionId,
        roomId: booking.roomId || `consultation:${booking._id}`,
        astrologerId: booking.astrologer?._id || booking.astrologer,
        consultationType: booking.type,
      });
      if (booking.type === 'chat') {
        navigation.navigate('Chat', {
          bookingId: booking._id,
          sessionId: booking.sessionId,
          roomId: booking.roomId || `consultation:${booking._id}`,
          astrologerId: booking.astrologer?._id || booking.astrologer,
          consultationType: 'chat',
        });
      }
    } catch (error) {
      console.error('Error joining session:', error);
      Alert.alert('Error', 'Failed to join session. Please try again.');
    }
  }, [navigation]);

  const handleViewChatHistory = useCallback((booking) => {
    if (!booking.sessionId) { Alert.alert('Error', 'Chat history is not available.'); return; }
    navigation.navigate('ChatHistory', {
      sessionId: booking.sessionId,
      bookingId: booking._id,
      astrologerName: booking.astrologer?.displayName || booking.astrologer?.name || 'Astrologer',
    });
  }, [navigation]);

  const handleRate = useCallback((bookingId) => {
    if (!bookingId) { Alert.alert('Error', 'This booking cannot be rated.'); return; }
    navigation.navigate('Rating', { bookingId });
  }, [navigation]);

  const handleRebook = useCallback((astrologerId) => {
    if (!astrologerId) { Alert.alert('Error', 'Astrologer information is missing.'); return; }
    navigation.navigate('AstrologerProfile', { astrologerId });
  }, [navigation]);

  const handleCancelBooking = useCallback((booking) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            await bookingsAPI.cancel(booking._id, 'User cancelled');
            fetchBookings();
          } catch (err) {
            console.error('Error cancelling booking:', err);
            Alert.alert('Error', 'Failed to cancel booking.');
          }
        },
      },
    ]);
  }, [fetchBookings]);

  const handleCardPress = useCallback((booking) => {
    if (['confirmed', 'waiting_for_user'].includes(booking.status)) {
      handleJoinSession(booking);
    } else if (booking.status === 'in-progress' && booking.type === 'chat') {
      navigation.navigate('Chat', { bookingId: booking._id, astrologer: booking.astrologer });
    } else if (booking.status === 'pending') {
      Alert.alert(
        'Booking Details',
        `Awaiting confirmation from ${booking.astrologer?.displayName || 'astrologer'}`,
        [
          { text: 'Cancel Booking', style: 'destructive', onPress: () => handleCancelBooking(booking) },
          { text: 'Close', style: 'cancel' },
        ]
      );
    }
  }, [handleJoinSession, handleCancelBooking, navigation]);

  const handleFindAstrologer = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);

  /* ─── Render item ─── */
  const renderItem = useCallback(({ item, index }) => {
    if (item.isHeader) {
      return <SectionHeader title={item.title} count={item.count} />;
    }
    return (
      <Animated.View
        entering={FadeInUp.delay(Math.min(index, 6) * 40).duration(280)}
        layout={Layout.springify()}
      >
        <BookingCard
          booking={item}
          index={index}
          onPress={() => handleCardPress(item)}
          onViewHistory={() => handleViewChatHistory(item)}
          onRate={(id) => handleRate(id)}
          onRebook={(astrologerId) => handleRebook(astrologerId)}
        />
      </Animated.View>
    );
  }, [handleCardPress, handleViewChatHistory, handleRate, handleRebook]);

  const keyExtractor = useCallback(
    (item) => item._id || item.isHeader ? item._id : Math.random().toString(),
    []
  );

  const emptyKey = activeSegment === 'history' ? activeFilter : 'active';
  const ListEmptyComponent = useCallback(
    () => <EmptyBookingState tabKey={emptyKey} onCta={handleFindAstrologer} />,
    [emptyKey, handleFindAstrologer]
  );

  const ListHeaderComponent = useCallback(() => (
    <>
      <BookingListHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSortPress={handleSortPress}
        bookingCount={bookings.length}
      />
      <BookingTabs
        activeSegment={activeSegment}
        onSegmentChange={(seg) => {
          setActiveSegment(seg);
          setActiveFilter('all');
          setActiveTypeFilter(null);
        }}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        activeTypeFilter={activeTypeFilter}
        onTypeFilterChange={setActiveTypeFilter}
        counts={counts}
      />
      {activeSegment === 'active' && bannerBooking && (
        <ActiveSessionBanner
          booking={bannerBooking}
          onJoin={handleCardPress}
          onCancel={handleCancelBooking}
        />
      )}
    </>
  ), [
    searchQuery, handleSortPress, bookings.length,
    activeSegment, activeFilter, activeTypeFilter, counts,
    bannerBooking, handleCardPress, handleCancelBooking,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <GestureHandlerRootView style={styles.inner}>
        {loading && !refreshing ? (
          <>
            <BookingListHeader
              searchQuery=""
              onSearchChange={() => {}}
              onSortPress={() => {}}
              bookingCount={0}
            />
            <View style={styles.skeletonPad}>
              <BookingSkeleton count={3} />
            </View>
          </>
        ) : (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderComponent}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accentGold}
                colors={[colors.accentGold]}
              />
            }
            ListEmptyComponent={ListEmptyComponent}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={10}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </GestureHandlerRootView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  inner: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  skeletonPad: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

export default BookingScreen;
