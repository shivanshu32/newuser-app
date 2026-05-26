import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Shop Screens
import ShopHomeScreen from '../screens/shop/ShopHomeScreen';
import ProductListScreen from '../screens/shop/ProductListScreen';
import ProductDetailScreen from '../screens/shop/ProductDetailScreen';
import CartScreen from '../screens/shop/CartScreen';
import CheckoutScreen from '../screens/shop/CheckoutScreen';
import OrderConfirmationScreen from '../screens/shop/OrderConfirmationScreen';
import OrderHistoryScreen from '../screens/shop/OrderHistoryScreen';
import OrderDetailScreen from '../screens/shop/OrderDetailScreen';
import WishlistScreen from '../screens/shop/WishlistScreen';
import AddressManagementScreen from '../screens/shop/AddressManagementScreen';

const Stack = createStackNavigator();

const ShopNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFB' }
      }}
    >
      <Stack.Screen name="ShopHome" component={ShopHomeScreen} />
      <Stack.Screen name="ProductList" component={ProductListScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen 
        name="OrderConfirmation" 
        component={OrderConfirmationScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="AddressManagement" component={AddressManagementScreen} />
    </Stack.Navigator>
  );
};

export default ShopNavigator;
