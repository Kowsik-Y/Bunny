import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  StyleSheet,
} from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';
import { Check } from 'lucide-react-native';

interface CheckboxProps extends TouchableOpacityProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  disabled,
  style,
  ...props
}: CheckboxProps) {
  const { colors, semiBoldFontFamily } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={() => onCheckedChange?.(!checked)}
      style={[styles.container, style]}
      {...props}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? colors.primary : colors.border,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
          disabled && { opacity: 0.5 },
        ]}
      >
        {checked && <Check size={14} color={colors.primaryForeground} strokeWidth={3} />}
      </View>
      {label && (
        <Typography
          style={[
            styles.label,
            { fontFamily: semiBoldFontFamily, color: colors.text },
            disabled && { opacity: 0.5 },
          ]}
        >
          {label}
        </Typography>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: 8,
    fontSize: 16,
  },
});
