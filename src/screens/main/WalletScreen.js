import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { walletAPI, offersAPI } from '../../services/api';
import RazorpayWebView from '../../components/RazorpayWebView';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [razorpayConfig, setRazorpayConfig] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const initialLoadDone = useRef(false);
  const isLoadingTransactions = useRef(false);
  const lastBalanceUpdate = useRef(null);

  const quickAmounts = [100, 500, 1000, 2000];

  const fetchTransactions = async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingTransactions.current) {
      console.log('🚫 fetchTransactions already in progress, skipping...');
      return;
    }
    try {
      isLoadingTransactions.current = true;
      setLoading(true);
      console.log('🔄 Starting fetchTransactions...');
      
      // Fetch wallet balance
      const balanceResponse = await walletAPI.getBalance();
      console.log('💰 Balance response:', balanceResponse);
      
      // Handle API response structure correctly (same as HomeScreen)
      if (balanceResponse && balanceResponse.success && balanceResponse.data) {
        const currentBalance = balanceResponse.data.balance || 0;
        
        // Update local state immediately for display
        setWalletBalance(currentBalance);
        console.log('✅ Local wallet balance updated:', currentBalance);
        
        // Only update user context if balance has actually changed and enough time has passed
        const shouldUpdate = user?.walletBalance !== currentBalance && 
                           (!lastBalanceUpdate.current || 
                            Date.now() - lastBalanceUpdate.current > 1000); // 1 second debounce
        
        if (shouldUpdate) {
          lastBalanceUpdate.current = Date.now();
          await updateUser({ walletBalance: currentBalance });
          console.log('✅ User context wallet balance updated:', currentBalance);
        } else {
          console.log('⏭️ Skipping user context update (no change or too frequent)');
        }
      } else {
        console.warn('⚠️ Wallet API returned success: false or no data');
        // Fallback to user context value if API fails
        setWalletBalance(user?.walletBalance || 0);
        console.log('⚠️ Using fallback balance from user context:', user?.walletBalance || 0);
      }
      
      // Fetch wallet transactions
      console.log('📋 Fetching wallet transactions...');
      const transactionsResponse = await walletAPI.getTransactions();
      console.log('📋 Full transactions response:', JSON.stringify(transactionsResponse, null, 2));
      
      // Backend returns transactions in data array format
      if (transactionsResponse && transactionsResponse.data && Array.isArray(transactionsResponse.data)) {
        setTransactions(transactionsResponse.data);
        console.log('✅ Transactions loaded:', transactionsResponse.data.length);
      } else {
        console.log('❌ No transactions found in response');
        setTransactions([]);
      }
      
      setLoading(false);
      isLoadingTransactions.current = false;
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setLoading(false);
      isLoadingTransactions.current = false;
      
      // Show more specific error message
      if (error.response) {
        console.error('API Error Response:', error.response.data);
        Alert.alert('Error', error.response.data.message || 'Failed to load wallet data. Please try again.');
      } else {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      }
      
      // Fallback to dummy transactions in case of error for development
      const dummyTransactions = [
        {
          _id: '1',
          type: 'wallet_topup',
          amount: 500,
          status: 'completed',
          description: 'Wallet top-up',
          createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          _id: '2',
          type: 'consultation_payment',
          amount: -225,
          status: 'completed',
          description: 'Video consultation payment',
          createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        },
        {
          _id: '3',
          type: 'wallet_topup',
          amount: 1000,
          status: 'completed',
          description: 'Wallet top-up with bonus',
          createdAt: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
        },
      ];
      
      setTransactions(dummyTransactions);
    } finally {
      isLoadingTransactions.current = false;
    }
  };

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchTransactions();
      fetchOffers();
    }
  }, []); // Empty dependency array to run only once on mount

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

  const handleAddMoney = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 10) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ₹10)');
      return;
    }

    // Navigate to the GST summary screen with the entered amount
    navigation.navigate('WalletTopUpSummary', { amount: numAmount.toString() });
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('Payment successful:', paymentData);
      
      // Verify payment on backend
      const verificationData = {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      };
      
      const verifyResponse = await walletAPI.verifyPayment(verificationData);
      console.log('Payment verification response:', verifyResponse);
      
      // Handle the response structure - API interceptor returns response.data directly
      let verificationResult;
      if (verifyResponse.success && verifyResponse.data) {
        // Direct response from API interceptor
        verificationResult = verifyResponse.data;
      } else if (verifyResponse.data && verifyResponse.data.success) {
        // Nested response structure
        verificationResult = verifyResponse.data.data;
      } else {
        const errorMsg = verifyResponse.message || verifyResponse.data?.message || 'Payment verification failed';
        throw new Error(errorMsg);
      }
      
      console.log('Verification result:', verificationResult);
      const { transaction, newBalance, bonusAmount } = verificationResult;
        
        // Update user balance in context
        await updateUser({ walletBalance: newBalance });
        
        // Show success message with bonus info
        let successMessage = `Payment successful! ₹${parseFloat(amount)} added to your wallet.`;
        if (bonusAmount > 0) {
          successMessage += ` You received a bonus of ₹${bonusAmount}!`;
        }
        
        Alert.alert('Success', successMessage);
        
        // Reset form and refresh data
        setAmount('');
        setSelectedOffer(null);
        fetchTransactions();

      
    } catch (error) {
      console.error('Payment verification error:', error);
      
      let errorMessage = 'Payment verification failed. Please contact support.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Verification Failed', errorMessage);
    } finally {
      setShowPaymentModal(false);
      setPaymentOrder(null);
      setRazorpayConfig(null);
    }
  };

  const handlePaymentFailure = (error) => {
    console.error('Payment failed:', error);
    
    let errorMessage = 'Payment failed. Please try again.';
    if (error.description) {
      errorMessage = error.description;
    } else if (error.code === 'payment_cancelled') {
      errorMessage = 'Payment was cancelled.';
    }
    
    Alert.alert('Payment Failed', errorMessage);
    
    setShowPaymentModal(false);
    setPaymentOrder(null);
    setRazorpayConfig(null);
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setPaymentOrder(null);
    setRazorpayConfig(null);
  };

  const renderTransaction = ({ item }) => {
    // For users: wallet_topup, bonus_credit, refund, admin_credit are credits (+)
    // session_payment, admin_debit are debits (-)
    const isCredit = item.type === 'wallet_topup' || 
                     item.type === 'bonus_credit' || 
                     item.type === 'refund' || 
                     item.type === 'admin_credit';
    const iconName = isCredit ? 'add-circle' : 'remove-circle';
    const iconColor = isCredit ? '#4CAF50' : '#F44336';
    const amountPrefix = isCredit ? '+' : '-';
    
    // Get transaction description based on type
    const getTransactionDescription = (transaction) => {
      switch (transaction.type) {
        case 'wallet_topup':
          return 'Wallet Recharge';
        case 'bonus_credit':
          return 'Bonus Credit';
        case 'consultation_payment':
          return 'Consultation Payment';
        case 'refund':
          return 'Refund';
        default:
          return transaction.description || 'Transaction';
      }
    };

    return (
      <View style={styles.transactionItem}>
        <View style={styles.transactionLeft}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionType}>
              {getTransactionDescription(item)}
            </Text>
            <Text style={styles.transactionDate}>
              {new Date(item.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
            <Text style={[styles.transactionStatus, { 
              color: item.status === 'completed' ? '#4CAF50' : 
                     item.status === 'pending' ? '#FF9800' : '#F44336' 
            }]}>
              Status: {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={[styles.transactionAmount, { color: iconColor }]}>
          {amountPrefix}₹{Math.abs(item.amount)}
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
    console.log('🔄 handleLoadMoreTransactions called - hasMoreTransactions:', hasMoreTransactions, 'loadingMoreTransactions:', loadingMoreTransactions, 'page:', page);
    
    if (!hasMoreTransactions || loadingMoreTransactions) {
      console.log('⏭️ Skipping handleLoadMoreTransactions - no more data or already loading');
      return;
    }

    console.log('📄 Loading more transactions for page:', page + 1);
    setLoadingMoreTransactions(true);
    try {
      const transactionsResponse = await walletAPI.getTransactions({ page: page + 1 });
      if (transactionsResponse.data && transactionsResponse.data.data) {
        setTransactions([...transactions, ...transactionsResponse.data.data]);
        setPage(page + 1);
        setHasMoreTransactions(transactionsResponse.data.pagination?.next ? true : false);
        console.log('✅ More transactions loaded:', transactionsResponse.data.data.length);
      }
    } catch (error) {
      console.error('❌ Error loading more transactions:', error);
    } finally {
      setLoadingMoreTransactions(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item._id || item.id}
        onEndReached={null}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            <View style={styles.walletCard}>
              <Text style={styles.walletLabel}>Wallet Balance</Text>
              <Text style={styles.walletBalance}>₹{walletBalance.toFixed(2)}</Text>
              
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
                  <View>
                    {offers.map((offer) => renderOffer({ item: offer }))}
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.transactionsContainer}>
              <Text style={styles.transactionsTitle}>Transaction History</Text>
              {loading && (
                <ActivityIndicator style={styles.loader} size="large" color="#F97316" />
              )}
              {!loading && transactions.length === 0 && (
                <View style={styles.emptyTransactions}>
                  <Ionicons name="wallet-outline" size={60} color="#ccc" />
                  <Text style={styles.emptyText}>No transactions yet</Text>
                </View>
              )}
            </View>
          </View>
        }
        ListFooterComponent={loadingMoreTransactions ? (
          <ActivityIndicator style={styles.loader} size="small" color="#F97316" />
        ) : null}
      />
      
      {/* Razorpay Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handlePaymentClose}
      >
        {paymentOrder && razorpayConfig && (
          <RazorpayWebView
            orderId={paymentOrder.orderId}
            keyId={razorpayConfig.keyId}
            amount={paymentOrder.amount}
            currency={paymentOrder.currency}
            userDetails={{
              name: user?.name || '',
              email: user?.email || '',
              phone: user?.phone || ''
            }}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentFailure={handlePaymentFailure}
            onClose={handlePaymentClose}
          />
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
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
    color: '#F97316',
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
    backgroundColor: '#fef3e2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  quickAmountText: {
    color: '#F97316',
    fontWeight: 'bold',
  },
  topUpButton: {
    backgroundColor: '#F97316',
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
    backgroundColor: '#fef3e2',
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
    backgroundColor: '#F97316',
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
