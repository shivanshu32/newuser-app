import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { colors, spacing, radius } from '../../theme';

/**
 * Input — Styled TextInput with consistent border, focus ring, error state,
 * label, and helper text.
 */

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  onFocus,
  onBlur,
  error,
  helper,
  icon,
  secureTextEntry,
  keyboardType,
  multiline,
  numberOfLines,
  maxLength,
  autoCapitalize,
  style,
  inputStyle,
  ...props
}) => {
  const [focused, setFocused] = React.useState(false);

  const handleFocus = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          {...props}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
        />
      </View>
      {error ? (
        <Text variant="caption" color={colors.error} style={styles.helper}>
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" color={colors.textMuted} style={styles.helper}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundElevated,
  },
  inputContainerError: {
    borderColor: colors.error,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  helper: {
    marginTop: spacing.xs,
  },
});

export default React.memo(Input);
