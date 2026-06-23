import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ledgerAPI } from '../../services/api';
import { colors, spacing, radius, shadows } from '../../theme';

const TransactionHistoryScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchTransactions = async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const params = {
        page: pageNum,
        limit: 20,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      };

      const response = await ledgerAPI.getMyTransactions(params);
      
      if (response.success) {
        const newTransactions = response.data.transactions || [];
        
        if (pageNum === 1 || refresh) {
          setTransactions(newTransactions);
        } else {
          setTransactions(prev => [...prev, ...newTransactions]);
        }
        
        setHasMore(newTransactions.length === params.limit);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      Alert.alert('Error', 'Failed to load transaction history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBalanceSummary = async () => {
    try {
      const response = await ledgerAPI.getBalanceSummary();
      if (response.success) {
        setBalanceSummary(response.data);
      }
    } catch (error) {
      console.error('Error fetching balance summary:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(1, true);
      fetchBalanceSummary();
    }, [])
  );

  const onRefresh = () => {
    fetchTransactions(1, true);
    fetchBalanceSummary();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchTransactions(page + 1);
    }
  };

  const getTransactionIcon = (type, reason) => {
    switch (reason) {
      case 'wallet_topup':
        return { name: 'add-circle', color: '#4CAF50' };
      case 'bonus_credit':
        return { name: 'gift', color: '#FF9800' };
      case 'consultation_payment':
        return { name: 'chatbubbles', color: '#2196F3' };
      case 'refund':
        return { name: 'refresh-circle', color: '#9C27B0' };
      case 'admin_adjustment':
        return { name: 'settings', color: '#607D8B' };
      default:
        return { 
          name: type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle', 
          color: type === 'credit' ? '#4CAF50' : '#F44336' 
        };
    }
  };

  const formatTransactionReason = (reason) => {
    const reasonMap = {
      'wallet_topup': 'Wallet Top-up',
      'bonus_credit': 'Bonus Credit',
      'consultation_payment': 'Consultation Payment',
      'refund': 'Refund',
      'admin_adjustment': 'Admin Adjustment'
    };
    return reasonMap[reason] || reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `Today, ${date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (diffDays === 2) {
      return `Yesterday, ${date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else {
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderTransaction = ({ item }) => {
    const icon = getTransactionIcon(item.transactionType, item.transactionReason);
    const isCredit = item.transactionType === 'credit';

    return (
      <TouchableOpacity 
        style={styles.transactionItem}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
      >
        <View style={styles.transactionLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
            <Ionicons name={icon.name} size={24} color={icon.color} />
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>
              {formatTransactionReason(item.transactionReason)}
            </Text>
            <Text style={styles.transactionDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(item.timestamp)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[
            styles.transactionAmount,
            { color: isCredit ? '#4CAF50' : '#F44336' }
          ]}>
            {isCredit ? '+' : '-'}₹{item.amount.toFixed(2)}
          </Text>
          <Text style={styles.balanceAfter}>
            Balance: ₹{item.newWalletBalance.toFixed(2)}
          </Text>
          {/* Status badges */}
          {!item.reflectedOnLiveWallet && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
          {item.metadata?.status === 'expired' && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
          {item.metadata?.status === 'cancelled' && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledText}>Cancelled</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Transaction History</Text>
      {balanceSummary && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Current Balance</Text>
            <Text style={styles.summaryValue}>₹{balanceSummary.currentBalance?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Spent</Text>
            <Text style={styles.summaryValueRed}>₹{balanceSummary.totalDebits?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Added</Text>
            <Text style={styles.summaryValueGreen}>₹{balanceSummary.totalCredits?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={64} color={colors.surfaceTertiary} />
      <Text style={styles.emptyTitle}>No Transactions</Text>
      <Text style={styles.emptyMessage}>Your transaction history will appear here</Text>
    </View>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  summaryValueGreen: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.success,
  },
  summaryValueRed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.error,
  },
  transactionItem: {
    backgroundColor: colors.surface,
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.card,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceAfter: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pendingBadge: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '500',
  },
  expiredBadge: {
    backgroundColor: colors.errorMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  expiredText: {
    fontSize: 10,
    color: colors.error,
    fontWeight: '500',
  },
  cancelledBadge: {
    backgroundColor: colors.infoMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  cancelledText: {
    fontSize: 10,
    color: colors.info,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default TransactionHistoryScreen;
