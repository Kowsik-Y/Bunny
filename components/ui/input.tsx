import React, { useState } from 'react';
import {
  TextInput,
  TextInputProps,
  StyleSheet,
  View,
} from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ style, label, error, onFocus, onBlur, ...props }: InputProps) {
  const { colors, semiBoldFontFamily, fontFamily } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : isFocused ? colors.primary : colors.border,
            color: colors.text,
            fontFamily: fontFamily,
          },
          style,
        ]}
        placeholderTextColor={colors.mutedForeground}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
