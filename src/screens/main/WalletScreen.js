import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, spacing, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { walletAPI, offersAPI, ledgerAPI } from '../../services/api';
import RazorpayWebView from '../../components/RazorpayWebView';

const WalletScreen = () => {
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionError, setTransactionError] = useState(false);
  const [amount, setAmount] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [offers, setOffers] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [razorpayConfig, setRazorpayConfig] = useState(null);
  const [showPaymentSummary, setShowPaymentSummary] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const { user, updateUser } = useAuth();
  const navigation = useNavigation();
  const isLoadingRef = useRef(false);
  const lastBalanceUpdate = useRef(null);

  const quickAmounts = [100, 500, 1000, 2000];

  useFocusEffect(
    useCallback(() => {
      fetchData();
      fetchOffers();
    }, [])
  );

  const fetchData = async (isRefresh = false) => {
    if (isLoadingRef.current && !isRefresh) return;
    try {
      isLoadingRef.current = true;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setTransactionError(false);

      const [balanceResponse, ledgerResponse] = await Promise.all([
        walletAPI.getBalance(),
        ledgerAPI.getMyTransactions({ page: 1, limit: 5, sortBy: 'timestamp', sortOrder: 'desc' }),
      ]);

      if (balanceResponse?.success && balanceResponse?.data) {
        const currentBalance = balanceResponse.data.balance || 0;
        setWalletBalance(currentBalance);
        const shouldUpdate =
          user?.walletBalance !== currentBalance &&
          (!lastBalanceUpdate.current || Date.now() - lastBalanceUpdate.current > 1000);
        if (shouldUpdate) {
          lastBalanceUpdate.current = Date.now();
          await updateUser({ walletBalance: currentBalance });
        }
      } else {
        setWalletBalance(user?.walletBalance || 0);
      }

      if (ledgerResponse?.success) {
        const txns = ledgerResponse.data?.transactions || [];
        setTransactions(txns);
        const hasTopup = txns.some(
          (t) => t.transactionReason === 'wallet_topup' && t.reflectedOnLiveWallet
        );
        setIsFirstTimeUser(!hasTopup);
      } else {
        setTransactions([]);
        setIsFirstTimeUser(true);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setTransactionError(true);
      setWalletBalance(user?.walletBalance || 0);
      if (error.isAuthError) {
        console.log('Auth error — will be redirected');
      } else if (error.isNetworkError) {
        Alert.alert('No Connection', 'Check your internet connection and pull down to retry.');
      }
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => fetchData(true);

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const offersResponse = await offersAPI.getRechargePackages();
      if (offersResponse?.success) {
        const packages = offersResponse.data || [];
        const sortedPackages = packages.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        setOffers(sortedPackages);
      } else {
        setOffers([]);
      }
    } catch (error) {
      console.error('Error fetching recharge packages:', error);
      setOffers([]);
    } finally {
      setLoadingOffers(false);
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
        fetchData(true);

      
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
      
      // Create payment order with total payable amount (including GST) and selected package
      const orderResponse = await walletAPI.createOrder(totalPayableAmount, selectedPackage);
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

  const getLedgerIcon = (reason) => {
    switch (reason) {
      case 'wallet_topup': return { name: 'arrow-down-circle', color: colors.success };
      case 'bonus_credit': return { name: 'gift', color: colors.warning };
      case 'consultation_payment': return { name: 'chatbubbles', color: colors.info };
      case 'refund': return { name: 'refresh-circle', color: colors.accentPurple };
      case 'admin_adjustment': return { name: 'settings', color: colors.secondary };
      default: return { name: 'swap-horizontal', color: colors.textSecondary };
    }
  };

  const formatReason = (reason) => {
    const map = {
      wallet_topup: 'Wallet Recharge',
      bonus_credit: 'Bonus Credit',
      consultation_payment: 'Consultation',
      refund: 'Refund',
      admin_adjustment: 'Adjustment',
    };
    return map[reason] || (reason || 'Transaction').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return `Today · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDays === 1) return `Yesterday · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderTransaction = ({ item, index }) => {
    const isCredit = item.transactionType === 'credit';
    const icon = getLedgerIcon(item.transactionReason);
    const isPending = !item.reflectedOnLiveWallet;

    return (
      <TouchableOpacity
        style={[styles.txItem, index === 0 && styles.txItemFirst]}
        onPress={() => navigation.navigate('TransactionHistory')}
        activeOpacity={0.7}
      >
        <View style={[styles.txIconWrap, { backgroundColor: `${icon.color}18` }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle} numberOfLines={1}>{formatReason(item.transactionReason)}</Text>
          <Text style={styles.txDate}>{formatDate(item.timestamp)}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.error }]}>
            {isCredit ? '+' : '−'}₹{item.amount?.toFixed(2)}
          </Text>
          {isPending && (
            <View style={styles.pendingPill}>
              <Text style={styles.pendingPillText}>Pending</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
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
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.selectedText}>Processing...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredOffers = offers.filter((offer) => !(offer.firstRecharge && !isFirstTimeUser));

  const renderListHeader = () => (
    <View>
      {/* ── Balance Hero Card ── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>Available Balance</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.heroBalance}>₹{walletBalance.toFixed(2)}</Text>
            )}
          </View>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text style={styles.heroBadgeText}>Secure</Text>
          </View>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroActions}>
          <View style={styles.heroHint}>
            <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
            <Text style={styles.heroHintText}>Funds used for consultations only</Text>
          </View>
        </View>
      </View>

      {/* ── Add Money Section ── */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Add Money</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="Enter amount"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!processingPayment}
          />
        </View>
        <View style={styles.quickAmounts}>
          {quickAmounts.map((q) => (
            <TouchableOpacity
              key={q}
              style={[styles.quickBtn, amount === q.toString() && styles.quickBtnActive]}
              onPress={() => setAmount(q.toString())}
              disabled={processingPayment}
            >
              <Text style={[styles.quickBtnText, amount === q.toString() && styles.quickBtnTextActive]}>
                ₹{q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.addMoneyBtn, (!amount || processingPayment) && styles.addMoneyBtnDisabled]}
          onPress={handleAddMoney}
          disabled={!amount || processingPayment}
          activeOpacity={0.85}
        >
          {processingPayment ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={18} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.addMoneyBtnText}>Proceed to Add Money</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.gstNote}>* Prices include 18% GST. No hidden charges.</Text>
      </View>

      {/* ── Recharge Packages ── */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recharge Packages</Text>
          {isFirstTimeUser && (
            <View style={styles.newUserBadge}>
              <Text style={styles.newUserBadgeText}>New User Offers</Text>
            </View>
          )}
        </View>
        {loadingOffers ? (
          <View style={styles.centeredLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingHint}>Loading packages...</Text>
          </View>
        ) : filteredOffers.length === 0 ? (
          <View style={styles.emptyPackages}>
            <Ionicons name="gift-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyPackagesText}>No packages available right now</Text>
          </View>
        ) : (
          filteredOffers.map((offer) => renderOffer({ item: offer }))
        )}
      </View>

      {/* ── Recent Transactions header ── */}
      <View style={styles.sectionHeaderRow2}>
        <Text style={styles.sectionTitle2}>Recent Transactions</Text>
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => navigation.navigate('TransactionHistory')}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderListFooter = () => (
    <View style={{ paddingBottom: 32 }} />
  );

  const renderEmptyTransactions = () => {
    if (loading) return null;
    if (transactionError) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyStateTitle}>Couldn't load transactions</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyStateTitle}>No transactions yet</Text>
        <Text style={styles.emptyStateSubtitle}>Add money to get started</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.contentWrapper}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Wallet</Text>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('TransactionHistory')}
          >
            <Ionicons name="time-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={loading ? [] : transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={renderEmptyTransactions}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
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
                      <Ionicons name="close" size={24} color={colors.textSecondary} />
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentWrapper: {
    flex: 1,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  listContent: {
    paddingBottom: 16,
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero Balance Card ────────────────────────────────────
  heroCard: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroBalance: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 4,
  },
  heroBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroHintText: {
    fontSize: 12,
    color: colors.textMuted,
  },

  // ── Section Card ─────────────────────────────────────────
  sectionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  // ── Add Money ─────────────────────────────────────────────
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  quickBtnActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickBtnTextActive: {
    color: colors.primary,
  },
  addMoneyBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  addMoneyBtnDisabled: {
    backgroundColor: colors.surfaceTertiary,
  },
  addMoneyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  gstNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // ── Recharge Packages ────────────────────────────────────
  newUserBadge: {
    backgroundColor: colors.successMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.success,
  },
  newUserBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  rechargePackageCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPackageCard: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  firstRechargeBadge: {
    backgroundColor: colors.successMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  firstRechargeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
  },
  packagePricing: {
    marginBottom: spacing.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 3,
  },
  pricingLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  payAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bonusAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  bonusBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bonusBadgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.primaryDark,
  },
  selectedText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  centeredLoader: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  loadingHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyPackages: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyPackagesText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // ── Recent Transactions ───────────────────────────────────
  sectionHeaderRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle2: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    gap: 2,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  txItemFirst: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  pendingPill: {
    backgroundColor: colors.warningMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pendingPillText: {
    fontSize: 10,
    color: colors.warning,
    fontWeight: '600',
  },

  // ── Empty / Error States ──────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.hero,
    paddingHorizontal: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Payment Summary Modal ─────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  paymentSummaryModal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 12 },
    }),
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  packageSummary: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  packageSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  packageSummaryDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryBreakdown: {
    marginBottom: spacing.xl,
    gap: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryBonus: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  payableRow: {
    backgroundColor: colors.warningMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  summaryPayableLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.warning,
  },
  summaryPayable: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.warning,
  },
  walletCreditSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.successMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  walletCreditTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
  },
  disabledButton: {
    backgroundColor: colors.textMuted,
  },
});

export default WalletScreen;
