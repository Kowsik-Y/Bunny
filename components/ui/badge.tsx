import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  label?: string;
}

export function Badge({
  variant = 'default',
  label,
  children,
  style,
  ...props
}: BadgeProps) {
  const { colors, semiBoldFontFamily } = useAppTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'default':
        return {
          badge: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
        };
      case 'secondary':
        return {
          badge: { backgroundColor: colors.secondary },
          text: { color: colors.secondaryForeground },
        };
      case 'outline':
        return {
          badge: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.text },
        };
      case 'destructive':
        return {
          badge: { backgroundColor: colors.destructive },
          text: { color: colors.destructiveForeground },
        };
      default:
        return {
          badge: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[styles.badge, variantStyles.badge, style]}
      {...props}
    >
      <Typography
        style={[
          styles.text,
          variantStyles.text,
          { fontFamily: semiBoldFontFamily, fontWeight: '600' },
        ]}
      >
        {label || children}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
  },
});
