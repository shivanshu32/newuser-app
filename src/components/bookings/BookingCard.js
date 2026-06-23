import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme';
import BookingStatusChip from './BookingStatusChip';
import { formatRating } from '../../utils/numberFormat';

const TYPE_ICON = {
  chat: 'chatbubble-outline',
  voice: 'call-outline',
  video: 'videocam-outline',
};

const BookingCard = ({
  booking,
  onPress,
  onViewHistory,
  onRate,
  onRebook,
  index,
}) => {
  const scale = useSharedValue(1);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.985, { stiffness: 320, damping: 22 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 320, damping: 22 });
  };

  const item = booking;

  const bookingDate = item.scheduledAt
    ? new Date(item.scheduledAt)
    : item.createdAt
    ? new Date(item.createdAt)
    : null;
  const isValidDate = bookingDate && !isNaN(bookingDate.getTime());

  const formatDate = () => {
    if (!isValidDate) return 'No date';
    const today = new Date();
    const diff = Math.floor((today - bookingDate) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return bookingDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = () => {
    if (!isValidDate) return '';
    return bookingDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = () => {
    if (!item.duration || item.duration <= 0) return null;
    const d = parseInt(item.duration);
    if (d >= 60) {
      const h = Math.floor(d / 60);
      const m = d % 60;
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${d}m`;
  };

  const getTypeLabel = () => {
    if (item.isFreeChat) return 'Free Chat';
    if (item.isPrepaidOffer) return 'Prepaid Offer';
    if (item.isPrepaidCard) return 'Pack Chat';
    const t = item.type || 'chat';
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const typeIcon = TYPE_ICON[item.type] || TYPE_ICON.chat;
  const isCompleted = item.status === 'completed';
  const isCancelled = ['cancelled', 'rejected', 'expired'].includes(item.status);
  const canJoin = ['confirmed', 'waiting_for_user'].includes(item.status);
  const isInProgress = item.status === 'in-progress';
  const hasRating = item.rating != null;
  const hasChat = isCompleted && item.type === 'chat' && item.sessionId;
  const astrologerId = item.astrologer?._id || item.astrologer;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.touchable}
      accessibilityRole="button"
      accessibilityLabel={`Booking with ${item.astrologer?.displayName || 'astrologer'}, status ${item.status}`}
    >
      <Animated.View style={[styles.card, isCancelled && styles.cardDimmed, animatedCardStyle]}>

        {/* Top row: avatar | name + meta | status chip */}
        <View style={styles.topRow}>
          <View style={styles.avatarWrap}>
            <Image
              source={{
                uri: item.astrologer?.imageUrl || item.astrologer?.profileImage || 'https://i.pravatar.cc/80',
              }}
              style={[styles.avatar, (canJoin || isInProgress) && styles.avatarGoldBorder]}
            />
            {(canJoin || isInProgress) && (
              <View style={[styles.liveDot, { backgroundColor: isInProgress ? colors.success : '#60A5FA' }]} />
            )}
          </View>

          <View style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {item.astrologer?.displayName || item.astrologer?.name || 'Astrologer'}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name={typeIcon} size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{getTypeLabel()}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{formatDate()}</Text>
              {isValidDate && (
                <>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{formatTime()}</Text>
                </>
              )}
            </View>

            <View style={styles.secondaryMeta}>
              {item.astrologer?.rating != null && (
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={10} color={colors.accentGold} />
                  <Text style={styles.ratingText}>{formatRating(item.astrologer.rating)}</Text>
                </View>
              )}
              {formatDuration() && (
                <View style={styles.durationPill}>
                  <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                  <Text style={styles.durationText}>{formatDuration()}</Text>
                </View>
              )}
              {item.isFreeChat ? (
                <View style={styles.freePill}>
                  <Text style={styles.freeText}>FREE</Text>
                </View>
              ) : item.totalAmount > 0 ? (
                <Text style={styles.priceText}>₹{parseFloat(item.totalAmount).toFixed(0)}</Text>
              ) : null}
            </View>
          </View>

          <BookingStatusChip status={item.status} />
        </View>

        {/* Action zone */}
        {(canJoin || isInProgress) && (
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={(e) => { e.stopPropagation(); onPress(); }}
            activeOpacity={0.85}
            accessibilityLabel="Join session"
          >
            <Ionicons name={isInProgress ? 'enter-outline' : 'play-circle-outline'} size={18} color="#FFFFFF" />
            <Text style={styles.primaryCtaText}>
              {isInProgress ? 'Rejoin Session' : 'Join Session'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.actionRow}>
            {hasChat && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={(e) => { e.stopPropagation(); onViewHistory?.(); }}
                activeOpacity={0.8}
                accessibilityLabel="View conversation"
              >
                <Ionicons name="chatbubbles-outline" size={15} color={colors.accentPurpleLight} />
                <Text style={styles.actionBtnText}>Conversation</Text>
              </TouchableOpacity>
            )}
            {!hasRating && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnGold]}
                onPress={(e) => { e.stopPropagation(); onRate?.(item._id); }}
                activeOpacity={0.8}
                accessibilityLabel="Rate this session"
              >
                <Ionicons name="star-outline" size={15} color={colors.accentGold} />
                <Text style={[styles.actionBtnText, styles.actionBtnGoldText]}>Rate</Text>
              </TouchableOpacity>
            )}
            {astrologerId && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnPurple]}
                onPress={(e) => { e.stopPropagation(); onRebook?.(astrologerId); }}
                activeOpacity={0.8}
                accessibilityLabel="Rebook this astrologer"
              >
                <Ionicons name="refresh-outline" size={15} color={colors.accentPurpleLight} />
                <Text style={[styles.actionBtnText, styles.actionBtnPurpleText]}>Rebook</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    borderRadius: 18,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#17171C',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardDimmed: {
    opacity: 0.65,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
    marginTop: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceTertiary,
  },
  avatarGoldBorder: {
    borderWidth: 2,
    borderColor: colors.accentGold,
  },
  liveDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#17171C',
  },
  nameBlock: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
  },
  secondaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accentGoldMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 11,
    color: colors.accentGoldLight,
    fontWeight: '600',
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  freePill: {
    backgroundColor: 'rgba(74,222,128,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  freeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentGold,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 14,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnGold: {
    backgroundColor: colors.accentGoldMuted,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  actionBtnPurple: {
    backgroundColor: colors.accentPurpleMuted,
    borderColor: 'rgba(91,75,255,0.2)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionBtnGoldText: {
    color: colors.accentGold,
  },
  actionBtnPurpleText: {
    color: colors.accentPurpleLight,
  },
});

export default React.memo(BookingCard);
