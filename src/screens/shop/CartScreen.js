import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import productAPI from '../../services/productAPI';
import CosmicBackground from '../../components/shop/CosmicBackground';

const CartScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [updatingItem, setUpdatingItem] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getCart();
      setCart(response.data);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      setUpdatingItem(itemId);
      const response = await productAPI.updateCartItem(itemId, newQuantity);
      setCart(response.data);
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update quantity');
    } finally {
      setUpdatingItem(null);
    }
  };

  const removeItem = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await productAPI.removeFromCart(itemId);
              setCart(response.data);
            } catch (error) {
              console.error('Error removing item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Error', 'Please enter a coupon code');
      return;
    }

    try {
      setApplyingCoupon(true);
      const response = await productAPI.applyCoupon(couponCode.trim());
      setAppliedCoupon(response.data);
      Alert.alert('Success', 'Coupon applied successfully');
    } catch (error) {
      console.error('Error applying coupon:', error);
      Alert.alert('Error', error.response?.data?.error || 'Invalid coupon code');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const proceedToCheckout = () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    navigation.navigate('Checkout', {
      cartItems: cart.items,
      subtotal: cart.subtotal,
      couponCode: appliedCoupon?.couponCode,
      discount: appliedCoupon?.discount || 0
    });
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

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#F3F4F6" />
          </TouchableOpacity>
          <Text style={styles.title}>Shopping Cart</Text>
          <View style={styles.placeholder} />
        </View>

        {isEmpty ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cart-outline" size={80} color="#94A3B8" />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySubtext}>Add products to get started</Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate('ShopHome')}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content}>
              {/* Cart Items */}
              <View style={styles.itemsSection}>
                {cart.items.map((item) => (
                  <View key={item._id} style={styles.cartItem}>
                    <Image
                      source={{ uri: item.product?.images?.[0]?.url || 'https://via.placeholder.com/80' }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.product?.name}
                      </Text>
                      {item.variant && (
                        <Text style={styles.variantText}>
                          Variant: {item.variant.name}
                        </Text>
                      )}
                      <Text style={styles.itemPrice}>₹{item.price}</Text>
                      
                      <View style={styles.itemActions}>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item._id, item.quantity - 1)}
                            disabled={updatingItem === item._id}
                          >
                            <Ionicons name="remove" size={16} color="#F3F4F6" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>{item.quantity}</Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateQuantity(item._id, item.quantity + 1)}
                            disabled={updatingItem === item._id}
                          >
                            <Ionicons name="add" size={16} color="#F3F4F6" />
                          </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeItem(item._id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#F87171" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Coupon Section */}
              <View style={styles.couponSection}>
                <Text style={styles.sectionTitle}>Apply Coupon</Text>
                {appliedCoupon ? (
                  <View style={styles.appliedCoupon}>
                    <View style={styles.couponInfo}>
                      <Ionicons name="pricetag" size={20} color="#34D399" />
                      <Text style={styles.couponCode}>{appliedCoupon.couponCode}</Text>
                      <Text style={styles.couponSaving}>
                        -₹{appliedCoupon.discount}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={removeCoupon}>
                      <Ionicons name="close-circle" size={24} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.couponInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChangeText={setCouponCode}
                      autoCapitalize="characters"
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      style={styles.applyButton}
                      onPress={applyCoupon}
                      disabled={applyingCoupon}
                    >
                      {applyingCoupon ? (
                        <ActivityIndicator size="small" color="#FBBF24" />
                      ) : (
                        <Text style={styles.applyButtonText}>Apply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Price Summary */}
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Price Details</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal ({cart.totalItems} items)</Text>
                  <Text style={styles.summaryValue}>₹{cart.subtotal}</Text>
                </View>
                {appliedCoupon && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, styles.discountLabel]}>Discount</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>
                      -₹{appliedCoupon.discount}
                    </Text>
                  </View>
                )}
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    ₹{appliedCoupon ? appliedCoupon.total : cart.subtotal}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Checkout Button */}
            <View style={styles.bottomBar}>
              <View style={styles.totalInfo}>
                <Text style={styles.bottomTotalLabel}>Total</Text>
                <Text style={styles.bottomTotalValue}>
                  ₹{appliedCoupon ? appliedCoupon.total : cart.subtotal}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={proceedToCheckout}
              >
                <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    marginBottom: 24
  },
  shopButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F97316',
    borderRadius: 12
  },
  shopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  content: {
    flex: 1
  },
  itemsSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  cartItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6',
    marginBottom: 4
  },
  variantText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FBBF24',
    marginBottom: 8
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    minWidth: 20,
    textAlign: 'center'
  },
  removeButton: {
    padding: 4
  },
  couponSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12
  },
  couponInput: {
    flexDirection: 'row',
    gap: 8
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  applyButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 80,
    alignItems: 'center'
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24'
  },
  appliedCoupon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(52,211,153,0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34D399'
  },
  couponInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  couponCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34D399'
  },
  couponSaving: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34D399'
  },
  summarySection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
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
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#F97316',
    borderRadius: 12
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  }
});

export default CartScreen;
