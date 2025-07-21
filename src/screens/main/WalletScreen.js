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
  SafeAreaView,
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
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true); // Track if user has never recharged
  const [page, setPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [razorpayConfig, setRazorpayConfig] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const initialLoadDone = useRef(false);
  const isLoadingTransactions = useRef(false);
  const lastBalanceUpdate = useRef(null);

  const quickAmounts = [100, 500, 1000, 2000];

  // Fetch recharge packages on component mount and when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 WalletScreen focused - refreshing data...');
      fetchOffers();
      fetchTransactions(); // Always refresh transactions and balance on focus
    });

    // Initial load
    fetchOffers();
    fetchTransactions();

    return unsubscribe;
  }, [navigation]);

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
        
        // Check if user has made any previous wallet top-ups
        const hasWalletTopups = transactionsResponse.data.some(transaction => 
          transaction.type === 'wallet_topup' && transaction.status === 'completed'
        );
        setIsFirstTimeUser(!hasWalletTopups);
        console.log('🔍 User first time recharge status:', !hasWalletTopups);
      } else {
        console.log('❌ No transactions found in response');
        setTransactions([]);
        // If no transactions, user is definitely first time
        setIsFirstTimeUser(true);
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
      console.log('🔄 Starting fetchOffers...');
      
      // Fetch all active recharge packages
      console.log('📡 Calling offersAPI.getRechargePackages()...');
      const offersResponse = await offersAPI.getRechargePackages();
      console.log('📦 Offers API Response:', offersResponse);
      
      // API interceptor returns response.data, so offersResponse is already the data object
      if (offersResponse && offersResponse.success) {
        const packages = offersResponse.data || [];
        console.log('✅ Found packages:', packages.length, packages);
        
        // Log first recharge packages for debugging
        const firstRechargePackages = packages.filter(pkg => pkg.firstRecharge);
        console.log('🎁 First recharge packages found:', firstRechargePackages.length, firstRechargePackages.map(p => p.name));
        
        // Sort by priority (lower number = higher priority)
        const sortedPackages = packages.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        console.log('📊 Sorted packages:', sortedPackages);
        setOffers(sortedPackages);
      } else {
        console.log('❌ No valid offers response:', offersResponse);
        setOffers([]);
      }
      
      setLoadingOffers(false);
    } catch (error) {
      console.error('❌ Error fetching recharge packages:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
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

    // Prepare navigation data
    const navigationData = {
      amount: numAmount.toString(),
      isFirstTimeUser: isFirstTimeUser,
      selectedPackage: selectedOffer ? {
        id: selectedOffer.id,
        name: selectedOffer.name,
        percentageBonus: selectedOffer.percentageBonus || 0,
        flatBonus: selectedOffer.flatBonus || 0,
        minRechargeAmount: selectedOffer.minRechargeAmount || 0,
        firstRecharge: selectedOffer.firstRecharge || false
      } : null
    };

    // If a package is selected, validate the amount matches the package
    if (selectedOffer) {
      const packageAmount = selectedOffer.minRechargeAmount || 0;
      if (numAmount !== packageAmount) {
        Alert.alert(
          'Amount Mismatch', 
          `Selected package requires exactly ₹${packageAmount}. Please use the correct amount or deselect the package.`,
          [
            { text: 'Fix Amount', onPress: () => setAmount(packageAmount.toString()) },
            { text: 'Deselect Package', onPress: () => setSelectedOffer(null) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      // Show confirmation for package selection
      const bonusAmount = selectedOffer.percentageBonus > 0 
        ? Math.round(numAmount * selectedOffer.percentageBonus / 100)
        : (selectedOffer.flatBonus || 0);
      const totalAmount = numAmount + bonusAmount;
      
      Alert.alert(
        'Confirm Recharge Package',
        `Package: ${selectedOffer.name}\n\nYou Pay: ₹${numAmount}\nBonus: +₹${bonusAmount}\nYou Get: ₹${totalAmount}\n\nProceed with this recharge?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => navigation.navigate('WalletTopUpSummary', navigationData) }
        ]
      );
    } else {
      // Navigate to the GST summary screen with the entered amount
      navigation.navigate('WalletTopUpSummary', navigationData);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('Payment successful:', paymentData);
      
      // Verify payment on backend - include selected package information
      const verificationData = {
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      };
      
      // Include selected package information if available
      if (selectedOffer) {
        verificationData.selectedPackage = {
          id: selectedOffer.id,
          name: selectedOffer.name,
          percentageBonus: selectedOffer.percentageBonus || 0,
          flatBonus: selectedOffer.flatBonus || 0,
          minRechargeAmount: selectedOffer.minRechargeAmount || 0,
          firstRecharge: selectedOffer.firstRecharge || false
        };
        console.log('🎁 Including selected package in verification:', verificationData.selectedPackage);
      }
      
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
        
        // Update local wallet balance immediately for instant UI update
        setWalletBalance(newBalance);
        console.log('✅ Local wallet balance updated immediately:', newBalance);
        
        // Update user balance in context
        await updateUser({ walletBalance: newBalance });
        console.log('✅ User context wallet balance updated:', newBalance);
        
        // Show success message with bonus info
        let successMessage = `Payment successful! ₹${parseFloat(amount)} added to your wallet.`;
        if (bonusAmount > 0) {
          successMessage += ` You received a bonus of ₹${bonusAmount}!`;
        }
        
        Alert.alert('Success', successMessage);
        
        // Reset form and refresh data
        setAmount('');
        setSelectedOffer(null);
        fetchTransactions(); // Refresh transactions list

      
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

  const handleConfirmPayment = async () => {
    if (!selectedPackage) return;
    
    const rechargeAmount = selectedPackage.minRechargeAmount || 0;
    const gstAmount = Math.round(rechargeAmount * 0.18); // 18% GST
    const totalPayableAmount = rechargeAmount + gstAmount; // Total amount including GST
    
    try {
      setProcessingPayment(true);
      setShowPaymentSummary(false); // Close summary modal
      
      console.log('🔄 Starting package payment process for amount:', totalPayableAmount);
      console.log('📦 Selected package:', selectedPackage);
      console.log('💰 Recharge amount:', rechargeAmount);
      console.log('🏷️ GST amount:', gstAmount);
      console.log('💳 Total payable amount:', totalPayableAmount);
      
      // Get Razorpay config
      const configResponse = await walletAPI.getRazorpayConfig();
      console.log('⚙️ Razorpay config response:', configResponse);
      
      // Handle the response structure - API interceptor returns response.data directly
      let config;
      if (configResponse.success && configResponse.data) {
        config = configResponse.data;
      } else if (configResponse.data && configResponse.data.success) {
        config = configResponse.data.data;
      } else {
        const errorMsg = configResponse.message || configResponse.data?.message || 'Failed to get payment config';
        throw new Error(errorMsg);
      }
      
      console.log('⚙️ Razorpay config extracted:', config);
      
      // Create payment order with total payable amount (including GST)
      const orderResponse = await walletAPI.createOrder(totalPayableAmount);
      console.log('📦 Order creation response:', orderResponse);
      
      // Handle the response structure - API interceptor returns response.data directly
      let order;
      if (orderResponse.success && orderResponse.data) {
        order = orderResponse.data;
      } else if (orderResponse.data && orderResponse.data.success) {
        order = orderResponse.data.data;
      } else {
        const errorMsg = orderResponse.message || orderResponse.data?.message || 'Failed to create order';
        throw new Error(errorMsg);
      }
      
      console.log('📦 Order extracted:', order);
      
      // Navigate to RazorpayPayment screen instead of showing modal
      // This fixes the white screen issue in production builds
      navigation.navigate('RazorpayPayment', {
        order: order,
        config: config,
        finalAmount: totalPayableAmount,
        user: user,
        selectedPackage: selectedPackage // Pass package info for verification success message
      });
      
      console.log('✅ Navigating to RazorpayPayment screen for package payment');
      
    } catch (error) {
      console.error('❌ Error initiating package payment:', error);
      
      let errorMessage = 'Failed to process payment. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message && !error.message.includes('payment_cancelled')) {
        errorMessage = error.message;
      }
      
      Alert.alert('Payment Error', errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelPayment = () => {
    setShowPaymentSummary(false);
    setSelectedPackage(null);
    setSelectedOffer(null);
    setAmount('');
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

  const renderOffer = ({ item }) => {
    // Calculate what user gets (recharge amount + bonus)
    const rechargeAmount = item.minRechargeAmount || 0;
    const bonusAmount = item.percentageBonus > 0 
      ? Math.round(rechargeAmount * item.percentageBonus / 100)
      : (item.flatBonus || 0);
    const totalAmount = rechargeAmount + bonusAmount;
    
    // Use _id for comparison (API returns _id, not id)
    const isSelected = selectedOffer?._id === item._id;

    const handlePackagePress = () => {
      console.log('🎯 Package selected:', item.name, 'Amount:', rechargeAmount);
      
      // Set the selected package and show payment summary
      setSelectedPackage(item);
      setSelectedOffer(item);
      setAmount(rechargeAmount.toString());
      setShowPaymentSummary(true);
    };

    return (
      <TouchableOpacity
        style={[
          styles.rechargePackageCard,
          isSelected && styles.selectedPackageCard
        ]}
        onPress={handlePackagePress}
        disabled={processingPayment}
      >
        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{item.name}</Text>
          {item.firstRecharge && isFirstTimeUser && (
            <View style={styles.firstRechargeBadge}>
              <Text style={styles.firstRechargeText}>First Recharge</Text>
            </View>
          )}
        </View>
        
        <View style={styles.packagePricing}>
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>You Pay:</Text>
            <Text style={styles.payAmount}>₹{rechargeAmount}</Text>
          </View>
          
          <View style={styles.pricingRow}>
            <Text style={styles.pricingLabel}>Bonus:</Text>
            <Text style={styles.bonusAmount}>+₹{bonusAmount}</Text>
          </View>
          
          <View style={[styles.pricingRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>You Get:</Text>
            <Text style={styles.totalAmount}>₹{totalAmount}</Text>
          </View>
        </View>
        
        {item.percentageBonus > 0 && (
          <View style={styles.bonusBadge}>
            <Text style={styles.bonusBadgeText}>{item.percentageBonus}% Bonus</Text>
          </View>
        )}
        
        {processingPayment && isSelected && (
          <View style={styles.selectedIndicator}>
            <ActivityIndicator size="small" color="#F97316" />
            <Text style={styles.selectedText}>Processing...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Wallet</Text>
      </View>
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
                <Text style={styles.offersTitle}>Recharge Packages</Text>
                {loadingOffers ? (
                  <ActivityIndicator style={styles.loader} size="large" color="#F97316" />
                ) : (() => {
                  // Filter offers based on user's recharge history
                  const filteredOffers = offers.filter((offer) => {
                    // Hide first recharge packages if user has already completed their first recharge
                    if (offer.firstRecharge && !isFirstTimeUser) {
                      console.log('🚫 Hiding first recharge package for returning user:', offer.name);
                      return false;
                    }
                    return true;
                  });
                  
                  // Show appropriate message based on filtered results
                  if (offers.length === 0) {
                    return (
                      <View style={styles.emptyOffers}>
                        <Ionicons name="gift-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No offers available</Text>
                      </View>
                    );
                  } else if (filteredOffers.length === 0) {
                    return (
                      <View style={styles.emptyOffers}>
                        <Ionicons name="gift-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>No packages available</Text>
                        <Text style={[styles.emptyText, { fontSize: 12, marginTop: 5, opacity: 0.7 }]}>First recharge offers are no longer available</Text>
                      </View>
                    );
                  } else {
                    return (
                      <View>
                        {filteredOffers.map((offer) => renderOffer({ item: offer }))}
                      </View>
                    );
                  }
                })()}
              </View>
            </View>
            
            <View style={styles.transactionsContainer}>
              <View style={styles.transactionHeader}>
                <Text style={styles.transactionsTitle}>Transaction History</Text>
                <TouchableOpacity 
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('TransactionHistory')}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#F97316" />
                </TouchableOpacity>
              </View>
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
      
      {/* Payment Summary Modal */}
      <Modal
        visible={showPaymentSummary}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelPayment}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentSummaryModal}>
            {selectedPackage && (() => {
              const rechargeAmount = selectedPackage.minRechargeAmount || 0;
              const bonusAmount = selectedPackage.percentageBonus > 0 
                ? Math.round(rechargeAmount * selectedPackage.percentageBonus / 100)
                : (selectedPackage.flatBonus || 0);
              const gstAmount = Math.round(rechargeAmount * 0.18); // 18% GST
              const totalPayableAmount = rechargeAmount + gstAmount; // What user actually pays
              const totalWalletCredit = rechargeAmount + bonusAmount; // What user gets in wallet
              
              return (
                <>
                  <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>Payment Summary</Text>
                    <TouchableOpacity onPress={handleCancelPayment}>
                      <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.packageSummary}>
                    <Text style={styles.packageSummaryName}>{selectedPackage.name}</Text>
                    <Text style={styles.packageSummaryDesc}>{selectedPackage.description}</Text>
                    
                    {selectedPackage.firstRecharge && isFirstTimeUser && (
                      <View style={styles.firstRechargeBadge}>
                        <Text style={styles.firstRechargeText}>First Recharge Offer</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.summaryBreakdown}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Recharge Amount:</Text>
                      <Text style={styles.summaryAmount}>₹{rechargeAmount}</Text>
                    </View>
                    
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>GST (18%):</Text>
                      <Text style={styles.summaryAmount}>₹{gstAmount}</Text>
                    </View>
                    
                    <View style={[styles.summaryRow, styles.payableRow]}>
                      <Text style={styles.summaryPayableLabel}>Total Payable:</Text>
                      <Text style={styles.summaryPayable}>₹{totalPayableAmount}</Text>
                    </View>
                    
                    <View style={styles.walletCreditSection}>
                      <Text style={styles.walletCreditTitle}>Wallet Credit Breakdown:</Text>
                      
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Base Credit:</Text>
                        <Text style={styles.summaryAmount}>₹{rechargeAmount}</Text>
                      </View>
                      
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Bonus ({selectedPackage.percentageBonus}%):</Text>
                        <Text style={styles.summaryBonus}>+₹{bonusAmount}</Text>
                      </View>
                      
                      <View style={[styles.summaryRow, styles.totalRow]}>
                        <Text style={styles.summaryTotalLabel}>You Get in Wallet:</Text>
                        <Text style={styles.summaryTotal}>₹{totalWalletCredit}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.summaryActions}>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={handleCancelPayment}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.confirmButton, processingPayment && styles.disabledButton]} 
                      onPress={handleConfirmPayment}
                      disabled={processingPayment}
                    >
                      {processingPayment ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.confirmButtonText}>Proceed to Payment</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
      
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
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
  // Legacy offer styles (keeping for compatibility)
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
  // New recharge package styles
  rechargePackageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedPackageCard: {
    backgroundColor: '#fef3e2',
    borderColor: '#F97316',
    borderWidth: 2,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  firstRechargeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  firstRechargeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  packagePricing: {
    marginBottom: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 4,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#666',
  },
  payAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bonusAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
  },
  bonusBadge: {
    backgroundColor: '#F97316',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bonusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F97316',
  },
  selectedText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F97316',
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
  // Payment Summary Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  paymentSummaryModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  packageSummary: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  packageSummaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  packageSummaryDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  summaryBreakdown: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  summaryBonus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 12,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F97316',
  },
  payableRow: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  summaryPayableLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
  },
  summaryPayable: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#856404',
  },
  walletCreditSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c3e6c3',
  },
  walletCreditTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#F97316',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF3E2',
  },
  viewAllText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default WalletScreen;
