import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

const BookingListHeader = ({
  searchQuery,
  onSearchChange,
  onSortPress,
  bookingCount = 0,
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef(null);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accentGold],
  });

  const handleChange = (text) => {
    setLocalQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearchChange(text);
    }, 250);
  };

  const handleClear = () => {
    setLocalQuery('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onSearchChange('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>My Consultations</Text>
          {bookingCount > 0 && (
            <Text style={styles.subtitle}>{bookingCount} total</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={onSortPress}
          activeOpacity={0.7}
          accessibilityLabel="Sort bookings"
          accessibilityRole="button"
        >
          <Ionicons name="funnel-outline" size={18} color={colors.accentGold} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.searchRow, { borderColor }]}>
        <Ionicons
          name="search"
          size={17}
          color={searchFocused ? colors.accentGold : colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search astrologer..."
          placeholderTextColor={colors.textMuted}
          value={localQuery}
          onChangeText={handleChange}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.accentGold}
          returnKeyType="search"
          accessibilityLabel="Search bookings by astrologer name"
        />
        {localQuery.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  sortButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accentGoldMuted,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1.5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    height: 48,
    fontWeight: '400',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
});

export default React.memo(BookingListHeader);
