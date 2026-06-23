import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';

/**
 * SafeAreaWrapper — Consistent safe area, status bar, and background color
 * for all screens. Wrap top-level screen content with this component.
 */

const SafeAreaWrapper = ({
  children,
  style,
  edges = ['top', 'left', 'right'],
  statusBarStyle = 'dark-content',
  backgroundColor = colors.background,
}) => {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor }, style]} edges={edges}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default React.memo(SafeAreaWrapper);
