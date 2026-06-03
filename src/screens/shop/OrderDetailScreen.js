import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';

const OrderDetailScreen = ({ route, navigation }) => {
  const { orderId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getOrder(orderId);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await productAPI.cancelOrder(orderId, 'Customer requested cancellation');
              Alert.alert('Success', 'Order cancelled successfully');
              await loadOrder();
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to cancel order');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'processing': return '#8B5CF6';
      case 'shipped': return '#06B6D4';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'processing': return 'sync-outline';
      case 'shipped': return 'airplane-outline';
      case 'delivered': return 'checkmark-done-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'refunded': return 'arrow-undo-outline';
      default: return 'ellipse-outline';
    }
  };

  const canCancelOrder = (status) => {
    return ['pending', 'confirmed'].includes(status);
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>

      <ScrollView style={styles.content}>
        {/* Order Status */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(order.orderStatus)}20` }]}>
            <Ionicons name={getStatusIcon(order.orderStatus)} size={32} color={getStatusColor(order.orderStatus)} />
          </View>
          <Text style={[styles.statusText, { color: getStatusColor(order.orderStatus) }]}>
            {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
          </Text>
          {order.estimatedDelivery && order.orderStatus !== 'delivered' && order.orderStatus !== 'cancelled' && (
            <Text style={styles.estimatedDelivery}>
              Expected by {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          )}
        </View>

        {/* Order Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Number</Text>
            <Text style={styles.infoValue}>{order.orderNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>
              {order.paymentMethod === 'wallet' ? 'Wallet' :
               order.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
            </Text>
          </View>
          {order.trackingNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tracking Number</Text>
              <TouchableOpacity onPress={() => Linking.openURL(`https://tracking-url.com/${order.trackingNumber}`)}>
                <Text style={styles.trackingNumber}>{order.trackingNumber}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>Items ({order.items.length})</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.variant && (
                  <Text style={styles.itemVariant}>Variant: {item.variant}</Text>
                )}
                <Text style={styles.itemQuantity}>Qty: {item.quantity} × ₹{item.price}</Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.subtotal}</Text>
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
            <Text style={styles.addressPhone}>Phone: {order.shippingAddress.phone}</Text>
          </View>
        )}

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.cardTitle}>Price Details</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Subtotal</Text>
            <Text style={styles.priceValue}>₹{order.subtotal}</Text>
          </View>
          {order.discount > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, styles.discountLabel]}>Discount</Text>
              <Text style={[styles.priceValue, styles.discountValue]}>-₹{order.discount}</Text>
            </View>
          )}
          {order.shippingCost > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Shipping</Text>
              <Text style={styles.priceValue}>₹{order.shippingCost}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Tax (GST)</Text>
            <Text style={styles.priceValue}>₹{order.tax}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{order.total}</Text>
          </View>
        </View>

        {/* Cancel Button */}
        {canCancelOrder(order.orderStatus) && (
          <TouchableOpacity
            style={[styles.cancelButton, cancelling && styles.disabledButton]}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Help Section */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="chatbubble-outline" size={20} color="#FBBF24" />
            <Text style={styles.helpButtonText}>Contact Support</Text>
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
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 24,
    marginTop: 8,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  statusBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4
  },
  estimatedDelivery: {
    fontSize: 14,
    color: '#94A3B8'
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  infoLabel: {
    fontSize: 14,
    color: '#94A3B8'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6'
  },
  trackingNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FBBF24',
    textDecorationLine: 'underline'
  },
  itemsCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  itemInfo: {
    flex: 1,
    marginRight: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6',
    marginBottom: 4
  },
  itemVariant: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4
  },
  itemQuantity: {
    fontSize: 12,
    color: '#A5B4FC'
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6'
  },
  addressCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
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
  priceCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  priceLabel: {
    fontSize: 14,
    color: '#94A3B8'
  },
  priceValue: {
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: 'rgba(248,113,113,0.1)'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F87171'
  },
  disabledButton: {
    opacity: 0.5
  },
  helpCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(251,191,36,0.15)'
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24'
  }
});

export default OrderDetailScreen;
