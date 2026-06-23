import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { typography, colors } from '../../theme';

/**
 * Text — Typography component with semantic variants.
 * Maps theme typography scale to a single prop.
 */

const Text = ({
  variant = 'body',
  color,
  style,
  numberOfLines,
  children,
  ...props
}) => {
  const textColor = color || colors.textPrimary;
  const variantStyle = typography[variant] || typography.body;

  return (
    <RNText
      {...props}
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        variantStyle,
        { color: textColor },
        style,
      ]}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: undefined,
  },
});

export default React.memo(Text);
