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
import { colors, spacing, radius, shadows } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { offersAPI } from '../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.38;
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

    return (
      <TouchableOpacity
        key={pkg._id}
        style={styles.packageCard}
        onPress={() => handlePackagePress(pkg)}
        activeOpacity={0.85}
      >
        <Text style={styles.packageName}>{pkg.name.toUpperCase()}</Text>

        <View style={styles.amountRow}>
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.amount}>{pkg.minRechargeAmount}</Text>
          </View>
          {bonusAmount > 0 && (
            <View style={styles.bonusPill}>
              <Text style={styles.bonusPillText}>+₹{bonusAmount}</Text>
            </View>
          )}
        </View>

        <Text style={styles.totalCredit}>Total ₹{totalCredit}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>Wallet Recharge</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || packages.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionTitle}>Wallet Recharge</Text>
          <Text style={styles.sectionSubtitle}>Add funds to your balance</Text>
        </View>
        <TouchableOpacity onPress={handleViewAll} style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
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
    marginTop: 24,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  loadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  packageCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginRight: CARD_MARGIN,
    borderWidth: 1,
    borderColor: 'rgba(200, 164, 106, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  packageName: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 1,
  },
  amount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  bonusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 164, 106, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(200, 164, 106, 0.25)',
  },
  bonusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  totalCredit: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

export default RechargePackagesSection;
