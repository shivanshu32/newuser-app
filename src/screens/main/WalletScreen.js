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
import { walletAPI } from '../../services/api';

// Mock Razorpay implementation for Expo Go compatibility
// This avoids the native module error
const RazorpayCheckout = {
  open: (options) => {
    console.log('Mock Razorpay payment initiated with options:', options);
    // Return a promise that resolves with mock payment data
    return Promise.resolve({
      razorpay_payment_id: 'mock_payment_' + Date.now(),
      razorpay_order_id: options.order_id,
      razorpay_signature: 'mock_signature_' + Date.now()
    });
  }
};

const WalletScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch wallet balance
      const balanceResponse = await walletAPI.getBalance();
      if (balanceResponse.data && balanceResponse.data.balance !== undefined) {
        // Update user wallet balance in auth context
        user.walletBalance = balanceResponse.data.balance;
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

  const handleAddMoney = () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    const amountValue = parseFloat(amount);
    
    Alert.alert(
      'Confirm Payment',
      `Add ₹${amountValue} to your wallet?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Proceed',
          onPress: () => processPayment(amountValue)
        }
      ]
    );
  };
  
  const processPayment = async (amountValue) => {
    try {
      setProcessingPayment(true);
      
      // Call backend API to create an order
      const orderResponse = await walletAPI.createOrder(amountValue);
      
      if (!orderResponse.data || !orderResponse.data.orderId || !orderResponse.data.keyId) {
        throw new Error('Failed to create payment order');
      }
      
      const { orderId, keyId } = orderResponse.data;
      
      // Configure Razorpay options
      const options = {
        description: 'Wallet Top-up',
        image: 'https://i.imgur.com/3g7nmJC.png', // Replace with your app icon
        currency: 'INR',
        key: keyId,
        amount: amountValue * 100, // Razorpay expects amount in paise
        name: 'JyotishCall',
        order_id: orderId,
        prefill: {
          email: user.email || '',
          contact: user.phoneNumber || '',
          name: user.name || ''
        },
        theme: { color: '#8A2BE2' }
      };
      
      // Open Razorpay payment flow
      RazorpayCheckout.open(options).then((data) => {
        verifyPayment(data, amountValue);
      }).catch((error) => {
        console.log('Payment Error:', error);
        setProcessingPayment(false);
        Alert.alert('Payment Failed', 'There was an error processing your payment.');
      });
      
    } catch (error) {
      console.log('Error initiating payment:', error);
      setProcessingPayment(false);
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
    }
  };
  
  const verifyPayment = async (paymentData, amountValue) => {
    try {
      // Call backend API to verify the payment
      const response = await walletAPI.verifyPayment({
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_signature: paymentData.razorpay_signature,
        amount: amountValue
      });
      
      if (response.data && response.data.success) {
        // Update local state with the new transaction
        const newTransaction = response.data.transaction;
        setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
        
        // Update user wallet balance
        if (user) {
          user.walletBalance = response.data.newBalance;
        }
        
        setProcessingPayment(false);
        setAmount('');
        
        Alert.alert('Payment Successful', `₹${amountValue} has been added to your wallet.`);
        
        // Refresh transactions list
        fetchTransactions();
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (error) {
      console.log('Payment verification error:', error);
      setProcessingPayment(false);
      Alert.alert('Payment Failed', 'There was an error verifying your payment.');
    }
  };

  const renderTransactionItem = ({ item }) => {
    const transactionDate = new Date(item.timestamp);
    
    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionIconContainer}>
          <Ionicons
            name={item.type === 'credit' ? 'arrow-down-outline' : 'arrow-up-outline'}
            size={20}
            color={item.type === 'credit' ? '#4CAF50' : '#F44336'}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>
            {transactionDate.toLocaleDateString()} at {transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'credit' ? '#4CAF50' : '#F44336' },
          ]}
        >
          {item.type === 'credit' ? '+' : '-'}₹{item.amount}
        </Text>
      </View>
    );
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
            {[100, 200, 500, 1000].map((quickAmount) => (
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
            onPress={handleTopUp}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.topUpButtonText}>Top Up Wallet</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.transactionsContainer}>
        <Text style={styles.transactionsTitle}>Transaction History</Text>
        
        {loading ? (
          <ActivityIndicator style={styles.loader} size="large" color="#8A2BE2" />
        ) : transactions.length === 0 ? (
          <View style={styles.emptyTransactions}>
            <Ionicons name="wallet-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
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
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    marginBottom: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WalletScreen;
