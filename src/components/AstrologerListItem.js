import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AstrologerListItem = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.astrologerCard}
      onPress={onPress}
      accessible={true}
      accessibilityLabel={`${item.name}, ${item.specialization}, ${item.rating} stars, ${item.experience} years experience, ₹${item.price} per minute. ${item.status === 'online' ? 'Online' : 'Offline'}`}
    >
      {/* Premium Badge for Premium Astrologers */}
      {(item.isPremium || item.rating?.average >= 4.8 || (typeof item.rating === 'number' && item.rating >= 4.8)) && (
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumText}>PREMIUM</Text>
        </View>
      )}
      
      {item.status === 'online' && (
        <View style={styles.liveIndicator}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      <Image 
        source={{ uri: item.image }} 
        style={styles.astrologerImage} 
        accessibilityLabel={`Profile picture of ${item.name}`}
      />
      <View style={styles.astrologerInfo}>
        <Text style={styles.astrologerName}>{item.name}</Text>
        <Text style={styles.astrologerSpecialization}>{item.specialization || 'Astrologer'}</Text>
        <View style={styles.astrologerDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.detailText}>{item.rating}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.detailText}>{item.experience}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={14} color="#F97316" />
            <Text style={styles.detailText}>₹{item.price}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  astrologerCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 10,
  },
  premiumText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  astrologerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignSelf: 'center',
    marginBottom: 12,
  },
  astrologerInfo: {
    alignItems: 'center',
  },
  astrologerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  astrologerSpecialization: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  astrologerDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
});

export default AstrologerListItem;
