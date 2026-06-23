import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { colors } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';

const OrderConfirmationScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      const response = await productAPI.getOrder(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <CosmicBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FBBF24" />
        </View>
      </CosmicBackground>
    );
  }

  if (!order) return null;

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
        </View>

        {/* Success Message */}
        <Text style={styles.successTitle}>Order Placed Successfully!</Text>
        <Text style={styles.successSubtitle}>
          Your order has been confirmed and will be processed soon
        </Text>

        {/* Order Details Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderHeader}>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Date</Text>
            <Text style={styles.detailValue}>
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {order.paymentMethod === 'wallet' ? 'Wallet' :
               order.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>₹{order.total}</Text>
          </View>

          {order.hasPhysicalProducts && order.estimatedDelivery && (
            <>
              <View style={styles.divider} />
              <View style={styles.deliveryInfo}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <View style={styles.deliveryText}>
                  <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
                  <Text style={styles.deliveryDate}>
                    {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Items Summary */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>Items Ordered ({order.items.length})</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.subtotal}</Text>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        {order.shippingAddress && (
          <View style={styles.addressCard}>
            <Text style={styles.cardTitle}>Delivery Address</Text>
            <Text style={styles.addressName}>{order.shippingAddress.fullName}</Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 && `, ${order.shippingAddress.addressLine2}`}
            </Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </Text>
            <Text style={styles.addressPhone}>{order.shippingAddress.phone}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
          >
            <Text style={styles.primaryButtonText}>Track Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('ShopHome')}
          >
            <Text style={styles.secondaryButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </SafeAreaView>
    </CosmicBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 16,
    alignItems: 'center'
  },
  successIcon: {
    marginTop: 32,
    marginBottom: 24
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#34D399',
    justifyContent: 'center',
    alignItems: 'center'
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
    textAlign: 'center',
    marginBottom: 8
  },
  successSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32
  },
  orderCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  orderHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  orderLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 14,
    color: '#94A3B8'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6'
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FBBF24'
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8
  },
  deliveryText: {
    flex: 1
  },
  deliveryLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 2
  },
  deliveryDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24'
  },
  itemsCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  itemInfo: {
    flex: 1,
    marginRight: 12
  },
  itemName: {
    fontSize: 14,
    color: '#F3F4F6',
    marginBottom: 4
  },
  itemQuantity: {
    fontSize: 12,
    color: '#94A3B8'
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  addressCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4
  },
  addressText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 2
  },
  addressPhone: {
    fontSize: 13,
    color: '#A5B4FC',
    marginTop: 4
  },
  actions: {
    width: '100%',
    gap: 12
  },
  primaryButton: {
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center'
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  secondaryButton: {
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
    alignItems: 'center'
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBBF24'
  }
});

export default OrderConfirmationScreen;
