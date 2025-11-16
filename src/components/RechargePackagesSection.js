import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { offersAPI } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.55;
const CARD_MARGIN = 10;

const RechargePackagesSection = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await offersAPI.getRechargePackages();
      
      if (response && response.success) {
        const packagesData = response.data || [];
        
        // Sort by minRechargeAmount (minimum to maximum)
        const sortedPackages = packagesData
          .filter(pkg => pkg.isActive) // Only active packages
          .sort((a, b) => (a.minRechargeAmount || 0) - (b.minRechargeAmount || 0));
        
        setPackages(sortedPackages);
      } else {
        setPackages([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('❌ [RECHARGE_PACKAGES] Error fetching packages:', err);
      setError(err.message);
      setLoading(false);
      setPackages([]);
    }
  };

  const handlePackagePress = (pkg) => {
    // Navigate to wallet screen with selected package
    navigation.navigate('Wallet', { selectedPackage: pkg });
  };

  const handleViewAll = () => {
    navigation.navigate('Wallet');
  };

  const renderPackageCard = (pkg) => {
    const bonusAmount = pkg.percentageBonus 
      ? Math.round(pkg.minRechargeAmount * pkg.percentageBonus / 100)
      : (pkg.flatBonus || 0);
    
    const totalCredit = pkg.minRechargeAmount + bonusAmount;
    const savingsPercent = pkg.percentageBonus || 
      (pkg.flatBonus ? Math.round((pkg.flatBonus / pkg.minRechargeAmount) * 100) : 0);

    return (
      <TouchableOpacity
        key={pkg._id}
        style={styles.packageCard}
        onPress={() => handlePackagePress(pkg)}
        activeOpacity={0.8}
      >
        {/* Badge for first recharge or popular */}
        {pkg.firstRecharge && (
          <View style={styles.badge}>
            <Ionicons name="gift" size={12} color="#fff" />
            <Text style={styles.badgeText}>First Recharge</Text>
          </View>
        )}
        
        {!pkg.firstRecharge && pkg.popular && (
          <View style={[styles.badge, styles.popularBadge]}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.badgeText}>Popular</Text>
          </View>
        )}

        {/* Package Name */}
        <Text style={styles.packageName}>{pkg.name}</Text>

        {/* Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <Text style={styles.amount}>{pkg.minRechargeAmount}</Text>
        </View>

        {/* Bonus Info */}
        {bonusAmount > 0 && (
          <View style={styles.bonusContainer}>
            <Ionicons name="add-circle" size={16} color="#4CAF50" />
            <Text style={styles.bonusText}>
              ₹{bonusAmount} Bonus
            </Text>
          </View>
        )}

        {/* Total Credit */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Credit</Text>
          <Text style={styles.totalValue}>₹{totalCredit}</Text>
        </View>

        {/* Savings Badge */}
        {savingsPercent > 0 && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {savingsPercent}%</Text>
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>Recharge Now</Text>
          <Ionicons name="arrow-forward" size={16} color="#FF6B35" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Recharge Packages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </View>
    );
  }

  if (error || packages.length === 0) {
    return null; // Don't show section if there's an error or no packages
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Recharge Packages</Text>
          <Text style={styles.sectionSubtitle}>Get bonus credits on recharge</Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_MARGIN}
        snapToAlignment="start"
      >
        {packages.map(pkg => renderPackageCard(pkg))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  packageCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginRight: CARD_MARGIN,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularBadge: {
    backgroundColor: '#FFB800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  packageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 2,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bonusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  savingsBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#FFF5F2',
    borderRadius: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF6B35',
  },
});

export default RechargePackagesSection;
