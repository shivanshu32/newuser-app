import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';

/**
 * Avatar — Consistent image avatar with online indicator and fallback.
 */

const Avatar = ({
  source,
  size = 48,
  online = false,
  border = false,
  borderColor = colors.primary,
  style,
}) => {
  const borderWidth = border ? 2 : 0;
  const effectiveSize = size - borderWidth * 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {source ? (
        <Image
          source={typeof source === 'string' ? { uri: source } : source}
          style={[
            styles.image,
            {
              width: effectiveSize,
              height: effectiveSize,
              borderRadius: size / 2,
              borderWidth,
              borderColor: borderColor,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: effectiveSize,
              height: effectiveSize,
              borderRadius: size / 2,
              borderWidth,
              borderColor: borderColor,
            },
          ]}
        >
          <Ionicons name="person" size={size * 0.4} color={colors.textMuted} />
        </View>
      )}
      {online && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              borderWidth: size * 0.04,
              borderColor: colors.backgroundElevated,
              bottom: size * 0.02,
              right: size * 0.02,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceSecondary,
  },
  fallback: {
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: colors.success,
  },
});

export default React.memo(Avatar);
