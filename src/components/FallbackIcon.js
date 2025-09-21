import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FallbackIcon = ({ name, size = 24, color = '#333', style }) => {
  // Clean monochrome icon mapping using simple Unicode symbols
  const iconMap = {
    'home': '⌂',
    'home-outline': '⌂',
    'calendar': '◫',
    'calendar-outline': '◫',
    'wallet': '◈',
    'wallet-outline': '◈',
    'person': '◉',
    'person-outline': '○',
    'send': '▷',
    'arrow-back': '◀',
    'arrow-forward': '▶',
    'chevron-forward': '›',
    'chevron-back': '‹',
    'checkmark': '✓',
    'close': '✕',
    'gift-outline': '◇',
    'add': '+',
    'remove': '−',
    'star': '★',
    'star-outline': '☆',
    'heart': '♥',
    'heart-outline': '♡',
    'search': '◎',
    'menu': '≡',
    'settings': '⚙',
    'notification': '◐',
    'notification-outline': '○',
    'call': '☎',
    'call-outline': '☎',
    'videocam': '◉',
    'videocam-outline': '○',
    'chat': '◈',
    'chatbubble': '◈',
    'time': '◷',
    'time-outline': '○',
    'location': '◎',
    'location-outline': '○',
    'refresh': '↻',
    'download': '↓',
    'upload': '↑',
    'share': '⤴',
    'copy': '◫',
    'trash': '◌',
    'edit': '✎',
    'save': '◉',
    'lock': '◉',
    'unlock': '○',
    'eye': '◉',
    'eye-off': '○',
    'information': 'ⓘ',
    'warning': '⚠',
    'alert': '!',
  };

  const fallbackIcon = iconMap[name] || '◯';

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Text style={[styles.icon, { fontSize: size * 0.9, color }]}>
        {fallbackIcon}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    textAlign: 'center',
    lineHeight: undefined, // Let the system handle line height
  },
});

export default FallbackIcon;
