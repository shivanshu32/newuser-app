import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { colors } from '../theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PendingPoojaDetailsSection = ({ bookings, onProvideDetails, loading }) => {
  if (loading || !bookings || bookings.length === 0) {
    return null;
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderBookingCard = ({ item }) => {
    const pooja = item.pooja || {};
    const packageData = item.package || item.packageSnapshot || {};
    
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => onProvideDetails(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={styles.cardGradient}
        >
          {/* Alert Badge */}
          <View style={styles.alertBadge}>
            <Ionicons name="alert-circle" size={14} color={colors.textInverse} />
            <Text style={styles.alertBadgeText}>Action Required</Text>
          </View>
          
          {/* Pooja Info */}
          <View style={styles.poojaInfo}>
            {pooja.featuredImage?.url ? (
              <Image
                source={{ uri: pooja.featuredImage.url }}
                style={styles.poojaImage}
              />
            ) : (
              <View style={[styles.poojaImage, styles.placeholderImage]}>
                <MaterialCommunityIcons name="hands-pray" size={24} color="#9b59b6" />
              </View>
            )}
            
            <View style={styles.poojaDetails}>
              <Text style={styles.poojaName} numberOfLines={2}>
                {pooja.mainHeading || 'Pooja Booking'}
              </Text>
              <Text style={styles.packageName}>
                {packageData.name || 'Standard Package'}
              </Text>
              <Text style={styles.bookingDate}>
                Booked on {formatDate(item.bookingDate)}
              </Text>
            </View>
          </View>
          
          {/* Action Button */}
          <TouchableOpacity
            style={styles.provideDetailsButton}
            onPress={() => onProvideDetails(item)}
          >
            <LinearGradient
              colors={['#9b59b6', '#8e44ad']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="form-textbox" size={18} color={colors.textInverse} />
              <Text style={styles.buttonText}>Provide Pooja Details</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textInverse} />
            </LinearGradient>
          </TouchableOpacity>
          
          {/* Info Text */}
          <Text style={styles.infoText}>
            Please provide your details for the pooja ceremony
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="clipboard-alert-outline" size={24} color="#f39c12" />
          <Text style={styles.sectionTitle}>Pending Pooja Details</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{bookings.length}</Text>
        </View>
      </View>
      
      {/* Bookings List */}
      <FlatList
        data={bookings}
        renderItem={renderBookingCard}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textInverse,
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  bookingCard: {
    width: 300,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(155, 89, 182, 0.3)',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  alertBadgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  poojaInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  poojaImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: 'rgba(155, 89, 182, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poojaDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  poojaName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textInverse,
    marginBottom: 4,
  },
  packageName: {
    fontSize: 13,
    color: '#9b59b6',
    fontWeight: '500',
    marginBottom: 2,
  },
  bookingDate: {
    fontSize: 12,
    color: '#888',
  },
  provideDetailsButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  infoText: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default PendingPoojaDetailsSection;
