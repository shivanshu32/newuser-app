import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Text from './Text';
import IconButton from './IconButton';
import { colors, spacing } from '../../theme';

/**
 * ScreenHeader — Consistent back button, title, and optional right action.
 */

const ScreenHeader = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  rightIcon,
  onRightAction,
  transparent = false,
  style,
}) => {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View
      style={[
        styles.container,
        transparent && styles.transparent,
        style,
      ]}
    >
      <View style={styles.left}>
        {showBack ? (
          <IconButton
            icon={<Ionicons name="arrow-back" size={24} color={colors.textPrimary} />}
            onPress={handleBack}
            variant="ghost"
            size={44}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.center}>
        <Text variant="h3" color={colors.textPrimary} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {rightAction || rightIcon ? (
          <IconButton
            icon={rightIcon || <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />}
            onPress={onRightAction}
            variant="ghost"
            size={44}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 56,
    backgroundColor: colors.backgroundElevated,
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
});

export default React.memo(ScreenHeader);
