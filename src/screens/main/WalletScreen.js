import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { walletAPI, offersAPI } from '../../services/api';
//import RazorpayCheckout from 'react-native-razorpay';
import RazorpayCheckout from '../../utils/razorpayMock';

const WalletScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const { user, updateUser } = useAuth();

  const quickAmounts = [100, 500, 1000, 2000];

  useEffect(() => {
    fetchTransactions();
    fetchOffers();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch wallet balance
      const balanceResponse = await walletAPI.getBalance();
      if (balanceResponse.data && balanceResponse.data.balance !== undefined) {
        // Update user wallet balance in auth context using the updateUser function
        await updateUser({ walletBalance: balanceResponse.data.balance });
      }
      
      // Fetch wallet transactions
      const transactionsResponse = await walletAPI.getTransactions();
      
      if (transactionsResponse.data && transactionsResponse.data.transactions) {
        setTransactions(transactionsResponse.data.transactions);
      } else {
        // Fallback to empty array if no transactions found
        setTransactions([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
      
      // Fallback to dummy transactions in case of error
      const dummyTransactions = [
        {
          id: '1',
          type: 'credit',
          amount: 500,
          description: 'Wallet top-up',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: '2',
          type: 'debit',
          amount: 225,
          description: 'Video consultation with Jyotish Gupta',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
        {
          id: '3',
          type: 'credit',
          amount: 1000,
          description: 'Wallet top-up',
          timestamp: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
        },
      ];
      
      setTransactions(dummyTransactions);
      setLoading(false);
    }
  };

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      
      const offersResponse = await offersAPI.getActiveOffers(amount);
      
      if (offersResponse.data && offersResponse.data.success) {
        setOffers(offersResponse.data.data || []);
      } else {
        setOffers([]);
      }
      
      setLoadingOffers(false);
    } catch (error) {
      console.error('Error fetching offers:', error);
      setLoadingOffers(false);
      setOffers([]);
    }
  };

  const handleAddMoney = async () => {
    const amountValue = parseFloat(amount);
    
    // Validate minimum amount
    if (!amount || isNaN(amountValue) || amountValue < 10) {
      Alert.alert('Invalid Amount', 'Minimum recharge amount is ₹10');
      return;
    }

    try {
      setProcessingPayment(true);

      // Create order
      const orderResponse = await walletAPI.createOrder(amountValue);
      
      if (!orderResponse.data.success) {
        throw new Error('Failed to create order');
      }

      const { orderId, keyId, amount: orderAmount, currency } = orderResponse.data.data;

      // Prepare Razorpay options
      const options = {
        description: 'Wallet Recharge',
        image: 'https://your-logo-url.com/logo.png', // Replace with your app logo
        currency: currency,
        key: keyId,
        amount: orderAmount,
        order_id: orderId,
        name: 'Jyotish Call',
        prefill: {
          email: user.email,
          contact: user.phone,
          name: user.name
        },
        theme: { color: '#8A2BE2' }
      };

      // Open Razorpay checkout
      const paymentResult = await RazorpayCheckout.open(options);
      
      // Verify payment
      const verificationData = {
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature
      };

      const verifyResponse = await walletAPI.verifyPayment(verificationData);
      
      if (verifyResponse.data.success) {
        Alert.alert('Success', 'Money added successfully!');
        setAmount('');
        fetchTransactions();
        
        // Show bonus message if applicable
        if (verifyResponse.data.data.bonusAmount > 0) {
          Alert.alert(
            'Bonus Credited!', 
            `You received a bonus of ₹${verifyResponse.data.data.bonusAmount}!`
          );
        }
      } else {
        throw new Error('Payment verification failed');
      }

    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Payment Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const isCredit = item.type === 'wallet_topup' || item.type === 'bonus_credit';
    const iconName = isCredit ? 'add-circle' : 'remove-circle';
    const iconColor = isCredit ? '#4CAF50' : '#F44336';
    const amountPrefix = isCredit ? '+' : '-';

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionType}>
              {item.type === 'wallet_topup' ? 'Wallet Recharge' : 
               item.type === 'bonus_credit' ? 'Bonus Credit' : 
               item.description || 'Transaction'}
            </Text>
            <Text style={styles.transactionDate}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.transactionStatus}>
              Status: {item.status}
            </Text>
          </View>
        </View>
        <Text style={[styles.transactionAmount, { color: iconColor }]}>
          {amountPrefix}₹{item.amount}
        </Text>
      </View>
    );
  };

  const renderOffer = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.offerCard,
        selectedOffer?.id === item.id && styles.selectedOfferCard
      ]}
      onPress={() => setSelectedOffer(selectedOffer?.id === item.id ? null : item)}
    >
      <View style={styles.offerHeader}>
        <Text style={styles.offerName}>{item.name}</Text>
        <View style={styles.offerBadge}>
          <Text style={styles.offerBadgeText}>
            {item.percentageBonus > 0 ? `${item.percentageBonus}%` : `₹${item.flatBonus}`}
          </Text>
        </View>
      </View>
      <Text style={styles.offerDescription}>{item.description}</Text>
      <Text style={styles.offerMinAmount}>
        Min. recharge: ₹{item.minRechargeAmount}
      </Text>
      {item.maxBonusAmount && (
        <Text style={styles.offerMaxBonus}>
          Max bonus: ₹{item.maxBonusAmount}
        </Text>
      )}
    </TouchableOpacity>
  );

  const handleLoadMoreTransactions = async () => {
    if (!hasMoreTransactions || loadingMoreTransactions) return;

    setLoadingMoreTransactions(true);
    try {
      const transactionsResponse = await walletAPI.getTransactions(page + 1);
      if (transactionsResponse.data && transactionsResponse.data.transactions) {
        setTransactions([...transactions, ...transactionsResponse.data.transactions]);
        setPage(page + 1);
        setHasMoreTransactions(transactionsResponse.data.hasMore);
      }
    } catch (error) {
      console.error('Error loading more transactions:', error);
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Wallet Balance</Text>
        <Text style={styles.walletBalance}>₹{user?.walletBalance || 0}</Text>
        
        <View style={styles.topUpContainer}>
          <Text style={styles.topUpLabel}>Top Up Amount</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="Enter amount"
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!processingPayment}
            />
          </View>
          
          <View style={styles.quickAmounts}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={styles.quickAmountButton}
                onPress={() => setAmount(quickAmount.toString())}
                disabled={processingPayment}
              >
                <Text style={styles.quickAmountText}>₹{quickAmount}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={[styles.topUpButton, processingPayment && styles.disabledButton]}
            onPress={handleAddMoney}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.topUpButtonText}>Top Up Wallet</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.offersContainer}>
          <Text style={styles.offersTitle}>Offers</Text>
          {loadingOffers ? (
            <ActivityIndicator style={styles.loader} size="large" color="#F97316" />
          ) : offers.length === 0 ? (
            <View style={styles.emptyOffers}>
              <Ionicons name="gift-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No offers available</Text>
            </View>
          ) : (
            <FlatList
              data={offers}
              renderItem={renderOffer}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </View>
      
      <View style={styles.transactionsContainer}>
        <Text style={styles.transactionsTitle}>Transaction History</Text>
        
        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#F97316" />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyTransactions}>
            <Ionicons name="wallet-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMoreTransactions}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    margin: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletLabel: {
    fontSize: 16,
    color: '#666',
  },
  walletBalance: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8A2BE2',
    marginVertical: 10,
  },
  topUpContainer: {
    marginTop: 20,
  },
  topUpLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#666',
    marginRight: 5,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  quickAmountButton: {
    backgroundColor: '#f0e6ff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  quickAmountText: {
    color: '#8A2BE2',
    fontWeight: 'bold',
  },
  topUpButton: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offersContainer: {
    marginTop: 20,
  },
  offersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOfferCard: {
    backgroundColor: '#f0e6ff',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  offerBadge: {
    backgroundColor: '#8A2BE2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  offerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  offerMinAmount: {
    fontSize: 14,
    color: '#666',
  },
  offerMaxBonus: {
    fontSize: 14,
    color: '#666',
  },
  emptyOffers: {
    alignItems: 'center',
    padding: 30,
  },
  transactionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    margin: 15,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  loader: {
    marginVertical: 20,
  },
  emptyTransactions: {
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDetails: {
    marginLeft: 15,
  },
  transactionType: {
    fontSize: 16,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionStatus: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 20,
  },
});

export default WalletScreen;
