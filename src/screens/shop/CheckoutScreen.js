import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import RazorpayCheckout from 'react-native-razorpay';
import productAPI from '../../services/productAPI';
import { useAuth } from '../../context/AuthContext';
import CosmicBackground from '../../components/shop/CosmicBackground';
import analyticsService from '../../services/analyticsService';

const CheckoutScreen = ({ route, navigation }) => {
  const { cartItems, subtotal, couponCode, discount } = route.params;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [deliveryType, setDeliveryType] = useState('standard');
  
  const hasPhysicalProducts = cartItems.some(item => item.product?.productType === 'physical');
  const shippingCost = hasPhysicalProducts ? (deliveryType === 'express' ? 100 : 50) : 0;
  const taxableAmount = subtotal - (discount || 0) + shippingCost;
  const tax = Math.round((taxableAmount * 0.18) * 100) / 100;
  const total = subtotal - (discount || 0) + shippingCost + tax;

  useEffect(() => {
    if (hasPhysicalProducts) {
      loadAddresses();
    }
  }, []);

  // Track begin_checkout when user lands on checkout screen
  useFocusEffect(
    useCallback(() => {
      const trackBeginCheckout = async () => {
        try {
          // GA4 begin_checkout
          await analyticsService.logEvent('begin_checkout', {
            currency: 'INR',
            value: total,
            tax: tax,
            shipping: shippingCost,
            coupon: couponCode || undefined,
            items: cartItems.map(item => ({
              item_id: item.product._id,
              item_name: item.product.name,
              item_category: item.product.category,
              item_variant: item.variant?.name,
              price: item.price,
              quantity: item.quantity
            }))
          });

          // Meta InitiateCheckout
          const { AppEventsLogger } = require('react-native-fbsdk-next');
          await AppEventsLogger.logEvent('InitiateCheckout', {
            fb_content_type: 'product',
            fb_num_items: cartItems.length,
            fb_currency: 'INR',
            fb_value: total
          });

          console.log('📊 [TRACKING] Begin checkout tracked (ecommerce):', {
            items: cartItems.length,
            value: total
          });
        } catch (error) {
          console.error('❌ [TRACKING] Failed to track begin checkout:', error);
        }
      };

      trackBeginCheckout();
    }, [cartItems, total])
  );

  // Helper function to track ecommerce purchase
  const trackPurchase = async (order, transactionId = null) => {
    try {
      // GA4 purchase event
      await analyticsService.logEvent('purchase', {
        transaction_id: transactionId || order._id,
        value: order.total,
        currency: 'INR',
        tax: order.tax || 0,
        shipping: order.shippingCost || 0,
        coupon: order.couponCode || undefined,
        items: order.items.map(item => ({
          item_id: item.product._id || item.productId,
          item_name: item.product.name || item.name,
          item_category: item.product.category,
          item_variant: item.variant?.name,
          price: item.price,
          quantity: item.quantity
        }))
      });

      // Meta Purchase event
      const { AppEventsLogger } = require('react-native-fbsdk-next');
      await AppEventsLogger.logPurchase(order.total, 'INR', {
        fb_content_type: 'product',
        fb_transaction_id: transactionId || order._id,
        fb_order_id: order.orderNumber,
        fb_num_items: order.items.length
      });

      console.log('📊 [TRACKING] Ecommerce purchase tracked:', {
        order_id: order._id,
        value: order.total,
        items: order.items.length
      });
    } catch (error) {
      console.error('❌ [TRACKING] Failed to track purchase:', error);
    }
  };

  const loadAddresses = async () => {
    try {
      const response = await productAPI.getAddresses();
      setAddresses(response.data);
      const defaultAddr = response.data.find(addr => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr._id);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (hasPhysicalProducts && !selectedAddress) {
      Alert.alert('Address Required', 'Please select a delivery address');
      return;
    }

    try {
      setLoading(true);

      // Create order
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.product._id,
          variantId: item.variant?._id,
          quantity: item.quantity
        })),
        shippingAddressId: selectedAddress,
        paymentMethod,
        deliveryType,
        couponCode
      };

      const orderResponse = await productAPI.createOrder(orderData);
      const order = orderResponse.data;

      if (paymentMethod === 'wallet') {
        // Wallet payment already processed - track purchase
        await trackPurchase(order);
        navigation.replace('OrderConfirmation', { orderId: order._id });
      } else if (paymentMethod === 'razorpay') {
        // Create Razorpay order
        const razorpayResponse = await productAPI.createRazorpayOrder(order._id);
        
        const options = {
          description: `Order ${order.orderNumber}`,
          image: 'https://your-logo-url.com/logo.png',
          currency: 'INR',
          key: razorpayResponse.data.keyId,
          amount: razorpayResponse.data.amount,
          order_id: razorpayResponse.data.orderId,
          name: 'JyotishCall',
          prefill: {
            email: user?.email || '',
            contact: user?.mobileNumber || user?.phone || '',
            name: user?.name || ''
          },
          theme: { color: '#F97316' }
        };

        RazorpayCheckout.open(options)
          .then(async (data) => {
            // Payment successful
            try {
              await productAPI.processPayment(order._id, {
                paymentMethod: 'razorpay',
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_order_id: data.razorpay_order_id,
                razorpay_signature: data.razorpay_signature
              });
              
              // Track purchase for Razorpay payment
              await trackPurchase(order, data.razorpay_payment_id);
              navigation.replace('OrderConfirmation', { orderId: order._id });
            } catch (error) {
              console.error('Payment verification error:', error);
              Alert.alert('Error', 'Payment verification failed');
            }
          })
          .catch((error) => {
            console.error('Razorpay error:', error);
            Alert.alert('Payment Failed', 'Payment was cancelled or failed');
          });
      } else if (paymentMethod === 'cod') {
        // Process COD
        await productAPI.processPayment(order._id, { paymentMethod: 'cod' });
        await trackPurchase(order);
        navigation.replace('OrderConfirmation', { orderId: order._id });
      }
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Checkout</Text>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.content}>
        {/* Delivery Address */}
        {hasPhysicalProducts && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('AddressManagement', { selectMode: true })}
              >
                <Text style={styles.addButton}>+ Add New</Text>
              </TouchableOpacity>
            </View>
            
            {addresses.length === 0 ? (
              <TouchableOpacity
                style={styles.emptyAddress}
                onPress={() => navigation.navigate('AddressManagement')}
              >
                <Ionicons name="location-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyText}>No addresses found</Text>
                <Text style={styles.emptySubtext}>Add a delivery address</Text>
              </TouchableOpacity>
            ) : (
              addresses.map((address) => (
                <TouchableOpacity
                  key={address._id}
                  style={[
                    styles.addressCard,
                    selectedAddress === address._id && styles.addressCardSelected
                  ]}
                  onPress={() => setSelectedAddress(address._id)}
                >
                  <View style={styles.radioButton}>
                    {selectedAddress === address._id && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={styles.addressInfo}>
                    <View style={styles.addressHeader}>
                      <Text style={styles.addressName}>{address.fullName}</Text>
                      {address.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.addressText}>
                      {address.addressLine1}, {address.addressLine2 && `${address.addressLine2}, `}
                      {address.city}, {address.state} - {address.pincode}
                    </Text>
                    <Text style={styles.addressPhone}>{address.phone}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Delivery Type */}
        {hasPhysicalProducts && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Type</Text>
            <View style={styles.deliveryOptions}>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryType === 'standard' && styles.deliveryOptionSelected
                ]}
                onPress={() => setDeliveryType('standard')}
              >
                <View style={styles.radioButton}>
                  {deliveryType === 'standard' && <View style={styles.radioButtonInner} />}
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryName}>Standard Delivery</Text>
                  <Text style={styles.deliveryTime}>5-7 business days</Text>
                </View>
                <Text style={styles.deliveryPrice}>₹50</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryType === 'express' && styles.deliveryOptionSelected
                ]}
                onPress={() => setDeliveryType('express')}
              >
                <View style={styles.radioButton}>
                  {deliveryType === 'express' && <View style={styles.radioButtonInner} />}
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryName}>Express Delivery</Text>
                  <Text style={styles.deliveryTime}>2-3 business days</Text>
                </View>
                <Text style={styles.deliveryPrice}>₹100</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'wallet' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('wallet')}
          >
            <View style={styles.radioButton}>
              {paymentMethod === 'wallet' && <View style={styles.radioButtonInner} />}
            </View>
            <Ionicons name="wallet" size={24} color="#F97316" />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Wallet</Text>
              <Text style={styles.paymentDesc}>Pay using wallet balance</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'razorpay' && styles.paymentOptionSelected
            ]}
            onPress={() => setPaymentMethod('razorpay')}
          >
            <View style={styles.radioButton}>
              {paymentMethod === 'razorpay' && <View style={styles.radioButtonInner} />}
            </View>
            <Ionicons name="card" size={24} color="#F97316" />
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>Card / UPI / Net Banking</Text>
              <Text style={styles.paymentDesc}>Pay via Razorpay</Text>
            </View>
          </TouchableOpacity>

          {hasPhysicalProducts && (
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cod' && styles.paymentOptionSelected
              ]}
              onPress={() => setPaymentMethod('cod')}
            >
              <View style={styles.radioButton}>
                {paymentMethod === 'cod' && <View style={styles.radioButtonInner} />}
              </View>
              <Ionicons name="cash" size={24} color="#F97316" />
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>Cash on Delivery</Text>
                <Text style={styles.paymentDesc}>Pay when you receive</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{subtotal}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>-₹{discount}</Text>
            </View>
          )}
          {hasPhysicalProducts && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>₹{shippingCost}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (18%)</Text>
            <Text style={styles.summaryValue}>₹{tax}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{total}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.bottomBar}>
        <View style={styles.totalInfo}>
          <Text style={styles.bottomTotalLabel}>Total Payable</Text>
          <Text style={styles.bottomTotalValue}>₹{total}</Text>
        </View>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.disabledButton]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  addButton: {
    fontSize: 14,
    color: '#FBBF24',
    fontWeight: '500'
  },
  emptyAddress: {
    alignItems: 'center',
    paddingVertical: 32
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#F3F4F6',
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4
  },
  addressCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  addressCardSelected: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.1)'
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FBBF24'
  },
  addressInfo: {
    flex: 1
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#FBBF24',
    borderRadius: 4
  },
  defaultText: {
    fontSize: 10,
    color: '#0B0F2F',
    fontWeight: '600'
  },
  addressText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 4
  },
  addressPhone: {
    fontSize: 13,
    color: '#A5B4FC'
  },
  deliveryOptions: {
    gap: 12
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  deliveryOptionSelected: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.1)'
  },
  deliveryInfo: {
    flex: 1,
    marginLeft: 12
  },
  deliveryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6'
  },
  deliveryTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24'
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  paymentOptionSelected: {
    borderColor: '#FBBF24',
    backgroundColor: 'rgba(251,191,36,0.1)'
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6'
  },
  paymentDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14,
    color: '#94A3B8'
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6'
  },
  discountLabel: {
    color: '#34D399'
  },
  discountValue: {
    color: '#34D399'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  bottomBar: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  totalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  bottomTotalLabel: {
    fontSize: 14,
    color: '#94A3B8'
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  placeOrderButton: {
    paddingVertical: 14,
    backgroundColor: '#F97316',
    borderRadius: 12,
    alignItems: 'center'
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default CheckoutScreen;
